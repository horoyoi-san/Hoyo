import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "../components/header";
import { ClientThemeWrapper, ThemeProvider } from "@/components/themeController";
import Footer from "@/components/footer";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ToastContainer } from 'react-toastify';
import QueryProviderWrapper from "@/components/queryProvider";
import ClientDataFetcher from "@/components/clientDataFetcher";
import AvatarBar from "@/components/avatarBar";
import ActionBar from "@/components/actionBar";
import PageNavigation from "@/components/pageNavigation";
import CharacterCatalogDrawer from "@/components/characterCatalogDrawer";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kafka SrTools",
  description: "Kafka SrTools for Honkai: Star Rail",
  icons: {
    icon: "/kafka-srtools-avatar.png",
    apple: "/kafka-srtools-avatar.png",
  },
  openGraph: {
    title: "Kafka SrTools",
    description: "Kafka SrTools for Honkai: Star Rail",
    url: "https://srtools.punklorde.org",
    siteName: "Kafka SrTools",
    images: [
      {
        url: "https://srtools.punklorde.org/kafka-srtools-avatar.png",
        width: 128,
        height: 128,
        alt: "Kafka SrTools logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kafka SrTools",
    description: "Kafka SrTools for Honkai: Star Rail",
    images: ["https://srtools.punklorde.org/kafka-srtools-avatar.png"],
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
    <html lang={locale} suppressHydrationWarning className="h-full w-full overflow-hidden overscroll-none fixed inset-0">
      <head>
        <link rel="preconnect" href="https://cdn.punklorde.org" />
        {/* Start the two first-screen requests with the HTML instead of after the JS has run. */}
        <link rel="preload" href="/api/data/metadata_core" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/api/data/avatar_index" as="fetch" crossOrigin="anonymous" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full w-full overflow-hidden overscroll-none fixed inset-0 max-w-full`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider messages={messages} locale={locale}>
          <QueryProviderWrapper>
            <ThemeProvider>
              <ClientThemeWrapper>
                <ClientDataFetcher >
                  <div className="h-dvh w-full flex flex-col overflow-hidden bg-ambient-mesh selection:bg-primary/20 selection:text-primary">
                    <Header />
                    <main className="flex w-full flex-1 min-h-0 overflow-hidden">
                      <aside className="hidden sm:flex sm:w-56 md:w-[264px] xl:w-[312px] h-full shrink-0 overflow-hidden bg-transparent">
                        <PageNavigation />
                      </aside>
                      <section className="flex h-full flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
                        <div className="detail-avatar-strip shrink-0 bg-transparent">
                          <AvatarBar layout="strip" />
                        </div>
                        <ActionBar />
                        <div data-page-scroll className="flex-1 overflow-y-auto min-h-0 px-3 sm:px-4 lg:px-6 xl:px-10 pt-1 pb-3 flex flex-col justify-between">
                          <div>
                            {children}
                          </div>
                          <Footer />
                        </div>
                      </section>
                    </main>
                  </div>
                  <CharacterCatalogDrawer />
                </ClientDataFetcher>
              </ClientThemeWrapper>
            </ThemeProvider>
          </QueryProviderWrapper>
        </NextIntlClientProvider>
        <ToastContainer
          position="top-right"
          autoClose={2500}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
          style={{ zIndex: 99999999 }}
        />

      </body>

    </html>
  );
}
