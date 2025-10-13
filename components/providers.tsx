'use client'

import * as React from 'react'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/components/auth/auth-provider'
import { Toaster } from '@/components/ui/sonner'

interface SiteConfig {
  title: string
  description: string
}

const SiteConfigContext = React.createContext<SiteConfig>({ title: 'FireflyCloud', description: '云存储' })

export function useSiteConfig() {
  return React.useContext(SiteConfigContext)
}

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const [siteConfig, setSiteConfig] = React.useState<SiteConfig>({ title: 'FireflyCloud', description: '云存储' })

  React.useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
    fetch(`${API_URL}/site-config`).then(async (r) => {
      if (r.ok) {
        const data = await r.json()
        setSiteConfig({ title: data.title || 'FireflyCloud', description: data.description || '云存储' })
      }
    }).catch(() => {})
  }, [])

  return (
    <AuthProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <SiteConfigContext.Provider value={siteConfig}>
          {children}
        </SiteConfigContext.Provider>
        <Toaster />
      </ThemeProvider>
    </AuthProvider>
  )
}
