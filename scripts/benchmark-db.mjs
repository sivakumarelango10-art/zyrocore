import postgres from 'postgres'
import fs from 'fs'
import path from 'path'

const envLocalPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8')
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const firstEquals = trimmed.indexOf('=')
    if (firstEquals === -1) return
    const key = trimmed.substring(0, firstEquals).trim()
    let val = trimmed.substring(firstEquals + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1)
    }
    if (!process.env[key]) {
      process.env[key] = val
    }
  })
}

const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || ''
const sql = postgres(dbUrl, { ssl: 'require', prepare: false })

async function runBenchmarks() {
  console.log('--- STARTING PERFORMANCE BENCHMARKS ---')

  // Warmup pass
  await sql`SELECT 1`

  // 1. Session check with no session ID (Guarded 0ms check)
  const startSessionNoCookie = performance.now()
  const token = null
  if (token) {
    await sql`SELECT u.id FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ${token}`
  }
  const sessionNoCookieTime = performance.now() - startSessionNoCookie
  console.log(`[Auth Check] Unauthenticated Session Check (Guarded 0 DB roundtrip): ${sessionNoCookieTime.toFixed(2)} ms`)

  // 2. Parallelized Products Listing + Count Query (Warm)
  const startProducts = performance.now()
  const [products, countResult] = await Promise.all([
    sql`
      SELECT p.id, p.name, p.price, p.discount_price, p.rating, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC
      LIMIT 12 OFFSET 0
    `,
    sql`SELECT COUNT(*)::int AS total FROM products`
  ])
  const productsTime = performance.now() - startProducts
  console.log(`[API / DB] Warm Products + Total Count Query (${products.length} products): ${productsTime.toFixed(2)} ms`)

  // 3. Parallelized Admin Stats Queries (Warm)
  const startStats = performance.now()
  const [[summary], recentOrders, ordersByStatus] = await Promise.all([
    sql`
      SELECT
        COALESCE((SELECT SUM(total) FROM orders WHERE status != 'cancelled'), 0) AS revenue,
        (SELECT COUNT(*) FROM orders) AS orders,
        (SELECT COUNT(*) FROM users WHERE role = 'user') AS users,
        (SELECT COUNT(*) FROM products) AS products,
        (SELECT COUNT(*) FROM products WHERE stock <= 10) AS low_stock
    `,
    sql`SELECT o.id, o.status, o.total, o.created_at FROM orders o ORDER BY o.created_at DESC LIMIT 5`,
    sql`SELECT status, COUNT(*) as count FROM orders GROUP BY status`
  ])
  const statsTime = performance.now() - startStats
  console.log(`[API / DB] Warm Admin Stats Queries: ${statsTime.toFixed(2)} ms`)

  // 4. Categories query (Warm)
  const startCategories = performance.now()
  const categories = await sql`SELECT * FROM categories ORDER BY name ASC`
  const categoriesTime = performance.now() - startCategories
  console.log(`[API / DB] Warm Categories Query: ${categoriesTime.toFixed(2)} ms`)

  await sql.end()
  console.log('--- BENCHMARKS COMPLETE ---')
}

runBenchmarks().catch(console.error)
