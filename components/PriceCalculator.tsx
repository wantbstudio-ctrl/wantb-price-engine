"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type ChannelKey = "online" | "offline" | "distribution";
type MiddleFeeType = "percent" | "fixed";
type CalculationMode = "margin" | "price" | "distributor";
type DistributorInputMode = "supplyPrice" | "marginAmount" | "marginRate";

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
      ? "text-[22px] font-bold tracking-tight text-red-400"
      : "font-semibold text-red-400";
  }

  if (value === 0) {
    return emphasize
      ? "text-[22px] font-bold tracking-tight text-[#b6ada4]"
      : "font-semibold text-[#b6ada4]";
  }

  return emphasize
    ? "text-[22px] font-bold tracking-tight text-[#f7f8fb]"
    : "font-semibold text-[#f7f8fb]";
}

function getPercentClass(value: number, options?: { emphasize?: boolean }) {
  const emphasize = options?.emphasize ?? false;

  if (value < 0) {
    return emphasize
      ? "text-[22px] font-bold tracking-tight text-red-400"
      : "font-semibold text-red-400";
  }

  if (value === 0) {
    return emphasize
      ? "text-[22px] font-bold tracking-tight text-[#b6ada4]"
      : "font-semibold text-[#b6ada4]";
  }

  return emphasize
    ? "text-[22px] font-bold tracking-tight text-[#f7f8fb]"
    : "font-semibold text-[#f7f8fb]";
}

type NumericInputProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  placeholder?: string;
  min?: number;
};

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3 border-b border-[#433d36] pb-3">
      <div>
        <h3 className="text-base font-bold tracking-tight text-[#f7f8fb]">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-xs leading-5 text-[#9e968d]">{description}</p>
        )}
      </div>
    </div>
  );
}

function ResultRow({
  label,
  value,
  emphasize = false,
  divider = false,
}: {
  label: string;
  value: ReactNode;
  emphasize?: boolean;
  divider?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 ${
        divider ? "border-b border-[#3d3934] pb-3" : ""
      }`}
    >
      <span
        className={
          emphasize
            ? "text-sm font-semibold text-[#d8d1c8]"
            : "text-sm text-[#a8a098]"
        }
      >
        {label}
      </span>
      <div className="text-right">{value}</div>
    </div>
  );
}

function NumericInput({
  label,
  value,
  onChange,
  suffix,
  placeholder,
  min = 0,
}: NumericInputProps) {
  const [text, setText] = useState(String(value ?? 0));

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[#ddd6cf]">{label}</label>
      <div className="flex items-center rounded-2xl border border-[#514940] bg-[#121417] px-4 transition-all duration-200 hover:border-[#62584d] focus-within:border-[#22b7ff] focus-within:bg-[#14181c] focus-within:shadow-[0_0_0_1px_rgba(34,183,255,0.26),0_0_18px_rgba(34,183,255,0.10)]">
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
          className="w-full bg-transparent py-3.5 text-[15px] font-medium text-[#f7f8fb] outline-none placeholder:text-[#7f756c]"
        />
        {suffix && (
          <span className="pl-2 text-sm font-semibold text-[#a9c9d8]">
            {suffix}
          </span>
        )}
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

  const [calculationMode, setCalculationMode] =
    useState<CalculationMode>("margin");
  const [targetSalePrice, setTargetSalePrice] = useState(0);

  const [offlineDiscount, setOfflineDiscount] = useState(0);
  const [distributionDiscount, setDistributionDiscount] = useState(0);

  const [distributorInputMode, setDistributorInputMode] =
    useState<DistributorInputMode>("marginRate");
  const [distributorInputValue, setDistributorInputValue] = useState(0);

  const [middleFeeType, setMiddleFeeType] =
    useState<MiddleFeeType>("percent");
  const [middleFeeValue, setMiddleFeeValue] = useState(0);

  const [selectedChannels, setSelectedChannels] = useState<ChannelKey[]>([
    "online",
  ]);

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
      onlinePrice > 0
        ? safePercent(Math.round((onlineProfit / onlinePrice) * 1000) / 10)
        : 0;

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
            ? safePercent(
                Math.round((distributorMarginAmount / retailPrice) * 1000) / 10
              )
            : 0;
      } else if (distributorInputMode === "marginAmount") {
        distributorMarginAmount = Math.round(Number(distributorInputValue || 0));
        distributorSupplyPrice = Math.max(0, retailPrice - distributorMarginAmount);
        distributorMarginRate =
          retailPrice > 0
            ? safePercent(
                Math.round((distributorMarginAmount / retailPrice) * 1000) / 10
              )
            : 0;
      } else {
        distributorMarginRate = clampToZero(Number(distributorInputValue || 0));
        distributorMarginAmount = Math.round(
          retailPrice * (distributorMarginRate / 100)
        );
        distributorSupplyPrice = Math.max(0, retailPrice - distributorMarginAmount);
      }
    } else {
      const normalizedDistributionRate = Number(distributionDiscount || 0) / 100;
      distributorSupplyPrice = Math.round(
        onlinePrice * (1 - normalizedDistributionRate)
      );
      distributorMarginAmount = Math.max(0, onlinePrice - distributorSupplyPrice);
      distributorMarginRate =
        onlinePrice > 0
          ? safePercent(
              Math.round((distributorMarginAmount / onlinePrice) * 1000) / 10
            )
          : 0;
    }

    const distributionMiddleFee = calcMiddleFee(distributorSupplyPrice);
    const distributionProfit =
      distributorSupplyPrice - totalCost - distributionMiddleFee;
    const distributionMarginChannelRate =
      distributorSupplyPrice > 0
        ? safePercent(
            Math.round((distributionProfit / distributorSupplyPrice) * 1000) / 10
          )
        : 0;

    const impliedOnlineMarginRate =
      onlinePrice > 0
        ? safePercent(Math.round((onlineProfit / onlinePrice) * 1000) / 10)
        : 0;

    const manufacturerSupplyPrice = distributorSupplyPrice;
    const manufacturerProfitAtDistribution = distributionProfit;
    const manufacturerProfitRateAtDistribution =
      manufacturerSupplyPrice > 0
        ? safePercent(
            Math.round(
              (manufacturerProfitAtDistribution / manufacturerSupplyPrice) * 1000
            ) / 10
          )
        : 0;

    const manufacturerProfitRateAgainstCost =
      totalCost > 0
        ? safePercent(
            Math.round((manufacturerProfitAtDistribution / totalCost) * 1000) / 10
          )
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
    setProductName("");
    setManufacturingCost(0);
    setPackageCost(0);
    setShippingCost(0);
    setAdCost(0);
    setStorageCost(0);
    setReturnCost(0);
    setDefectRate(0);
    setPlatformFee(0);
    setMarginRate(0);
    setCalculationMode("margin");
    setTargetSalePrice(0);
    setOfflineDiscount(0);
    setDistributionDiscount(0);
    setDistributorInputMode("marginRate");
    setDistributorInputValue(0);
    setMiddleFeeType("percent");
    setMiddleFeeValue(0);
    setSelectedChannels(["online"]);
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-32px)] max-w-[2520px] grid-cols-1 gap-5 xl:grid-cols-[1180px_minmax(0,1fr)]">
      <div className="h-full rounded-[28px] border border-[#4d463e] bg-[#212325] p-6 shadow-[0_24px_50px_rgba(0,0,0,0.42)] ring-1 ring-[rgba(255,255,255,0.02)]">
        <div className="mb-6 flex flex-col gap-3 border-b border-[#443d36] pb-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex rounded-full border border-[#22b7ff]/40 bg-[#0d1a22] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#72dbff]">
              Dashboard
            </span>
            <span className="inline-flex rounded-full border border-[#4c453e] bg-[#191b1d] px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-[#b7afa6]">
              Selling Price Calculator
            </span>
          </div>

          <div>
            <h1 className="text-[30px] font-bold tracking-tight text-[#f7f8fb]">
              판매가 계산기
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#b0a79e]">
              웜그레이 기반 다크톤 위에 핵심 값과 입력 영역이 또렷하게 보이도록
              최종 마감한 계산 화면입니다.
            </p>
          </div>
        </div>

        <SectionTitle
          title="기본 정보 입력"
          description="원가, 수수료, 할인 기준을 입력해 판매가와 수익 구조를 바로 계산합니다."
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-medium text-[#ddd6cf]">제품명</label>
            <div className="rounded-2xl border border-[#514940] bg-[#121417] px-4 transition-all duration-200 hover:border-[#62584d] focus-within:border-[#22b7ff] focus-within:bg-[#14181c] focus-within:shadow-[0_0_0_1px_rgba(34,183,255,0.26),0_0_18px_rgba(34,183,255,0.10)]">
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full bg-transparent py-3.5 text-[15px] font-medium text-[#f7f8fb] outline-none placeholder:text-[#7f756c]"
                placeholder="제품명을 입력하세요"
              />
            </div>
          </div>

          <NumericInput
            label="제조원가 (￦)"
            value={manufacturingCost}
            onChange={setManufacturingCost}
          />
          <NumericInput
            label="패키지비 (￦)"
            value={packageCost}
            onChange={setPackageCost}
          />
          <NumericInput
            label="배송비 (￦)"
            value={shippingCost}
            onChange={setShippingCost}
          />
          <NumericInput label="광고비 (￦)" value={adCost} onChange={setAdCost} />
          <NumericInput
            label="보관비 (￦)"
            value={storageCost}
            onChange={setStorageCost}
          />
          <NumericInput
            label="반품비 (￦)"
            value={returnCost}
            onChange={setReturnCost}
          />
          <NumericInput
            label="불량률 (%)"
            value={defectRate}
            onChange={setDefectRate}
          />
          <NumericInput
            label="플랫폼 수수료 (%)"
            value={platformFee}
            onChange={setPlatformFee}
          />

          <div className="rounded-2xl border border-[#474038] bg-[#191c1f] p-4 md:col-span-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            <label className="mb-3 block text-sm font-medium text-[#ddd6cf]">
              계산 기준
            </label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <button
                type="button"
                onClick={() => setCalculationMode("margin")}
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  calculationMode === "margin"
                    ? "border-[#22b7ff] bg-[#101c24] text-[#f7f8fb] shadow-[0_0_20px_rgba(34,183,255,0.12)]"
                    : "border-[#4e463f] bg-[#131518] text-[#d7d1c9] hover:border-[#22b7ff] hover:text-[#f7f8fb]"
                }`}
              >
                목표 마진 기준
              </button>

              <button
                type="button"
                onClick={() => setCalculationMode("price")}
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  calculationMode === "price"
                    ? "border-[#22b7ff] bg-[#101c24] text-[#f7f8fb] shadow-[0_0_20px_rgba(34,183,255,0.12)]"
                    : "border-[#4e463f] bg-[#131518] text-[#d7d1c9] hover:border-[#22b7ff] hover:text-[#f7f8fb]"
                }`}
              >
                판매가 기준
              </button>

              <button
                type="button"
                onClick={() => setCalculationMode("distributor")}
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  calculationMode === "distributor"
                    ? "border-[#79e8ff] bg-[#122028] text-[#f7f8fb] shadow-[0_0_20px_rgba(121,232,255,0.10)]"
                    : "border-[#4e463f] bg-[#131518] text-[#d7d1c9] hover:border-[#79e8ff] hover:text-[#f7f8fb]"
                }`}
              >
                제조사-유통 기준
              </button>
            </div>
          </div>

          {calculationMode === "margin" && (
            <>
              <NumericInput
                label="목표 마진 (%)"
                value={marginRate}
                onChange={setMarginRate}
              />
              <NumericInput
                label="오프라인 할인율 (%)"
                value={offlineDiscount}
                onChange={setOfflineDiscount}
              />
              <NumericInput
                label="유통 할인율 (%)"
                value={distributionDiscount}
                onChange={setDistributionDiscount}
              />
            </>
          )}

          {calculationMode === "price" && (
            <>
              <NumericInput
                label="목표 판매가 (￦)"
                value={targetSalePrice}
                onChange={setTargetSalePrice}
              />
              <NumericInput
                label="오프라인 할인율 (%)"
                value={offlineDiscount}
                onChange={setOfflineDiscount}
              />
              <NumericInput
                label="유통 할인율 (%)"
                value={distributionDiscount}
                onChange={setDistributionDiscount}
              />
            </>
          )}

          {calculationMode === "distributor" && (
            <>
              <NumericInput
                label="소비자가 / 최종 판매가 (￦)"
                value={targetSalePrice}
                onChange={setTargetSalePrice}
              />

              <div className="rounded-2xl border border-[#474038] bg-[#191c1f] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                <label className="mb-3 block text-sm font-medium text-[#ddd6cf]">
                  유통 계산 기준
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDistributorInputMode("supplyPrice")}
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                      distributorInputMode === "supplyPrice"
                        ? "border-[#22b7ff] bg-[#101c24] text-[#f7f8fb]"
                        : "border-[#4e463f] bg-[#131518] text-[#d7d1c9] hover:border-[#22b7ff] hover:text-[#f7f8fb]"
                    }`}
                  >
                    납품가 기준
                  </button>

                  <button
                    type="button"
                    onClick={() => setDistributorInputMode("marginAmount")}
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                      distributorInputMode === "marginAmount"
                        ? "border-[#22b7ff] bg-[#101c24] text-[#f7f8fb]"
                        : "border-[#4e463f] bg-[#131518] text-[#d7d1c9] hover:border-[#22b7ff] hover:text-[#f7f8fb]"
                    }`}
                  >
                    마진금액 기준
                  </button>

                  <button
                    type="button"
                    onClick={() => setDistributorInputMode("marginRate")}
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                      distributorInputMode === "marginRate"
                        ? "border-[#79e8ff] bg-[#122028] text-[#f7f8fb]"
                        : "border-[#4e463f] bg-[#131518] text-[#d7d1c9] hover:border-[#79e8ff] hover:text-[#f7f8fb]"
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
            <label className="block text-sm font-medium text-[#ddd6cf]">
              중간판매 수수료
            </label>
            <div className="flex overflow-hidden rounded-2xl border border-[#514940] bg-[#121417] transition-all duration-200 hover:border-[#62584d] focus-within:border-[#22b7ff] focus-within:bg-[#14181c] focus-within:shadow-[0_0_0_1px_rgba(34,183,255,0.26),0_0_18px_rgba(34,183,255,0.10)]">
              <input
                type="text"
                inputMode="decimal"
                value={String(middleFeeValue)}
                onFocus={(e) => {
                  if (Number(e.target.value || 0) === 0) e.target.value = "";
                }}
                onChange={(e) => {
                  const onlyNumber = e.target.value.replace(/[^0-9.]/g, "");
                  setMiddleFeeValue(
                    onlyNumber === "" ? 0 : clampToZero(Number(onlyNumber))
                  );
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
                className="w-full bg-transparent px-4 py-3.5 text-[15px] font-medium text-[#f7f8fb] outline-none placeholder:text-[#7f756c]"
              />

              <div className="flex border-l border-[#514940]">
                <button
                  type="button"
                  onClick={() => setMiddleFeeType("percent")}
                  className={`min-w-[60px] px-3 text-sm font-semibold transition ${
                    middleFeeType === "percent"
                      ? "bg-[#101c24] text-[#f7f8fb]"
                      : "bg-[#1a1c20] text-[#d7d1c9]"
                  }`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setMiddleFeeType("fixed")}
                  className={`min-w-[60px] border-l border-[#514940] px-3 text-sm font-semibold transition ${
                    middleFeeType === "fixed"
                      ? "bg-[#22b7ff] text-[#f7f8fb]"
                      : "bg-[#1a1c20] text-[#d7d1c9]"
                  }`}
                >
                  원
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-7 rounded-2xl border border-[#474038] bg-[#191c1f] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <label className="mb-3 block text-sm font-medium text-[#ddd6cf]">
            채널 선택
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleToggleChannel("online")}
              className={`rounded-2xl border px-5 py-3 text-sm font-semibold transition ${
                selectedChannels.includes("online")
                  ? "border-[#22b7ff] bg-[#101c24] text-[#f7f8fb] shadow-[0_0_18px_rgba(34,183,255,0.10)]"
                  : "border-[#4e463f] bg-[#131518] text-[#d7d1c9] hover:border-[#22b7ff] hover:text-[#f7f8fb]"
              }`}
            >
              온라인
            </button>

            <button
              type="button"
              onClick={() => handleToggleChannel("offline")}
              className={`rounded-2xl border px-5 py-3 text-sm font-semibold transition ${
                selectedChannels.includes("offline")
                  ? "border-[#22b7ff] bg-[#101c24] text-[#f7f8fb] shadow-[0_0_18px_rgba(34,183,255,0.10)]"
                  : "border-[#4e463f] bg-[#131518] text-[#d7d1c9] hover:border-[#22b7ff] hover:text-[#f7f8fb]"
              }`}
            >
              오프라인
            </button>

            <button
              type="button"
              onClick={() => handleToggleChannel("distribution")}
              className={`rounded-2xl border px-5 py-3 text-sm font-semibold transition ${
                selectedChannels.includes("distribution")
                  ? "border-[#79e8ff] bg-[#122028] text-[#f7f8fb] shadow-[0_0_18px_rgba(121,232,255,0.08)]"
                  : "border-[#4e463f] bg-[#131518] text-[#d7d1c9] hover:border-[#79e8ff] hover:text-[#f7f8fb]"
              }`}
            >
              유통
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleCreateEstimate}
            className="rounded-2xl border border-[#22b7ff] bg-[#1aa7f7] px-5 py-3 text-sm font-bold text-[#f7f8fb] transition hover:bg-[#2eb5ff] hover:shadow-[0_0_18px_rgba(34,183,255,0.22)]"
          >
            견적 만들기
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="rounded-2xl border border-[#575046] bg-[#16181b] px-5 py-3 text-sm font-semibold text-[#ddd6cf] transition hover:border-red-400 hover:bg-[#201617] hover:text-red-300"
          >
            초기화
          </button>
        </div>
      </div>

      <div className="h-full rounded-[28px] border border-[#4d463e] bg-[#212325] p-6 shadow-[0_24px_50px_rgba(0,0,0,0.42)] ring-1 ring-[rgba(255,255,255,0.02)]">
        <div className="mb-6 flex items-center justify-between gap-3 border-b border-[#443d36] pb-5">
          <div>
            <h2 className="text-[30px] font-bold tracking-tight text-[#f7f8fb]">
              자동 계산 결과
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#b0a79e]">
              핵심 금액과 채널별 수익 구조를 한눈에 확인할 수 있도록 마지막으로
              정리한 요약 패널입니다.
            </p>
          </div>
          <span className="rounded-full border border-[#4d463e] bg-[#181a1d] px-3 py-1 text-xs font-semibold text-[#b7afa6]">
            Live Summary
          </span>
        </div>

        {calculationMode === "distributor" ? (
          <>
            <div className="rounded-[24px] border border-[#4f4740] bg-[#181c20] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold tracking-tight text-[#f7f8fb]">
                  제조사-유통 계산 요약
                </h3>
                <span className="rounded-full border border-[#79e8ff]/50 bg-[#0e1c24] px-3 py-1 text-xs font-bold text-[#86ebff]">
                  제조사 기준
                </span>
              </div>

              <div className="space-y-3">
                <ResultRow
                  label="소비자가"
                  divider
                  value={
                    <span className={getAmountClass(targetSalePrice, { emphasize: true })}>
                      {numberFormat(targetSalePrice)}원
                    </span>
                  }
                />

                <ResultRow
                  label="유통사 납품가"
                  emphasize
                  value={
                    <span
                      className={getAmountClass(calculations.distributorSupplyPrice, {
                        emphasize: true,
                      })}
                    >
                      {numberFormat(calculations.distributorSupplyPrice)}원
                    </span>
                  }
                />

                <ResultRow
                  label="유통사 마진금액"
                  value={
                    <span className={getAmountClass(calculations.distributorMarginAmount)}>
                      {numberFormat(calculations.distributorMarginAmount)}원
                    </span>
                  }
                />

                <ResultRow
                  label="유통사 마진율"
                  value={
                    <span className={getPercentClass(calculations.distributorMarginRate)}>
                      {formatPercent(calculations.distributorMarginRate)}
                    </span>
                  }
                />

                <div className="my-2 border-t border-[#3d3934]" />

                <ResultRow
                  label="총원가"
                  value={
                    <span className={getAmountClass(calculations.totalCost)}>
                      {numberFormat(calculations.totalCost)}원
                    </span>
                  }
                />

                <ResultRow
                  label="제조사 수익"
                  emphasize
                  value={
                    <span
                      className={getAmountClass(
                        calculations.manufacturerProfitAtDistribution,
                        { emphasize: true }
                      )}
                    >
                      {numberFormat(calculations.manufacturerProfitAtDistribution)}원
                    </span>
                  }
                />

                <ResultRow
                  label="제조사 수익률 (납품가 기준)"
                  value={
                    <span
                      className={getPercentClass(
                        calculations.manufacturerProfitRateAtDistribution
                      )}
                    >
                      {formatPercent(calculations.manufacturerProfitRateAtDistribution)}
                    </span>
                  }
                />

                <ResultRow
                  label="제조사 수익률 (원가 기준)"
                  value={
                    <span
                      className={getPercentClass(
                        calculations.manufacturerProfitRateAgainstCost
                      )}
                    >
                      {formatPercent(calculations.manufacturerProfitRateAgainstCost)}
                    </span>
                  }
                />
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-[#484139] bg-[#171a1d] p-4">
              <div className="flex items-center justify-between py-1 text-sm">
                <span className="text-[#a8a098]">현재 계산 기준</span>
                <span className="font-bold text-[#f7f8fb]">제조사-유통 기준</span>
              </div>
              <div className="mt-2 flex items-center justify-between py-1 text-sm">
                <span className="text-[#a8a098]">유통 계산 기준</span>
                <span className="font-bold text-[#f7f8fb]">
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
          <div className="rounded-[24px] border border-[#484139] bg-[#171a1d] p-4">
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="text-[#a8a098]">현재 계산 기준</span>
              <span className="font-bold text-[#f7f8fb]">
                {calculationMode === "margin" ? "목표 마진 기준" : "판매가 기준"}
              </span>
            </div>

            {calculationMode === "margin" && (
              <div className="mt-2 flex items-center justify-between py-1 text-sm">
                <span className="text-[#a8a098]">설정 목표 마진</span>
                <span className={getPercentClass(marginRate)}>
                  {formatPercent(marginRate)}
                </span>
              </div>
            )}

            {calculationMode === "price" && (
              <>
                <div className="mt-2 flex items-center justify-between py-1 text-sm">
                  <span className="text-[#a8a098]">입력 판매가</span>
                  <span className={getAmountClass(targetSalePrice)}>
                    {numberFormat(targetSalePrice)}원
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between py-1 text-sm">
                  <span className="text-[#a8a098]">역산 마진율</span>
                  <span className={getPercentClass(calculations.impliedOnlineMarginRate)}>
                    {formatPercent(calculations.impliedOnlineMarginRate)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div className="rounded-[24px] border border-[#4f4740] bg-[#181c20] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <h3 className="mb-3 text-base font-bold text-[#f7f8fb]">원가 요약</h3>
            <div className="space-y-3">
              <ResultRow
                label="기본 원가 합계"
                value={
                  <span className={getAmountClass(calculations.baseCost)}>
                    {numberFormat(calculations.baseCost)}원
                  </span>
                }
              />
              <ResultRow
                label="불량 반영 비용"
                value={
                  <span className={getAmountClass(calculations.defectCost)}>
                    {numberFormat(calculations.defectCost)}원
                  </span>
                }
              />
              <ResultRow
                label="총 원가"
                emphasize
                value={
                  <span className={getAmountClass(calculations.totalCost, { emphasize: true })}>
                    {numberFormat(calculations.totalCost)}원
                  </span>
                }
              />
            </div>
          </div>

          {selectedChannels.includes("online") && (
            <div className="rounded-[24px] border border-[#4f4740] bg-[#181c20] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-[#f7f8fb]">온라인</h3>
                <span className="rounded-full border border-[#22b7ff]/40 bg-[#0f1b22] px-3 py-1 text-[11px] font-bold text-[#70d9ff]">
                  Online
                </span>
              </div>
              <div className="space-y-3">
                <ResultRow
                  label="판매가"
                  emphasize
                  value={
                    <span className={getAmountClass(calculations.online.price, { emphasize: true })}>
                      {numberFormat(calculations.online.price)}원
                    </span>
                  }
                />
                <ResultRow
                  label="플랫폼 수수료"
                  value={
                    <span className={getAmountClass(calculations.online.platformFee)}>
                      {numberFormat(calculations.online.platformFee)}원
                    </span>
                  }
                />
                <ResultRow
                  label="중간판매 수수료"
                  value={
                    <span className={getAmountClass(calculations.online.middleFee)}>
                      {numberFormat(calculations.online.middleFee)}원
                    </span>
                  }
                />
                <ResultRow
                  label="수익"
                  value={
                    <span className={getAmountClass(calculations.online.profit)}>
                      {numberFormat(calculations.online.profit)}원
                    </span>
                  }
                />
                <ResultRow
                  label="수익률"
                  value={
                    <span className={getPercentClass(calculations.online.marginRate)}>
                      {formatPercent(calculations.online.marginRate)}
                    </span>
                  }
                />
              </div>
            </div>
          )}

          {selectedChannels.includes("offline") && (
            <div className="rounded-[24px] border border-[#4f4740] bg-[#181c20] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-[#f7f8fb]">오프라인</h3>
                <span className="rounded-full border border-[#22b7ff]/30 bg-[#10161b] px-3 py-1 text-[11px] font-bold text-[#b5dfff]">
                  Offline
                </span>
              </div>
              <div className="space-y-3">
                <ResultRow
                  label="납품가"
                  emphasize
                  value={
                    <span className={getAmountClass(calculations.offline.price, { emphasize: true })}>
                      {numberFormat(calculations.offline.price)}원
                    </span>
                  }
                />
                <ResultRow
                  label="중간판매 수수료"
                  value={
                    <span className={getAmountClass(calculations.offline.middleFee)}>
                      {numberFormat(calculations.offline.middleFee)}원
                    </span>
                  }
                />
                <ResultRow
                  label="수익"
                  value={
                    <span className={getAmountClass(calculations.offline.profit)}>
                      {numberFormat(calculations.offline.profit)}원
                    </span>
                  }
                />
                <ResultRow
                  label="수익률"
                  value={
                    <span className={getPercentClass(calculations.offline.marginRate)}>
                      {formatPercent(calculations.offline.marginRate)}
                    </span>
                  }
                />
              </div>
            </div>
          )}

          {selectedChannels.includes("distribution") && (
            <div className="rounded-[24px] border border-[#4f4740] bg-[#181c20] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-[#f7f8fb]">유통</h3>
                <span className="rounded-full border border-[#79e8ff]/40 bg-[#122027] px-3 py-1 text-[11px] font-bold text-[#8be9ff]">
                  Distribution
                </span>
              </div>
              <div className="space-y-3">
                <ResultRow
                  label="유통사 납품가"
                  emphasize
                  value={
                    <span
                      className={getAmountClass(calculations.distribution.price, {
                        emphasize: true,
                      })}
                    >
                      {numberFormat(calculations.distribution.price)}원
                    </span>
                  }
                />
                <ResultRow
                  label="유통사 마진금액"
                  value={
                    <span className={getAmountClass(calculations.distributorMarginAmount)}>
                      {numberFormat(calculations.distributorMarginAmount)}원
                    </span>
                  }
                />
                <ResultRow
                  label="유통사 마진율"
                  value={
                    <span className={getPercentClass(calculations.distributorMarginRate)}>
                      {formatPercent(calculations.distributorMarginRate)}
                    </span>
                  }
                />
                <ResultRow
                  label="중간판매 수수료"
                  value={
                    <span className={getAmountClass(calculations.distribution.middleFee)}>
                      {numberFormat(calculations.distribution.middleFee)}원
                    </span>
                  }
                />
                <ResultRow
                  label="제조사 수익"
                  value={
                    <span className={getAmountClass(calculations.distribution.profit)}>
                      {numberFormat(calculations.distribution.profit)}원
                    </span>
                  }
                />
                <ResultRow
                  label="제조사 수익률"
                  value={
                    <span className={getPercentClass(calculations.distribution.marginRate)}>
                      {formatPercent(calculations.distribution.marginRate)}
                    </span>
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}