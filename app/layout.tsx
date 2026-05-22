import type { Metadata, Viewport } from "next";
import { GlobalErrorHandler } from "@/components/global-error-handler";
import { Toaster } from "@/components/ui/sonner"
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoHub",
  applicationName: "AutoHub",
  appleWebApp: {
    capable: true,
    title: "AutoHub",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <GlobalErrorHandler>{children}</GlobalErrorHandler>
        <Toaster />
      </body>
    </html>
  );
}
