import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
}

export const prisma = new PrismaClient();
