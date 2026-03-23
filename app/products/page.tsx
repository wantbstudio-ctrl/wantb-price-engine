"use client";

import { useEffect, useState } from "react";

type SavedProduct = {
  id: number;
  productName: string;
  channels?: string[];

  totalCost?: number;
  online?: { price?: number; profit?: number };
  offline?: { price?: number; profit?: number };
  distribution?: { price?: number; profit?: number };

  date?: string;
};

const STORAGE_KEY = "wantb-products";
const CURRENT_PRODUCT_KEY = "wantb-current-product";

function formatNumber(value?: number | string) {
  return Number(value || 0).toLocaleString("ko-KR");
}

function getChannelStyle(channel: string) {
  switch (channel) {
    case "online":
      return "bg-blue-100 text-blue-700";
    case "offline":
      return "bg-green-100 text-green-700";
    case "distribution":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getChannelLabel(channel: string) {
  switch (channel) {
    case "online":
      return "온라인";
    case "offline":
      return "오프라인";
    case "distribution":
      return "유통";
    default:
      return channel;
  }
}

export default function ProductsPage() {
  const [products, setProducts] = useState<SavedProduct[]>([]);

  const loadProducts = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];

      if (Array.isArray(parsed)) {
        setProducts(parsed.sort((a, b) => Number(b.id) - Number(a.id)));
      } else {
        setProducts([]);
      }
    } catch {
      setProducts([]);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleLoad = (product: SavedProduct) => {
    localStorage.setItem(CURRENT_PRODUCT_KEY, JSON.stringify(product));
    alert("Dashboard로 제품을 불러옵니다.");
    window.location.href = "/";
  };

  const handleDelete = (id: number) => {
    const ok = confirm("삭제하시겠습니까?");
    if (!ok) return;

    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const updated = parsed.filter((item: SavedProduct) => item.id !== id);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    loadProducts();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold mb-6">Products</h1>

        {products.length === 0 ? (
          <div className="bg-white p-8 rounded-xl shadow-sm text-gray-500">
            저장된 제품이 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((item) => (
              <div
                key={item.id}
                onClick={() => handleLoad(item)}
                className="cursor-pointer rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-lg hover:-translate-y-1"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">
                  {/* 왼쪽 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-lg font-bold text-gray-900">
                        {item.productName}
                      </h2>

                      {(item.channels || []).map((ch) => (
                        <span
                          key={ch}
                          className={`px-3 py-1 text-xs rounded-full font-semibold ${getChannelStyle(
                            ch
                          )}`}
                        >
                          {getChannelLabel(ch)}
                        </span>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                      <div>총원가: {formatNumber(item.totalCost)}원</div>
                      <div>온라인 판매가: {formatNumber(item.online?.price)}원</div>
                      <div>오프라인 판매가: {formatNumber(item.offline?.price)}원</div>
                      <div>유통 판매가: {formatNumber(item.distribution?.price)}원</div>

                      <div className="font-semibold text-gray-900">
                        온라인 수익: {formatNumber(item.online?.profit)}원
                      </div>
                      <div className="font-semibold text-gray-900">
                        오프라인 수익: {formatNumber(item.offline?.profit)}원
                      </div>
                      <div className="font-semibold text-gray-900">
                        유통 수익: {formatNumber(item.distribution?.profit)}원
                      </div>
                      <div>저장일: {item.date}</div>
                    </div>
                  </div>

                  {/* 버튼 */}
                  <div
                    className="flex gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleLoad(item)}
                      className="bg-black text-white px-4 py-2 rounded-xl text-sm"
                    >
                      불러오기
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="border px-4 py-2 rounded-xl text-sm text-red-500"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}