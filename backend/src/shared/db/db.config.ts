import dotenv from "dotenv";

dotenv.config();

export const mainDb = {
    host: process.env.QDEX_DB_HOST,
    user: process.env.QDEX_DB_USER,
    password: process.env.QDEX_DB_PASSWORD,
    database: process.env.QDEX_DB_NAME,
    port: Number(process.env.QDEX_DB_PORT) || 3306,
}