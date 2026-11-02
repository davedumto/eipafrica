import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { instrumentSerif, hankenGrotesk, jetbrainsMono } from "./fonts";
import Providers from "./providers";
import NavProgress from "./components/NavProgress";
import Toaster from "./components/Toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "EIP Africa",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${hankenGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        <Toaster />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
