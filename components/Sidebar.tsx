"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { name: "Dashboard", href: "/" },
  { name: "Products", href: "/products" },
  { name: "Estimate", href: "/estimate" },
  { name: "Company Settings", href: "/company-settings" },
  { name: "Templates", href: "/templates" },
  { name: "About", href: "/about" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-[240px] flex-col border-r border-gray-200 bg-white p-4">
      {/* 상단 로고 */}
      <div className="mb-8">
        <h1 className="text-lg font-bold text-gray-900">WantB Price Engine</h1>
        <p className="text-xs text-gray-500">판매가 계산 · 견적 생성 프로그램</p>
      </div>

      {/* 메뉴 */}
      <nav className="flex flex-col gap-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition
                ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* 하단 버튼 */}
      <div className="mt-auto">
        <button className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700">
          HomeTax / 홈택스 바로가기
        </button>
      </div>
    </div>
  );
}