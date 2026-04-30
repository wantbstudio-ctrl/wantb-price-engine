import "./globals.css";
import LayoutClient from "./layoutclient";

export const metadata = {
  title: "WantB Price Engine",
  description: "판매가 계산 및 견적 생성 프로그램",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  );
}