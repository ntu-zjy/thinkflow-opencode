import postgres from "postgres"

const DB_URL = process.env.DATABASE_URL ?? "postgres://thinkflow:thinkflow_dev@localhost:5432/thinkflow"

export const sql = postgres(DB_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
})
