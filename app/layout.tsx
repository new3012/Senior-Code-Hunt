import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ภารกิจตามหาพี่รหัส",
  description: "ปลดล็อกคำใบ้รายวัน และตามหาตัวตนของพี่รหัสให้พบ",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
