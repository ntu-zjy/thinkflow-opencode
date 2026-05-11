// 一次性建表脚本，部署后手动运行一次：bun run src/migrate.ts
import { sql } from "./db"
import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const dir = dirname(fileURLToPath(import.meta.url))
const schema = readFileSync(resolve(dir, "schema.sql"), "utf-8")

console.log("Running migrations...")
await sql.unsafe(schema)
console.log("Done.")
await sql.end()
