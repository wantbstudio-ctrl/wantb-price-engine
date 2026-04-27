"use client";

import {
  ChangeEvent,
  KeyboardEvent,
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

type ProductLibraryItem = {
  id: string;
  group: string;
  category: string;
  name: string;
  spec: string;
  weight: string;
  packType: string;
  unit: string;
  origin: string;
  cost: number;
  wholesale: number;
  retail: number;
  supply: number;
  headline: string;
  description: string;
  imageUrl: string;
  memo: string;
  createdAt: string;
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

type EditableColumn =
  | "name"
  | "spec"
  | "unit"
  | "quantity"
  | "wholesalePrice"
  | "retailPrice"
  | "note";

const SEQ_KEY = "wantb-price-list-seq";
const CURRENT_NUMBER_KEY = "wantb-current-price-list-number";
const COMPANY_KEY = "wantb-company-settings";
const PRODUCT_LIBRARY_KEY = "wantb-product-library";

const ITEMS_PER_FIRST_PAGE = 13;
const ITEMS_PER_NEXT_PAGE = 13;

const EDITABLE_COLUMNS: EditableColumn[] = [
  "name",
  "spec",
  "unit",
  "quantity",
  "wholesalePrice",
  "retailPrice",
  "note",
];

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
  "w-full rounded-2xl border border-[#34404b] bg-[#0c1117] px-4 py-2.5 text-sm text-[#f4f8fb] outline-none placeholder:text-[#6f7b88] focus:border-[#22b7ff] focus:bg-[#141b22] focus:shadow-[0_0_0_3px_rgba(34,183,255,0.14)]";

const compactInputClass =
  "w-full rounded-xl border border-[#34404b] bg-[#0c1117] px-3 py-2 text-sm text-[#f4f8fb] outline-none placeholder:text-[#6f7b88] focus:border-[#22b7ff] focus:bg-[#141b22] focus:shadow-[0_0_0_3px_rgba(34,183,255,0.14)]";

const cardClass = "wb-card p-5";

const buttonBlue =
  "wb-btn wb-btn-primary px-4 py-2 text-sm font-semibold";

const buttonDark =
  "wb-btn wb-btn-secondary px-4 py-2 text-sm font-semibold";

const buttonDanger =
  "wb-btn wb-btn-danger px-4 py-2 text-sm font-semibold";

function normalizeProductLibraryItem(
  raw: Partial<ProductLibraryItem>
): ProductLibraryItem {
  return {
    id: String(raw.id ?? ""),
    group: String(raw.group ?? ""),
    category: String(raw.category ?? ""),
    name: String(raw.name ?? ""),
    spec: String(raw.spec ?? ""),
    weight: String(raw.weight ?? ""),
    packType: String(raw.packType ?? ""),
    unit: String(raw.unit ?? ""),
    origin: String(raw.origin ?? ""),
    cost: Number(raw.cost ?? 0),
    wholesale: Number(raw.wholesale ?? 0),
    retail: Number(raw.retail ?? 0),
    supply: Number(raw.supply ?? 0),
    headline: String(raw.headline ?? ""),
    description: String(raw.description ?? ""),
    imageUrl: String(raw.imageUrl ?? ""),
    memo: String(raw.memo ?? ""),
    createdAt: String(raw.createdAt ?? ""),
  };
}

function productToPriceItem(product: ProductLibraryItem): PriceItem {
  const noteParts = [
    product.origin ? `원산지: ${product.origin}` : "",
    product.headline || product.memo || "",
  ].filter(Boolean);

  return {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    image: product.imageUrl || "",
    name: product.name || "",
    spec: product.spec || "",
    unit: product.unit || "",
    quantity: 1,
    wholesalePrice: Number(product.wholesale || 0),
    retailPrice: Number(product.retail || 0),
    note: noteParts.join(" / "),
  };
}

const ImagePlaceholder = memo(function ImagePlaceholder() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[#8ca0b3]">
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="8.5" cy="10" r="1.5" />
        <path d="M21 16l-5.2-5.2a1 1 0 0 0-1.4 0L8 17" />
      </svg>
      <span className="text-[10px] font-medium leading-none">이미지</span>
    </div>
  );
});

export default function PriceListPage() {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  const deferredItems = useDeferredValue(items);

  const [productLibrary, setProductLibrary] = useState<ProductLibraryItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productKeyword, setProductKeyword] = useState("");
  const deferredProductKeyword = useDeferredValue(productKeyword);

  useEffect(() => {
    const companyRaw = localStorage.getItem(COMPANY_KEY);
    if (companyRaw) setCompany(JSON.parse(companyRaw));

    const productRaw = localStorage.getItem(PRODUCT_LIBRARY_KEY);
    if (productRaw) {
      try {
        const parsed = JSON.parse(productRaw);
        if (Array.isArray(parsed)) {
          setProductLibrary(
            parsed.map((item) => normalizeProductLibraryItem(item))
          );
        }
      } catch {
        setProductLibrary([]);
      }
    }

    const seq = Number(localStorage.getItem(SEQ_KEY) || "0") + 1;
    localStorage.setItem(SEQ_KEY, String(seq));

    const num = `PL-${new Date().getFullYear()}-${String(seq).padStart(4, "0")}`;
    setDocumentNumber(num);
    localStorage.setItem(CURRENT_NUMBER_KEY, num);
  }, []);

  const filteredProductLibrary = useMemo(() => {
    const q = deferredProductKeyword.trim().toLowerCase();
    if (!q) return productLibrary;

    return productLibrary.filter((product) =>
      [
        product.group,
        product.category,
        product.name,
        product.spec,
        product.unit,
        product.origin,
        product.headline,
        product.memo,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [productLibrary, deferredProductKeyword]);

  const selectedProduct = useMemo(() => {
    return productLibrary.find((product) => product.id === selectedProductId);
  }, [productLibrary, selectedProductId]);

  const displayItems = useMemo(() => {
    return deferredItems.map((item) => {
      const unitPrice =
        priceMode === "wholesale" ? item.wholesalePrice : item.retailPrice;

      return {
        ...item,
        displayPrice: unitPrice,
        amount: unitPrice * item.quantity,
      };
    });
  }, [deferredItems, priceMode]);

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

  const focusCell = useCallback(
    (rowIndex: number, column: EditableColumn) => {
      const row = items[rowIndex];
      if (!row) return;

      const key = `${row.id}-${column}`;
      const target = cellRefs.current[key];
      if (!target) return;

      target.focus();
      target.select?.();
    },
    [items]
  );

  const handleCellKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    column: EditableColumn
  ) => {
    const columnIndex = EDITABLE_COLUMNS.indexOf(column);
    if (columnIndex === -1) return;

    const currentValue = e.currentTarget.value;
    const selectionStart = e.currentTarget.selectionStart ?? 0;
    const selectionEnd = e.currentTarget.selectionEnd ?? 0;
    const isAllSelected =
      currentValue.length > 0 &&
      selectionStart === 0 &&
      selectionEnd === currentValue.length;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      focusCell(Math.max(0, rowIndex - 1), column);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusCell(Math.min(items.length - 1, rowIndex + 1), column);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();

      if (rowIndex === items.length - 1) {
        const newItem = createEmptyItem();
        setItems((prev) => [...prev, newItem]);

        setTimeout(() => {
          const key = `${newItem.id}-${column}`;
          const target = cellRefs.current[key];
          target?.focus();
          target?.select?.();
        }, 0);
        return;
      }

      focusCell(rowIndex + 1, column);
      return;
    }

    if (e.key === "ArrowLeft") {
      if (selectionStart === 0 && selectionEnd === 0 && columnIndex > 0) {
        e.preventDefault();
        focusCell(rowIndex, EDITABLE_COLUMNS[columnIndex - 1]);
      }
      return;
    }

    if (e.key === "ArrowRight") {
      if (
        ((selectionStart === currentValue.length &&
          selectionEnd === currentValue.length) ||
          isAllSelected) &&
        columnIndex < EDITABLE_COLUMNS.length - 1
      ) {
        e.preventDefault();
        focusCell(rowIndex, EDITABLE_COLUMNS[columnIndex + 1]);
      }
    }
  };

  const addRow = () => {
    const newItem = createEmptyItem();
    setItems((prev) => [...prev, newItem]);

    setTimeout(() => {
      const key = `${newItem.id}-name`;
      const target = cellRefs.current[key];
      target?.focus();
      target?.select?.();
    }, 0);
  };

    const isEmptyPriceItem = (row: PriceItem) => {
    return (
      !row.image &&
      !row.name &&
      !row.spec &&
      !row.unit &&
      row.quantity === 0 &&
      row.wholesalePrice === 0 &&
      row.retailPrice === 0 &&
      !row.note
    );
  };

  const addSelectedProductToItems = () => {
    if (!selectedProduct) {
      alert("불러올 제품을 선택해주세요.");
      return;
    }

    const newItem = productToPriceItem(selectedProduct);

    setItems((prev) => {
      const hasOnlyEmptyRows = prev.every((row) => isEmptyPriceItem(row));

      if (hasOnlyEmptyRows) {
        return [newItem];
      }

      return [newItem, ...prev];
    });

    setSelectedProductId("");

    setTimeout(() => {
      const key = `${newItem.id}-quantity`;
      const target = cellRefs.current[key];
      target?.focus();
      target?.select?.();
    }, 0);
  };

  const addAllFilteredProductsToItems = () => {
    if (filteredProductLibrary.length === 0) {
      alert("불러올 제품이 없습니다.");
      return;
    }

    const newItems = filteredProductLibrary.map((product) =>
      productToPriceItem(product)
    );

    setItems((prev) => {
      const hasOnlyEmptyRows = prev.every((row) => isEmptyPriceItem(row));

      if (hasOnlyEmptyRows) {
        return newItems;
      }

      return [...newItems, ...prev];
    });

    setSelectedProductId("");
  };

  const updateItem = useCallback(
    (id: string, key: keyof PriceItem, value: string | number) => {
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
    },
    []
  );

  const handleImageUpload = (id: string, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      updateItem(id, "image", result);
    };
    reader.readAsDataURL(file);

    e.target.value = "";
  };

  const removeRow = (id: string) => {
    setItems((prev) =>
      prev.length === 1
        ? [createEmptyItem()]
        : prev.filter((row) => row.id !== id)
    );
  };
  const getPreviewPages = () => {
    if (!previewRef.current) return [];
    return Array.from(
      previewRef.current.querySelectorAll<HTMLElement>('[data-price-page="true"]')
    );
  };

  const exportPageCanvas = async (page: HTMLElement) => {
    const rawCanvas = await html2canvas(page, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      scrollX: 0,
      scrollY: -window.scrollY,
      windowWidth: page.scrollWidth,
      windowHeight: page.scrollHeight,
    });

    const targetWidth = 794 * 2;
    const targetHeight = 1123 * 2;

    const normalizedCanvas = document.createElement("canvas");
    normalizedCanvas.width = targetWidth;
    normalizedCanvas.height = targetHeight;

    const ctx = normalizedCanvas.getContext("2d");
    if (!ctx) return rawCanvas;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    const scale = Math.min(
      targetWidth / rawCanvas.width,
      targetHeight / rawCanvas.height
    );

    const drawWidth = rawCanvas.width * scale;
    const drawHeight = rawCanvas.height * scale;
    const offsetX = (targetWidth - drawWidth) / 2;
    const offsetY = (targetHeight - drawHeight) / 2;

    ctx.drawImage(rawCanvas, offsetX, offsetY, drawWidth, drawHeight);

    return normalizedCanvas;
  };

  const handleSavePNG = async () => {
    const pages = getPreviewPages();
    if (pages.length === 0) return;

    for (let index = 0; index < pages.length; index += 1) {
      const canvas = await exportPageCanvas(pages[index]);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download =
        pages.length === 1
          ? `${documentNumber || "price-list"}.png`
          : `${documentNumber || "price-list"}_${index + 1}.png`;
      link.click();
    }
  };

  const handleSaveJPG = async () => {
    const pages = getPreviewPages();
    if (pages.length === 0) return;

    for (let index = 0; index < pages.length; index += 1) {
      const canvas = await exportPageCanvas(pages[index]);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/jpeg", 0.96);
      link.download =
        pages.length === 1
          ? `${documentNumber || "price-list"}.jpg`
          : `${documentNumber || "price-list"}_${index + 1}.jpg`;
      link.click();
    }
  };

  const handleSavePDF = async () => {
    const pages = getPreviewPages();
    if (pages.length === 0) return;

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = 210;
    const pageHeight = 297;

    for (let index = 0; index < pages.length; index += 1) {
      const canvas = await exportPageCanvas(pages[index]);
      const imgData = canvas.toDataURL("image/jpeg", 0.96);

      if (index > 0) pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight);
    }

    pdf.save(`${documentNumber || "price-list"}.pdf`);
  };

  const handlePrint = async () => {
    const pages = getPreviewPages();
    if (pages.length === 0) return;

    const imageUrls: string[] = [];

    for (const page of pages) {
      const canvas = await exportPageCanvas(page);
      imageUrls.push(canvas.toDataURL("image/jpeg", 0.96));
    }

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      alert("인쇄 프레임을 생성할 수 없습니다.");
      return;
    }

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>${documentNumber}</title>
          <style>
            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              width: 210mm;
              background: #ffffff;
            }

            .page {
              width: 210mm;
              height: 297mm;
              margin: 0;
              padding: 0;
              overflow: hidden;
              page-break-after: always;
              break-after: page;
              background: #ffffff;
            }

            .page:last-child {
              page-break-after: auto;
              break-after: auto;
            }

            img {
              display: block;
              width: 210mm;
              height: 297mm;
              object-fit: fill;
              margin: 0;
              padding: 0;
              border: 0;
            }

            @page {
              size: A4 portrait;
              margin: 0;
            }

            @media print {
              html,
              body {
                margin: 0;
                padding: 0;
                width: 210mm;
                background: #ffffff;
              }

              .page {
                width: 210mm;
                height: 297mm;
                margin: 0;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          ${imageUrls
            .map((url) => `<div class="page"><img src="${url}" /></div>`)
            .join("")}
        </body>
      </html>
    `);
    doc.close();

    const images = Array.from(doc.images);

    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
              return;
            }
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
      )
    );

    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();

    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1500);
  };

  const handleReset = () => {
    setTitle("유통 단가표");
    setPriceMode("wholesale");
    setEffectiveDate(new Date().toISOString().slice(0, 10));
    setNotice("단가 변동 가능 / 주문 전 최종 확인");
    setClientName("");
    setClientManager("");
    setClientPhone("");
    setItems([createEmptyItem(), createEmptyItem(), createEmptyItem()]);
    setSelectedProductId("");
    setProductKeyword("");
  };

  return (
    <div className="min-h-screen bg-[#07090c] px-6 py-6">
      <div className="wb-page wb-page-2col">
        {/* LEFT */}
        <section className="min-w-0 space-y-5">
          <div className={cardClass}>
            <h1 className="text-[29px] font-light tracking-tight text-[#38BDF8]">
              유통 단가표
            </h1>
            <p className="wb-subtitle mt-1 text-sm">
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
                className={priceMode === "wholesale" ? buttonBlue : buttonDark}
              >
                도매가 기준
              </button>

              <button
                onClick={() => setPriceMode("retail")}
                className={priceMode === "retail" ? buttonBlue : buttonDark}
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
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-light tracking-tight text-[#38BDF8]">
                  품목 입력
                </h2>
                <p className="mt-1 text-xs leading-5 text-[#9aa4b2]">
                  직접 입력하거나 제품 라이브러리에서 불러올 수 있습니다.
                </p>
              </div>

              <button onClick={addRow} className={buttonBlue}>
                행 추가
              </button>
            </div>

            <div className="mb-4 rounded-2xl border border-[#34404b] bg-[#0b1118] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[14px] font-medium text-[#38BDF8]">
                    Product Library 불러오기
                  </div>
                  <div className="mt-1 text-xs text-[#9aa4b2]">
                    저장된 제품을 유통 단가표 품목으로 자동 추가합니다.
                  </div>
                </div>

                <div className="text-xs text-[#9aa4b2]">
                  저장 제품 {productLibrary.length}개
                </div>
              </div>

              <div className="grid grid-cols-[1fr_1.35fr_auto_auto] gap-2">
                <input
  value={productKeyword}
  onChange={(e) => setProductKeyword(e.target.value)}
  className="w-full rounded-xl border border-[#4b5563] bg-[#1f2937] px-3 py-2 text-sm text-white placeholder:text-[#cbd5e1] outline-none transition focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/15"
  placeholder="제품 검색"
/>

                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className={compactInputClass}
                >
                  <option value="">제품 선택</option>
                  {filteredProductLibrary.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name || "이름 없음"} / {product.spec || "-"} /{" "}
                      {product.origin || "-"}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={addSelectedProductToItems}
                  className={buttonBlue}
                >
                  선택 추가
                </button>

                <button
                  type="button"
                  onClick={addAllFilteredProductsToItems}
                  className={buttonDark}
                >
                  검색 전체 추가
                </button>
              </div>

              {selectedProduct ? (
                <div className="mt-3 grid grid-cols-[48px_1fr_auto] items-center gap-3 rounded-xl border border-[#34404b] bg-[#111821] p-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-[#34404b] bg-[#0c1117]">
                    {selectedProduct.imageUrl ? (
                      <img
                        src={selectedProduct.imageUrl}
                        alt={selectedProduct.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-[#6f7b88]">IMG</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-white">
                      {selectedProduct.name || "-"}
                    </div>
                    <div className="mt-1 truncate text-xs text-[#9aa4b2]">
                      {selectedProduct.group || "-"} /{" "}
                      {selectedProduct.category || "-"} · 규격{" "}
                      {selectedProduct.spec || "-"} · 원산지{" "}
                      {selectedProduct.origin || "-"}
                    </div>
                  </div>

                  <div className="text-right text-xs text-[#dce6ef]">
                    <div>도매 {formatNumber(selectedProduct.wholesale)}원</div>
                    <div className="mt-1">
                      소매 {formatNumber(selectedProduct.retail)}원
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="max-h-[540px] overflow-auto rounded-2xl border border-[#2d3742]">
              <table className="w-full min-w-[1100px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-[#151a20] text-[#dce6ef]">
                  <tr>
                    <th className="border-b border-[#2d3742] px-1.5 py-2 text-center text-[12px] font-semibold whitespace-nowrap">
                      이미지
                    </th>
                    <th className="border-b border-[#2d3742] px-1.5 py-2 text-center text-[12px] font-semibold whitespace-nowrap">
                      제품명
                    </th>
                    <th className="border-b border-[#2d3742] px-1.5 py-2 text-center text-[12px] font-semibold whitespace-nowrap">
                      규격
                    </th>
                    <th className="border-b border-[#2d3742] px-1.5 py-2 text-center text-[12px] font-semibold whitespace-nowrap">
                      단위
                    </th>
                    <th className="border-b border-[#2d3742] px-1.5 py-2 text-center text-[12px] font-semibold whitespace-nowrap">
                      수량
                    </th>
                    <th className="border-b border-[#2d3742] px-1.5 py-2 text-center text-[12px] font-semibold whitespace-nowrap">
                      도매가
                    </th>
                    <th className="border-b border-[#2d3742] px-1.5 py-2 text-center text-[12px] font-semibold whitespace-nowrap">
                      소매가
                    </th>
                    <th className="border-b border-[#2d3742] px-1.5 py-2 text-center text-[12px] font-semibold whitespace-nowrap">
                      비고
                    </th>
                    <th className="border-b border-[#2d3742] px-1.5 py-2 text-center text-[12px] font-semibold whitespace-nowrap">
                      삭제
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((row, rowIndex) => (
                    <tr key={row.id} className="bg-[#0d1218]">
                      <td className="border-t border-[#2d3742] p-2 align-middle">
                        <label className="flex cursor-pointer items-center justify-center">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(row.id, e)}
                          />

                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#3b4956] bg-[#131922] transition hover:border-[#22b7ff] hover:bg-[#18202a]">
                            {row.image ? (
                              <img
                                src={row.image}
                                alt={row.name || "제품 이미지"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ImagePlaceholder />
                            )}
                          </div>
                        </label>
                      </td>

                      <td className="border-t border-[#2d3742] p-2">
                        <input
                          ref={(el) => {
                            cellRefs.current[`${row.id}-name`] = el;
                          }}
                          value={row.name}
                          onChange={(e) =>
                            updateItem(row.id, "name", e.target.value)
                          }
                          onKeyDown={(e) =>
                            handleCellKeyDown(e, rowIndex, "name")
                          }
                          className={inputClass}
                        />
                      </td>

                      <td className="border-t border-[#2d3742] p-2">
                        <input
                          ref={(el) => {
                            cellRefs.current[`${row.id}-spec`] = el;
                          }}
                          value={row.spec}
                          onChange={(e) =>
                            updateItem(row.id, "spec", e.target.value)
                          }
                          onKeyDown={(e) =>
                            handleCellKeyDown(e, rowIndex, "spec")
                          }
                          className={inputClass}
                        />
                      </td>

                      <td className="border-t border-[#2d3742] p-2">
                        <input
                          ref={(el) => {
                            cellRefs.current[`${row.id}-unit`] = el;
                          }}
                          value={row.unit}
                          onChange={(e) =>
                            updateItem(row.id, "unit", e.target.value)
                          }
                          onKeyDown={(e) =>
                            handleCellKeyDown(e, rowIndex, "unit")
                          }
                          className={inputClass}
                        />
                      </td>

                      <td className="border-t border-[#2d3742] p-2">
                        <input
                          ref={(el) => {
                            cellRefs.current[`${row.id}-quantity`] = el;
                          }}
                          value={row.quantity === 0 ? "" : String(row.quantity)}
                          onChange={(e) =>
                            updateItem(row.id, "quantity", e.target.value)
                          }
                          onKeyDown={(e) =>
                            handleCellKeyDown(e, rowIndex, "quantity")
                          }
                          className={`${inputClass} text-right`}
                        />
                      </td>

                      <td className="border-t border-[#2d3742] p-2">
                        <input
                          ref={(el) => {
                            cellRefs.current[`${row.id}-wholesalePrice`] = el;
                          }}
                          value={
                            row.wholesalePrice === 0
                              ? ""
                              : String(row.wholesalePrice)
                          }
                          onChange={(e) =>
                            updateItem(row.id, "wholesalePrice", e.target.value)
                          }
                          onKeyDown={(e) =>
                            handleCellKeyDown(e, rowIndex, "wholesalePrice")
                          }
                          className={`${inputClass} text-right`}
                        />
                      </td>

                      <td className="border-t border-[#2d3742] p-2">
                        <input
                          ref={(el) => {
                            cellRefs.current[`${row.id}-retailPrice`] = el;
                          }}
                          value={
                            row.retailPrice === 0 ? "" : String(row.retailPrice)
                          }
                          onChange={(e) =>
                            updateItem(row.id, "retailPrice", e.target.value)
                          }
                          onKeyDown={(e) =>
                            handleCellKeyDown(e, rowIndex, "retailPrice")
                          }
                          className={`${inputClass} text-right`}
                        />
                      </td>

                      <td className="border-t border-[#2d3742] p-2">
                        <input
                          ref={(el) => {
                            cellRefs.current[`${row.id}-note`] = el;
                          }}
                          value={row.note}
                          onChange={(e) =>
                            updateItem(row.id, "note", e.target.value)
                          }
                          onKeyDown={(e) =>
                            handleCellKeyDown(e, rowIndex, "note")
                          }
                          className={inputClass}
                        />
                      </td>

                      <td className="border-t border-[#2d3742] p-2 text-center">
                        <button
                          onClick={() => removeRow(row.id)}
                          className={buttonDanger}
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
            <h2 className="mb-3 text-[18px] font-light tracking-tight text-[#38BDF8]">
              저장 / 출력
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <button className={buttonDark} onClick={handleSavePNG}>
                PNG 저장
              </button>
              <button className={buttonDark} onClick={handleSaveJPG}>
                JPG 저장
              </button>
              <button className={buttonDark} onClick={handleSavePDF}>
                PDF 저장
              </button>
              <button className={buttonDark}>이메일 발송</button>
              <button className={buttonDark} onClick={handlePrint}>
                인쇄
              </button>
            </div>

            <button className={`${buttonDark} mt-3 w-full`} onClick={handleReset}>
              새 단가표 작성
            </button>
          </div>
        </section>

        {/* RIGHT */}
        <section className="min-w-0 flex-1">
          <div className={cardClass}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-[18px] font-light tracking-tight text-[#38BDF8]">
                  출력 미리보기
                </h2>
                <p className="wb-subtitle text-sm">
                  좌측 입력 반응을 우선하고, 출력 미리보기는 지연 렌더로 부드럽게 반영됩니다.
                </p>
              </div>

              <div className="rounded-full border border-[#34404b] bg-[#11161d] px-4 py-2 text-sm font-semibold text-[#dce6ef]">
                {priceMode === "wholesale"
                  ? "도매 데이터 적용"
                  : "소매 데이터 적용"}
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

                                  <div className="max-w-[260px] text-right text-[13px] leading-5 text-gray-600">
                                    <div className="font-semibold text-gray-800">
                                      {clientName || "거래처 미입력"}
                                    </div>
                                    <div className="mt-1">
                                      {clientPhone || "전화번호 미입력"}
                                      {clientManager ? ` · ${clientManager}` : ""}
                                    </div>
                                    <div className="mt-1 break-words text-[12px] text-gray-500">
                                      {notice}
                                    </div>
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
                                    <col style={{ width: "88px" }} />
                                    <col style={{ width: "170px" }} />
                                    <col style={{ width: "90px" }} />
                                    <col style={{ width: "46px" }} />
                                    <col style={{ width: "50px" }} />
                                    <col style={{ width: "82px" }} />
                                    <col style={{ width: "92px" }} />
                                    <col style={{ width: "132px" }} />
                                  </colgroup>

                                  <thead>
                                    <tr className="bg-white text-gray-900">
                                      <th className="whitespace-nowrap border-b border-gray-300 px-2 py-2.5 text-center align-middle text-[14px] font-bold">
                                        이미지
                                      </th>
                                      <th className="whitespace-nowrap border-b border-gray-300 px-2 py-2.5 text-center align-middle text-[14px] font-bold">
                                        제품명
                                      </th>
                                      <th className="whitespace-nowrap border-b border-gray-300 px-2 py-2.5 text-center align-middle text-[14px] font-bold">
                                        규격
                                      </th>
                                      <th className="whitespace-nowrap border-b border-gray-300 px-2 py-2.5 text-center align-middle text-[14px] font-bold">
                                        단위
                                      </th>
                                      <th className="whitespace-nowrap border-b border-gray-300 px-2 py-2.5 text-center align-middle text-[14px] font-bold">
                                        수량
                                      </th>
                                      <th className="whitespace-nowrap border-b border-gray-300 px-2 py-2.5 text-center align-middle text-[14px] font-bold">
                                        금액
                                      </th>
                                      <th className="whitespace-nowrap border-b border-gray-300 px-2 py-2.5 text-center align-middle text-[14px] font-bold">
                                        합계
                                      </th>
                                      <th className="whitespace-nowrap border-b border-gray-300 px-2 py-2.5 text-center align-middle text-[14px] font-bold">
                                        비고
                                      </th>
                                    </tr>
                                  </thead>

                                  <tbody>
                                    {pageItems.map((item, index) => (
                                      <tr
                                        key={item.id}
                                        className={
                                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                                        }
                                      >
                                        <td className="border-t border-gray-200 px-2 py-[2px] text-center align-middle">
                                          <div className="mx-auto flex h-[66px] w-[66px] items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white">
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

                                        <td className="border-t border-gray-200 px-2 py-[2px] text-center align-middle text-[14px] font-semibold leading-tight text-gray-900">
                                          <div className="break-keep leading-tight">
                                            {item.name || "-"}
                                          </div>
                                        </td>

                                        <td className="border-t border-gray-200 px-2 py-[2px] text-center align-middle text-[14px] leading-tight text-gray-700">
                                          <div className="break-keep leading-tight">
                                            {item.spec || "-"}
                                          </div>
                                        </td>

                                        <td className="border-t border-gray-200 px-2 py-[2px] text-center align-middle text-[14px] text-gray-700">
                                          {item.unit || "-"}
                                        </td>

                                        <td className="border-t border-gray-200 px-2 py-[2px] text-center align-middle text-[14px] text-gray-700">
                                          {formatNumber(item.quantity)}
                                        </td>

                                        <td className="border-t border-gray-200 px-2 py-[2px] text-center align-middle text-[14px] font-semibold text-gray-900">
                                          {formatNumber(item.displayPrice)}원
                                        </td>

                                        <td className="border-t border-gray-200 px-2 py-[2px] text-center align-middle text-[14px] font-semibold text-gray-900">
                                          {formatNumber(item.amount)}원
                                        </td>

                                        <td className="border-t border-gray-200 px-2 py-[2px] text-center align-middle text-[13px] leading-tight text-gray-700">
                                          <div
                                            className="break-keep leading-tight"
                                            style={{
                                              display: "-webkit-box",
                                              WebkitLineClamp: 2,
                                              WebkitBoxOrient: "vertical",
                                              overflow: "hidden",
                                            }}
                                          >
                                            {item.note || "-"}
                                          </div>
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