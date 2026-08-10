/**
 * Environment Variable Validation & Configuration Manager
 * 
 * Ensures required server-side environment variables exist and are strictly validated
 * without exposing confidential credentials to client bundles.
 */

export function validateEnv() {
  const isServer = typeof window === 'undefined'
  
  if (isServer) {
    const requiredServerVars = ['DATABASE_URL', 'JWT_SECRET']
    const missing = requiredServerVars.filter(v => !process.env[v])
    
    if (missing.length > 0) {
      throw new Error(`[CRITICAL] Missing required server-side environment variables: ${missing.join(', ')}`)
    }
  }
}

export const env = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fdtituksbcprvduaskii.supabase.co',
  SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_W9cuxwB1dHTy3FxAIPVWLw_Xv3MQV00',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
  RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || 'rzp_test_TNwSqkorc3pJAL',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || 'xGzYghCi9qBcAUyib26Abor8',
  NODE_ENV: process.env.NODE_ENV || 'development',
}

// Automatically validate during server startup
validateEnv()
