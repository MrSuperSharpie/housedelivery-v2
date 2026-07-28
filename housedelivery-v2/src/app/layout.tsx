import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://housedelivery.ca"),
  title: {
    default: "House Delivery Inc. | Pre-Engineered Homes, Delivered",
    template: "%s | House Delivery Inc.",
  },
  description:
    "Pre-engineered component homes coordinated from permits and engineering through delivery and on-site assembly.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "House Delivery Inc. | Homebuilding, made certain.",
    description:
      "Explore 13 architectural home models and a coordinated path from feasibility to delivery.",
    siteName: "House Delivery Inc.",
    type: "website",
    locale: "en_CA",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
