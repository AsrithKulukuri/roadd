import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "sonner";
import { ClientLayoutWrapper } from "@/components/layout/client-layout-wrapper";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Inter({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://roadfacing.com"),
  title: {
    default: "RoadFacing — Real Projects. Real People. Real Updates.",
    template: "%s | RoadFacing",
  },
  description:
    "Real Projects. Real People. Real Updates. RoadFacing brings you closer to projects through real, on-ground videos and regular updates. We show projects as they are today — their progress, location, development, and current status.",
  keywords: [
    "real estate India",
    "buy property India",
    "rent apartment",
    "flat for sale",
    "villa for sale",
    "plot for sale",
    "RERA verified",
    "Hyderabad real estate",
    "Bengaluru apartments",
    "Mumbai flats",
  ],
  authors: [{ name: "ROAD FACING", url: "https://road.in" }],
  creator: "ROAD FACING — Real Owner Agent Developer",
  publisher: "ROAD FACING",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://road.in",
    title: "ROAD FACING — India's Premium Real Estate Platform",
    description:
      "Buy, sell, and rent properties across India with verified listings and AI-powered search.",
    siteName: "ROAD FACING",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ROAD FACING — Real Owner Agent Developer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ROAD FACING — India's Premium Real Estate Platform",
    description:
      "Buy, sell, and rent properties across India with verified listings and AI-powered search.",
    images: ["/og-image.png"],
    creator: "@road_in",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#16161A" },
    { media: "(prefers-color-scheme: light)", color: "#F7F6F3" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable}`}
    >
      <body suppressHydrationWarning className="min-h-screen bg-bg-primary font-body text-text-primary antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <div className="relative flex min-h-screen flex-col">
            <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
          </div>
          <Toaster
            position="bottom-right"
            toastOptions={{
              className:
                "!bg-bg-card !text-text-primary !border-border-default",
              duration: 4000,
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
