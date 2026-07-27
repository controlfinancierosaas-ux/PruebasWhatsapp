import type { Metadata } from "next";
import "./globals.css";
import WebChatWidget from "@/components/WebChatWidget";

export const metadata: Metadata = {
  title: "WhatsApp Bot Dashboard",
  description: "Manage your WhatsApp bot with AI integration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <WebChatWidget />
      </body>
    </html>
  );
}
