import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "../components/header";
import { ClientThemeWrapper, ThemeProvider } from "@/components/themeController";
import Footer from "@/components/footer";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ToastContainer } from 'react-toastify';
import AvatarBar from "@/components/avatarBar";
import ActionBar from "@/components/actionBar";
import QueryProviderWrapper from "@/components/queryProvider";
import ClientDataFetcher from "@/components/clientDataFetcher";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SR Tools TH",
  description: "เครื่องมือ SR Tools สำหรับผู้เล่นภาษาไทย",
  icons: {
    icon: "/sr-tool.png",
    shortcut: "/ff-srtool.ico",
    apple: "/sr-tool.png",
  },
  openGraph: {
    title: "SR Tools TH",
    description: "เครื่องมือ SR Tools สำหรับผู้เล่นภาษาไทย",
    url: "https://srtools.th",
    siteName: "SR Tools TH",
    images: [
      {
        url: "https://srtools.th/sr-tool.png",
        width: 630,
        height: 630,
        alt: "SR Tools TH Logo",
      },
    ],
    locale: "th_TH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SR Tools TH",
    description: "เครื่องมือ SR Tools สำหรับผู้เล่นภาษาไทย",
    images: ["https://srtools.th/sr-tool.png"],
  },
};


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();
  const locale = await getLocale()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider messages={messages}>
          <QueryProviderWrapper>
            <ThemeProvider>
              <ClientThemeWrapper>
              <ClientDataFetcher /> 
                <div className="min-h-screen w-full">
                  <Header />
                  <div className="grid grid-cols-12 w-full">
                    <div className="col-span-3 sticky top-0 self-start h-fit">
                      <AvatarBar />
                    </div>
                    <div className="col-span-9">
                      <ActionBar />
                      {children}

                    </div>
                  </div>
                  <Footer />
                </div>

              </ClientThemeWrapper>
            </ThemeProvider>
          </QueryProviderWrapper>
        </NextIntlClientProvider>
        <ToastContainer />
      </body>
    </html>
  );
}
