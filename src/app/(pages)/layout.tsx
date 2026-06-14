import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";
import Providers from "../../providers/providers";
import MenuNavbar from "@/src/components/navbar/menu.navbar";
import { Analytics } from "@vercel/analytics/next";

const prompt = Prompt({
  variable: "--font-prompt",
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "relic FreeSR",
  description: "Honkai: Star Rail Relic Configuration Tool",
  icons: {
    icon: "/1001.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${prompt.variable} h-full antialiased scroll-smooth`}
      suppressHydrationWarning
    >
      <body className="bg-[#09090b] min-h-screen" suppressHydrationWarning>
        {/* Subtle gradient overlay */}
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.08),transparent)]" />
        <Providers>
          <MenuNavbar />
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
