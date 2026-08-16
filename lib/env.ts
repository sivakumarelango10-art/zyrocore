/**
 * Environment Variable Validation & Configuration Manager
 * 
 * Ensures required server-side environment variables exist and are strictly validated
 * without exposing confidential credentials to client bundles.
 */

const isServer = typeof window === 'undefined'

function cleanEnv(val: string | undefined): string {
  if (!val) return ''
  let s = val.trim()
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.substring(1, s.length - 1).trim()
  }
  return s
}

// Public client-safe environment variables
export const clientEnv = {
  get NEXT_PUBLIC_SUPABASE_URL() { return cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) },
  get NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY() { return cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) },
  get NEXT_PUBLIC_APP_URL() { return cleanEnv(process.env.NEXT_PUBLIC_APP_URL) },
  get NEXT_PUBLIC_RAZORPAY_KEY_ID() { return cleanEnv(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) },
  get NEXT_PUBLIC_GOOGLE_MAPS_API_KEY() { return cleanEnv(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) },
  get NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION() { return cleanEnv(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION) },
}

// Strictly server-side secret environment variables
function getServerSecret(key: string): string {
  if (!isServer) {
    throw new Error(`[SECURITY] Accessing server-only secret "${key}" on the browser client is forbidden.`)
  }
  return process.env[key] || ''
}

export const serverEnv = {
  get DATABASE_URL() { return getServerSecret('DATABASE_URL') },
  get DIRECT_URL() { return getServerSecret('DIRECT_URL') },
  get SUPABASE_SECRET_KEY() { return getServerSecret('SUPABASE_SECRET_KEY') || getServerSecret('SUPABASE_SERVICE_ROLE_KEY') },
  get JWT_SECRET() { return getServerSecret('JWT_SECRET') },
  get RAZORPAY_KEY_SECRET() { return getServerSecret('RAZORPAY_KEY_SECRET') },
  get GEMINI_API_KEY() { return getServerSecret('GEMINI_API_KEY') },
  get ADMIN_EMAIL() { return getServerSecret('ADMIN_EMAIL') },
}

export function validateEnv() {
  if (isServer) {
    const requiredServerVars = ['DATABASE_URL', 'JWT_SECRET']
    const missing = requiredServerVars.filter(v => !process.env[v])
    
    if (missing.length > 0) {
      console.warn(`[WARN] Missing server environment variables: ${missing.join(', ')}`)
    }
  }
}

export const env = {
  get SUPABASE_URL() {
    return clientEnv.NEXT_PUBLIC_SUPABASE_URL || (isServer ? process.env.SUPABASE_URL || '' : '')
  },
  get SUPABASE_KEY() {
    return clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || (isServer ? process.env.SUPABASE_PUBLISHABLE_KEY || '' : '')
  },
  get DATABASE_URL() { return serverEnv.DATABASE_URL },
  get JWT_SECRET() { return serverEnv.JWT_SECRET },
  get RAZORPAY_KEY_ID() {
    return clientEnv.NEXT_PUBLIC_RAZORPAY_KEY_ID || (isServer ? process.env.RAZORPAY_KEY_ID || '' : '')
  },
  get RAZORPAY_KEY_SECRET() { return serverEnv.RAZORPAY_KEY_SECRET },
  get GEMINI_API_KEY() { return serverEnv.GEMINI_API_KEY },
  NODE_ENV: process.env.NODE_ENV || 'development',
}

// Automatically validate during server startup
validateEnv()

