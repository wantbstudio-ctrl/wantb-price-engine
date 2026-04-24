"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

type LayoutClientProps = {
  children: ReactNode;
};

type AdItem = {
  id: string;
  name: string;
  slot: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
  priority: number;
  sortOrder: number;
  startDate: string;
  endDate: string;
  daysOfWeek: string;
  startTime: string;
  endTime: string;
  displaySeconds: number;
  targetPage: string;
  notes: string;
  updatedAt: string;
};

type AdApiResponse = {
  success?: boolean;
  action?: string;
  data?: AdItem[];
  message?: string;
};

const menuItems = [
  { href: "/", title: "Selling Price Calculator", subtitle: "판매가 계산기" },
  { href: "/estimate", title: "Estimate", subtitle: "견적서" },
  { href: "/statement", title: "Statement", subtitle: "거래명세표" },
  { href: "/pricelist", title: "Price List", subtitle: "유통 단가표" },
  {
    href: "/product-library",
    title: "Product Library",
    subtitle: "제품 라이브러리",
  },
  { href: "/clients", title: "Clients", subtitle: "거래처관리" },
  {
    href: "/company-settings",
    title: "Company Settings",
    subtitle: "회사설정",
  },
  { href: "/about", title: "About", subtitle: "프로그램정보" },
  { href: "/ad-manager", title: "Ad Manager", subtitle: "광고관리" },
];

const quickLinks = [
  {
    title: "홈택스",
    href: "https://hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index.xml",
    image: "/quick-links/hometax.jpg",
    imageClass: "h-8 w-auto object-contain",
  },
  {
    title: "네이버",
    href: "https://www.naver.com/",
    image: "/quick-links/naver.jpg",
    imageClass: "h-7 w-auto object-contain",
  },
  {
    title: "구글",
    href: "https://www.google.com/",
    image: "/quick-links/google.jpg",
    imageClass: "h-7 w-auto object-contain",
  },
  {
    title: "다음",
    href: "https://daum.net",
    image: "/quick-links/daum.jpg",
    imageClass: "h-7 w-auto object-contain",
  },
];

function getTargetPageFromPath(pathname: string): string {
  if (pathname === "/") return "dashboard";
  if (pathname.startsWith("/estimate")) return "estimate";
  if (pathname.startsWith("/statement")) return "statement";
  if (pathname.startsWith("/pricelist")) return "pricelist";
  if (pathname.startsWith("/product-library")) return "product-library";
  if (pathname.startsWith("/clients")) return "clients";
  if (pathname.startsWith("/company-settings")) return "company-settings";
  if (pathname.startsWith("/about")) return "about";
  if (pathname.startsWith("/ad-manager")) return "ad-manager";
  return "all";
}

function normalizeAdItem(raw: Partial<AdItem>): AdItem {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    slot: String(raw.slot ?? ""),
    imageUrl: String(raw.imageUrl ?? ""),
    linkUrl: String(raw.linkUrl ?? ""),
    isActive: Boolean(raw.isActive),
    priority: Number(raw.priority ?? 1),
    sortOrder: Number(raw.sortOrder ?? 1),
    startDate: String(raw.startDate ?? ""),
    endDate: String(raw.endDate ?? ""),
    daysOfWeek: String(raw.daysOfWeek ?? ""),
    startTime: String(raw.startTime ?? ""),
    endTime: String(raw.endTime ?? ""),
    displaySeconds: Number(raw.displaySeconds ?? 8),
    targetPage: String(raw.targetPage ?? "all"),
    notes: String(raw.notes ?? ""),
    updatedAt: String(raw.updatedAt ?? ""),
  };
}

function openExternalLink(url: string) {
  if (!url) return;

  if (typeof window !== "undefined") {
    const electronAPI = (window as any).electronAPI;
    const lowerUrl = url.toLowerCase();

    const shouldUseChrome =
      lowerUrl.includes("hometax.go.kr") || lowerUrl.includes("daum.net");

    if (
      shouldUseChrome &&
      electronAPI &&
      typeof electronAPI.openUrlWithChrome === "function"
    ) {
      electronAPI.openUrlWithChrome(url);
      return;
    }

    if (
      lowerUrl.includes("hometax.go.kr") &&
      electronAPI &&
      typeof electronAPI.openHometaxDirect === "function"
    ) {
      electronAPI.openHometaxDirect();
      return;
    }

    if (electronAPI && typeof electronAPI.openExternalUrl === "function") {
      electronAPI.openExternalUrl(url);
      return;
    }

    if (electronAPI && typeof electronAPI.openExternalURL === "function") {
      electronAPI.openExternalURL(url);
      return;
    }
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

function SidebarAdCard({
  ad,
  currentIndex,
  totalCount,
  onPrev,
  onNext,
}: {
  ad: AdItem | null;
  currentIndex: number;
  totalCount: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const hasAd = ad !== null;

  return (
    <div className="rounded-[20px] border border-[#38BDF8]/25 bg-[#121a24] p-3 shadow-[0_0_0_1px_rgba(56,189,248,0.08),0_0_18px_rgba(56,189,248,0.08)]">
      <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#38BDF8]">
        Advertisement
      </div>

      <div className="mb-3">
        <div className="text-[18px] font-semibold leading-tight text-white">
          원트비 광고 슬롯
        </div>
        <div className="mt-1 text-[11px] leading-4 text-slate-400">
          관리자 설정 광고 영역
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[18px] border border-[#38BDF8]/15 bg-[#060c13]">
        {hasAd && ad ? (
          <button
            type="button"
            onClick={() => openExternalLink(ad.linkUrl)}
            className="block w-full text-left"
            title={ad.name}
          >
            <div className="relative aspect-[9/16] w-full overflow-hidden bg-[#070d14]">
              {ad.imageUrl ? (
                <img
                  src={ad.imageUrl}
                  alt={ad.name || "광고 이미지"}
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                  이미지 없음
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

              <div className="absolute left-2 top-2 rounded-full border border-[#38BDF8]/40 bg-[#38BDF8]/15 px-2 py-0.5 text-[9px] font-semibold text-[#BAE6FD]">
                LIVE AD
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="line-clamp-2 text-[13px] font-medium leading-5 text-white">
                  {ad.name || "광고명 없음"}
                </div>
                <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-300">
                  {ad.notes.trim() || "클릭 시 연결된 링크로 이동합니다."}
                </div>
              </div>
            </div>
          </button>
        ) : (
          <div className="flex aspect-[9/16] flex-col justify-between p-3">
            <div className="rounded-[14px] border border-dashed border-[#38BDF8]/15 bg-white/[0.03] p-3">
              <div className="text-[13px] font-medium text-white">
                광고 배너 영역
              </div>
              <div className="mt-1 text-[11px] leading-4 text-slate-400">
                이미지 · 링크 · 시간 설정
              </div>
            </div>

            <div className="relative mt-3 flex-1 overflow-hidden rounded-[14px] border border-[#38BDF8]/10 bg-gradient-to-br from-[#38BDF8]/8 to-transparent">
              <div className="absolute -left-10 top-1/2 h-[105px] w-[105px] -translate-y-1/2 rounded-full border-[8px] border-white/18" />
              <div className="absolute -right-10 top-1/2 h-[105px] w-[105px] -translate-y-1/2 rounded-full border-[8px] border-white/18" />
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: Math.max(totalCount, 3) }).map((_, index) => {
            const active = hasAd ? index === currentIndex : index === 0;

            return (
              <span
                key={index}
                className={`h-2 w-2 rounded-full transition-all ${
                  active
                    ? "bg-[#38BDF8] shadow-[0_0_10px_rgba(56,189,248,0.8)]"
                    : "bg-slate-600"
                }`}
              />
            );
          })}
        </div>

        {totalCount > 1 ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onPrev}
              className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-slate-300 transition hover:border-[#38BDF8]/50 hover:text-white"
            >
              이전
            </button>
            <button
              type="button"
              onClick={onNext}
              className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-slate-300 transition hover:border-[#38BDF8]/50 hover:text-white"
            >
              다음
            </button>
          </div>
        ) : (
          <div className="text-[11px] text-slate-500">
            {hasAd ? "1 / 1" : "광고 대기 중"}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LayoutClient({ children }: LayoutClientProps) {
  const pathname = usePathname();
  const [ads, setAds] = useState<AdItem[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState<number>(0);
  const [isLoadingAds, setIsLoadingAds] = useState<boolean>(true);

  const targetPage = useMemo(() => getTargetPageFromPath(pathname), [pathname]);

  useEffect(() => {
    let cancelled = false;

    async function fetchAds() {
      try {
        setIsLoadingAds(true);

        const params = new URLSearchParams({
          action: "activeAds",
          slot: "sidebar-bottom",
          targetPage,
        });

        const response = await fetch(`/api/ad-manager?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });

        const result = (await response.json()) as AdApiResponse;

        if (cancelled) return;

        if (result.success && Array.isArray(result.data)) {
          const normalizedAds = result.data.map((item) => normalizeAdItem(item));
          setAds(normalizedAds);
          setCurrentAdIndex(0);
        } else {
          setAds([]);
          setCurrentAdIndex(0);
        }
      } catch (error) {
        console.error("Failed to fetch sidebar ads:", error);
        if (!cancelled) {
          setAds([]);
          setCurrentAdIndex(0);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAds(false);
        }
      }
    }

    fetchAds();

    return () => {
      cancelled = true;
    };
  }, [targetPage]);

  useEffect(() => {
    if (ads.length <= 1) return;

    const activeAd = ads[currentAdIndex];
    const seconds =
      activeAd && activeAd.displaySeconds > 0 ? activeAd.displaySeconds : 8;

    const timer = window.setTimeout(() => {
      setCurrentAdIndex((prev) => (prev + 1) % ads.length);
    }, seconds * 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [ads, currentAdIndex]);

  const currentAd: AdItem | null =
    ads.length > 0 && ads[currentAdIndex] ? ads[currentAdIndex] : null;

  function movePrevAd() {
    if (ads.length <= 1) return;
    setCurrentAdIndex((prev) => (prev - 1 + ads.length) % ads.length);
  }

  function moveNextAd() {
    if (ads.length <= 1) return;
    setCurrentAdIndex((prev) => (prev + 1) % ads.length);
  }

  return (
    <div className="min-h-screen bg-[#05070b] text-white">
      <div className="flex min-h-screen">
        <aside className="flex w-[300px] shrink-0 flex-col border-r border-white/10 bg-gradient-to-b from-[#0b1017] via-[#080c12] to-[#05070b] px-4 py-5">
          <div className="mb-5">
            <div className="text-[26px] font-semibold leading-tight tracking-[-0.04em] text-white">
              원트비 프라이스 엔진
            </div>
            <div className="mt-1.5 text-xs text-slate-400">
              WantB Price Engine
            </div>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-[18px] border px-4 py-3 transition ${
                    isActive
                      ? "border-[#38BDF8]/80 bg-gradient-to-r from-[#38BDF8]/40 via-[#38BDF8]/28 to-[#17384a] shadow-[0_0_24px_rgba(56,189,248,0.24)]"
                      : "border-[#323c48] bg-[#202833] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#38BDF8]/35 hover:bg-[#263241]"
                  }`}
                >
                  <div
                    className={`text-[15px] leading-none ${
                      isActive
                        ? "font-semibold text-white"
                        : "font-medium text-slate-100"
                    }`}
                  >
                    {item.title}
                  </div>
                  <div
                    className={`mt-1.5 text-[12px] leading-none ${
                      isActive ? "text-[#E0F2FE]" : "text-slate-400"
                    }`}
                  >
                    {item.subtitle}
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="mt-5">
            <SidebarAdCard
              ad={isLoadingAds ? null : currentAd}
              currentIndex={currentAdIndex}
              totalCount={ads.length}
              onPrev={movePrevAd}
              onNext={moveNextAd}
            />
          </div>

          <div className="mt-4 rounded-[20px] border border-[#323c48] bg-[#202833] p-3">
            <div className="grid grid-cols-4 gap-2">
              {quickLinks.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => openExternalLink(item.href)}
                  className="flex h-[64px] items-center justify-center rounded-[14px] border border-[#323c48] bg-[#111821] px-1.5 transition hover:border-[#38BDF8]/50 hover:bg-[#1a2632]"
                  title={item.title}
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className={item.imageClass}
                  />
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-x-auto bg-[#05070b]">
          <div className="min-h-screen p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}