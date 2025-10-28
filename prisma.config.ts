import type { PrismaConfig } from "prisma";

// import your .env file
import "dotenv/config"; // <-- You need your env variables in this file for it to start working. This import worked for me in NextJS 15

export default {
  schema: "prisma/schema",
} satisfies PrismaConfig;
