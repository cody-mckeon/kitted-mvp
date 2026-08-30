import type { Metadata } from "next";
import { GlobalNavigation } from "@/components/global-navigation";
import { CartProvider } from "@/components/cart-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kitted | Get outside, confidently",
  description: "Find dependable outdoor gear by activity.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <GlobalNavigation />
          {children}
          <footer><span className="wordmark">KITTED</span><p>Local gear discovery, built for the outdoors.</p></footer>
        </CartProvider>
      </body>
    </html>
  );
}
