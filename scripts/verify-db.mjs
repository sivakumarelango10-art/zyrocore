import postgres from 'postgres'

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || ''
console.log('Connecting to DB using:', dbUrl ? dbUrl.substring(0, 30) + '...' : 'EMPTY')

const sql = postgres(dbUrl, { ssl: 'require', prepare: false })

try {
  const rows = await sql`SELECT name, email, role FROM users`
  console.log('Users in DB:')
  rows.forEach(r => console.log(' -', r.name, '|', r.email, '|', r.role))
} catch (err) {
  console.error('Connection failed:', err)
} finally {
  await sql.end()
}

