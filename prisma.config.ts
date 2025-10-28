import path from "node:path";
import type { PrismaConfig } from "prisma";

export default {
  schema: path.join("prisma", "schema", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  views: {
    path: path.join("prisma", "schema", "views"),
  },
  typedSql: {
    path: path.join("prisma", "schema", "queries"),
  },
  engine: "classic",
  datasource: {
    url: process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/postgres'
  }
} satisfies PrismaConfig;
