import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "STUDIO TWOTONE — 시공 전에 우리 집에 타일을 먼저 깔아 보세요",
  description:
    "욕실·주방 사진에 바닥, 벽, 백스플래시, 샤워 공간 타일을 미리 적용해 보는 AI 타일·엔지니어드 스톤 시뮬레이터. 크기와 줄눈 색까지 바꿔 보고 샘플 주문·상담까지.",
  openGraph: {
    title: "STUDIO TWOTONE — AI 타일·스톤 인테리어 시뮬레이터",
    description:
      "내 욕실·주방 사진에 마음에 드는 타일을 미리 깔아 보세요.",
    siteName: "STUDIO TWOTONE",
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
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-paper text-ink font-sans">
        {children}
      </body>
    </html>
  );
}
