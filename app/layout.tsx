import type { Metadata } from "next";
import { Noto_Serif_KR } from "next/font/google";
import "./globals.css";

const notoSerif = Noto_Serif_KR({
  weight: ["400", "600", "700", "900"],
  subsets: ["latin"],
  variable: "--font-noto-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "ReRoom Tile — 시공 전에 우리 집에 타일을 먼저 깔아 보세요",
  description:
    "욕실·주방 사진에 바닥, 벽, 백스플래시, 샤워 공간 타일을 미리 적용해 보는 AI 타일 시뮬레이터. 크기와 줄눈 색까지 바꿔 보고 샘플 주문·상담까지.",
  openGraph: {
    title: "ReRoom Tile — AI 타일 인테리어 시뮬레이터",
    description:
      "내 욕실·주방 사진에 마음에 드는 타일을 미리 깔아 보세요.",
    siteName: "ReRoom Tile",
    locale: "ko_KR",
    type: "website",
  },
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`h-full antialiased ${notoSerif.variable}`}>
      <body className="min-h-full flex flex-col bg-paper text-ink font-sans">
        {children}
      </body>
    </html>
  );
}
