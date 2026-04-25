"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";

type AdItem = {
  id?: string;
  name?: string;
  slot?: string;
  imageUrl?: string;
  linkUrl?: string;
  isActive?: boolean | string;
  priority?: number | string;
  sortOrder?: number | string;
  targetPage?: string;
  displaySeconds?: number | string;
};

interface ElectronWindow extends Window {
  electronAPI?: any;
}

const menuItems = [
  { href: "/", title: "Selling Price Calculator", subtitle: "판매가 계산기" },
  { href: "/estimate", title: "Estimate", subtitle: "견적서" },
  { href: "/statement", title: "Statement", subtitle: "거래명세서" },
  { href: "/pricelist", title: "Price List", subtitle: "유통 단가표" },
  { href: "/product-library", title: "Product Library", subtitle: "제품 라이브러리" },
  { href: "/clients", title: "Clients", subtitle: "거래처관리" },
  { href: "/company-settings", title: "Company Settings", subtitle: "회사설정" },
  { href: "/ad-manager", title: "Ad Manager", subtitle: "광고관리" },
  { href: "/about", title: "About", subtitle: "프로그램 정보" },
];

const quickLinks = [
  {
    title: "홈택스",
    subtitle: "Hometax",
    href: "https://hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index.xml",
    image: "https://www.google.com/s2/favicons?domain=hometax.go.kr&sz=128",
  },
  {
    title: "네이버",
    subtitle: "Naver",
    href: "https://www.naver.com/",
    image: "https://www.google.com/s2/favicons?domain=naver.com&sz=128",
  },
  {
    title: "구글",
    subtitle: "Google",
    href: "https://www.google.com/",
    image: "https://www.google.com/s2/favicons?domain=google.com&sz=128",
  },
  {
    title: "다음",
    subtitle: "Daum",
    href: "https://daum.net",
    image: "https://www.google.com/s2/favicons?domain=daum.net&sz=128",
  },
];

function isActiveAd(value: unknown) {
  if (value === true) return true;

  if (typeof value === "string") {
    return value.toLowerCase() === "true" || value.toUpperCase() === "Y";
  }

  return false;
}

function SidebarAdCard({ pathname }: { pathname: string }) {
  const [ads, setAds] = useState<AdItem[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadAds() {
      try {
        const res = await fetch("/api/ad-manager?action=activeAds", {
          cache: "no-store",
        });

        const json = await res.json();

        const rawAds = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.ads)
          ? json.ads
          : [];

        const filtered = rawAds
          .filter((ad: AdItem) => {
            const active = isActiveAd(ad.isActive);
            const slotOk = !ad.slot || ad.slot === "sidebar-bottom";
            const target = String(ad.targetPage || "all");
            const targetOk =
              target === "all" ||
              target === pathname ||
              pathname.startsWith(target);

            return active && slotOk && targetOk;
          })
          .sort((a: AdItem, b: AdItem) => {
            const ap = Number(a.priority || 999);
            const bp = Number(b.priority || 999);
            const as = Number(a.sortOrder || 999);
            const bs = Number(b.sortOrder || 999);

            if (ap !== bp) return ap - bp;
            return as - bs;
          });

        if (mounted) {
          setAds(filtered);
          setIndex(0);
        }
      } catch {
        if (mounted) {
          setAds([]);
          setIndex(0);
        }
      }
    }

    loadAds();

    return () => {
      mounted = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (ads.length <= 1) return;

    const current = ads[index];
    const seconds = Math.max(Number(current?.displaySeconds || 8), 3);

    const timer = window.setTimeout(() => {
      setIndex((prev) => (prev + 1) % ads.length);
    }, seconds * 1000);

    return () => window.clearTimeout(timer);
  }, [ads, index]);

  const ad = ads[index];

  if (!ad || !ad.imageUrl) {
    return (
      <div className="mt-4 overflow-hidden rounded-[22px] border border-[#323c48] bg-[#202833] p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="rounded-full border border-[#38BDF8]/40 px-2 py-0.5 text-[10px] font-medium tracking-wide text-[#38BDF8]">
            AD
          </span>
          <span className="text-[10px] text-[#7f8a99]">sidebar-bottom</span>
        </div>

        <div className="flex aspect-[9/16] w-full items-center justify-center rounded-[18px] border border-dashed border-[#3d4754] bg-[#111821] text-center text-xs leading-5 text-[#7f8a99]">
          등록된 광고가 없습니다.
        </div>
      </div>
    );
  }

  const content = (
    <div className="mt-4 overflow-hidden rounded-[22px] border border-[#323c48] bg-[#202833] p-3 transition hover:border-[#38BDF8]/50">
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded-full border border-[#38BDF8]/40 px-2 py-0.5 text-[10px] font-medium tracking-wide text-[#38BDF8]">
          LIVE
        </span>

        <span className="truncate pl-2 text-[10px] text-[#7f8a99]">
          {ad.name || "광고"}
        </span>
      </div>

      <div className="aspect-[9/16] w-full overflow-hidden rounded-[18px] border border-[#323c48] bg-[#111821]">
        <img
          src={ad.imageUrl}
          alt={ad.name || "광고 이미지"}
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );

  if (ad.linkUrl) {
    return (
      <button
        type="button"
        onClick={() => {
          const url = String(ad.linkUrl || "");
          if (!url) return;
          window.open(url, "_blank", "noopener,noreferrer");
        }}
        className="block w-full text-left"
      >
        {content}
      </button>
    );
  }

  return content;
}

export default function LayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const activeTitle = useMemo(() => {
    const exact = menuItems.find((item) => item.href === pathname);
    if (exact) return exact.subtitle;

    const matched = menuItems.find(
      (item) => item.href !== "/" && pathname.startsWith(item.href)
    );

    return matched?.subtitle || "판매가 계산기";
  }, [pathname]);

  async function openExternalLink(url: string) {
    try {
      const api = (window as ElectronWindow).electronAPI;

      const isHometax = url.includes("hometax.go.kr");
      const isDaum = url.includes("daum.net");

      if ((isHometax || isDaum) && api?.openUrlWithChrome) {
        await api.openUrlWithChrome(url);
        return;
      }

      if (isHometax && api?.openHometaxDirect) {
        await api.openHometaxDirect();
        return;
      }

      if (api?.openExternalUrl) {
        await api.openExternalUrl(url);
        return;
      }

      if (api?.openExternalURL) {
        await api.openExternalURL(url);
        return;
      }

      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="min-h-screen bg-[#151b22] text-[#e5e7eb]">
      <div className="flex min-h-screen">
        <aside className="fixed left-0 top-0 z-30 flex h-screen w-[280px] flex-col border-r border-[#323c48] bg-[#1b222b] px-4 py-5">
          <div className="mb-5">
            <div className="rounded-[24px] border border-[#323c48] bg-[#202833] px-4 py-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#7f8a99]">
                WantB Studio
              </p>
              <h1 className="mt-2 text-[23px] font-light tracking-tight text-white">
                원트비 프라이스 엔진
              </h1>
              <p className="mt-1 text-xs text-[#9aa4b2]">
                Seller pricing & document system
              </p>
            </div>
          </div>

          <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {menuItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "group block rounded-[18px] border px-4 py-3 transition",
                    active
                      ? "border-[#38BDF8] bg-[#123244] shadow-[0_0_0_1px_rgba(56,189,248,0.18),0_0_18px_rgba(56,189,248,0.16)]"
                      : "border-[#323c48] bg-[#202833] hover:border-[#38BDF8]/50 hover:bg-[#25303b]",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className={[
                          "truncate text-[15px] tracking-tight",
                          active
                            ? "font-semibold text-white"
                            : "font-medium text-[#d7dde6]",
                        ].join(" ")}
                      >
                        {item.subtitle}
                      </p>

                      <p
                        className={[
                          "mt-0.5 truncate text-[11px]",
                          active ? "text-[#b9e9ff]" : "text-[#8c97a6]",
                        ].join(" ")}
                      >
                        {item.title}
                      </p>
                    </div>

                    {active && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[#38BDF8] shadow-[0_0_12px_rgba(56,189,248,0.8)]" />
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="shrink-0 pt-3">
            <SidebarAdCard pathname={pathname} />

            <div className="mt-4 rounded-[20px] border border-[#323c48] bg-[#202833] p-3">
              <div className="grid grid-cols-4 gap-2">
                {quickLinks.map((item) => (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => openExternalLink(item.href)}
                    className="flex h-[78px] flex-col items-center justify-center overflow-hidden rounded-[14px] border border-[#323c48] bg-[#111821] px-1 py-2 transition hover:border-[#38BDF8]/50 hover:bg-[#1a2632]"
                    title={item.title}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-6 w-6 object-contain"
                        draggable={false}
                      />
                    </div>
                    <span className="mt-1 text-[10px] font-medium text-white">
                      {item.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="ml-[280px] min-h-screen flex-1">
          <div className="sticky top-0 z-20 border-b border-[#323c48] bg-[#151b22]/92 px-8 py-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[#7f8a99]">
                  {activeTitle}
                </p>
                <p className="mt-1 text-xs text-[#9aa4b2]">
                  원프앤 작업 시스템
                </p>
              </div>

              <div className="rounded-full border border-[#38BDF8]/40 bg-[#0f2430] px-3 py-1 text-xs font-medium text-[#38BDF8]">
                DASHBOARD
              </div>
            </div>
          </div>

          <div className="px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}