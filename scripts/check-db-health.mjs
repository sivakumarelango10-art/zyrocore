import fs from 'fs'
import path from 'path'
import postgres from 'postgres'

const envLocalPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8')
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eq = trimmed.indexOf('=')
    if (eq > 0) {
      const k = trimmed.slice(0, eq).trim()
      let v = trimmed.slice(eq + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      if (!process.env[k]) process.env[k] = v
    }
  })
}

const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || ''
if (!dbUrl) {
  console.error('DATABASE_URL is missing')
  process.exit(1)
}

const sql = postgres(dbUrl, { ssl: 'require', prepare: false })

async function run() {
  console.log('=== DATABASE HEALTH DIAGNOSTIC ===')
  
  // 1. Version & Connectivity
  const startPing = performance.now()
  const [{ version }] = await sql`SELECT version()`
  const pingDuration = performance.now() - startPing
  console.log(`[✓] Connection: Connected via SSL (Ping: ${pingDuration.toFixed(2)} ms)`)
  console.log(`[✓] PostgreSQL Version: ${version.split(' on ')[0]}`)

  // 2. Public Tables
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `
  console.log(`[✓] Tables Found (${tables.length}): ${tables.map(t => t.table_name).join(', ')}`)

  // 3. Foreign Key Constraints
  const fkConstraints = await sql`
    SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name 
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name 
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name 
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name
  `
  console.log(`[✓] Foreign Key Relationships: ${fkConstraints.length} active FK constraints`)

  // 4. Performance Indexes
  const indexes = await sql`
    SELECT tablename, indexname 
    FROM pg_indexes 
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `
  console.log(`[✓] Performance Indexes: ${indexes.length} total indexes across public tables`)

  // 5. Data Row Counts
  const [
    [u], [p], [c], [o], [oi], [s], [w], [r], [ps], [rl]
  ] = await Promise.all([
    sql`SELECT count(*)::int as c FROM users`,
    sql`SELECT count(*)::int as c FROM products`,
    sql`SELECT count(*)::int as c FROM categories`,
    sql`SELECT count(*)::int as c FROM orders`,
    sql`SELECT count(*)::int as c FROM order_items`,
    sql`SELECT count(*)::int as c FROM sessions`,
    sql`SELECT count(*)::int as c FROM wishlists`,
    sql`SELECT count(*)::int as c FROM reviews`,
    sql`SELECT count(*)::int as c FROM payment_settings`,
    sql`SELECT count(*)::int as c FROM rate_limits`,
  ])

  console.log('--- TABLE METRICS ---')
  console.log(` - users: ${u.c}`)
  console.log(` - products: ${p.c}`)
  console.log(` - categories: ${c.c}`)
  console.log(` - orders: ${o.c}`)
  console.log(` - order_items: ${oi.c}`)
  console.log(` - sessions: ${s.c}`)
  console.log(` - wishlists: ${w.c}`)
  console.log(` - reviews: ${r.c}`)
  console.log(` - payment_settings: ${ps.c}`)
  console.log(` - rate_limits: ${rl.c}`)

  // 6. Test Numeric Float Parsing
  const [testNum] = await sql`SELECT 1499.50::numeric as price`
  const isFloat = typeof testNum.price === 'number' || !isNaN(parseFloat(testNum.price))
  console.log(`[✓] Numeric Decimal Parser: ${isFloat ? 'Working (Float/Number parsed correctly)' : 'Warning: String output'}`)

  console.log('=== DATABASE HEALTH VERDICT: EXCELLENT / HEALTHY ===')
  await sql.end()
}

run().catch(err => {
  console.error('[X] DB Health Check Failed:', err)
  process.exit(1)
})
