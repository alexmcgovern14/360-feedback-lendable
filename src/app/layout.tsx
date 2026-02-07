import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const camphor = localFont({
  variable: "--font-camphor",
  src: [
    { path: "../fonts/Camphor-Thin.ttf", weight: "200", style: "normal" },
    { path: "../fonts/Camphor-Light.ttf", weight: "300", style: "normal" },
    { path: "../fonts/Camphor-Heavy.ttf", weight: "700", style: "normal" },
    { path: "../fonts/Camphor-Italic.ttf", weight: "400", style: "italic" },
  ],
});

export const metadata: Metadata = {
  title: "Lendable 360 Feedback",
  description: "Prototype for structured 360 feedback collection and synthesis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${camphor.variable} antialiased`}>{children}</body>
    </html>
  );
}
