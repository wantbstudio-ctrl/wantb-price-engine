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
  { label: "Templates", sub: "템플릿", href: "/templates" },
  { label: "About", sub: "프로그램정보", href: "/about" },
];

const quickLinks = [
  {
    label: "홈택스 바로가기",
    href: "https://www.hometax.go.kr",
  },
  {
    label: "네이버 바로가기",
    href: "https://www.naver.com",
  },
  {
    label: "구글 바로가기",
    href: "https://www.google.com",
  },
  {
    label: "다음 바로가기",
    href: "https://www.daum.net",
  },
];

const defaultAds = [
  {
    id: 1,
    title: "광고 배너 영역",
    description: "관리자 이미지 · 시간 설정 연결 예정",
    imageUrl: "https://dummyimage.com/800x420/e5e7eb/111827&text=AD+01",
  },
  {
    id: 2,
    title: "원프앤 공지 슬롯",
    description: "이벤트 · 공지 · 업데이트 배너 배포 가능",
    imageUrl: "https://dummyimage.com/800x420/dbeafe/111827&text=AD+02",
  },
  {
    id: 3,
    title: "관리자 배너 영역",
    description: "향후 관리자 설정과 연결할 광고 영역",
    imageUrl: "https://dummyimage.com/800x420/f3e8ff/111827&text=AD+03",
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

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="no-drag h-screen w-[260px] overflow-y-auto border-r border-gray-200 bg-white px-5 py-6">
        <div className="mb-10">
          <h1 className="text-xl font-bold text-gray-900">원트비 프라이스 엔진</h1>
          <p className="mt-1 text-xs text-gray-400">WantB Price Engine</p>
        </div>

        <nav className="flex flex-col gap-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col rounded-xl px-4 py-3 transition ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span className="text-sm font-semibold">{item.label}</span>
                <span
                  className={`text-xs ${
                    isActive ? "text-gray-300" : "text-gray-400"
                  }`}
                >
                  {item.sub}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-5">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="relative h-[170px] w-full bg-gray-900">
              <img
                src={currentAd.imageUrl}
                alt={currentAd.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent" />

              <div className="relative z-10 flex h-full flex-col justify-between p-4 text-white">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.18em] text-white/80">
                    ADVERTISEMENT
                  </p>
                  <h3 className="mt-2 text-sm font-bold leading-snug">
                    {currentAd.title}
                  </h3>
                  <p className="mt-2 text-[11px] leading-relaxed text-white/85">
                    {currentAd.description}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {adItems.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCurrentAdIndex(index)}
                        className={`h-2 w-2 rounded-full transition ${
                          currentAdIndex === index
                            ? "bg-white"
                            : "bg-white/35 hover:bg-white/60"
                        }`}
                        aria-label={`광고 ${index + 1} 보기`}
                      />
                    ))}
                  </div>

                  <span className="text-[10px] font-medium text-white/80">
                    {currentAdIndex + 1} / {adItems.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2">
            {quickLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
