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

const onlyNumberText = (value: string) => value.replace(/[^\d]/g, "");

const formatInputNumber = (value: number) => {
  if (!Number.isFinite(value) || value === 0) return "";
  return Math.round(value).toLocaleString("ko-KR");
};

const getInputKey = (rowIndex: number, colIndex: number) =>
  `${rowIndex}-${colIndex}`;

const EDITABLE_COLUMN_KEYS: Array<
  "name" | "spec" | "unit" | "quantity" | "wholesalePrice" | "retailPrice" | "note"
> = ["name", "spec", "unit", "quantity", "wholesalePrice", "retailPrice", "note"];

export default function PriceListPage() {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const cellInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [company, setCompany] = useState<CompanySettings>({});
  const [savedLists, setSavedLists] = useState<SavedPriceList[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

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

  const [items, setItems] = useState<PriceItem[]>([
    createEmptyItem(),
    createEmptyItem(),
    createEmptyItem(),
  ]);

  const generateNextDocumentNumber = () => {
    const currentYear = new Date().getFullYear();
    const currentSeq = Number(localStorage.getItem(SEQ_KEY) || "0") + 1;
    localStorage.setItem(SEQ_KEY, String(currentSeq));
    return `PL-${currentYear}-${String(currentSeq).padStart(4, "0")}`;
  };

  useEffect(() => {
    try {
      const companyRaw = localStorage.getItem(COMPANY_KEY);
      if (companyRaw) {
        setCompany(JSON.parse(companyRaw));
      }
    } catch (error) {
      console.error("회사 정보 로드 실패:", error);
    }

    try {
      const savedRaw = localStorage.getItem(STORAGE_KEY);
      if (savedRaw) {
        setSavedLists(JSON.parse(savedRaw));
      }
    } catch (error) {
      console.error("단가표 목록 로드 실패:", error);
    }

    const currentNumber = localStorage.getItem(CURRENT_NUMBER_KEY);
    if (currentNumber) {
      setDocumentNumber(currentNumber);
    } else {
      const nextNumber = generateNextDocumentNumber();
      setDocumentNumber(nextNumber);
      localStorage.setItem(CURRENT_NUMBER_KEY, nextNumber);
    }
  }, []);

  const displayItems = useMemo(() => {
    return items.map((item) => {
      const displayPrice =
        priceMode === "wholesale" ? item.wholesalePrice : item.retailPrice;
      const amount = displayPrice * item.quantity;

      return {
        ...item,
        displayPrice,
        amount,
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

  const allRowsSelected =
    items.length > 0 && selectedRowIds.length === items.length;

  const persistSavedLists = (next: SavedPriceList[]) => {
    setSavedLists(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const updateItem = (
    itemId: string,
    key: keyof PriceItem,
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [key]:
                key === "quantity" ||
                key === "wholesalePrice" ||
                key === "retailPrice"
                  ? typeof value === "number"
                    ? value
                    : toNumber(value)
                  : value,
            }
          : item
      )
    );
  };

  const handleNumericInputChange = (
    itemId: string,
    key: "quantity" | "wholesalePrice" | "retailPrice",
    rawValue: string
  ) => {
    const cleaned = onlyNumberText(rawValue);
    updateItem(itemId, key, cleaned === "" ? 0 : Number(cleaned));
  };

  const focusCell = (rowIndex: number, colIndex: number) => {
    const key = getInputKey(rowIndex, colIndex);
    const target = cellInputRefs.current[key];
    if (target) {
      target.focus();
      target.select();
    }
  };

  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: number
  ) => {
    const maxRow = items.length - 1;
    const maxCol = 6;

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusCell(rowIndex, Math.max(0, colIndex - 1));
      return;
    }

    if (e.key === "ArrowRight") {
      e.preventDefault();
      focusCell(rowIndex, Math.min(maxCol, colIndex + 1));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      focusCell(Math.max(0, rowIndex - 1), colIndex);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusCell(Math.min(maxRow, rowIndex + 1), colIndex);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();

      if (rowIndex === maxRow) {
        setItems((prev) => [...prev, createEmptyItem()]);
        setTimeout(() => {
          focusCell(rowIndex + 1, colIndex);
        }, 30);
      } else {
        focusCell(rowIndex + 1, colIndex);
      }
    }
  };

  const handleCellPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startRowIndex: number,
    startColIndex: number
  ) => {
    const pastedText = e.clipboardData.getData("text");
    if (!pastedText.trim()) return;

    e.preventDefault();

    const rows = pastedText
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .filter((row) => row.trim() !== "");

    if (!rows.length) return;

    const parsedRows = rows.map((row) => row.split("\t"));

    setItems((prev) => {
      const nextItems = [...prev];
      const requiredLength = startRowIndex + parsedRows.length;

      while (nextItems.length < requiredLength) {
        nextItems.push(createEmptyItem());
      }

      parsedRows.forEach((cells, pastedRowOffset) => {
        const targetRowIndex = startRowIndex + pastedRowOffset;
        const currentItem = nextItems[targetRowIndex];

        if (!currentItem) return;

        const updatedItem: PriceItem = { ...currentItem };

        cells.forEach((cellValue, pastedColOffset) => {
          const targetColIndex = startColIndex + pastedColOffset;
          if (targetColIndex < 0 || targetColIndex >= EDITABLE_COLUMN_KEYS.length) {
            return;
          }

          const targetKey = EDITABLE_COLUMN_KEYS[targetColIndex];
          const trimmedValue = cellValue.trim();

          if (
            targetKey === "quantity" ||
            targetKey === "wholesalePrice" ||
            targetKey === "retailPrice"
          ) {
            updatedItem[targetKey] = trimmedValue === "" ? 0 : toNumber(trimmedValue);
          } else {
            updatedItem[targetKey] = trimmedValue;
          }
        });

        nextItems[targetRowIndex] = updatedItem;
      });

      return nextItems;
    });

    const lastRowIndex = startRowIndex + parsedRows.length - 1;
    const lastColumnLength = parsedRows[parsedRows.length - 1]?.length ?? 1;
    const lastColIndex = Math.min(
      6,
      startColIndex + Math.max(0, lastColumnLength - 1)
    );

    setTimeout(() => {
      focusCell(lastRowIndex, lastColIndex);
    }, 50);
  };

  const addItem = (focusToNewRow = false) => {
    const nextRowIndex = items.length;
    setItems((prev) => [...prev, createEmptyItem()]);

    if (focusToNewRow) {
      setTimeout(() => {
        focusCell(nextRowIndex, 0);
      }, 30);
    }
  };

  const duplicateItem = (itemId: string) => {
    const sourceIndex = items.findIndex((item) => item.id === itemId);
    if (sourceIndex < 0) return;

    const sourceItem = items[sourceIndex];
    const duplicatedItem: PriceItem = {
      ...sourceItem,
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };

    setItems((prev) => {
      const next = [...prev];
      next.splice(sourceIndex + 1, 0, duplicatedItem);
      return next;
    });

    setTimeout(() => {
      focusCell(sourceIndex + 1, 0);
    }, 30);
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => {
      if (prev.length <= 1) {
        return [createEmptyItem()];
      }
      return prev.filter((item) => item.id !== itemId);
    });

    setSelectedRowIds((prev) => prev.filter((id) => id !== itemId));
  };

  const toggleRowSelection = (itemId: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const toggleSelectAllRows = () => {
    if (allRowsSelected) {
      setSelectedRowIds([]);
      return;
    }
    setSelectedRowIds(items.map((item) => item.id));
  };

  const deleteSelectedRows = () => {
    if (selectedRowIds.length === 0) {
      alert("삭제할 행을 먼저 선택해 주세요.");
      return;
    }

    const ok = window.confirm(
      `선택한 ${selectedRowIds.length}개 행을 삭제하시겠습니까?`
    );
    if (!ok) return;

    setItems((prev) => {
      const next = prev.filter((item) => !selectedRowIds.includes(item.id));
      return next.length > 0 ? next : [createEmptyItem()];
    });

    setSelectedRowIds([]);
  };

  const isRowEmpty = (item: PriceItem) => {
    return (
      !item.image &&
      item.name.trim() === "" &&
      item.spec.trim() === "" &&
      item.unit.trim() === "" &&
      item.quantity === 0 &&
      item.wholesalePrice === 0 &&
      item.retailPrice === 0 &&
      item.note.trim() === ""
    );
  };

  const clearEmptyRows = () => {
    setItems((prev) => {
      const next = prev.filter((item) => !isRowEmpty(item));
      return next.length > 0 ? next : [createEmptyItem()];
    });

    setSelectedRowIds((prev) =>
      prev.filter((id) => {
        const item = items.find((row) => row.id === id);
        return item ? !isRowEmpty(item) : false;
      })
    );
  };

  const handleImageUpload = (itemId: string, file?: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      updateItem(itemId, "image", result);
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    const nextNumber = generateNextDocumentNumber();
    localStorage.setItem(CURRENT_NUMBER_KEY, nextNumber);

    setSelectedId("");
    setSelectedRowIds([]);
    setDocumentNumber(nextNumber);
    setTitle("유통 단가표");
    setPriceMode("wholesale");
    setEffectiveDate(new Date().toISOString().slice(0, 10));
    setNotice("단가 변동 가능 / 주문 전 최종 확인");
    setClientName("");
    setClientManager("");
    setClientPhone("");
    setItems([createEmptyItem(), createEmptyItem(), createEmptyItem()]);
  };

  const buildPayload = (): SavedPriceList => {
    const now = new Date().toISOString();
    const existing = savedLists.find((item) => item.id === selectedId);

    return {
      id:
        selectedId ||
        `price-list-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      documentNumber,
      title,
      priceMode,
      effectiveDate,
      notice,
      clientName,
      clientManager,
      clientPhone,
      items,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
  };

  const handleSave = () => {
    const payload = buildPayload();

    let next: SavedPriceList[];
    if (selectedId) {
      next = savedLists.map((item) => (item.id === selectedId ? payload : item));
    } else {
      next = [payload, ...savedLists];
      setSelectedId(payload.id);
    }

    persistSavedLists(next);
    localStorage.setItem(CURRENT_NUMBER_KEY, payload.documentNumber);
    alert("단가표가 저장되었습니다.");
  };

  const handleLoad = (id: string) => {
    const found = savedLists.find((item) => item.id === id);
    if (!found) return;

    setSelectedId(found.id);
    setSelectedRowIds([]);
    setDocumentNumber(found.documentNumber);
    setTitle(found.title);
    setPriceMode(found.priceMode);
    setEffectiveDate(found.effectiveDate);
    setNotice(found.notice || "단가 변동 가능 / 주문 전 최종 확인");
    setClientName(found.clientName || "");
    setClientManager(found.clientManager || "");
    setClientPhone(found.clientPhone || "");
    setItems(found.items?.length ? found.items : [createEmptyItem()]);
  };

  const handleDelete = (id: string) => {
    const ok = window.confirm("이 단가표를 삭제하시겠습니까?");
    if (!ok) return;

    const next = savedLists.filter((item) => item.id !== id);
    persistSavedLists(next);

    if (selectedId === id) {
      resetForm();
    }
  };

  const getSafeBaseName = () => {
    const modeText = priceMode === "wholesale" ? "도매형" : "소매형";
    const dateText = effectiveDate || new Date().toISOString().slice(0, 10);
    return `${title}_${modeText}_${dateText}`.replace(/[\\/:*?"<>|]/g, "_");
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const getPageElements = () => {
    if (!previewRef.current) {
      throw new Error("미리보기 영역을 찾을 수 없습니다.");
    }

    const pageElements = Array.from(
      previewRef.current.querySelectorAll("[data-price-page='true']")
    ) as HTMLElement[];

    if (!pageElements.length) {
      throw new Error("출력 페이지를 찾을 수 없습니다.");
    }

    return pageElements;
  };

  const renderPageCanvas = async (pageElement: HTMLElement) => {
    return await html2canvas(pageElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });
  };

  const renderAllPageImages = async () => {
    const pageElements = getPageElements();
    const images: string[] = [];

    for (let i = 0; i < pageElements.length; i += 1) {
      const canvas = await renderPageCanvas(pageElements[i]);
      images.push(canvas.toDataURL("image/png"));
    }

    return images;
  };

  const createPdfBlob = async () => {
    const pageElements = getPageElements();
    const pdf = new jsPDF("p", "mm", "a4");

    for (let i = 0; i < pageElements.length; i += 1) {
      const canvas = await renderPageCanvas(pageElements[i]);
      const imgData = canvas.toDataURL("image/jpeg", 1.0);

      if (i > 0) {
        pdf.addPage();
      }

      pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
    }

    return pdf.output("blob");
  };

  const handleSavePNG = async () => {
    try {
      setIsExporting(true);

      const pageElements = getPageElements();
      const baseName = getSafeBaseName();

      for (let i = 0; i < pageElements.length; i += 1) {
        const canvas = await renderPageCanvas(pageElements[i]);
        const dataUrl = canvas.toDataURL("image/png");
        const blob = await (await fetch(dataUrl)).blob();
        const fileName =
          pageElements.length === 1
            ? `${baseName}.png`
            : `${baseName}_페이지${i + 1}.png`;

        downloadBlob(blob, fileName);
      }
    } catch (error) {
      console.error(error);
      alert("PNG 저장 중 오류가 발생했습니다.");
    } finally {
      setTimeout(() => {
        setIsExporting(false);
      }, 300);
    }
  };

  const handleSaveJPG = async () => {
    try {
      setIsExporting(true);

      const pageElements = getPageElements();
      const baseName = getSafeBaseName();

      for (let i = 0; i < pageElements.length; i += 1) {
        const canvas = await renderPageCanvas(pageElements[i]);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
        const blob = await (await fetch(dataUrl)).blob();
        const fileName =
          pageElements.length === 1
            ? `${baseName}.jpg`
            : `${baseName}_페이지${i + 1}.jpg`;

        downloadBlob(blob, fileName);
      }
    } catch (error) {
      console.error(error);
      alert("JPG 저장 중 오류가 발생했습니다.");
    } finally {
      setTimeout(() => {
        setIsExporting(false);
      }, 300);
    }
  };

  const handleSavePDF = async () => {
    try {
      setIsExporting(true);

      const blob = await createPdfBlob();
      const fileName = `${getSafeBaseName()}.pdf`;

      downloadBlob(blob, fileName);
    } catch (error) {
      console.error(error);
      alert("PDF 저장 중 오류가 발생했습니다.");
    } finally {
      setTimeout(() => {
        setIsExporting(false);
      }, 300);
    }
  };

  const handlePrint = async () => {
    try {
      setIsExporting(true);

      const images = await renderAllPageImages();

      const printWindow = window.open("", "_blank", "width=1000,height=900");
      if (!printWindow) {
        alert("인쇄 창을 열지 못했습니다. 팝업 차단 여부를 확인해 주세요.");
        return;
      }

      const pageHtml = images
        .map(
          (src) => `
            <div class="page">
              <img src="${src}" alt="print-page" />
            </div>
          `
        )
        .join("");

      printWindow.document.open();
      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ko">
          <head>
            <meta charset="UTF-8" />
            <title>${title} 인쇄</title>
            <style>
              @page {
                size: A4;
                margin: 0;
              }

              html, body {
                margin: 0;
                padding: 0;
                background: #ffffff;
              }

              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }

              .page {
                width: 210mm;
                height: 297mm;
                margin: 0 auto;
                page-break-after: always;
                break-after: page;
                overflow: hidden;
              }

              .page:last-child {
                page-break-after: auto;
                break-after: auto;
              }

              .page img {
                display: block;
                width: 210mm;
                height: 297mm;
                object-fit: fill;
              }

              @media screen {
                body {
                  background: #e5e7eb;
                  padding: 20px 0;
                }

                .page {
                  margin: 0 auto 16px auto;
                  box-shadow: 0 10px 24px rgba(0,0,0,0.12);
                }
              }
            </style>
          </head>
          <body>
            ${pageHtml}
            <script>
              const runPrint = () => {
                setTimeout(() => {
                  window.focus();
                  window.print();
                }, 700);
              };

              if (document.readyState === "complete") {
                runPrint();
              } else {
                window.addEventListener("load", runPrint);
              }

              window.addEventListener("afterprint", () => {
                setTimeout(() => window.close(), 300);
              });
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error(error);
      alert("인쇄 준비 중 오류가 발생했습니다.");
    } finally {
      setTimeout(() => {
        setIsExporting(false);
      }, 800);
    }
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`${title}`);
    const body = encodeURIComponent(
      [
        `${title}`,
        `문서번호: ${documentNumber}`,
        `기준일: ${effectiveDate}`,
        "",
        `거래처 상호: ${clientName || ""}`,
        `담당자: ${clientManager || ""}`,
        `연락처: ${clientPhone || ""}`,
        "",
        `회사명: ${company.companyName || ""}`,
        `회사 연락처: ${company.phone || ""}`,
        `회사 이메일: ${company.email || ""}`,
        "",
        `총 품목 수: ${displayItems.length}`,
      ].join("\n")
    );

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] px-6 py-6">
      <div className="mx-auto flex w-full max-w-[2320px] gap-6">
        <section className="w-[920px] shrink-0 space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-gray-900">유통 단가표</h1>
              <p className="mt-1 text-sm text-gray-500">
                상인 / 거래처 배포용 가격표 문서를 작성합니다.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  문서번호
                </label>
                <input
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  문서명
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  가격 기준
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPriceMode("wholesale")}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      priceMode === "wholesale"
                        ? "border-blue-700 bg-blue-700 text-white"
                        : "border-gray-300 bg-white text-gray-700"
                    }`}
                  >
                    도매가
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceMode("retail")}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      priceMode === "retail"
                        ? "border-blue-700 bg-blue-700 text-white"
                        : "border-gray-300 bg-white text-gray-700"
                    }`}
                  >
                    소매가
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  기준일
                </label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  거래처 상호
                </label>
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="상호"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  담당자
                </label>
                <input
                  value={clientManager}
                  onChange={(e) => setClientManager(e.target.value)}
                  placeholder="담당자"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-500"
                />
              </div>

              <div className="col-span-2">
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  전화번호
                </label>
                <input
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="전화번호"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-500"
                />
              </div>

              <div className="col-span-2">
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  안내 문구
                </label>
                <textarea
                  value={notice}
                  onChange={(e) => setNotice(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-500"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">품목 입력</h2>
                <p className="text-sm text-gray-500">
                  방향키(← → ↑ ↓), Tab, Enter, 엑셀 복붙을 지원합니다.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => addItem(true)}
                  className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  품목 추가
                </button>
                <button
                  type="button"
                  onClick={toggleSelectAllRows}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800"
                >
                  {allRowsSelected ? "전체 해제" : "전체 선택"}
                </button>
                <button
                  type="button"
                  onClick={deleteSelectedRows}
                  className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600"
                >
                  선택 삭제
                </button>
                <button
                  type="button"
                  onClick={clearEmptyRows}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800"
                >
                  빈 행 정리
                </button>
              </div>
            </div>

            <div className="mb-3 rounded-xl bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-600">
              선택 체크 후 일괄 삭제가 가능하며, 각 행의 <span className="font-semibold">복제</span> 버튼으로
              바로 아래 줄에 같은 품목을 복사할 수 있습니다.
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200">
              <div className="max-h-[540px] overflow-auto">
                <table className="w-full min-w-[1100px] border-collapse">
                  <thead className="sticky top-0 z-10 bg-gray-900 text-white">
                    <tr>
                      <th className="w-[52px] px-2 py-2 text-center text-[11px] font-semibold">
                        선택
                      </th>
                      <th className="w-[58px] px-2 py-2 text-center text-[11px] font-semibold">
                        이미지
                      </th>
                      <th className="w-[170px] px-2 py-2 text-left text-[11px] font-semibold">
                        제품명
                      </th>
                      <th className="w-[92px] px-2 py-2 text-left text-[11px] font-semibold">
                        규격
                      </th>
                      <th className="w-[56px] px-2 py-2 text-left text-[11px] font-semibold">
                        단위
                      </th>
                      <th className="w-[70px] px-2 py-2 text-right text-[11px] font-semibold">
                        수량
                      </th>
                      <th className="w-[92px] px-2 py-2 text-right text-[11px] font-semibold">
                        도매가
                      </th>
                      <th className="w-[92px] px-2 py-2 text-right text-[11px] font-semibold">
                        소매가
                      </th>
                      <th className="w-[140px] px-2 py-2 text-left text-[11px] font-semibold">
                        비고
                      </th>
                      <th className="w-[62px] px-2 py-2 text-center text-[11px] font-semibold">
                        복제
                      </th>
                      <th className="w-[64px] px-2 py-2 text-center text-[11px] font-semibold">
                        삭제
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((item, rowIndex) => (
                      <tr
                        key={item.id}
                        className={
                          selectedRowIds.includes(item.id)
                            ? "bg-blue-50"
                            : rowIndex % 2 === 0
                            ? "bg-white"
                            : "bg-gray-50"
                        }
                      >
                        <td className="border-t border-gray-200 px-2 py-1.5 text-center">
                          <input
                            type="checkbox"
                            checked={selectedRowIds.includes(item.id)}
                            onChange={() => toggleRowSelection(item.id)}
                            className="h-4 w-4 cursor-pointer rounded border-gray-300"
                          />
                        </td>

                        <td className="border-t border-gray-200 px-2 py-1.5 align-middle">
                          <div
                            className="mx-auto flex h-[36px] w-[36px] cursor-pointer items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white text-[9px] text-gray-500"
                            onClick={() => fileInputRefs.current[item.id]?.click()}
                          >
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name || "제품 이미지"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              "IMG"
                            )}
                          </div>
                          <input
                            ref={(el) => {
                              fileInputRefs.current[item.id] = el;
                            }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              handleImageUpload(item.id, e.target.files?.[0])
                            }
                          />
                        </td>

                        <td className="border-t border-gray-200 px-2 py-1.5">
                          <input
                            ref={(el) => {
                              cellInputRefs.current[getInputKey(rowIndex, 0)] = el;
                            }}
                            value={item.name}
                            onChange={(e) =>
                              updateItem(item.id, "name", e.target.value)
                            }
                            onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 0)}
                            onPaste={(e) => handleCellPaste(e, rowIndex, 0)}
                            placeholder="제품명"
                            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-[12px] outline-none focus:border-gray-500"
                          />
                        </td>

                        <td className="border-t border-gray-200 px-2 py-1.5">
                          <input
                            ref={(el) => {
                              cellInputRefs.current[getInputKey(rowIndex, 1)] = el;
                            }}
                            value={item.spec}
                            onChange={(e) =>
                              updateItem(item.id, "spec", e.target.value)
                            }
                            onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 1)}
                            onPaste={(e) => handleCellPaste(e, rowIndex, 1)}
                            placeholder="규격"
                            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-[12px] outline-none focus:border-gray-500"
                          />
                        </td>

                        <td className="border-t border-gray-200 px-2 py-1.5">
                          <input
                            ref={(el) => {
                              cellInputRefs.current[getInputKey(rowIndex, 2)] = el;
                            }}
                            value={item.unit}
                            onChange={(e) =>
                              updateItem(item.id, "unit", e.target.value)
                            }
                            onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 2)}
                            onPaste={(e) => handleCellPaste(e, rowIndex, 2)}
                            placeholder="BOX"
                            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-[12px] outline-none focus:border-gray-500"
                          />
                        </td>

                        <td className="border-t border-gray-200 px-2 py-1.5">
                          <input
                            ref={(el) => {
                              cellInputRefs.current[getInputKey(rowIndex, 3)] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            value={formatInputNumber(item.quantity)}
                            onChange={(e) =>
                              handleNumericInputChange(
                                item.id,
                                "quantity",
                                e.target.value
                              )
                            }
                            onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 3)}
                            onPaste={(e) => handleCellPaste(e, rowIndex, 3)}
                            placeholder="0"
                            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-right text-[12px] outline-none focus:border-gray-500"
                          />
                        </td>

                        <td className="border-t border-gray-200 px-2 py-1.5">
                          <input
                            ref={(el) => {
                              cellInputRefs.current[getInputKey(rowIndex, 4)] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            value={formatInputNumber(item.wholesalePrice)}
                            onChange={(e) =>
                              handleNumericInputChange(
                                item.id,
                                "wholesalePrice",
                                e.target.value
                              )
                            }
                            onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 4)}
                            onPaste={(e) => handleCellPaste(e, rowIndex, 4)}
                            placeholder="0"
                            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-right text-[12px] outline-none focus:border-gray-500"
                          />
                        </td>

                        <td className="border-t border-gray-200 px-2 py-1.5">
                          <input
                            ref={(el) => {
                              cellInputRefs.current[getInputKey(rowIndex, 5)] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            value={formatInputNumber(item.retailPrice)}
                            onChange={(e) =>
                              handleNumericInputChange(
                                item.id,
                                "retailPrice",
                                e.target.value
                              )
                            }
                            onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 5)}
                            onPaste={(e) => handleCellPaste(e, rowIndex, 5)}
                            placeholder="0"
                            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-right text-[12px] outline-none focus:border-gray-500"
                          />
                        </td>

                        <td className="border-t border-gray-200 px-2 py-1.5">
                          <input
                            ref={(el) => {
                              cellInputRefs.current[getInputKey(rowIndex, 6)] = el;
                            }}
                            value={item.note}
                            onChange={(e) =>
                              updateItem(item.id, "note", e.target.value)
                            }
                            onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 6)}
                            onPaste={(e) => handleCellPaste(e, rowIndex, 6)}
                            placeholder="비고"
                            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-[12px] outline-none focus:border-gray-500"
                          />
                        </td>

                        <td className="border-t border-gray-200 px-2 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => duplicateItem(item.id)}
                            className="w-[50px] rounded-md border border-blue-200 px-2 py-1 text-[11px] font-semibold text-blue-600"
                          >
                            복제
                          </button>
                        </td>

                        <td className="border-t border-gray-200 px-2 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="w-[50px] rounded-md border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-500"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}

                    {items.length < 12 &&
                      Array.from({ length: 12 - items.length }).map((_, index) => (
                        <tr key={`empty-row-${index}`} className="bg-white">
                          <td className="border-t border-gray-200 px-2 py-[11px]" />
                          <td className="border-t border-gray-200 px-2 py-[11px]" />
                          <td className="border-t border-gray-200 px-2 py-[11px]" />
                          <td className="border-t border-gray-200 px-2 py-[11px]" />
                          <td className="border-t border-gray-200 px-2 py-[11px]" />
                          <td className="border-t border-gray-200 px-2 py-[11px]" />
                          <td className="border-t border-gray-200 px-2 py-[11px]" />
                          <td className="border-t border-gray-200 px-2 py-[11px]" />
                          <td className="border-t border-gray-200 px-2 py-[11px]" />
                          <td className="border-t border-gray-200 px-2 py-[11px]" />
                          <td className="border-t border-gray-200 px-2 py-[11px]" />
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3">
              <h2 className="text-lg font-bold text-gray-900">저장 / 출력</h2>
              <p className="text-sm text-gray-500">
                작성 데이터만 도매/소매로 구분하고, 출력물은 일반 가격표처럼 표시됩니다.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white"
              >
                단가표 저장
              </button>
              <button
                type="button"
                onClick={handleSavePNG}
                disabled={isExporting}
                className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                PNG 저장
              </button>
              <button
                type="button"
                onClick={handleSaveJPG}
                disabled={isExporting}
                className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                JPG 저장
              </button>
              <button
                type="button"
                onClick={handleSavePDF}
                disabled={isExporting}
                className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                PDF 저장
              </button>
              <button
                type="button"
                onClick={handleEmail}
                className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800"
              >
                이메일 발송
              </button>
              <button
                type="button"
                onClick={handlePrint}
                disabled={isExporting}
                className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                인쇄
              </button>
            </div>

            <button
              type="button"
              onClick={resetForm}
              className="mt-3 w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white"
            >
              새 단가표 작성
            </button>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-900">저장된 단가표</h2>
              <p className="text-sm text-gray-500">
                저장한 단가표를 다시 불러오거나 삭제할 수 있습니다.
              </p>
            </div>

            <div className="space-y-3">
              {savedLists.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-400">
                  저장된 단가표가 없습니다.
                </div>
              ) : (
                savedLists.map((saved) => (
                  <div
                    key={saved.id}
                    className={`rounded-2xl border p-4 ${
                      selectedId === saved.id
                        ? "border-blue-700 bg-blue-50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-gray-900">
                          {saved.title}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {saved.documentNumber} ·{" "}
                          {saved.priceMode === "wholesale" ? "도매가" : "소매가"} ·{" "}
                          {saved.effectiveDate}
                        </div>
                        {saved.clientName ? (
                          <div className="mt-1 text-xs text-gray-500">
                            거래처: {saved.clientName}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleLoad(saved.id)}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700"
                        >
                          불러오기
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(saved.id)}
                          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-500"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="min-w-0 flex-1">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">출력 미리보기</h2>
                <p className="text-sm text-gray-500">
                  고밀도 유통 단가표 구조입니다. 페이지당 품목 12칸 기준이며, 품목 수에 따라 다음 페이지로 이어집니다.
                </p>
              </div>

              <div className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
                {priceMode === "wholesale" ? "도매 데이터 적용" : "소매 데이터 적용"}
              </div>
            </div>

            <div className="overflow-auto rounded-2xl bg-gray-100 p-6">
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
                      className="mx-auto h-[1123px] w-[794px] overflow-hidden bg-white shadow-[0_12px_30px_rgba(0,0,0,0.08)]"
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