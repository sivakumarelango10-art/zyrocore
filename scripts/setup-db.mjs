import postgres from 'postgres'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'

// Programmatically parse .env and .env.local if they exist
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
  console.warn('[setup-db] No DATABASE_URL or DIRECT_URL provided. Skipping schema setup during build.')
  process.exit(0)
}

let sql
try {
  sql = postgres(dbUrl, { ssl: 'require', connect_timeout: 10 })
} catch (err) {
  console.warn('[setup-db] Could not initialize Postgres connection:', err)
  process.exit(0)
}

console.log('Creating database schema...')

try {
  // === SCHEMA ===
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      status VARCHAR(20) DEFAULT 'active',
      phone VARCHAR(50),
      address TEXT,
      city VARCHAR(100),
      state VARCHAR(100),
      zip VARCHAR(20),
      failed_login_attempts INTEGER DEFAULT 0,
      lockout_until TIMESTAMP,
      last_login_at TIMESTAMP,
      login_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100)`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR(100)`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS zip VARCHAR(20)`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`

  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      image_url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(500) NOT NULL,
      description TEXT,
      price DECIMAL(10, 2) NOT NULL,
      discount_price DECIMAL(10, 2),
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      images TEXT[] DEFAULT '{}',
      stock INTEGER NOT NULL DEFAULT 0,
      rating DECIMAL(3, 2) DEFAULT 0,
      rating_count INTEGER DEFAULT 0,
      sizes TEXT[] DEFAULT '{}',
      product_details JSONB DEFAULT '{}'::jsonb,
      size_stock JSONB DEFAULT '{}'::jsonb,
      is_featured BOOLEAN DEFAULT false,
      is_best_seller BOOLEAN DEFAULT false,
      show_on_home BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN DEFAULT false`

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(255) PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS cart_items (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL DEFAULT 1,
      size VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, product_id, size)
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      subtotal DECIMAL(10, 2) NOT NULL,
      shipping_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
      total DECIMAL(10, 2) NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'UPI',
      payment_status VARCHAR(50) DEFAULT 'pending',
      shipping_name VARCHAR(255),
      shipping_phone VARCHAR(50),
      shipping_address TEXT,
      shipping_address2 TEXT,
      shipping_landmark TEXT,
      shipping_city VARCHAR(255),
      shipping_district VARCHAR(255),
      shipping_state VARCHAR(255),
      shipping_pincode VARCHAR(50),
      shipping_zip VARCHAR(50),
      shipping_country VARCHAR(100) DEFAULT 'India',
      tracking_number VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'Razorpay'`
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending'`
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(255)`
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255)`
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_signature VARCHAR(500)`
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address2 TEXT`
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_landmark TEXT`
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_district VARCHAR(255)`
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_pincode VARCHAR(50)`
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_country VARCHAR(100) DEFAULT 'India'`
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_name VARCHAR(255)`
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url TEXT`

  await sql`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name VARCHAR(500) NOT NULL,
      product_image TEXT,
      price DECIMAL(10, 2) NOT NULL,
      quantity INTEGER NOT NULL,
      size VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS wishlists (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, product_id)
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(255) NOT NULL,
      details TEXT,
      ip_address VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      title VARCHAR(255),
      comment TEXT,
      images TEXT[] DEFAULT '{}',
      is_verified BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, product_id)
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS rate_limits (
      key VARCHAR(255) PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 1,
      reset_time TIMESTAMP NOT NULL
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS payment_settings (
      id SERIAL PRIMARY KEY,
      upi_id VARCHAR(255),
      qr_image_url TEXT,
      business_name VARCHAR(255),
      razorpay_key_id VARCHAR(255),
      razorpay_key_secret VARCHAR(255),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `
  await sql`ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS razorpay_key_id VARCHAR(255)`
  await sql`ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS razorpay_key_secret VARCHAR(255)`

  // Indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured)`
  await sql`CREATE INDEX IF NOT EXISTS idx_products_best_seller ON products(is_best_seller)`
  await sql`CREATE INDEX IF NOT EXISTS idx_products_show_on_home ON products(show_on_home)`
  await sql`CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_cart_user_product_size ON cart_items(user_id, product_id, size)`
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status)`
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON orders(tracking_number)`
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`
  await sql`CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id)`

  console.log('[✓] Schema applied')

  // === SEED CATEGORIES ===
  await sql`
    INSERT INTO categories (name, slug, image_url) VALUES
      ('Formals', 'formals', '/categories/formals.jpg'),
      ('Casuals', 'casuals', '/categories/casuals.jpg'),
      ('Party Wear', 'party-wear', '/categories/party-wear.jpg'),
      ('Premium Collection', 'premium', '/categories/premium.jpg')
    ON CONFLICT (slug) DO NOTHING
  `
  console.log('[✓] Categories seeded')

  // === CREATE ADMIN ===
  const email = process.env.ADMIN_EMAIL || 'bpzyrocore@gmail.com'
  const password = process.env.ADMIN_INITIAL_PASSWORD

  if (!password) {
    console.warn('[setup-db] Skipping initial admin user creation: ADMIN_INITIAL_PASSWORD is not set.')
  } else {
    const name = 'ZYRØCORE Admin'
    const hash = await bcrypt.hash(password, 12)

    await sql`
      INSERT INTO users (name, email, password_hash, role, status)
      VALUES (${name}, ${email}, ${hash}, 'admin', 'active')
      ON CONFLICT (email) DO NOTHING
    `
    console.log('[✓] Admin user checked/created:', email)
  }

  console.log('[✓] Database schema setup complete.')
} catch (err) {
  console.warn('[setup-db] Database setup encountered an error (will not block build):', err)
} finally {
  if (sql) {
    await sql.end().catch(() => {})
  }
}
