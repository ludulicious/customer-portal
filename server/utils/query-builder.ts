import type {
  QueryInput,
  FilterOperator as FilterOperatorType,
} from '#types'
import { z } from 'zod'
import type { SQL, SQLWrapper, AnyColumn } from 'drizzle-orm'
import { and, eq, ne, gt, lt, gte, lte, ilike, inArray, notInArray, asc, desc } from 'drizzle-orm'

// Schema for FilterOperator - now using z.enum with actual values
export const FilterOperatorSchema = z.enum([
  'eq',
  'neq',
  'gt',
  'lt',
  'gte',
  'lte',
  'contains',
  'startsWith',
  'endsWith',
  'in',
  'notIn',
])

// Schema for a single filter object
export const FilterSchema = z.object({
  field: z.string(),
  operator: FilterOperatorSchema,
  // Basic JSON value types. For more complex scenarios (e.g. Date), this might need refinement.
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.union([z.string(), z.number(), z.boolean()])),
    z.null(),
  ]),
})

// Define Zod schema for the Sort object, matching QueryInput's Sort interface
export const SortSchema = z.object({
  field: z.string(),
  direction: z.enum(['asc', 'desc']),
})

// Base schema for common query parameters, now including a generic 'filters' array
export const BaseQuerySchema = z.object({
  take: z.preprocess(
    (val) => (val ? Number(val) : undefined),
    z.number().int().min(1).optional(),
  ),
  skip: z.preprocess(
    (val) => (val ? Number(val) : undefined),
    z.number().int().min(0).optional(),
  ),
  sortField: z.string().optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
  filters: z.preprocess((val) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val)
      } catch {
        return undefined
      }
    }
    return val
  }, z.array(FilterSchema).optional()),
})

/**
 * Type for a function that resolves a field path to a Drizzle column reference.
 * This allows the query builder to work with any table schema.
 */
export type FieldResolver = (fieldPath: string) => AnyColumn | SQLWrapper | undefined

/**
 * Creates a Drizzle SQL condition from a filter.
 * For nested fields (e.g., "relation.field"), you'll need to handle joins separately.
 * This function supports flat fields only.
 *
 * @param fieldResolver - Function to resolve field paths to column references
 * @param fieldPath - The field path (e.g., "name", "email", "createdAt")
 * @param operator - The filter operator
 * @param value - The filter value
 * @returns A Drizzle SQL condition
 */
function createFilterCondition(
  fieldResolver: FieldResolver,
  fieldPath: string,
  operator: FilterOperatorType,
  value: unknown,
): SQL | undefined {
  const column = fieldResolver(fieldPath)
  if (!column) {
    console.warn(`Field "${fieldPath}" could not be resolved to a column`)
    return undefined
  }

  // Type guard to ensure column is valid
  if (typeof column !== 'object' || column === null) {
    return undefined
  }

  // Handle null values
  if (value === null || value === undefined) {
    if (operator === 'eq') {
      return eq(column, null)
    }
    if (operator === 'neq') {
      return ne(column, null)
    }
    return undefined
  }

  switch (operator) {
    case 'eq':
      return eq(column, value)
    case 'neq':
      return ne(column, value)
    case 'gt':
      return gt(column, value)
    case 'lt':
      return lt(column, value)
    case 'gte':
      return gte(column, value)
    case 'lte':
      return lte(column, value)
    case 'contains':
      return ilike(column as AnyColumn, `%${String(value)}%`)
    case 'startsWith':
      return ilike(column as AnyColumn, `${String(value)}%`)
    case 'endsWith':
      return ilike(column as AnyColumn, `%${String(value)}`)
    case 'in':
      if (!Array.isArray(value)) {
        return undefined
      }
      return inArray(column, value)
    case 'notIn':
      if (!Array.isArray(value)) {
        return undefined
      }
      return notInArray(column, value)
    default:
      return undefined
  }
}

/**
 * Query builder result containing Drizzle-compatible query conditions
 */
export interface DrizzleQueryResult {
  /** Drizzle SQL where condition (can be used with .where()) */
  where: SQL | undefined
  /** Drizzle orderBy expression (can be used with .orderBy()) */
  orderBy: SQL | undefined
  /** Limit for pagination */
  limit: number | undefined
  /** Offset for pagination */
  offset: number | undefined
}

/**
 * Builds Drizzle ORM query conditions from a QueryInput object.
 *
 * @param queryInput - The QueryInput object containing dynamic filters, sorting, and pagination.
 * @param fieldResolver - Function to resolve field paths to Drizzle column references.
 *                       Example: (field) => userTable[field] or a more sophisticated resolver.
 * @param baseWhere - Optional base where condition to combine with filters (using AND).
 * @returns An object with `where`, `orderBy`, `limit`, and `offset` suitable for Drizzle queries.
 *
 * @example
 * ```ts
 * const { where, orderBy, limit, offset } = buildDrizzleQuery(
 *   { filters: [{ field: 'email', operator: 'contains', value: 'example' }] },
 *   (field) => userTable[field]
 * )
 *
 * let query = db.select().from(userTable)
 * if (where) query = query.where(where)
 * if (orderBy) query = query.orderBy(orderBy)
 * if (limit) query = query.limit(limit)
 * if (offset) query = query.offset(offset)
 * const users = await query
 * ```
 */
export function buildDrizzleQuery(
  queryInput: QueryInput,
  fieldResolver: FieldResolver,
  baseWhere?: SQL,
): DrizzleQueryResult {
  // 1. Build where conditions from filters
  const filterConditions: SQL[] = []

  if (queryInput.filters?.length) {
    for (const filter of queryInput.filters) {
      const condition = createFilterCondition(
        fieldResolver,
        filter.field,
        filter.operator as FilterOperatorType,
        filter.value,
      )
      if (condition) {
        filterConditions.push(condition)
      }
    }
  }

  // Combine baseWhere and filter conditions with AND
  let finalWhere: SQL | undefined = undefined
  if (baseWhere && filterConditions.length > 0) {
    finalWhere = and(baseWhere, ...filterConditions)!
  } else if (baseWhere) {
    finalWhere = baseWhere
  } else if (filterConditions.length > 0) {
    finalWhere = filterConditions.length === 1
      ? filterConditions[0]
      : and(...filterConditions)!
  }

  // 2. Build orderBy
  let orderBy: SQL | undefined = undefined
  if (queryInput.sortField) {
    const column = fieldResolver(queryInput.sortField)
    if (column) {
      const direction = queryInput.sortDirection || 'asc'
      orderBy = direction === 'desc' ? desc(column) : asc(column)
    }
  }

  // 3. Extract limit and offset
  const limit = queryInput.take
  const offset = queryInput.skip

  return {
    where: finalWhere,
    orderBy,
    limit,
    offset,
  }
}

/**
 * Legacy function name for backward compatibility.
 * @deprecated Use buildDrizzleQuery instead
 */
export function buildPrismaQueryArgs(
  queryInput: QueryInput,
  fieldResolver: FieldResolver,
  baseWhere?: SQL,
): DrizzleQueryResult {
  return buildDrizzleQuery(queryInput, fieldResolver, baseWhere)
}
