import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7: la URL de conexión se declara aquí y no en schema.prisma.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
