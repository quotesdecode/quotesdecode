import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "QuotesDecode – Interpret Quotes & Share Your Perspective",
  description:
    "QuotesDecode is a community where people decode and interpret meaningful quotes from philosophers, writers, poets, and modern thinkers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} min-h-screen bg-zinc-950 text-zinc-100`}
      >
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-6">
          {/* Navbar */}
          <header className="mb-6 flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-xs font-semibold tracking-tight">
                QD
              </div>
              <div>
                <h1 className="text-base font-semibold tracking-tight">
                  QuotesDecode
                </h1>
                <p className="text-[11px] text-zinc-400">
                  Decode quotes. Discover perspectives.
                </p>
              </div>
            </div>

            <nav className="flex items-center gap-3 text-xs text-zinc-300">
              <button className="rounded-full border border-zinc-700 px-3 py-1 hover:border-zinc-500 hover:bg-zinc-900">
                Explore
              </button>
              <button className="rounded-full bg-zinc-100 px-3 py-1 font-semibold text-zinc-900 hover:bg-white">
                Sign in
              </button>
            </nav>
          </header>

          {/* Page content */}
          <main className="flex-1">{children}</main>

          {/* Footer */}
          <footer className="mt-6 border-t border-zinc-800 pt-3 text-[11px] text-zinc-500">
            © {new Date().getFullYear()} QuotesDecode — A space to understand
            quotes through collective interpretation.
          </footer>
        </div>
      </body>
    </html>
  );
}
