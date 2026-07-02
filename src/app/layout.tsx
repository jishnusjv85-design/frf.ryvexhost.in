import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { DataProvider } from "@/lib/data-context";
import { Shell } from "@/components/shell";

export const metadata: Metadata = {
  title: "FRF Developers — Construction ERP",
  description:
    "Premium construction project management platform: BOQ management, daily site updates, material tracking, financials, profit analytics.",
};

const themeScript = `
try {
  const t = localStorage.getItem('frf-theme');
  if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
} catch {}
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-[#fafafa] text-slate-900 antialiased dark:bg-[#0b1220] dark:text-slate-100">
        <DataProvider>
          <Shell>{children}</Shell>
        </DataProvider>
      </body>
    </html>
  );
}
