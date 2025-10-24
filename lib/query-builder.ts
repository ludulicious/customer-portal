import type {
  QueryInput,
  FilterOperator as FilterOperatorType,
} from '../types/queryBuilder'
import { z } from 'zod'

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
  operator: FilterOperatorSchema, // Now uses the refined enum schema
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
  // Replace sortField and sortDirection with a single 'sort' object
  // The client would need to pass sort as a stringified JSON object: e.g., sort={\"field\":\"createdAt\",\"direction\":\"desc\"}
  sortField: z.string().optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
  filters: z.preprocess((val) => {
      if (typeof val === 'string') {
      try {
        return JSON.parse(val)
      } catch (e) {
        return undefined
      }
    }
    return val
  }, z.array(FilterSchema).optional()),
})

// Map filter operators to Prisma query operators
const operatorMap: Record<FilterOperatorType, (value: any) => any> = {
  eq: (value) => ({ equals: value }),
  neq: (value) => ({ not: value }),
  gt: (value) => ({ gt: value }),
  lt: (value) => ({ lt: value }),
  gte: (value) => ({ gte: value }),
  lte: (value) => ({ lte: value }),
  contains: (value) => ({ contains: value, mode: 'insensitive' }),
  startsWith: (value) => ({ startsWith: value, mode: 'insensitive' }),
  endsWith: (value) => ({ endsWith: value, mode: 'insensitive' }),
  in: (value) => ({ in: value }),
  notIn: (value) => ({ notIn: value }),
}

/**
 * Creates a nested object structure for Prisma queries from a dot-separated field path.
 * Example: "answers.questionId", "equals", "someValue"
 * Becomes: { answers: { questionId: { equals: "someValue" } } }
 */
function createNestedFilter(fieldPath: string, operator: FilterOperatorType, value: any): Record<string, any> {
  console.log('createNestedFilter', fieldPath, operator, value)
  const pathParts = fieldPath.split('.')
  if (pathParts.length === 0) {
    console.log('pathParts.length === 0', operatorMap[operator](value))
    return operatorMap[operator](value == null ? null : value)
  }
  const root: Record<string, any> = {}
  let currentLevel = root

  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i]
    if (i === pathParts.length - 1) {
      // This is the actual field to apply the operator on
      currentLevel[part] = operatorMap[operator](value)
    } else {
      // This part is a relation. Assume 'some' for to-many relations.
      // This addresses the Prisma requirement for filtering on related records.
      currentLevel[part] = { some: {} }
      currentLevel = currentLevel[part].some
    }
  }
  return root
}

/**
 * Builds arguments for Prisma's findMany and count methods by merging
 * a QueryInput object with base Prisma arguments.
 *
 * @template TBaseArgs - The type of the base arguments, typically including select/include.
 *                      It's recommended to pass a const-asserted object for baseArgs
 *                      to preserve literal types for select/include, aiding Prisma's inference.
 * @param queryInput - The QueryInput object containing dynamic filters, sorting, and pagination.
 * @param baseArgs - Optional base arguments for the Prisma query (e.g., select, include, initial where).
 * @returns An object with `findManyArgs` and `countArgs` suitable for Prisma client calls.
 */
export function buildPrismaQueryArgs<
  TBaseArgs extends Record<string, any> | undefined = undefined,
>(queryInput: QueryInput, baseArgs?: TBaseArgs) {
  // Type helpers to extract parts from TBaseArgs if they exist
  type BaseWhere = TBaseArgs extends { where?: infer W }
    ? W
    : Record<string, any>
  type BaseOrderBy = TBaseArgs extends { orderBy?: infer O }
    ? O
    : Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>
  type BaseTake = TBaseArgs extends { take?: infer T } ? T : number | undefined
  type BaseSkip = TBaseArgs extends { skip?: infer S } ? S : number | undefined

  // 1. Construct the final 'where' clause
  let finalWhereClause: BaseWhere | Record<string, any> | undefined = undefined
  const filtersFromQueryInput = queryInput.filters?.length
    ? {
        AND: queryInput.filters.map((f) => {
          // Use createNestedFilter to handle potentially nested fields
          return createNestedFilter(f.field, f.operator as FilterOperatorType, f.value)
        }),
      }
    : undefined
  const whereFromBaseArgs = baseArgs?.where

  if (whereFromBaseArgs && filtersFromQueryInput) {
    // If both exist, ensure they are treated as objects for AND clause
    finalWhereClause = {
      AND: [whereFromBaseArgs as object, filtersFromQueryInput as object],
    } as BaseWhere
  } else {
    finalWhereClause = (whereFromBaseArgs || filtersFromQueryInput) as
      | BaseWhere
      | undefined
  }

  if (queryInput.sortField && !queryInput.sortDirection) {
    queryInput.sortDirection = 'asc'
  }
  // 2. Construct 'orderBy' clause - queryInput.sort takes precedence
  const finalOrderByClause:
    | BaseOrderBy
    | Array<Record<string, 'asc' | 'desc'>>
    | undefined = queryInput.sortField && queryInput.sortDirection
    ? [{ [queryInput.sortField]: queryInput.sortDirection }]
    : (baseArgs?.orderBy as BaseOrderBy | undefined)

  // 3. Construct 'take' and 'skip' - queryInput.limit/offset take precedence
  const finalTake: BaseTake | number | undefined =
    queryInput.take ?? (baseArgs?.take as BaseTake | undefined)
  const finalSkip: BaseSkip | number | undefined =
    queryInput.skip ?? (baseArgs?.skip as BaseSkip | undefined)

  // 4. Assemble the final arguments for Prisma's findMany call.
  // Spread baseArgs first (this includes select/include and any other properties).
  // Then, explicitly set/override where, orderBy, take, skip.

  const findManyArgs = {
    ...(baseArgs ?? ({} as TBaseArgs)),
    where: finalWhereClause,
    orderBy: finalOrderByClause,
    take: finalTake,
    skip: finalSkip,
  } as const // `as const` ensures the returned object has a literal type, aiding Prisma inference.

  // 5. Assemble arguments for count (typically only 'where')
  const countArgs = {
    where: finalWhereClause,
  } as const

  return { findManyArgs, countArgs }
}
