import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kitted | Get outside, confidently",
  description: "Find dependable outdoor gear by activity.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link className="wordmark" href="/" aria-label="Kitted home">KITTED</Link>
          <span className="header-note">Gear for wherever you go</span>
        </header>
        {children}
        <footer><span className="wordmark">KITTED</span><p>Local gear discovery, built for the outdoors.</p></footer>
      </body>
    </html>
  );
}
