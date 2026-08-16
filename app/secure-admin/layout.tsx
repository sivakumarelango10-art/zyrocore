import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AdminAuthProvider } from './admin-auth-provider'
import { getAdminSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ZYRØCORE — Admin Panel',
  description: 'Internal admin panel for Zyrocore',
  robots: 'noindex, nofollow',
}

export default async function SecureAdminRootLayout({ children }: { children: React.ReactNode }) {
  const user = await getAdminSession()
  if (!user) {
    redirect('/login?from=/secure-admin')
  }

  return (
    <AdminAuthProvider>
      {children}
    </AdminAuthProvider>
  )
}
