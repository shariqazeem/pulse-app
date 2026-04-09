import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { StarkZapProvider } from "@/providers/StarkZapProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Pulse — Live Tipping for Starknet",
  description:
    "Real-time tipping for streamers, podcasters, and live events. Built on Starknet with Starkzap v2.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Pulse — Live Tipping for Starknet",
    description:
      "Real-time tipping for streamers, podcasters, and live events. Gasless. Social login. Built with Starkzap v2.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        <StarkZapProvider>{children}</StarkZapProvider>
      </body>
    </html>
  );
}
