import postgres from 'postgres'

const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || ''
const sql = postgres(dbUrl, { ssl: 'require' })

const rows = await sql`SELECT name, email, role FROM users`
console.log('Users in DB:')
rows.forEach(r => console.log(' -', r.name, '|', r.email, '|', r.role))

await sql.end()
