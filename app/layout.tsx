import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { Providers } from "@/components/providers"

export const metadata: Metadata = {
  title: "FireflyCloud - การจัดเก็บข้อมูลบนคลาวด์",
  description: "รองรับการจัดเก็บข้อมูลภายในเครื่องและโซลูชันการจัดเก็บข้อมูลบนคลาวด์ R2",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="th-TH" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className={GeistSans.className} suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
