"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type PriceMode = "wholesale" | "retail";

type CompanySettings = {
  companyName?: string;
  ceoName?: string;
  businessNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  logoDataUrl?: string;
};

type PriceItem = {
  id: string;
  image?: string;
  name: string;
  spec: string;
  unit: string;
  quantity: number;
  wholesalePrice: number;
  retailPrice: number;
  note: string;
};

type SavedPriceList = {
  id: string;
  documentNumber: string;
  title: string;
  priceMode: PriceMode;
  effectiveDate: string;
  notice: string;
  clientName?: string;
  clientManager?: string;
  clientPhone?: string;
  items: PriceItem[];
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "wantb-price-lists";
const SEQ_KEY = "wantb-price-list-seq";
const CURRENT_NUMBER_KEY = "wantb-current-price-list-number";
const COMPANY_KEY = "wantb-company-settings";

const ITEMS_PER_FIRST_PAGE = 12;
const ITEMS_PER_NEXT_PAGE = 12;

const createEmptyItem = (): PriceItem => ({
  id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  image: "",
  name: "",
  spec: "",
  unit: "",
  quantity: 0,
  wholesalePrice: 0,
  retailPrice: 0,
  note: "",
});

const formatNumber = (value: number) => {
  if (!Number.isFinite(value)) return "0";
  return Math.round(value).toLocaleString("ko-KR");
};

const toNumber = (value: string | number) => {
  const cleaned = String(value).replace(/,/g, "").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const inputClass =
  "w-full rounded-2xl border border-[#34404b] bg-[#0c1117] px-4 py-2.5 text-sm text-[#f4f8fb] outline-none focus:border-[#22b7ff]";

const cardClass =
  "rounded-[28px] border border-[#2d3742] bg-[#1b2026] p-5 shadow-[0_12px_28px_rgba(0,0,0,0.28)]";

const buttonBlue =
  "rounded-2xl border border-[#22b7ff] bg-[#1aa7f7] px-4 py-2 text-sm font-semibold text-white";

const buttonDark =
  "rounded-2xl border border-[#34404b] bg-[#11161d] px-4 py-2 text-sm font-semibold text-[#dce6ef]";

export default function PriceListPage() {
  const previewRef = useRef<HTMLDivElement | null>(null);

  const [documentNumber, setDocumentNumber] = useState("");
  const [title, setTitle] = useState("유통 단가표");
  const [priceMode, setPriceMode] = useState<PriceMode>("wholesale");
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [notice, setNotice] = useState("단가 변동 가능 / 주문 전 최종 확인");
  const [clientName, setClientName] = useState("");
  const [clientManager, setClientManager] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const [company, setCompany] = useState<CompanySettings>({});
  const [items, setItems] = useState<PriceItem[]>([
    createEmptyItem(),
    createEmptyItem(),
    createEmptyItem(),
  ]);

  useEffect(() => {
    const companyRaw = localStorage.getItem(COMPANY_KEY);
    if (companyRaw) setCompany(JSON.parse(companyRaw));

    const seq = Number(localStorage.getItem(SEQ_KEY) || "0") + 1;
    localStorage.setItem(SEQ_KEY, String(seq));

    const num = `PL-${new Date().getFullYear()}-${String(seq).padStart(4, "0")}`;
    setDocumentNumber(num);
  }, []);

  const displayItems = useMemo(() => {
    return items.map((item) => {
      const unitPrice =
        priceMode === "wholesale"
          ? item.wholesalePrice
          : item.retailPrice;

      return {
        ...item,
        displayPrice: unitPrice,
        amount: unitPrice * item.quantity,
      };
    });
  }, [items, priceMode]);
  const pagedItems = useMemo(() => {
  if (displayItems.length <= ITEMS_PER_FIRST_PAGE) {
    return [displayItems];
  }

  const firstPage = displayItems.slice(0, ITEMS_PER_FIRST_PAGE);
  const rest = displayItems.slice(ITEMS_PER_FIRST_PAGE);

  const nextPages: typeof displayItems[] = [];
  for (let i = 0; i < rest.length; i += ITEMS_PER_NEXT_PAGE) {
    nextPages.push(rest.slice(i, i + ITEMS_PER_NEXT_PAGE));
  }

  return [firstPage, ...nextPages];
}, [displayItems]);

  const addRow = () => {
    setItems((prev) => [...prev, createEmptyItem()]);
  };

  const updateItem = (
    id: string,
    key: keyof PriceItem,
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [key]:
                key === "quantity" ||
                key === "wholesalePrice" ||
                key === "retailPrice"
                  ? toNumber(value)
                  : value,
            }
          : row
      )
    );
  };

  const removeRow = (id: string) => {
    setItems((prev) =>
      prev.length === 1
        ? [createEmptyItem()]
        : prev.filter((row) => row.id !== id)
    );
  };

  return (
    <div className="min-h-screen bg-[#07090c] px-6 py-6">
      <div className="mx-auto grid max-w-[2520px] grid-cols-1 gap-5 xl:grid-cols-[1180px_minmax(0,1fr)]">

        {/* LEFT */}
        <section className="min-w-0 space-y-5">

          <div className={cardClass}>
            <h1 className="text-2xl font-bold text-white">유통 단가표</h1>
            <p className="mt-1 text-sm text-[#9fb0bf]">
              실무형 대량 입력 + 거래처 배포용 가격표
            </p>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <input
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                className={inputClass}
                placeholder="문서번호"
              />

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
                placeholder="문서명"
              />

              <button
                onClick={() => setPriceMode("wholesale")}
                className={
                  priceMode === "wholesale" ? buttonBlue : buttonDark
                }
              >
                도매가 기준
              </button>

              <button
                onClick={() => setPriceMode("retail")}
                className={
                  priceMode === "retail" ? buttonBlue : buttonDark
                }
              >
                소매가 기준
              </button>

              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className={inputClass}
              />

              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className={inputClass}
                placeholder="거래처 상호"
              />

              <input
                value={clientManager}
                onChange={(e) => setClientManager(e.target.value)}
                className={inputClass}
                placeholder="담당자"
              />

              <input
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className={inputClass}
                placeholder="전화번호"
              />

              <textarea
                value={notice}
                onChange={(e) => setNotice(e.target.value)}
                className={`${inputClass} col-span-2 h-[80px] resize-none`}
              />
            </div>
          </div>

          <div className={cardClass}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">품목 입력</h2>

              <button onClick={addRow} className={buttonBlue}>
                행 추가
              </button>
            </div>

            <div className="max-h-[540px] overflow-auto rounded-2xl border border-[#2d3742]">
              <table className="w-full min-w-[1100px] border-collapse text-sm">
                <thead className="sticky top-0 bg-[#151a20] text-[#dce6ef]">
                  <tr>
                    <th className="p-2 border-b border-[#2d3742]">이미지</th>
                    <th className="p-2 border-b border-[#2d3742]">제품명</th>
                    <th className="p-2 border-b border-[#2d3742]">규격</th>
                    <th className="p-2 border-b border-[#2d3742]">단위</th>
                    <th className="p-2 border-b border-[#2d3742]">수량</th>
                    <th className="p-2 border-b border-[#2d3742]">도매가</th>
                    <th className="p-2 border-b border-[#2d3742]">소매가</th>
                    <th className="p-2 border-b border-[#2d3742]">비고</th>
                    <th className="p-2 border-b border-[#2d3742]">삭제</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="bg-[#0d1218]">
                      <td className="p-2 border-t border-[#2d3742]">
                        <div className="h-10 w-10 rounded bg-[#1f2630]" />
                      </td>

                      <td className="p-2 border-t border-[#2d3742]">
                        <input
                          value={row.name}
                          onChange={(e) =>
                            updateItem(row.id, "name", e.target.value)
                          }
                          className={inputClass}
                        />
                      </td>

                      <td className="p-2 border-t border-[#2d3742]">
                        <input
                          value={row.spec}
                          onChange={(e) =>
                            updateItem(row.id, "spec", e.target.value)
                          }
                          className={inputClass}
                        />
                      </td>
                                            <td className="p-2 border-t border-[#2d3742]">
                        <input
                          value={row.unit}
                          onChange={(e) =>
                            updateItem(row.id, "unit", e.target.value)
                          }
                          className={inputClass}
                        />
                      </td>

                      <td className="p-2 border-t border-[#2d3742]">
                        <input
                          value={row.quantity === 0 ? "" : String(row.quantity)}
                          onChange={(e) =>
                            updateItem(row.id, "quantity", e.target.value)
                          }
                          className={`${inputClass} text-right`}
                        />
                      </td>

                      <td className="p-2 border-t border-[#2d3742]">
                        <input
                          value={
                            row.wholesalePrice === 0
                              ? ""
                              : String(row.wholesalePrice)
                          }
                          onChange={(e) =>
                            updateItem(row.id, "wholesalePrice", e.target.value)
                          }
                          className={`${inputClass} text-right`}
                        />
                      </td>

                      <td className="p-2 border-t border-[#2d3742]">
                        <input
                          value={
                            row.retailPrice === 0
                              ? ""
                              : String(row.retailPrice)
                          }
                          onChange={(e) =>
                            updateItem(row.id, "retailPrice", e.target.value)
                          }
                          className={`${inputClass} text-right`}
                        />
                      </td>

                      <td className="p-2 border-t border-[#2d3742]">
                        <input
                          value={row.note}
                          onChange={(e) =>
                            updateItem(row.id, "note", e.target.value)
                          }
                          className={inputClass}
                        />
                      </td>

                      <td className="p-2 border-t border-[#2d3742] text-center">
                        <button
                          onClick={() => removeRow(row.id)}
                          className={buttonDark}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={cardClass}>
            <h2 className="mb-3 text-lg font-bold text-white">저장 / 출력</h2>

            <div className="grid grid-cols-2 gap-3">
              <button className={buttonBlue}>단가표 저장</button>
              <button className={buttonDark}>PNG 저장</button>
              <button className={buttonDark}>JPG 저장</button>
              <button className={buttonDark}>PDF 저장</button>
              <button className={buttonDark}>이메일 발송</button>
              <button className={buttonDark}>인쇄</button>
            </div>

            <button className={`${buttonDark} mt-3 w-full`}>
              새 단가표 작성
            </button>
          </div>
        </section>

        {/* RIGHT */}
        <section className="min-w-0 flex-1">
          <div className={cardClass}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">출력 미리보기</h2>
                <p className="text-sm text-[#a9b4bf]">
                  기존 Price List 구조는 유지하고 컬러 톤만 전체 프로그램과 맞췄습니다.
                </p>
              </div>

              <div className="rounded-full border border-[#34404b] bg-[#11161d] px-4 py-2 text-sm font-semibold text-[#dce6ef]">
                {priceMode === "wholesale" ? "도매 데이터 적용" : "소매 데이터 적용"}
              </div>
            </div>

            <div className="overflow-auto rounded-[26px] border border-[#27313b] bg-[#0b0f14] p-6">
              <div ref={previewRef} className="space-y-8">
                {pagedItems.map((pageItems, pageIndex) => {
                  const isFirstPage = pageIndex === 0;
                  const targetCount = isFirstPage
                    ? ITEMS_PER_FIRST_PAGE
                    : ITEMS_PER_NEXT_PAGE;

                  return (
                    <div
                      key={`page-${pageIndex}`}
                      data-price-page="true"
                      className="mx-auto h-[1123px] w-[794px] overflow-hidden bg-white shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
                    >
                      <div className="flex h-full w-full items-start justify-center overflow-hidden bg-white">
                        <div
                          style={{
                            width: "794px",
                            height: "1123px",
                            transform: "scale(0.93)",
                            transformOrigin: "top center",
                          }}
                          className="bg-white"
                        >
                          <div className="flex h-full flex-col">
                            {isFirstPage ? (
                              <div className="border-b border-gray-300 px-7 py-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-center gap-4">
                                    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white">
                                      {company.logoDataUrl ? (
                                        <img
                                          src={company.logoDataUrl}
                                          alt="회사 로고"
                                          className="h-full w-full object-contain"
                                        />
                                      ) : (
                                        <span className="text-[9px] text-gray-400">
                                          LOGO
                                        </span>
                                      )}
                                    </div>

                                    <div>
                                      <div className="text-[22px] font-bold tracking-tight text-gray-900">
                                        {title}
                                      </div>
                                      <div className="text-[13px] text-gray-500">
                                        {documentNumber} · {effectiveDate}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="max-w-[210px] text-right text-[12px] leading-5 text-gray-500">
                                    <div className="break-words">{notice}</div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="border-b border-gray-300 px-7 py-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-[17px] font-bold text-gray-900">
                                      {title}
                                    </div>
                                    <div className="text-[12px] text-gray-500">
                                      {effectiveDate}
                                    </div>
                                  </div>

                                  <div className="text-[11px] text-gray-400">
                                    Page {pageIndex + 1}
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="flex-1 px-1 py-4">
                              <div className="overflow-hidden rounded-xl border border-gray-300">
                                <table className="w-full table-fixed border-collapse">
                                  <colgroup>
                                    <col style={{ width: "96px" }} />
                                    <col style={{ width: "155px" }} />
                                    <col style={{ width: "78px" }} />
                                    <col style={{ width: "46px" }} />
                                    <col style={{ width: "50px" }} />
                                    <col style={{ width: "82px" }} />
                                    <col style={{ width: "92px" }} />
                                    <col style={{ width: "125px" }} />
                                  </colgroup>

                                  <thead>
                                    <tr className="bg-white text-gray-900">
                                      <th className="whitespace-nowrap border-b border-gray-300 px-2 py-3 text-center align-middle text-[13px] font-bold">
                                        이미지
                                      </th>
                                      <th className="whitespace-nowrap border-b border-gray-300 px-2 py-3 text-center align-middle text-[13px] font-bold">
                                        제품명
                                      </th>
                                      <th className="whitespace-nowrap border-b border-gray-300 px-2 py-3 text-center align-middle text-[13px] font-bold">
                                        규격
                                      </th>
                                      <th className="whitespace-nowrap border-b border-gray-300 px-2 py-3 text-center align-middle text-[13px] font-bold">
                                        단위
                                      </th>
                                      <th className="whitespace-nowrap border-b border-gray-300 px-2 py-3 text-center align-middle text-[13px] font-bold">
                                        수량
                                      </th>
                                      <th className="whitespace-nowrap border-b border-gray-300 px-2 py-3 text-center align-middle text-[13px] font-bold">
                                        금액
                                      </th>
                                      <th className="whitespace-nowrap border-b border-gray-300 px-2 py-3 text-center align-middle text-[13px] font-bold">
                                        합계
                                      </th>
                                      <th className="whitespace-nowrap border-b border-gray-300 px-2 py-3 text-center align-middle text-[13px] font-bold">
                                        비고
                                      </th>
                                    </tr>
                                  </thead>

                                  <tbody>
                                    {pageItems.map((item, index) => (
                                      <tr
                                        key={item.id}
                                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                                      >
                                        <td className="border-t border-gray-200 px-2 py-0.5 text-center align-middle">
                                          <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white">
                                            {item.image ? (
                                              <img
                                                src={item.image}
                                                alt={item.name || "제품"}
                                                className="h-full w-full object-cover"
                                              />
                                            ) : (
                                              <span className="text-[11px] text-gray-400">
                                                IMG
                                              </span>
                                            )}
                                          </div>
                                        </td>

                                        <td className="border-t border-gray-200 px-2 py-0.5 text-center align-middle text-[13px] font-semibold text-gray-900">
                                          <div className="truncate">{item.name || "-"}</div>
                                        </td>

                                        <td className="border-t border-gray-200 px-2 py-0.5 text-center align-middle text-[13px] text-gray-700">
                                          <div className="truncate">{item.spec || "-"}</div>
                                        </td>

                                        <td className="border-t border-gray-200 px-2 py-0.5 text-center align-middle text-[13px] text-gray-700">
                                          {item.unit || "-"}
                                        </td>

                                        <td className="border-t border-gray-200 px-2 py-0.5 text-center align-middle text-[13px] text-gray-700">
                                          {formatNumber(item.quantity)}
                                        </td>

                                        <td className="border-t border-gray-200 px-2 py-0.5 text-center align-middle text-[13px] font-semibold text-gray-900">
                                          {formatNumber(item.displayPrice)}원
                                        </td>

                                        <td className="border-t border-gray-200 px-2 py-0.5 text-center align-middle text-[13px] font-semibold text-gray-900">
                                          {formatNumber(item.amount)}원
                                        </td>

                                        <td className="border-t border-gray-200 px-2 py-0.5 text-center align-middle text-[12px] text-gray-700">
                                          <div className="truncate">{item.note || "-"}</div>
                                        </td>
                                      </tr>
                                    ))}

                                    {Array.from({
                                      length: targetCount - pageItems.length,
                                    }).map((_, index) => (
                                      <tr key={`empty-${pageIndex}-${index}`}>
                                        <td className="border-t border-gray-200 px-2 py-[4px]" />
                                        <td className="border-t border-gray-200 px-2 py-[4px]" />
                                        <td className="border-t border-gray-200 px-2 py-[4px]" />
                                        <td className="border-t border-gray-200 px-2 py-[4px]" />
                                        <td className="border-t border-gray-200 px-2 py-[4px]" />
                                        <td className="border-t border-gray-200 px-2 py-[4px]" />
                                        <td className="border-t border-gray-200 px-2 py-[4px]" />
                                        <td className="border-t border-gray-200 px-2 py-[4px]" />
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            <div className="border-t border-gray-300 px-7 py-2">
                              <div className="flex items-center justify-end">
                                <div className="text-right text-[12px] text-gray-400">
                                  {pageIndex + 1} / {pagedItems.length}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}