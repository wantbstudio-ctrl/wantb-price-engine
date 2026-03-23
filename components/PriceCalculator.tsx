"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ChannelKey = "online" | "offline" | "distribution";
type MiddleFeeType = "percent" | "fixed";

type ChannelResult = {
  price: number;
  platformFee: number;
  middleFee: number;
  profit: number;
  marginRate: number;
};

type SavedProduct = {
  id: number;
  productName: string;
  channels: ChannelKey[];
  baseCost: number;
  defectCost: number;
  totalCost: number;
  platformFee: number;
  marginRate: number;
  offlineDiscount: number;
  distributionDiscount: number;
  middleFeeType: MiddleFeeType;
  middleFeeValue: number;
  online: ChannelResult;
  offline: ChannelResult;
  distribution: ChannelResult;
  date: string;
};

const STORAGE_KEY = "wantb-products";
const CURRENT_PRODUCT_KEY = "wantb-current-product";

function numberFormat(value: number) {
  return Number(value || 0).toLocaleString("ko-KR");
}

function safePercent(value: number) {
  return Number.isFinite(value) ? value : 0;
}

export default function PriceCalculator() {
  const router = useRouter();

  const [productName, setProductName] = useState("");
  const [manufacturingCost, setManufacturingCost] = useState(0);
  const [packageCost, setPackageCost] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [adCost, setAdCost] = useState(0);
  const [storageCost, setStorageCost] = useState(0);
  const [returnCost, setReturnCost] = useState(0);
  const [defectRate, setDefectRate] = useState(0);

  const [platformFee, setPlatformFee] = useState(0);
  const [marginRate, setMarginRate] = useState(0);

  const [offlineDiscount, setOfflineDiscount] = useState(0);
  const [distributionDiscount, setDistributionDiscount] = useState(0);

  const [middleFeeType, setMiddleFeeType] = useState<MiddleFeeType>("percent");
  const [middleFeeValue, setMiddleFeeValue] = useState(0);

  const [selectedChannels, setSelectedChannels] = useState<ChannelKey[]>(["online"]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(CURRENT_PRODUCT_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);

      setProductName(parsed?.productName || "");
      setManufacturingCost(Number(parsed?.manufacturingCost ?? 0));
      setPackageCost(Number(parsed?.packageCost ?? 0));
      setShippingCost(Number(parsed?.shippingCost ?? 0));
      setAdCost(Number(parsed?.adCost ?? 0));
      setStorageCost(Number(parsed?.storageCost ?? 0));
      setReturnCost(Number(parsed?.returnCost ?? 0));
      setDefectRate(Number(parsed?.defectRate ?? 0));

      setPlatformFee(Number(parsed?.platformFee ?? 0));
      setMarginRate(Number(parsed?.marginRate ?? 0));

      setOfflineDiscount(Number(parsed?.offlineDiscount ?? 0));
      setDistributionDiscount(Number(parsed?.distributionDiscount ?? 0));

      setMiddleFeeType((parsed?.middleFeeType as MiddleFeeType) || "percent");
      setMiddleFeeValue(Number(parsed?.middleFeeValue ?? 0));

      if (Array.isArray(parsed?.channels) && parsed.channels.length > 0) {
        setSelectedChannels(parsed.channels as ChannelKey[]);
      }
    } catch {
      // ignore
    }
  }, []);

  const calculations = useMemo(() => {
    const baseCost =
      Number(manufacturingCost || 0) +
      Number(packageCost || 0) +
      Number(shippingCost || 0) +
      Number(adCost || 0) +
      Number(storageCost || 0) +
      Number(returnCost || 0);

    const defectCost = Math.round(baseCost * (Number(defectRate || 0) / 100));
    const totalCost = baseCost + defectCost;

    const calcMiddleFee = (price: number) => {
      if (middleFeeType === "percent") {
        return Math.round(price * (Number(middleFeeValue || 0) / 100));
      }
      return Math.round(Number(middleFeeValue || 0));
    };

    const onlineDenominator =
      1 - Number(platformFee || 0) / 100 - Number(marginRate || 0) / 100;

    const onlinePrice =
      onlineDenominator > 0 ? Math.round(totalCost / onlineDenominator) : 0;

    const onlinePlatformFee = Math.round(onlinePrice * (Number(platformFee || 0) / 100));
    const onlineMiddleFee = calcMiddleFee(onlinePrice);
    const onlineProfit = onlinePrice - totalCost - onlinePlatformFee - onlineMiddleFee;
    const onlineMarginRate =
      onlinePrice > 0 ? safePercent(Math.round((onlineProfit / onlinePrice) * 1000) / 10) : 0;

    const offlinePrice = Math.round(onlinePrice * (1 - Number(offlineDiscount || 0) / 100));
    const offlineMiddleFee = calcMiddleFee(offlinePrice);
    const offlineProfit = offlinePrice - totalCost - offlineMiddleFee;
    const offlineMarginRate =
      offlinePrice > 0
        ? safePercent(Math.round((offlineProfit / offlinePrice) * 1000) / 10)
        : 0;

    const distributionPrice = Math.round(
      onlinePrice * (1 - Number(distributionDiscount || 0) / 100)
    );
    const distributionMiddleFee = calcMiddleFee(distributionPrice);
    const distributionProfit = distributionPrice - totalCost - distributionMiddleFee;
    const distributionMarginRate =
      distributionPrice > 0
        ? safePercent(Math.round((distributionProfit / distributionPrice) * 1000) / 10)
        : 0;

    return {
      baseCost,
      defectCost,
      totalCost,
      online: {
        price: onlinePrice,
        platformFee: onlinePlatformFee,
        middleFee: onlineMiddleFee,
        profit: onlineProfit,
        marginRate: onlineMarginRate,
      },
      offline: {
        price: offlinePrice,
        platformFee: 0,
        middleFee: offlineMiddleFee,
        profit: offlineProfit,
        marginRate: offlineMarginRate,
      },
      distribution: {
        price: distributionPrice,
        platformFee: 0,
        middleFee: distributionMiddleFee,
        profit: distributionProfit,
        marginRate: distributionMarginRate,
      },
    };
  }, [
    manufacturingCost,
    packageCost,
    shippingCost,
    adCost,
    storageCost,
    returnCost,
    defectRate,
    platformFee,
    marginRate,
    offlineDiscount,
    distributionDiscount,
    middleFeeType,
    middleFeeValue,
  ]);

  const handleSaveProduct = () => {
    if (!productName.trim()) {
      alert("제품명을 입력해주세요.");
      return;
    }

    const newProduct: SavedProduct & {
      manufacturingCost: number;
      packageCost: number;
      shippingCost: number;
      adCost: number;
      storageCost: number;
      returnCost: number;
      defectRate: number;
    } = {
      id: Date.now(),
      productName: productName.trim(),
      channels: selectedChannels,
      manufacturingCost,
      packageCost,
      shippingCost,
      adCost,
      storageCost,
      returnCost,
      defectRate,
      baseCost: calculations.baseCost,
      defectCost: calculations.defectCost,
      totalCost: calculations.totalCost,
      platformFee,
      marginRate,
      offlineDiscount,
      distributionDiscount,
      middleFeeType,
      middleFeeValue,
      online: calculations.online,
      offline: calculations.offline,
      distribution: calculations.distribution,
      date: new Date().toLocaleDateString("ko-KR"),
    };

    const existing = localStorage.getItem(STORAGE_KEY);
    const parsed = existing ? JSON.parse(existing) : [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify([newProduct, ...parsed]));
    localStorage.setItem(CURRENT_PRODUCT_KEY, JSON.stringify(newProduct));

    alert("제품이 저장되었습니다.");
  };

  const handleCreateEstimate = () => {
    const preferredChannel: ChannelKey = selectedChannels.includes("online")
      ? "online"
      : selectedChannels.includes("offline")
      ? "offline"
      : "distribution";

    const selectedPrice =
      preferredChannel === "online"
        ? calculations.online.price
        : preferredChannel === "offline"
        ? calculations.offline.price
        : calculations.distribution.price;

    const draft = {
      productName: productName.trim(),
      quantity: 1,
      unitPrice: Math.round(selectedPrice || 0),
      supplyPrice: Math.round(selectedPrice || 0),
      vat: Math.round((selectedPrice || 0) * 0.1),
      totalAmount: Math.round((selectedPrice || 0) * 1.1),
    };

    localStorage.setItem("estimate-draft", JSON.stringify(draft));
    router.push("/estimate");
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-500">
          원가와 수수료를 입력하면 채널별 판매가와 수익을 자동 계산합니다.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">제품명</label>
            <div className="rounded-xl border border-gray-300 bg-white px-3">
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full bg-transparent py-3 outline-none"
                placeholder="제품명을 입력하세요"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">제조원가</label>
            <div className="rounded-xl border border-gray-300 bg-white px-3">
              <input
                type="number"
                value={manufacturingCost}
                onChange={(e) => setManufacturingCost(Number(e.target.value || 0))}
                className="w-full bg-transparent py-3 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">패키지비</label>
            <div className="rounded-xl border border-gray-300 bg-white px-3">
              <input
                type="number"
                value={packageCost}
                onChange={(e) => setPackageCost(Number(e.target.value || 0))}
                className="w-full bg-transparent py-3 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">배송비</label>
            <div className="rounded-xl border border-gray-300 bg-white px-3">
              <input
                type="number"
                value={shippingCost}
                onChange={(e) => setShippingCost(Number(e.target.value || 0))}
                className="w-full bg-transparent py-3 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">광고비</label>
            <div className="rounded-xl border border-gray-300 bg-white px-3">
              <input
                type="number"
                value={adCost}
                onChange={(e) => setAdCost(Number(e.target.value || 0))}
                className="w-full bg-transparent py-3 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">보관비</label>
            <div className="rounded-xl border border-gray-300 bg-white px-3">
              <input
                type="number"
                value={storageCost}
                onChange={(e) => setStorageCost(Number(e.target.value || 0))}
                className="w-full bg-transparent py-3 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">반품비</label>
            <div className="rounded-xl border border-gray-300 bg-white px-3">
              <input
                type="number"
                value={returnCost}
                onChange={(e) => setReturnCost(Number(e.target.value || 0))}
                className="w-full bg-transparent py-3 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">불량률</label>
            <div className="rounded-xl border border-gray-300 bg-white px-3">
              <input
                type="number"
                value={defectRate}
                onChange={(e) => setDefectRate(Number(e.target.value || 0))}
                className="w-full bg-transparent py-3 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">플랫폼 수수료</label>
            <div className="rounded-xl border border-gray-300 bg-white px-3">
              <input
                type="number"
                value={platformFee}
                onChange={(e) => setPlatformFee(Number(e.target.value || 0))}
                className="w-full bg-transparent py-3 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">목표 마진</label>
            <div className="rounded-xl border border-gray-300 bg-white px-3">
              <input
                type="number"
                value={marginRate}
                onChange={(e) => setMarginRate(Number(e.target.value || 0))}
                className="w-full bg-transparent py-3 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">오프라인 할인율</label>
            <div className="rounded-xl border border-gray-300 bg-white px-3">
              <input
                type="number"
                value={offlineDiscount}
                onChange={(e) => setOfflineDiscount(Number(e.target.value || 0))}
                className="w-full bg-transparent py-3 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">유통 할인율</label>
            <div className="rounded-xl border border-gray-300 bg-white px-3">
              <input
                type="number"
                value={distributionDiscount}
                onChange={(e) => setDistributionDiscount(Number(e.target.value || 0))}
                className="w-full bg-transparent py-3 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              중간판매자 수수료 방식
            </label>
            <select
              value={middleFeeType}
              onChange={(e) => setMiddleFeeType(e.target.value as MiddleFeeType)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 outline-none"
            >
              <option value="percent">퍼센트(%)</option>
              <option value="fixed">고정금액</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">중간판매자 수수료</label>
            <div className="rounded-xl border border-gray-300 bg-white px-3">
              <input
                type="number"
                value={middleFeeValue}
                onChange={(e) => setMiddleFeeValue(Number(e.target.value || 0))}
                className="w-full bg-transparent py-3 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-base font-bold text-gray-900">채널 선택</h3>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                setSelectedChannels((prev) =>
                  prev.includes("online")
                    ? prev.filter((item) => item !== "online")
                    : [...prev, "online"]
                )
              }
              className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
                selectedChannels.includes("online")
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              온라인
            </button>

            <button
              type="button"
              onClick={() =>
                setSelectedChannels((prev) =>
                  prev.includes("offline")
                    ? prev.filter((item) => item !== "offline")
                    : [...prev, "offline"]
                )
              }
              className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
                selectedChannels.includes("offline")
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              오프라인
            </button>

            <button
              type="button"
              onClick={() =>
                setSelectedChannels((prev) =>
                  prev.includes("distribution")
                    ? prev.filter((item) => item !== "distribution")
                    : [...prev, "distribution"]
                )
              }
              className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
                selectedChannels.includes("distribution")
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              유통
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSaveProduct}
            className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black"
          >
            제품 저장하기
          </button>

          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("wantb-current-product");
              window.location.reload();
            }}
            className="rounded-xl border border-red-300 px-5 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            초기화
          </button>

          <button
            type="button"
            onClick={handleCreateEstimate}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            견적 만들기
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h2 className="text-xl font-bold text-gray-900">자동 계산 결과</h2>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl bg-gray-50 p-4">
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="text-gray-500">기본 원가 합계</span>
              <span className="font-semibold text-gray-900">
                {numberFormat(calculations.baseCost)}원
              </span>
            </div>
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="text-gray-500">불량 반영 비용</span>
              <span className="font-semibold text-gray-900">
                {numberFormat(calculations.defectCost)}원
              </span>
            </div>
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="text-gray-500">총 원가</span>
              <span className="font-bold text-gray-900">
                {numberFormat(calculations.totalCost)}원
              </span>
            </div>
          </div>

          {selectedChannels.includes("online") && (
            <div className="rounded-2xl border border-gray-200 p-4">
              <h3 className="text-base font-bold text-gray-900">온라인</h3>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">판매가</span>
                  <span className="font-semibold">{numberFormat(calculations.online.price)}원</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">플랫폼 수수료</span>
                  <span className="font-semibold">
                    {numberFormat(calculations.online.platformFee)}원
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">중간판매 수수료</span>
                  <span className="font-semibold">
                    {numberFormat(calculations.online.middleFee)}원
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">수익</span>
                  <span className="font-bold">{numberFormat(calculations.online.profit)}원</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">수익률</span>
                  <span className="font-bold">{calculations.online.marginRate}%</span>
                </div>
              </div>
            </div>
          )}

          {selectedChannels.includes("offline") && (
            <div className="rounded-2xl border border-gray-200 p-4">
              <h3 className="text-base font-bold text-gray-900">오프라인</h3>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">납품가</span>
                  <span className="font-semibold">
                    {numberFormat(calculations.offline.price)}원
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">중간판매 수수료</span>
                  <span className="font-semibold">
                    {numberFormat(calculations.offline.middleFee)}원
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">수익</span>
                  <span className="font-bold">
                    {numberFormat(calculations.offline.profit)}원
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">수익률</span>
                  <span className="font-bold">{calculations.offline.marginRate}%</span>
                </div>
              </div>
            </div>
          )}

          {selectedChannels.includes("distribution") && (
            <div className="rounded-2xl border border-gray-200 p-4">
              <h3 className="text-base font-bold text-gray-900">유통</h3>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">납품가</span>
                  <span className="font-semibold">
                    {numberFormat(calculations.distribution.price)}원
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">중간판매 수수료</span>
                  <span className="font-semibold">
                    {numberFormat(calculations.distribution.middleFee)}원
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">수익</span>
                  <span className="font-bold">
                    {numberFormat(calculations.distribution.profit)}원
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">수익률</span>
                  <span className="font-bold">{calculations.distribution.marginRate}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}