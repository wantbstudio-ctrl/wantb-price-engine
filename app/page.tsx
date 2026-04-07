"use client";

import PriceCalculator from "../components/PriceCalculator";

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Selling Price Calculator
        </h1>
        <p className="mt-2 text-sm text-gray-500">판매가 계산기</p>
      </div>

      <PriceCalculator />
    </div>
  );
}