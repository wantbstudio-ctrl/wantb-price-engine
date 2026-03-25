"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

type LayoutClientProps = {
  children: ReactNode;
};

const menuItems = [
  { label: "Dashboard", sub: "대시보드", href: "/" },
  { label: "Products", sub: "제품관리", href: "/products" },
  { label: "Estimate", sub: "견적서", href: "/estimate" },

  // ✅ 추가됨 (핵심)
  { label: "Statement", sub: "거래명세표", href: "/statement" },

  { label: "Clients", sub: "거래처관리", href: "/clients" },
  { label: "Company Settings", sub: "회사설정", href: "/company-settings" },
  { label: "Templates", sub: "템플릿", href: "/templates" },
  { label: "About", sub: "프로그램정보", href: "/about" },
];

export default function LayoutClient({ children }: LayoutClientProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* 사이드바 */}
      <aside className="no-drag w-[260px] border-r border-gray-200 bg-white px-5 py-6">
        <div className="mb-10">
          <h1 className="text-xl font-bold text-gray-900">원프앤</h1>
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
      </aside>

      {/* 메인 영역 */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}