import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Inter, Red_Hat_Display } from "next/font/google";
import "material-symbols/outlined.css";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const redHat = Red_Hat_Display({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-redhat", display: "swap" });
const hanken = Hanken_Grotesk({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-hanken", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "TalentVault | Curated, anonymised talent", template: "%s | TalentVault" },
  description:
    "TalentVault is a recruitment company combining curated candidate representation, AI-assisted CV processing and anonymous candidate discovery for approved employers.",
  icons: { icon: "/brand/favicon.svg" },
};

export const viewport: Viewport = { themeColor: "#1a6840" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${inter.variable} ${redHat.variable} ${hanken.variable}`}>
      <body className="bg-surface font-body-md text-body-md text-on-surface antialiased">{children}</body>
    </html>
  );
}
