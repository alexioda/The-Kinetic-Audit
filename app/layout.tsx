import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const cormorant = Cormorant_Garamond({ 
  subsets: ["latin"], 
  weight: ["400", "600"], 
  style: ["normal", "italic"],
  variable: '--font-cormorant'
});

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: "Kinetic Blueprint Diagnostic | LiveAdaptiv Ecosystem",
  description: "Identify your default response under pressure and map your recovery.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${cormorant.variable} ${inter.variable} font-sans antialiased bg-kinetic min-h-screen flex flex-col selection:bg-gold-500 selection:text-stone-950`}>
        <main className="flex-grow flex items-center justify-center p-6 w-full max-w-2xl mx-auto">
          {children}
        </main>
        <footer className="text-center p-6 border-t border-stone-900 mt-auto">
          <p className="text-stone-600 text-[10px]">
            &copy; {new Date().getFullYear()} LiveAdaptiv. Educational purposes only. Not medical advice. 
            <a href="#" className="underline hover:text-stone-400 ml-2">Privacy Policy</a> |
            <a href="#" className="underline hover:text-stone-400 ml-2">Methodology</a>
          </p>
        </footer>
        {/* Vercel Analytics automatically tracks page views here */}
        <Analytics />
      </body>
    </html>
  );
}
