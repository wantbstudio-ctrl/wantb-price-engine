"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
      ? "text-[22px] font-bold tracking-tight text-[#9aa6b2]"
      : "font-semibold text-[#9aa6b2]";
  }

  return emphasize
    ? "text-[22px] font-bold tracking-tight text-[#f8fafc]"
    : "font-semibold text-[#f8fafc]";
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
      ? "text-[22px] font-bold tracking-tight text-[#9aa6b2]"
      : "font-semibold text-[#9aa6b2]";
  }

  return emphasize
    ? "text-[22px] font-bold tracking-tight text-[#f8fafc]"
    : "font-semibold text-[#f8fafc]";
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getSelectionButtonClass(active: boolean, extra?: string) {
  return cn(
    "wb-btn flex items-center justify-center text-center",
    active ? "wb-btn-primary" : "wb-btn-secondary",
    extra
  );
}

function getActionButtonClass(
  variant: "primary" | "secondary" | "danger",
  extra?: string
) {
  return cn(
    "wb-btn flex items-center justify-center text-center",
    variant === "primary" && "wb-btn-primary",
    variant === "secondary" && "wb-btn-secondary",
    variant === "danger" && "wb-btn-danger",
    extra
  );
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
    <div className="mb-4 flex items-end justify-between gap-3 border-b border-[#2a3440] pb-3">
      <div>
        <h3 className="text-[18px] font-light tracking-tight text-[#38BDF8]">
  {title}
</h3>
        {description && (
          <p className="wb-subtitle mt-1 text-xs leading-5">{description}</p>
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
        divider ? "border-b border-[#26313d] pb-3" : ""
      }`}
    >
      <span
        className={
          emphasize
            ? "text-sm font-semibold text-[#dbe7f3]"
            : "text-sm text-[#9fb0c3]"
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
useEffect(() => {
  setText(String(value ?? 0));
}, [value]);
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[#dbe7f3]">{label}</label>

      <div className="relative">
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
          className={`w-full px-4 py-3.5 text-[15px] font-medium ${
            suffix ? "pr-14" : ""
          }`}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#8fd8ff]">
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
    const onlineProfit =
      onlinePrice - totalCost - onlinePlatformFee - onlineMiddleFee;
    const onlineMarginRate =
      onlinePrice > 0
        ? safePercent(Math.round((onlineProfit / onlinePrice) * 1000) / 10)
        : 0;

    const offlinePrice = Math.round(
      onlinePrice * (1 - normalizedOfflineDiscount)
    );
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
        distributorMarginAmount = Math.max(
          0,
          retailPrice - distributorSupplyPrice
        );
        distributorMarginRate =
          retailPrice > 0
            ? safePercent(
                Math.round((distributorMarginAmount / retailPrice) * 1000) / 10
              )
            : 0;
      } else if (distributorInputMode === "marginAmount") {
        distributorMarginAmount = Math.round(Number(distributorInputValue || 0));
        distributorSupplyPrice = Math.max(
          0,
          retailPrice - distributorMarginAmount
        );
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
        distributorSupplyPrice = Math.max(
          0,
          retailPrice - distributorMarginAmount
        );
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
    <div className="wb-page wb-page-2col">
      <div className="wb-card h-full">
        <div className="mb-6 flex flex-col gap-3 border-b border-[#2a3440] pb-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex rounded-full border border-[#38bdf8]/40 bg-[#0b1822] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#7dd3fc]">
              Dashboard
            </span>
            <span className="inline-flex rounded-full border border-[#2b3642] bg-[#12171d] px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-[#b9c7d6]">
              Selling Price Calculator
            </span>
          </div>

          <div>
            <h1 className="text-[29px] font-light tracking-tight text-[#38BDF8]">
  판매가 계산기
</h1>
            <p className="wb-subtitle mt-2">
              다른 카테고리와 톤을 맞춘 쿨톤 다크 기준의 판매가 계산 화면입니다.
            </p>
          </div>
        </div>

        <SectionTitle
          title="기본 정보 입력"
          description="원가, 수수료, 할인 기준을 입력해 판매가와 수익 구조를 바로 계산합니다."
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-medium text-[#dbe7f3]">
              제품명
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full px-4 py-3.5 text-[15px] font-medium"
              placeholder="제품명을 입력하세요"
            />
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

          <div className="wb-panel md:col-span-2">
            <label className="mb-3 block text-sm font-medium text-[#dbe7f3]">
              계산 기준
            </label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <button
                type="button"
                onClick={() => setCalculationMode("margin")}
                className={getSelectionButtonClass(
                  calculationMode === "margin",
                  "w-full"
                )}
              >
                목표 마진 기준
              </button>

              <button
                type="button"
                onClick={() => setCalculationMode("price")}
                className={getSelectionButtonClass(
                  calculationMode === "price",
                  "w-full"
                )}
              >
                판매가 기준
              </button>

              <button
                type="button"
                onClick={() => setCalculationMode("distributor")}
                className={getSelectionButtonClass(
                  calculationMode === "distributor",
                  "w-full"
                )}
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

              <div className="wb-panel">
                <label className="mb-3 block text-sm font-medium text-[#dbe7f3]">
                  유통 계산 기준
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDistributorInputMode("supplyPrice")}
                    className={getSelectionButtonClass(
                      distributorInputMode === "supplyPrice",
                      "w-full px-3"
                    )}
                  >
                    납품가 기준
                  </button>

                  <button
                    type="button"
                    onClick={() => setDistributorInputMode("marginAmount")}
                    className={getSelectionButtonClass(
                      distributorInputMode === "marginAmount",
                      "w-full px-3"
                    )}
                  >
                    마진금액 기준
                  </button>

                  <button
                    type="button"
                    onClick={() => setDistributorInputMode("marginRate")}
                    className={getSelectionButtonClass(
                      distributorInputMode === "marginRate",
                      "w-full px-3"
                    )}
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
            <label className="block text-sm font-medium text-[#dbe7f3]">
              중간판매 수수료
            </label>

            <div className="flex overflow-hidden rounded-2xl border border-[#33404d] bg-[#1b2128] transition-all duration-200 hover:border-[#3b4654] focus-within:border-[#60a5fa] focus-within:bg-[#242c35] focus-within:shadow-[0_0_0_3px_rgba(96,165,250,0.2)]">
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
                  if (
                    e.target.value === "" ||
                    Number.isNaN(Number(e.target.value))
                  ) {
                    setMiddleFeeValue(0);
                    e.target.value = "0";
                    return;
                  }
                  const normalized = clampToZero(Number(e.target.value));
                  setMiddleFeeValue(normalized);
                  e.target.value = String(normalized);
                }}
                className="w-full rounded-none border-0 bg-transparent px-4 py-3.5 text-[15px] font-medium text-[#f8fafc] outline-none shadow-none focus:border-0 focus:shadow-none hover:bg-transparent"
              />

              <div className="flex border-l border-[#33404d]">
                <button
                  type="button"
                  onClick={() => setMiddleFeeType("percent")}
                  className={cn(
                    "min-w-[60px] border-0 px-3 text-sm font-semibold transition",
                    middleFeeType === "percent"
                      ? "bg-[#0d1a24] text-[#f8fafc]"
                      : "bg-[#1a2129] text-[#d9e4ef]"
                  )}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setMiddleFeeType("fixed")}
                  className={cn(
                    "min-w-[60px] border-l border-[#33404d] px-3 text-sm font-semibold transition",
                    middleFeeType === "fixed"
                      ? "bg-[#0d1a24] text-[#f8fafc]"
                      : "bg-[#1a2129] text-[#d9e4ef]"
                  )}
                >
                  원
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="wb-panel mt-7">
          <label className="mb-3 block text-sm font-medium text-[#dbe7f3]">
            채널 선택
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleToggleChannel("online")}
              className={getSelectionButtonClass(
                selectedChannels.includes("online"),
                "px-5"
              )}
            >
              온라인
            </button>

            <button
              type="button"
              onClick={() => handleToggleChannel("offline")}
              className={getSelectionButtonClass(
                selectedChannels.includes("offline"),
                "px-5"
              )}
            >
              오프라인
            </button>

            <button
              type="button"
              onClick={() => handleToggleChannel("distribution")}
              className={getSelectionButtonClass(
                selectedChannels.includes("distribution"),
                "px-5"
              )}
            >
              유통
            </button>
          </div>
        </div>

        <div className="wb-actions mt-8">
          <button
            type="button"
            onClick={handleCreateEstimate}
            className={getActionButtonClass("primary", "px-5")}
          >
            견적 만들기
          </button>

          <button
            type="button"
            onClick={handleReset}
            className={getActionButtonClass("danger", "px-5")}
          >
            초기화
          </button>
        </div>
      </div>

      <div className="wb-card h-full">
        <div className="mb-6 flex items-center justify-between gap-3 border-b border-[#2a3440] pb-5">
          <div>
            <h2 className="text-[29px] font-semibold tracking-tight text-white">
  자동 계산 결과
</h2>
            <p className="wb-subtitle mt-2">
              핵심 금액과 채널별 수익 구조를 한눈에 확인할 수 있도록 정리한
              결과 패널입니다.
            </p>
          </div>
          <span className="rounded-full border border-[#2b3642] bg-[#12171d] px-3 py-1 text-xs font-semibold text-[#b9c7d6]">
            Live Summary
          </span>
        </div>

        {calculationMode === "distributor" ? (
          <>
            <div className="rounded-[24px] border border-[#25313d] bg-[#11171d] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold tracking-tight text-[#f8fafc]">
                  제조사-유통 계산 요약
                </h3>
                <span className="rounded-full border border-[#67e8f9]/50 bg-[#0d1a22] px-3 py-1 text-xs font-bold text-[#8be9ff]">
                  제조사 기준
                </span>
              </div>

              <div className="space-y-3">
                <ResultRow
                  label="소비자가"
                  divider
                  value={
                    <span
                      className={getAmountClass(targetSalePrice, {
                        emphasize: true,
                      })}
                    >
                      {numberFormat(targetSalePrice)}원
                    </span>
                  }
                />

                <ResultRow
                  label="유통사 납품가"
                  emphasize
                  value={
                    <span
                      className={getAmountClass(
                        calculations.distributorSupplyPrice,
                        {
                          emphasize: true,
                        }
                      )}
                    >
                      {numberFormat(calculations.distributorSupplyPrice)}원
                    </span>
                  }
                />

                <ResultRow
                  label="유통사 마진금액"
                  value={
                    <span
                      className={getAmountClass(
                        calculations.distributorMarginAmount
                      )}
                    >
                      {numberFormat(calculations.distributorMarginAmount)}원
                    </span>
                  }
                />

                <ResultRow
                  label="유통사 마진율"
                  value={
                    <span
                      className={getPercentClass(
                        calculations.distributorMarginRate
                      )}
                    >
                      {formatPercent(calculations.distributorMarginRate)}
                    </span>
                  }
                />

                <div className="my-2 border-t border-[#26313d]" />

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
                      {numberFormat(
                        calculations.manufacturerProfitAtDistribution
                      )}
                      원
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
                      {formatPercent(
                        calculations.manufacturerProfitRateAtDistribution
                      )}
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
                      {formatPercent(
                        calculations.manufacturerProfitRateAgainstCost
                      )}
                    </span>
                  }
                />
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-[#25313d] bg-[#11171d] p-4">
              <div className="flex items-center justify-between py-1 text-sm">
                <span className="text-[#9fb0c3]">현재 계산 기준</span>
                <span className="font-bold text-[#f8fafc]">제조사-유통 기준</span>
              </div>
              <div className="mt-2 flex items-center justify-between py-1 text-sm">
                <span className="text-[#9fb0c3]">유통 계산 기준</span>
                <span className="font-bold text-[#f8fafc]">
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
          <div className="rounded-[24px] border border-[#25313d] bg-[#11171d] p-4">
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="text-[#9fb0c3]">현재 계산 기준</span>
              <span className="font-bold text-[#f8fafc]">
                {calculationMode === "margin" ? "목표 마진 기준" : "판매가 기준"}
              </span>
            </div>

            {calculationMode === "margin" && (
              <div className="mt-2 flex items-center justify-between py-1 text-sm">
                <span className="text-[#9fb0c3]">설정 목표 마진</span>
                <span className={getPercentClass(marginRate)}>
                  {formatPercent(marginRate)}
                </span>
              </div>
            )}

            {calculationMode === "price" && (
              <>
                <div className="mt-2 flex items-center justify-between py-1 text-sm">
                  <span className="text-[#9fb0c3]">입력 판매가</span>
                  <span className={getAmountClass(targetSalePrice)}>
                    {numberFormat(targetSalePrice)}원
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between py-1 text-sm">
                  <span className="text-[#9fb0c3]">역산 마진율</span>
                  <span
                    className={getPercentClass(
                      calculations.impliedOnlineMarginRate
                    )}
                  >
                    {formatPercent(calculations.impliedOnlineMarginRate)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div className="rounded-[24px] border border-[#25313d] bg-[#11171d] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <h3 className="mb-3 text-base font-bold text-[#f8fafc]">원가 요약</h3>
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
                  <span
                    className={getAmountClass(calculations.totalCost, {
                      emphasize: true,
                    })}
                  >
                    {numberFormat(calculations.totalCost)}원
                  </span>
                }
              />
            </div>
          </div>

          {selectedChannels.includes("online") && (
            <div className="rounded-[24px] border border-[#25313d] bg-[#11171d] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-[#f8fafc]">온라인</h3>
                <span className="rounded-full border border-[#38bdf8]/40 bg-[#0c1720] px-3 py-1 text-[11px] font-bold text-[#7dd3fc]">
                  Online
                </span>
              </div>
              <div className="space-y-3">
                <ResultRow
                  label="판매가"
                  emphasize
                  value={
                    <span
                      className={getAmountClass(calculations.online.price, {
                        emphasize: true,
                      })}
                    >
                      {numberFormat(calculations.online.price)}원
                    </span>
                  }
                />
                <ResultRow
                  label="플랫폼 수수료"
                  value={
                    <span
                      className={getAmountClass(
                        calculations.online.platformFee
                      )}
                    >
                      {numberFormat(calculations.online.platformFee)}원
                    </span>
                  }
                />
                <ResultRow
                  label="중간판매 수수료"
                  value={
                    <span
                      className={getAmountClass(calculations.online.middleFee)}
                    >
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
                    <span
                      className={getPercentClass(calculations.online.marginRate)}
                    >
                      {formatPercent(calculations.online.marginRate)}
                    </span>
                  }
                />
              </div>
            </div>
          )}

          {selectedChannels.includes("offline") && (
            <div className="rounded-[24px] border border-[#25313d] bg-[#11171d] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-[#f8fafc]">오프라인</h3>
                <span className="rounded-full border border-[#38bdf8]/28 bg-[#0d141b] px-3 py-1 text-[11px] font-bold text-[#c8e8ff]">
                  Offline
                </span>
              </div>
              <div className="space-y-3">
                <ResultRow
                  label="납품가"
                  emphasize
                  value={
                    <span
                      className={getAmountClass(calculations.offline.price, {
                        emphasize: true,
                      })}
                    >
                      {numberFormat(calculations.offline.price)}원
                    </span>
                  }
                />
                <ResultRow
                  label="중간판매 수수료"
                  value={
                    <span
                      className={getAmountClass(calculations.offline.middleFee)}
                    >
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
                    <span
                      className={getPercentClass(
                        calculations.offline.marginRate
                      )}
                    >
                      {formatPercent(calculations.offline.marginRate)}
                    </span>
                  }
                />
              </div>
            </div>
          )}

          {selectedChannels.includes("distribution") && (
            <div className="rounded-[24px] border border-[#25313d] bg-[#11171d] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-[#f8fafc]">유통</h3>
                <span className="rounded-full border border-[#67e8f9]/40 bg-[#0d1a21] px-3 py-1 text-[11px] font-bold text-[#8be9ff]">
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
                    <span
                      className={getAmountClass(
                        calculations.distributorMarginAmount
                      )}
                    >
                      {numberFormat(calculations.distributorMarginAmount)}원
                    </span>
                  }
                />
                <ResultRow
                  label="유통사 마진율"
                  value={
                    <span
                      className={getPercentClass(
                        calculations.distributorMarginRate
                      )}
                    >
                      {formatPercent(calculations.distributorMarginRate)}
                    </span>
                  }
                />
                <ResultRow
                  label="중간판매 수수료"
                  value={
                    <span
                      className={getAmountClass(
                        calculations.distribution.middleFee
                      )}
                    >
                      {numberFormat(calculations.distribution.middleFee)}원
                    </span>
                  }
                />
                <ResultRow
                  label="제조사 수익"
                  value={
                    <span
                      className={getAmountClass(calculations.distribution.profit)}
                    >
                      {numberFormat(calculations.distribution.profit)}원
                    </span>
                  }
                />
                <ResultRow
                  label="제조사 수익률"
                  value={
                    <span
                      className={getPercentClass(
                        calculations.distribution.marginRate
                      )}
                    >
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