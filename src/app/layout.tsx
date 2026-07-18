import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import { ThemeSync } from "@/components/theme-sync";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const clashDisplay = localFont({
  variable: "--font-clash-display",
  src: [
    { path: "./fonts/ClashDisplay-Regular.woff2", weight: "400 600", style: "normal" },
    { path: "./fonts/ClashDisplay-Bold.woff2", weight: "700", style: "normal" },
  ],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Mikko Visuel — Direction artistique, motion design & photo",
  description:
    "Portfolio de Mikko Visuel : flyers club, motion design, direction artistique, photo et aftermovies pour clubs et marques.",
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    title: "Mikko Visuel",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#dded2e",
};

const themeInitScript = `
(function () {
  try {
    var cookieMatch = document.cookie.match(/(?:^|; )theme=(light|dark)/);
    var stored = cookieMatch ? cookieMatch[1] : localStorage.getItem("theme");
    var theme = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    if (theme === "dark") document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${clashDisplay.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-surface text-ink">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <ThemeSync />
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
