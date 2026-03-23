"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

type LayoutClientProps = {
  children: ReactNode;
};

const menuItems = [
  { labelKr: "대시보드", labelEn: "Dashboard", href: "/" },
  { labelKr: "제품관리", labelEn: "Products", href: "/products" },
  { labelKr: "견적서", labelEn: "Estimate", href: "/estimate" },
  { labelKr: "회사정보", labelEn: "Company Settings", href: "/company-settings" },
  { labelKr: "템플릿", labelEn: "Templates", href: "/templates" },
  { labelKr: "소개", labelEn: "About", href: "/about" },
];

export default function LayoutClient({ children }: LayoutClientProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* 사이드바 */}
      <aside className="no-drag w-[360px] border-r border-gray-200 bg-white px-7 py-8">
        <div className="mb-10">
          <h1 className="text-[24px] font-extrabold leading-tight text-gray-900">
            WantB Price
            <br />
            Engine
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-500">
            판매가 계산 · 견적 생성 프로그램
            <br />
            Price Calculator & Estimate Tool
          </p>
        </div>

        <nav className="space-y-3">
          {menuItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-2xl px-5 py-4 transition ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <div className="text-[15px] font-semibold leading-none">
                  {item.labelKr}
                </div>
                <div
                  className={`mt-2 text-xs ${
                    isActive ? "text-gray-200" : "text-gray-400"
                  }`}
                >
                  {item.labelEn}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-10">
          <a
            href="https://hometax.go.kr"
            target="_blank"
            rel="noreferrer"
            className="block rounded-2xl bg-blue-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            HomeTax / 홈택스 바로가기
          </a>
        </div>
      </aside>

      {/* 본문 */}
      <main className="flex-1 p-5">{children}</main>
    </div>
  );
}