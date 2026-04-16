"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ChannelKey = "online" | "offline" | "distribution";
type MiddleFeeType = "percent" | "fixed";
type CalculationMode = "margin" | "price" | "distributor";
type DistributorInputMode = "supplyPrice" | "marginAmount" | "marginRate";

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
  calculationMode?: CalculationMode;
  targetSalePrice?: number;
  distributorInputMode?: DistributorInputMode;
  distributorInputValue?: number;
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

function formatPercent(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${safeValue.toFixed(1)}%`;
}

function safePercent(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function clampToZero(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function getAmountClass(value: number, options?: { emphasize?: boolean }) {
  const emphasize = options?.emphasize ?? false;

  if (value < 0) {
    return emphasize
      ? "text-lg font-bold text-red-600"
      : "font-semibold text-red-600";
  }

  if (value === 0) {
    return emphasize
      ? "text-lg font-bold text-gray-400"
      : "font-semibold text-gray-400";
  }

  return emphasize
    ? "text-lg font-bold text-gray-900"
    : "font-semibold text-gray-900";
}

function getPercentClass(value: number, options?: { emphasize?: boolean }) {
  const emphasize = options?.emphasize ?? false;

  if (value < 0) {
    return emphasize
      ? "text-lg font-bold text-red-600"
      : "font-semibold text-red-600";
  }

  if (value === 0) {
    return emphasize
      ? "text-lg font-bold text-gray-400"
      : "font-semibold text-gray-400";
  }

  return emphasize
    ? "text-lg font-bold text-gray-900"
    : "font-semibold text-gray-900";
}

type NumericInputProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  placeholder?: string;
  min?: number;
};

function NumericInput({
  label,
  value,
  onChange,
  suffix,
  placeholder,
  min = 0,
}: NumericInputProps) {
  const [text, setText] = useState(String(value ?? 0));

  useEffect(() => {
    setText(String(value ?? 0));
  }, [value]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center rounded-xl border border-gray-300 bg-white px-3">
        <input
          type="text"
          inputMode="decimal"
          value={text}
          placeholder={placeholder}
          onFocus={() => {
            if (Number(text || 0) === 0) {
              setText("");
            }
          }}
          onChange={(e) => {
            const onlyNumber = e.target.value.replace(/[^0-9.]/g, "");
            setText(onlyNumber);

            if (onlyNumber === "") {
              onChange(0);
              return;
            }

            onChange(clampToZero(Number(onlyNumber)));
          }}
          onBlur={() => {
            if (text === "" || Number.isNaN(Number(text))) {
              setText(String(min));
              onChange(min);
              return;
            }

            const normalized = clampToZero(Number(text));
            setText(String(normalized));
            onChange(normalized);
          }}
          className="w-full bg-transparent py-3 outline-none"
        />
        {suffix && <span className="pl-2 text-sm font-medium text-gray-400">{suffix}</span>}
      </div>
    </div>
  );
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

  const [calculationMode, setCalculationMode] = useState<CalculationMode>("margin");
  const [targetSalePrice, setTargetSalePrice] = useState(0);

  const [offlineDiscount, setOfflineDiscount] = useState(0);
  const [distributionDiscount, setDistributionDiscount] = useState(0);

  const [distributorInputMode, setDistributorInputMode] =
    useState<DistributorInputMode>("marginRate");
  const [distributorInputValue, setDistributorInputValue] = useState(0);

  const [middleFeeType, setMiddleFeeType] = useState<MiddleFeeType>("percent");
  const [middleFeeValue, setMiddleFeeValue] = useState(0);

  const [selectedChannels, setSelectedChannels] = useState<ChannelKey[]>(["online"]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(CURRENT_PRODUCT_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);

      if (parsed?.productName) {
        setProductName(String(parsed.productName));
      }

      if (
        parsed?.manufacturingCost !== undefined ||
        parsed?.packageCost !== undefined ||
        parsed?.shippingCost !== undefined ||
        parsed?.adCost !== undefined ||
        parsed?.storageCost !== undefined ||
        parsed?.returnCost !== undefined ||
        parsed?.defectRate !== undefined
      ) {
        setManufacturingCost(Number(parsed?.manufacturingCost ?? 0));
        setPackageCost(Number(parsed?.packageCost ?? 0));
        setShippingCost(Number(parsed?.shippingCost ?? 0));
        setAdCost(Number(parsed?.adCost ?? 0));
        setStorageCost(Number(parsed?.storageCost ?? 0));
        setReturnCost(Number(parsed?.returnCost ?? 0));
        setDefectRate(Number(parsed?.defectRate ?? 0));
      } else {
        const total = Number(parsed?.totalCost ?? 0);
        setManufacturingCost(total);
        setPackageCost(0);
        setShippingCost(0);
        setAdCost(0);
        setStorageCost(0);
        setReturnCost(0);
        setDefectRate(0);
      }

      setPlatformFee(Number(parsed?.platformFee ?? 0));
      setMarginRate(Number(parsed?.marginRate ?? 0));
      setOfflineDiscount(Number(parsed?.offlineDiscount ?? 0));
      setDistributionDiscount(Number(parsed?.distributionDiscount ?? 0));

      setMiddleFeeType((parsed?.middleFeeType as MiddleFeeType) || "percent");
      setMiddleFeeValue(Number(parsed?.middleFeeValue ?? 0));

      setCalculationMode((parsed?.calculationMode as CalculationMode) || "margin");
      setTargetSalePrice(Number(parsed?.targetSalePrice ?? 0));

      setDistributorInputMode(
        (parsed?.distributorInputMode as DistributorInputMode) || "marginRate"
      );
      setDistributorInputValue(Number(parsed?.distributorInputValue ?? 0));

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

    const normalizedPlatformRate = Number(platformFee || 0) / 100;
    const normalizedMarginRate = Number(marginRate || 0) / 100;
    const normalizedOfflineDiscount = Number(offlineDiscount || 0) / 100;

    let onlinePrice = 0;

    if (calculationMode === "margin") {
      const denominator = 1 - normalizedPlatformRate - normalizedMarginRate;
      onlinePrice = denominator > 0 ? Math.round(totalCost / denominator) : 0;
    } else {
      onlinePrice = Math.round(Number(targetSalePrice || 0));
    }

    const onlinePlatformFee = Math.round(onlinePrice * normalizedPlatformRate);
    const onlineMiddleFee = calcMiddleFee(onlinePrice);
    const onlineProfit = onlinePrice - totalCost - onlinePlatformFee - onlineMiddleFee;
    const onlineMarginRate =
      onlinePrice > 0 ? safePercent(Math.round((onlineProfit / onlinePrice) * 1000) / 10) : 0;

    const offlinePrice = Math.round(onlinePrice * (1 - normalizedOfflineDiscount));
    const offlineMiddleFee = calcMiddleFee(offlinePrice);
    const offlineProfit = offlinePrice - totalCost - offlineMiddleFee;
    const offlineMarginRate =
      offlinePrice > 0
        ? safePercent(Math.round((offlineProfit / offlinePrice) * 1000) / 10)
        : 0;

    let distributorSupplyPrice = 0;
    let distributorMarginAmount = 0;
    let distributorMarginRate = 0;

    if (calculationMode === "distributor") {
      const retailPrice = Math.round(Number(targetSalePrice || 0));

      if (distributorInputMode === "supplyPrice") {
        distributorSupplyPrice = Math.round(Number(distributorInputValue || 0));
        distributorMarginAmount = Math.max(0, retailPrice - distributorSupplyPrice);
        distributorMarginRate =
          retailPrice > 0
            ? safePercent(Math.round((distributorMarginAmount / retailPrice) * 1000) / 10)
            : 0;
      } else if (distributorInputMode === "marginAmount") {
        distributorMarginAmount = Math.round(Number(distributorInputValue || 0));
        distributorSupplyPrice = Math.max(0, retailPrice - distributorMarginAmount);
        distributorMarginRate =
          retailPrice > 0
            ? safePercent(Math.round((distributorMarginAmount / retailPrice) * 1000) / 10)
            : 0;
      } else {
        distributorMarginRate = clampToZero(Number(distributorInputValue || 0));
        distributorMarginAmount = Math.round(retailPrice * (distributorMarginRate / 100));
        distributorSupplyPrice = Math.max(0, retailPrice - distributorMarginAmount);
      }
    } else {
      const normalizedDistributionRate = Number(distributionDiscount || 0) / 100;
      distributorSupplyPrice = Math.round(onlinePrice * (1 - normalizedDistributionRate));
      distributorMarginAmount = Math.max(0, onlinePrice - distributorSupplyPrice);
      distributorMarginRate =
        onlinePrice > 0
          ? safePercent(Math.round((distributorMarginAmount / onlinePrice) * 1000) / 10)
          : 0;
    }

    const distributionMiddleFee = calcMiddleFee(distributorSupplyPrice);
    const distributionProfit = distributorSupplyPrice - totalCost - distributionMiddleFee;
    const distributionMarginChannelRate =
      distributorSupplyPrice > 0
        ? safePercent(Math.round((distributionProfit / distributorSupplyPrice) * 1000) / 10)
        : 0;

    const impliedOnlineMarginRate =
      onlinePrice > 0 ? safePercent(Math.round((onlineProfit / onlinePrice) * 1000) / 10) : 0;

    const manufacturerSupplyPrice = distributorSupplyPrice;
    const manufacturerProfitAtDistribution = distributionProfit;
    const manufacturerProfitRateAtDistribution =
      manufacturerSupplyPrice > 0
        ? safePercent(
            Math.round((manufacturerProfitAtDistribution / manufacturerSupplyPrice) * 1000) / 10
          )
        : 0;

    const manufacturerProfitRateAgainstCost =
      totalCost > 0
        ? safePercent(Math.round((manufacturerProfitAtDistribution / totalCost) * 1000) / 10)
        : 0;

    return {
      baseCost,
      defectCost,
      totalCost,
      impliedOnlineMarginRate,
      distributorSupplyPrice,
      distributorMarginAmount,
      distributorMarginRate,
      manufacturerSupplyPrice,
      manufacturerProfitAtDistribution,
      manufacturerProfitRateAtDistribution,
      manufacturerProfitRateAgainstCost,
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
        price: distributorSupplyPrice,
        platformFee: 0,
        middleFee: distributionMiddleFee,
        profit: distributionProfit,
        marginRate: distributionMarginChannelRate,
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
    calculationMode,
    targetSalePrice,
    offlineDiscount,
    distributionDiscount,
    distributorInputMode,
    distributorInputValue,
    middleFeeType,
    middleFeeValue,
  ]);

  const handleToggleChannel = (channel: ChannelKey) => {
    setSelectedChannels((prev) => {
      const exists = prev.includes(channel);
      if (exists) {
        const next = prev.filter((item) => item !== channel);
        return next.length > 0 ? next : [channel];
      }
      return [...prev, channel];
    });
  };

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
      marginRate: calculationMode === "margin" ? marginRate : calculations.impliedOnlineMarginRate,
      offlineDiscount,
      distributionDiscount,
      middleFeeType,
      middleFeeValue,
      calculationMode,
      targetSalePrice,
      distributorInputMode,
      distributorInputValue,
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

  const handleReset = () => {
    localStorage.removeItem(CURRENT_PRODUCT_KEY);
    window.location.reload();
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Selling Price Calculator</h1>
        <p className="mt-2 text-sm text-gray-500">판매가 계산기</p>

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

          <NumericInput label="제조원가 (￦)" value={manufacturingCost} onChange={setManufacturingCost} />
          <NumericInput label="패키지비 (￦)" value={packageCost} onChange={setPackageCost} />
          <NumericInput label="배송비 (￦)" value={shippingCost} onChange={setShippingCost} />
          <NumericInput label="광고비 (￦)" value={adCost} onChange={setAdCost} />
          <NumericInput label="보관비 (￦)" value={storageCost} onChange={setStorageCost} />
          <NumericInput label="반품비 (￦)" value={returnCost} onChange={setReturnCost} />
          <NumericInput label="불량률 (%)" value={defectRate} onChange={setDefectRate} />
          <NumericInput label="플랫폼 수수료 (%)" value={platformFee} onChange={setPlatformFee} />

          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">계산 기준</label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <button
                type="button"
                onClick={() => setCalculationMode("margin")}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  calculationMode === "margin" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                목표 마진 기준
              </button>

              <button
                type="button"
                onClick={() => setCalculationMode("price")}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  calculationMode === "price" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                판매가 기준
              </button>

              <button
                type="button"
                onClick={() => setCalculationMode("distributor")}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  calculationMode === "distributor" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                제조사-유통 기준
              </button>
            </div>
          </div>

          {calculationMode === "margin" && (
            <>
              <NumericInput label="목표 마진 (%)" value={marginRate} onChange={setMarginRate} />
              <NumericInput label="오프라인 할인율 (%)" value={offlineDiscount} onChange={setOfflineDiscount} />
              <NumericInput label="유통 할인율 (%)" value={distributionDiscount} onChange={setDistributionDiscount} />
            </>
          )}

          {calculationMode === "price" && (
            <>
              <NumericInput label="목표 판매가 (￦)" value={targetSalePrice} onChange={setTargetSalePrice} />
              <NumericInput label="오프라인 할인율 (%)" value={offlineDiscount} onChange={setOfflineDiscount} />
              <NumericInput label="유통 할인율 (%)" value={distributionDiscount} onChange={setDistributionDiscount} />
            </>
          )}

          {calculationMode === "distributor" && (
            <>
              <NumericInput
                label="소비자가 / 최종 판매가 (￦)"
                value={targetSalePrice}
                onChange={setTargetSalePrice}
              />

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">유통 계산 기준</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDistributorInputMode("supplyPrice")}
                    className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${
                      distributorInputMode === "supplyPrice"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    납품가 기준
                  </button>

                  <button
                    type="button"
                    onClick={() => setDistributorInputMode("marginAmount")}
                    className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${
                      distributorInputMode === "marginAmount"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    마진금액 기준
                  </button>

                  <button
                    type="button"
                    onClick={() => setDistributorInputMode("marginRate")}
                    className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${
                      distributorInputMode === "marginRate"
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    마진율 기준
                  </button>
                </div>
              </div>

              <NumericInput
                label={
                  distributorInputMode === "supplyPrice"
                    ? "유통사 납품가 (￦)"
                    : distributorInputMode === "marginAmount"
                    ? "유통사 마진금액 (￦)"
                    : "유통사 마진율 (%)"
                }
                value={distributorInputValue}
                onChange={setDistributorInputValue}
              />
            </>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">중간판매 수수료</label>
            <div className="flex overflow-hidden rounded-xl border border-gray-300 bg-white">
              <input
                type="text"
                inputMode="decimal"
                value={String(middleFeeValue)}
                onFocus={(e) => {
                  if (Number(e.target.value || 0) === 0) e.target.value = "";
                }}
                onChange={(e) => {
                  const onlyNumber = e.target.value.replace(/[^0-9.]/g, "");
                  setMiddleFeeValue(onlyNumber === "" ? 0 : clampToZero(Number(onlyNumber)));
                }}
                onBlur={(e) => {
                  if (e.target.value === "" || Number.isNaN(Number(e.target.value))) {
                    setMiddleFeeValue(0);
                    e.target.value = "0";
                    return;
                  }
                  const normalized = clampToZero(Number(e.target.value));
                  setMiddleFeeValue(normalized);
                  e.target.value = String(normalized);
                }}
                className="w-full bg-transparent px-3 py-3 outline-none"
              />

              <div className="flex border-l border-gray-300">
                <button
                  type="button"
                  onClick={() => setMiddleFeeType("percent")}
                  className={`min-w-[58px] px-3 text-sm font-semibold transition ${
                    middleFeeType === "percent" ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-700"
                  }`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setMiddleFeeType("fixed")}
                  className={`min-w-[58px] border-l border-gray-300 px-3 text-sm font-semibold transition ${
                    middleFeeType === "fixed" ? "bg-blue-600 text-white" : "bg-gray-50 text-gray-700"
                  }`}
                >
                  원
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-base font-bold text-gray-900">채널 선택</h3>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleToggleChannel("online")}
              className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
                selectedChannels.includes("online") ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              온라인
            </button>

            <button
              type="button"
              onClick={() => handleToggleChannel("offline")}
              className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
                selectedChannels.includes("offline") ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              오프라인
            </button>

            <button
              type="button"
              onClick={() => handleToggleChannel("distribution")}
              className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
                selectedChannels.includes("distribution") ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
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
            onClick={handleReset}
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

        {calculationMode === "distributor" ? (
          <>
            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-bold text-emerald-900">제조사-유통 계산 요약</h3>
                <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
                  제조사 기준
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                  <span className="text-gray-600">소비자가</span>
                  <span className={getAmountClass(targetSalePrice, { emphasize: true })}>
                    {numberFormat(targetSalePrice)}원
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">유통사 납품가</span>
                  <span className={getAmountClass(calculations.distributorSupplyPrice, { emphasize: true })}>
                    {numberFormat(calculations.distributorSupplyPrice)}원
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">유통사 마진금액</span>
                  <span className={getAmountClass(calculations.distributorMarginAmount)}>
                    {numberFormat(calculations.distributorMarginAmount)}원
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">유통사 마진율</span>
                  <span className={getPercentClass(calculations.distributorMarginRate)}>
                    {formatPercent(calculations.distributorMarginRate)}
                  </span>
                </div>

                <div className="my-2 border-t border-emerald-100" />

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">총원가</span>
                  <span className={getAmountClass(calculations.totalCost)}>
                    {numberFormat(calculations.totalCost)}원
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">제조사 수익</span>
                  <span className={getAmountClass(calculations.manufacturerProfitAtDistribution, { emphasize: true })}>
                    {numberFormat(calculations.manufacturerProfitAtDistribution)}원
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">제조사 수익률 (납품가 기준)</span>
                  <span className={getPercentClass(calculations.manufacturerProfitRateAtDistribution)}>
                    {formatPercent(calculations.manufacturerProfitRateAtDistribution)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">제조사 수익률 (원가 기준)</span>
                  <span className={getPercentClass(calculations.manufacturerProfitRateAgainstCost)}>
                    {formatPercent(calculations.manufacturerProfitRateAgainstCost)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
              <div className="flex items-center justify-between py-1 text-sm">
                <span className="text-gray-600">현재 계산 기준</span>
                <span className="font-bold text-gray-900">제조사-유통 기준</span>
              </div>
              <div className="flex items-center justify-between py-1 text-sm">
                <span className="text-gray-600">유통 계산 기준</span>
                <span className="font-bold text-gray-900">
                  {distributorInputMode === "supplyPrice"
                    ? "납품가 기준"
                    : distributorInputMode === "marginAmount"
                    ? "마진금액 기준"
                    : "마진율 기준"}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="text-gray-600">현재 계산 기준</span>
              <span className="font-bold text-gray-900">
                {calculationMode === "margin" ? "목표 마진 기준" : "판매가 기준"}
              </span>
            </div>

            {calculationMode === "margin" && (
              <div className="flex items-center justify-between py-1 text-sm">
                <span className="text-gray-600">설정 목표 마진</span>
                <span className={getPercentClass(marginRate)}>{formatPercent(marginRate)}</span>
              </div>
            )}

            {calculationMode === "price" && (
              <>
                <div className="flex items-center justify-between py-1 text-sm">
                  <span className="text-gray-600">입력 판매가</span>
                  <span className={getAmountClass(targetSalePrice)}>
                    {numberFormat(targetSalePrice)}원
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 text-sm">
                  <span className="text-gray-600">역산 마진율</span>
                  <span className={getPercentClass(calculations.impliedOnlineMarginRate)}>
                    {formatPercent(calculations.impliedOnlineMarginRate)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl bg-gray-50 p-4">
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="text-gray-500">기본 원가 합계</span>
              <span className={getAmountClass(calculations.baseCost)}>
                {numberFormat(calculations.baseCost)}원
              </span>
            </div>
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="text-gray-500">불량 반영 비용</span>
              <span className={getAmountClass(calculations.defectCost)}>
                {numberFormat(calculations.defectCost)}원
              </span>
            </div>
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="text-gray-500">총 원가</span>
              <span className={getAmountClass(calculations.totalCost)}>
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
                  <span className={getAmountClass(calculations.online.price)}>
                    {numberFormat(calculations.online.price)}원
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">플랫폼 수수료</span>
                  <span className={getAmountClass(calculations.online.platformFee)}>
                    {numberFormat(calculations.online.platformFee)}원
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">중간판매 수수료</span>
                  <span className={getAmountClass(calculations.online.middleFee)}>
                    {numberFormat(calculations.online.middleFee)}원
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">수익</span>
                  <span className={getAmountClass(calculations.online.profit)}>
                    {numberFormat(calculations.online.profit)}원
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">수익률</span>
                  <span className={getPercentClass(calculations.online.marginRate)}>
                    {formatPercent(calculations.online.marginRate)}
                  </span>
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
                  <span className={getAmountClass(calculations.offline.price)}>
                    {numberFormat(calculations.offline.price)}원
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">중간판매 수수료</span>
                  <span className={getAmountClass(calculations.offline.middleFee)}>
                    {numberFormat(calculations.offline.middleFee)}원
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">수익</span>
                  <span className={getAmountClass(calculations.offline.profit)}>
                    {numberFormat(calculations.offline.profit)}원
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">수익률</span>
                  <span className={getPercentClass(calculations.offline.marginRate)}>
                    {formatPercent(calculations.offline.marginRate)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {selectedChannels.includes("distribution") && (
            <div className="rounded-2xl border border-gray-200 p-4">
              <h3 className="text-base font-bold text-gray-900">유통</h3>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">유통사 납품가</span>
                  <span className={getAmountClass(calculations.distribution.price)}>
                    {numberFormat(calculations.distribution.price)}원
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">유통사 마진금액</span>
                  <span className={getAmountClass(calculations.distributorMarginAmount)}>
                    {numberFormat(calculations.distributorMarginAmount)}원
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">유통사 마진율</span>
                  <span className={getPercentClass(calculations.distributorMarginRate)}>
                    {formatPercent(calculations.distributorMarginRate)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">중간판매 수수료</span>
                  <span className={getAmountClass(calculations.distribution.middleFee)}>
                    {numberFormat(calculations.distribution.middleFee)}원
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">제조사 수익</span>
                  <span className={getAmountClass(calculations.distribution.profit)}>
                    {numberFormat(calculations.distribution.profit)}원
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">제조사 수익률</span>
                  <span className={getPercentClass(calculations.distribution.marginRate)}>
                    {formatPercent(calculations.distribution.marginRate)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}