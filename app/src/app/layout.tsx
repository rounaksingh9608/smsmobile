import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/app/components/Toast";
import { EmergencyListener } from "@/app/components/EmergencyListener";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: 'swap',
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: 'swap',
});

import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  themeColor: '#00236f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Society Management System",
  description: "A modern management system for residential societies",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SMS App",
  },
  formatDetection: {
    telephone: false,
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`light ${inter.variable} ${manrope.variable} antialiased`}
    >
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
      </head>
      <body className="font-body-md text-body-md text-on-surface bg-surface-subtle min-h-screen selection:bg-primary-container selection:text-on-primary-container">
        {children}
        <ToastProvider />
        <EmergencyListener />
      </body>
    </html>
  );
}
