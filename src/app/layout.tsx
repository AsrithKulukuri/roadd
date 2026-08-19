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
  metadataBase: new URL("https://www.roadfacing.com"),
  title: {
    default: "Road Facing — Real Projects. Real People. Real Updates | Vijayawada, Guntur & Amaravati",
    template: "%s | Road Facing",
  },
  description:
    "Explore verified properties, luxury apartments, gated villas, and CRDA approved plots across Vijayawada, Guntur, Amaravati, Mangalagiri, and Tadepalli. Real on-ground video updates & developer transparency.",
  keywords: [
    "real estate Vijayawada",
    "properties in Guntur",
    "plots in Amaravati",
    "CRDA approved plots",
    "flats for sale in Benz Circle",
    "villas in Mangalagiri",
    "apartments in Tadepalli",
    "Poranki gated community",
    "Kanuru luxury apartments",
    "Gorantla Guntur flats",
    "buy property Andhra Pradesh",
    "RERA verified projects AP",
    "Road Facing real estate",
  ],
  authors: [{ name: "Road Facing", url: "https://www.roadfacing.com" }],
  creator: "Road Facing",
  publisher: "Road Facing",
  alternates: {
    canonical: "https://www.roadfacing.com",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://www.roadfacing.com",
    siteName: "Road Facing",
    title: "Road Facing — Real Projects. Real People. Real Updates",
    description:
      "Buy, sell, and rent verified properties across Vijayawada, Guntur, Amaravati & Andhra Pradesh with real video updates and AI search.",
    images: [
      {
        url: "/api/og?title=Find+Verified+Homes+in+Vijayawada,+Guntur+&+Amaravati&location=AP+Capital+Region&type=Real+Estate+Portal&badge=RERA+%26+CRDA+Verified",
        width: 1200,
        height: 630,
        alt: "Road Facing — Real Projects. Real People. Real Updates",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Road Facing — Real Projects. Real People. Real Updates",
    description:
      "Verified properties, luxury apartments & plots across Vijayawada, Guntur, and Amaravati.",
    images: [
      "/api/og?title=Find+Verified+Homes+in+Vijayawada,+Guntur+&+Amaravati&location=AP+Capital+Region&type=Real+Estate+Portal&badge=RERA+%26+CRDA+Verified",
    ],
    creator: "@roadfacing",
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
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

const jsonLdWebsite = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "RealEstateAgent",
      "@id": "https://www.roadfacing.com/#organization",
      name: "Road Facing",
      url: "https://www.roadfacing.com",
      logo: "https://www.roadfacing.com/favicon.ico",
      description:
        "India's premier real estate platform bringing real on-ground video updates for properties and projects across Vijayawada, Guntur, and Amaravati.",
      email: "care@roadfacing.com",
      telephone: "+91 98765 43210",
      areaServed: [
        { "@type": "City", name: "Vijayawada" },
        { "@type": "City", name: "Guntur" },
        { "@type": "City", name: "Amaravati" },
        { "@type": "City", name: "Mangalagiri" },
        { "@type": "City", name: "Tadepalli" },
      ],
      address: {
        "@type": "PostalAddress",
        addressLocality: "Vijayawada",
        addressRegion: "Andhra Pradesh",
        addressCountry: "IN",
      },
      sameAs: [
        "https://www.instagram.com/roadfacing",
        "https://twitter.com/roadfacing",
        "https://www.youtube.com/@roadfacing",
      ],
    },
    {
      "@type": "WebSite",
      "@id": "https://www.roadfacing.com/#website",
      url: "https://www.roadfacing.com",
      name: "Road Facing",
      publisher: {
        "@id": "https://www.roadfacing.com/#organization",
      },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://www.roadfacing.com/search?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebsite) }}
        />
      </head>
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
