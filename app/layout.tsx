import { GlobalErrorHandler } from "@/components/global-error-handler";
import { Toaster } from "@/components/ui/sonner"
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <GlobalErrorHandler>{children}</GlobalErrorHandler>
        <Toaster />
      </body>
    </html>
  );
}
