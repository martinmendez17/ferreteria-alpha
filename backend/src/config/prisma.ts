import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { env } from "./env";

// Prisma 7 se conecta a PostgreSQL a través del adaptador oficial de "pg".
// Se crea una sola instancia para toda la aplicación.
const adapter = new PrismaPg({ connectionString: env.databaseUrl });

export const prisma = new PrismaClient({ adapter });
