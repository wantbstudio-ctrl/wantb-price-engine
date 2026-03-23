"use client";

import PriceCalculator from "../components/PriceCalculator";

export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p className="text-gray-500 mb-6">
        판매가 계산, 제품 저장, 견적 연결을 한 화면에서 관리합니다.
      </p>

      <PriceCalculator />
    </div>
  );
}