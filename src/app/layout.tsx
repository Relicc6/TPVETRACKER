import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'TPVE Tracker – Tarkov PVE',
  description: 'Track your Tarkov PVE tasks, hideout upgrades, and flea market prices.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-tarkov-bg text-tarkov-text antialiased">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  )
}
