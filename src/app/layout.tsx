import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The External Lobe",
  description: "ADHD Executive Function Support — Zero-Friction Productivity",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-zinc-950 text-white font-sans">
        {children}
      </body>
    </html>
  );
}
