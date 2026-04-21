"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

type LayoutClientProps = {
  children: ReactNode;
};

const menuItems = [
  { label: "Selling Price Calculator", sub: "판매가 계산기", href: "/" },
  { label: "Estimate", sub: "견적서", href: "/estimate" },
  { label: "Statement", sub: "거래명세표", href: "/statement" },
  { label: "Price List", sub: "유통 단가표", href: "/pricelist" },
  { label: "Clients", sub: "거래처관리", href: "/clients" },
  { label: "Company Settings", sub: "회사설정", href: "/company-settings" },
  { label: "About", sub: "프로그램정보", href: "/about" },
];

const quickLinks = [
  { label: "홈택스 바로가기", href: "https://www.hometax.go.kr/" },
  { label: "네이버 바로가기", href: "https://www.naver.com/" },
  { label: "구글 바로가기", href: "https://www.google.com/" },
  { label: "다음 바로가기", href: "https://www.daum.net/" },
];

const defaultAds = [
  {
    id: 1,
    title: "광고 배너 영역",
    description: "관리자 이미지 · 시간 설정 연결 예정",
    imageUrl: "https://dummyimage.com/800x420/1f2024/f5f7fb&text=AD+01",
  },
  {
    id: 2,
    title: "원트비 공지 슬롯",
    description: "향후 관리자 설정과 연결할 광고 영역",
    imageUrl: "https://dummyimage.com/800x420/23252a/f5f7fb&text=AD+02",
  },
  {
    id: 3,
    title: "관리자 배너 영역",
    description: "이벤트 · 공지 · 업데이트 배너 배포 가능",
    imageUrl: "https://dummyimage.com/800x420/1b1d22/f5f7fb&text=AD+03",
  },
];

export default function LayoutClient({ children }: LayoutClientProps) {
  const pathname = usePathname();
  const adItems = useMemo(() => defaultAds, []);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  useEffect(() => {
    if (adItems.length <= 1) return;

    const timer = window.setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % adItems.length);
    }, 3000);

    return () => window.clearInterval(timer);
  }, [adItems]);

  const currentAd = adItems[currentAdIndex];

  const handleQuickLinkClick = async (
    e: React.MouseEvent<HTMLButtonElement>,
    href: string,
    label: string
  ) => {
    e.preventDefault();

    try {
      const electronWindow = window as Window & {
        electronAPI?: {
          openExternalUrl?: (url: string) => Promise<{
            success: boolean;
            message?: string;
            url?: string;
          }>;
          openHometaxDirect?: () => Promise<{
            success: boolean;
            message?: string;
            url?: string;
          }>;
        };
      };

      if (
        label === "홈택스 바로가기" &&
        electronWindow.electronAPI?.openHometaxDirect
      ) {
        const result = await electronWindow.electronAPI.openHometaxDirect();

        if (!result?.success) {
          alert(`실패: ${result?.message || "홈택스 실행 실패"}`);
        }

        return;
      }

      if (
        electronWindow.electronAPI &&
        typeof electronWindow.electronAPI.openExternalUrl === "function"
      ) {
        const result = await electronWindow.electronAPI.openExternalUrl(href);

        if (!result?.success) {
          alert(`실패: ${result?.message || "외부 브라우저 실행 실패"}`);
        }

        return;
      }

      window.open(href, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("외부 링크 실행 실패:", error);
      alert("외부 브라우저 실행 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a0b] text-[#f5f7fb]">
      <aside className="no-drag h-screen w-[260px] overflow-y-auto border-r border-[#454850] bg-[#161618] px-5 py-6">
        <div className="mb-10">
          <h1 className="text-[18px] font-bold leading-tight tracking-[-0.02em] text-white whitespace-nowrap">
            원트비 프라이스 엔진
          </h1>
          <p className="mt-2 text-sm font-medium tracking-wide text-[#b3b0ab]">
            WantB Price Engine
          </p>
        </div>

        <nav className="flex flex-col gap-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex flex-col rounded-2xl border px-4 py-3.5 transition-all duration-200 ${
                  isActive
                    ? "border-[#0ea5ff] bg-[#23252a] text-white shadow-[0_0_0_1px_rgba(14,165,255,0.16),0_0_18px_rgba(14,165,255,0.08)]"
                    : "border-transparent text-[#d7d2cc] hover:border-[#454850] hover:bg-[#23252a] hover:text-white"
                }`}
              >
                <span
                  className={`absolute left-0 top-3 bottom-3 w-[4px] rounded-r-full transition-all ${
                    isActive
                      ? "bg-[#0ea5ff] shadow-[0_0_14px_rgba(14,165,255,0.8)]"
                      : "bg-transparent group-hover:bg-[#67e8f9]/70"
                  }`}
                />
                <span className="pl-3 text-sm font-semibold">{item.label}</span>
                <span
                  className={`pl-3 text-xs ${
                    isActive ? "text-[#67e8f9]" : "text-[#b3b0ab]"
                  }`}
                >
                  {item.sub}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-5 space-y-3">
          <div className="overflow-hidden rounded-3xl border border-[#454850] bg-[#23252a] shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
            <div className="relative h-[425px] w-full bg-[#18191c]">
              <img
                src={currentAd.imageUrl}
                alt={currentAd.title}
                className="absolute inset-0 h-full w-full object-cover opacity-70"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0d] via-[#0b0b0d]/45 to-transparent" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(14,165,255,0.22),transparent_38%)]" />

              <div className="relative z-10 flex h-full flex-col justify-between p-4 text-white">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.18em] text-[#0ea5ff]">
                    ADVERTISEMENT
                  </p>
                  <h3 className="mt-3 text-lg font-bold leading-snug text-white">
                    {currentAd.title}
                  </h3>
                  <p className="mt-2 text-[12px] leading-relaxed text-[#d7d2cc]">
                    {currentAd.description}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {adItems.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCurrentAdIndex(index)}
                        className={`h-3 w-3 rounded-full border transition ${
                          currentAdIndex === index
                            ? "border-[#0ea5ff] bg-[#0ea5ff] shadow-[0_0_12px_rgba(14,165,255,0.9)]"
                            : "border-[#6d6a65] bg-white/20 hover:border-[#67e8f9] hover:bg-[#67e8f9]/70"
                        }`}
                        aria-label={`광고 ${index + 1} 보기`}
                      />
                    ))}
                  </div>

                  <span className="text-xs font-medium text-[#f5f7fb]">
                    {currentAdIndex + 1} / {adItems.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#454850] bg-[#23252a] p-3 shadow-[0_10px_24px_rgba(0,0,0,0.24)]">
            <p className="mb-3 px-1 text-[11px] font-semibold tracking-[0.16em] text-[#b3b0ab]">
              QUICK LINKS
            </p>

            <div className="grid grid-cols-1 gap-2">
              {quickLinks.map((link) => (
                <button
                  key={link.label}
                  type="button"
                  onClick={(e) => handleQuickLinkClick(e, link.href, link.label)}
                  className="rounded-2xl border border-[#454850] bg-[#1b1d22] px-4 py-3 text-left text-sm font-semibold text-[#e2ddd7] transition-all duration-200 hover:border-[#0ea5ff] hover:bg-[#25282f] hover:text-white hover:shadow-[0_0_16px_rgba(14,165,255,0.10)]"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 bg-[#0a0a0b] p-6">{children}</main>
    </div>
  );
}