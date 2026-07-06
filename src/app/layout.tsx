import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "App Builder Studio",
  description: "Build powerful apps from simple ideas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}