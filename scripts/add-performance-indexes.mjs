import postgres from 'postgres'
import fs from 'fs'
import path from 'path'

const loadEnvFile = (filePath) => {
  if (fs.existsSync(filePath)) {
    const envContent = fs.readFileSync(filePath, 'utf8')
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
}
loadEnvFile(path.join(process.cwd(), '.env'))
loadEnvFile(path.join(process.cwd(), '.env.local'))

const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || ''
if (!dbUrl) {
  console.error('DATABASE_URL is missing')
  process.exit(1)
}

const sql = postgres(dbUrl, { ssl: 'require', prepare: false })

async function run() {
  console.log('[...] Adding performance indexes to PostgreSQL...')

  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);`
    await sql`CREATE INDEX IF NOT EXISTS idx_products_category_created ON products(category_id, created_at DESC);`
    await sql`CREATE INDEX IF NOT EXISTS idx_products_category_price ON products(category_id, price);`
    await sql`CREATE INDEX IF NOT EXISTS idx_products_category_rating ON products(category_id, rating DESC);`
    await sql`CREATE INDEX IF NOT EXISTS idx_products_show_home_created ON products(show_on_home, created_at DESC);`
    await sql`CREATE INDEX IF NOT EXISTS idx_products_featured_created ON products(is_featured, created_at DESC);`
    await sql`CREATE INDEX IF NOT EXISTS idx_products_bestseller_created ON products(is_best_seller, created_at DESC);`
    await sql`CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);`
    await sql`CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating DESC);`
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_id_expires ON sessions(id, expires_at);`
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);`
    await sql`CREATE INDEX IF NOT EXISTS idx_order_items_composite ON order_items(order_id, product_id);`
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));`

    console.log('[✓] Performance indexes successfully applied to PostgreSQL!')
  } catch (err) {
    console.error('[X] Index creation error:', err)
  } finally {
    await sql.end()
  }
}

run()

