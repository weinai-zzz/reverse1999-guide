import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reverse: 1999 攻略指南",
  description: "角色介紹與配隊推薦",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
