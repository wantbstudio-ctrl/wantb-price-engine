"use client";

import { useEffect, useMemo, useState } from "react";

type SavedProduct = {
  id: number;
  productName: string;
};

type VatMode = "included" | "separate" | "none";

type EstimateLineItem = {
  productName: string;
  quantity: number;
  unitPrice: number;
};

type EstimateItem = {
  id: number;
  estimateNumber: string;

  productName: string;
  quantity: number;
  unitPrice: number;
  vatMode: VatMode;

  supplyPrice: number;
  vat: number;
  totalAmount: number;

  clientName: string;
  managerName: string;
  phone: string;
  email: string;
  deliveryCondition: string;
  validUntil: string;

  companyName: string;
  ceoName: string;
  businessNumber: string;
  address: string;
  companyPhone: string;
  companyEmail: string;

  date: string;
};

type CompanySettings = {
  companyName?: string;
  ownerName?: string;
  ceoName?: string;
  businessNumber?: string;
  address?: string;
  phone?: string;
  companyPhone?: string;
  email?: string;
  companyEmail?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  logoDataUrl?: string;
  stampDataUrl?: string;
};

const STORAGE_KEY = "wantb-estimates";
const PRODUCT_KEY = "wantb-products";
const COMPANY_KEY = "wantb-company-settings";
const ESTIMATE_DRAFT_KEY = "estimate-draft";
const SELECTED_CLIENT_KEY = "wantb-selected-client";

const ESTIMATE_SEQ_KEY = "wantb-estimate-seq";
const CURRENT_ESTIMATE_NUMBER_KEY = "wantb-current-estimate-number";

function getCurrentYear() {
  return new Date().getFullYear();
}

function getEstimateSequenceMap(): Record<string, number> {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(ESTIMATE_SEQ_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveEstimateSequenceMap(map: Record<string, number>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ESTIMATE_SEQ_KEY, JSON.stringify(map));
}

function formatEstimateNumber(year: number, sequence: number) {
  return `WB-${year}-${String(sequence).padStart(4, "0")}`;
}

function peekNextEstimateNumber() {
  const year = getCurrentYear();
  const map = getEstimateSequenceMap();
  const nextSequence = (map[String(year)] || 0) + 1;
  return formatEstimateNumber(year, nextSequence);
}

function reserveNextEstimateNumber() {
  const year = getCurrentYear();
  const map = getEstimateSequenceMap();
  const nextSequence = (map[String(year)] || 0) + 1;

  map[String(year)] = nextSequence;
  saveEstimateSequenceMap(map);

  return formatEstimateNumber(year, nextSequence);
}

function ensureEstimateNumber(currentEstimateNumber?: string) {
  if (typeof window === "undefined") {
    return currentEstimateNumber || peekNextEstimateNumber();
  }

  if (currentEstimateNumber && currentEstimateNumber.trim()) {
    return currentEstimateNumber;
  }

  const storedCurrent = localStorage.getItem(CURRENT_ESTIMATE_NUMBER_KEY);
  if (storedCurrent && storedCurrent.trim()) {
    return storedCurrent;
  }

  const reserved = reserveNextEstimateNumber();
  localStorage.setItem(CURRENT_ESTIMATE_NUMBER_KEY, reserved);
  return reserved;
}

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString("ko-KR");
}

function getDisplayDate(value?: string) {
  if (!value) return "-";
  return value;
}

function getVatModeLabel(vatMode: VatMode) {
  if (vatMode === "included") return "부가세 포함";
  if (vatMode === "separate") return "부가세 별도";
  return "부가세 없음";
}

function createEmptyLineItem(): EstimateLineItem {
  return {
    productName: "",
    quantity: 1,
    unitPrice: 0,
  };
}

export default function EstimatePage() {
  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([]);
  const [savedEstimates, setSavedEstimates] = useState<EstimateItem[]>([]);

  const [estimateNumber, setEstimateNumber] = useState("");

  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [vatMode, setVatMode] = useState<VatMode>("included");

  const [items, setItems] = useState<EstimateLineItem[]>([createEmptyLineItem()]);

  const [clientName, setClientName] = useState("");
  const [managerName, setManagerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [deliveryCondition, setDeliveryCondition] = useState("");
  const [validUntil, setValidUntil] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [ceoName, setCeoName] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [address, setAddress] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");

  const [companySettings, setCompanySettings] = useState<CompanySettings>({});

  const activeItems = useMemo(() => {
    return items.filter(
      (item) =>
        item.productName.trim() !== "" ||
        Number(item.quantity || 0) > 0 ||
        Number(item.unitPrice || 0) > 0
    );
  }, [items]);

  const estimateTitle = useMemo(() => {
    if (activeItems.length === 0) return productName || "";
    if (activeItems.length === 1) return activeItems[0].productName || "";
    return `${activeItems[0].productName || "품목"} 외 ${activeItems.length - 1}건`;
  }, [activeItems, productName]);

  const baseAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      return sum + Number(item.quantity || 0) * Number(item.unitPrice || 0);
    }, 0);
  }, [items]);

  const supplyPrice = useMemo(() => {
    if (vatMode === "included") {
      return Math.round(baseAmount / 1.1);
    }
    return baseAmount;
  }, [baseAmount, vatMode]);

  const vat = useMemo(() => {
    if (vatMode === "included") {
      return baseAmount - supplyPrice;
    }
    if (vatMode === "separate") {
      return Math.round(supplyPrice * 0.1);
    }
    return 0;
  }, [baseAmount, supplyPrice, vatMode]);

  const totalAmount = useMemo(() => {
    if (vatMode === "included") {
      return baseAmount;
    }
    if (vatMode === "separate") {
      return supplyPrice + vat;
    }
    return supplyPrice;
  }, [baseAmount, supplyPrice, vat, vatMode]);

  const today = useMemo(() => new Date().toLocaleDateString("ko-KR"), []);

  const displayCompanyName = companySettings.companyName || companyName || "회사명";
  const displayCeoName =
    companySettings.ownerName || companySettings.ceoName || ceoName || "-";
  const displayBusinessNumber = companySettings.businessNumber || businessNumber || "-";
  const displayAddress = companySettings.address || address || "-";
  const displayCompanyPhone =
    companySettings.phone || companySettings.companyPhone || companyPhone || "-";
  const displayCompanyEmail =
    companySettings.email || companySettings.companyEmail || companyEmail || "-";

  const displayAccountInfo =
    companySettings.bankName ||
    companySettings.accountNumber ||
    companySettings.accountHolder
      ? `${companySettings.bankName || ""} ${companySettings.accountNumber || ""} / ${
          companySettings.accountHolder || ""
        }`.trim()
      : "-";

  const previewRows = useMemo(() => {
    const baseRow = {
      category: "",
      item: "",
      spec: "",
      unit: "",
      quantity: "",
      price: "",
      supplyAmount: "",
      note: "",
    };

    const rows = Array.from({ length: 10 }, () => ({ ...baseRow }));

    items.slice(0, 10).forEach((item, index) => {
      const hasContent =
        item.productName.trim() !== "" ||
        Number(item.quantity || 0) > 0 ||
        Number(item.unitPrice || 0) > 0;

      if (!hasContent) return;

      const rowSupply = Number(item.quantity || 0) * Number(item.unitPrice || 0);

      rows[index] = {
        category: String(index + 1),
        item: item.productName || "",
        spec: item.productName || "-",
        unit: "set",
        quantity: item.quantity ? String(item.quantity) : "",
        price: item.unitPrice ? formatNumber(item.unitPrice) : "",
        supplyAmount: rowSupply ? formatNumber(rowSupply) : "",
        note: index === 0 ? getVatModeLabel(vatMode) : "",
      };
    });

    return rows;
  }, [items, vatMode]);

  const refreshSavedEstimates = () => {
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: EstimateItem[] = raw ? JSON.parse(raw) : [];
      setSavedEstimates(Array.isArray(parsed) ? parsed.sort((a, b) => b.id - a.id) : []);
    } catch {
      setSavedEstimates([]);
    }
  };

  const refreshSavedProducts = () => {
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(PRODUCT_KEY);
      const parsed = raw ? JSON.parse(raw) : [];

      if (Array.isArray(parsed)) {
        const normalized: SavedProduct[] = parsed.map((item: any, index: number) => ({
          id: Number(item?.id ?? Date.now() + index),
          productName: String(item?.productName ?? ""),
        }));
        setSavedProducts(normalized);
      } else {
        setSavedProducts([]);
      }
    } catch {
      setSavedProducts([]);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const currentSavedNumber = localStorage.getItem(CURRENT_ESTIMATE_NUMBER_KEY);
    if (currentSavedNumber && currentSavedNumber.trim()) {
      setEstimateNumber(currentSavedNumber);
    } else {
      const nextNumber = peekNextEstimateNumber();
      setEstimateNumber(String(nextNumber));
    }

    refreshSavedProducts();
    refreshSavedEstimates();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const rawCompany = localStorage.getItem(COMPANY_KEY);
      if (!rawCompany) return;

      const parsed: CompanySettings = JSON.parse(rawCompany);

      setCompanySettings(parsed || {});
      setCompanyName(parsed?.companyName || "");
      setCeoName(parsed?.ownerName || parsed?.ceoName || "");
      setBusinessNumber(parsed?.businessNumber || "");
      setAddress(parsed?.address || "");
      setCompanyPhone(parsed?.phone || parsed?.companyPhone || "");
      setCompanyEmail(parsed?.email || parsed?.companyEmail || "");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const rawDraft = localStorage.getItem(ESTIMATE_DRAFT_KEY);
      if (!rawDraft) return;

      const draft = JSON.parse(rawDraft);

      const draftProductName = draft?.productName || "";
      const draftQuantity = Number(draft?.quantity ?? 1);
      const draftUnitPrice = Number(draft?.unitPrice ?? 0);

      setProductName(draftProductName);
      setQuantity(draftQuantity);
      setUnitPrice(draftUnitPrice);
      setItems([
        {
          productName: draftProductName,
          quantity: draftQuantity,
          unitPrice: draftUnitPrice,
        },
      ]);

      setVatMode((draft?.vatMode as VatMode) || "included");

      setClientName(draft?.clientName || "");
      setManagerName(draft?.managerName || "");
      setPhone(draft?.phone || "");
      setEmail(draft?.email || "");
      setDeliveryCondition(draft?.deliveryCondition || "");
      setValidUntil(draft?.validUntil || "");

      if (draft?.estimateNumber && String(draft.estimateNumber).trim()) {
        setEstimateNumber(String(draft.estimateNumber));
        localStorage.setItem(CURRENT_ESTIMATE_NUMBER_KEY, String(draft.estimateNumber));
      } else {
        const currentSavedNumber = localStorage.getItem(CURRENT_ESTIMATE_NUMBER_KEY);
        if (currentSavedNumber && currentSavedNumber.trim()) {
          setEstimateNumber(currentSavedNumber);
        } else {
          const nextNumber = peekNextEstimateNumber();
          setEstimateNumber(String(nextNumber));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(SELECTED_CLIENT_KEY);
      if (!raw) return;

      const client = JSON.parse(raw);

      setClientName(client?.companyName || client?.name || "");
      setManagerName(client?.managerName || client?.owner || "");
      setPhone(client?.phone || "");
      setEmail(client?.email || "");
    } catch {
      // ignore
    }
  }, []);

  const handleProductSelect = (selectedProductName: string) => {
    setProductName(selectedProductName);

    setItems((prev) => {
      const updated = [...prev];
      if (updated.length === 0) {
        return [
          {
            productName: selectedProductName,
            quantity: 1,
            unitPrice: 0,
          },
        ];
      }

      updated[0] = {
        ...updated[0],
        productName: selectedProductName,
      };

      return updated;
    });
  };

  const handleItemChange = (
    index: number,
    field: keyof EstimateLineItem,
    value: string | number
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };

      if (index === 0) {
        setProductName(updated[0].productName || "");
        setQuantity(Number(updated[0].quantity || 0));
        setUnitPrice(Number(updated[0].unitPrice || 0));
      }

      return updated;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, createEmptyLineItem()]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => {
      if (prev.length === 1) {
        const reset = [createEmptyLineItem()];
        setProductName("");
        setQuantity(1);
        setUnitPrice(0);
        return reset;
      }

      const updated = prev.filter((_, i) => i !== index);

      if (index === 0 && updated[0]) {
        setProductName(updated[0].productName || "");
        setQuantity(Number(updated[0].quantity || 0));
        setUnitPrice(Number(updated[0].unitPrice || 0));
      }

      return updated;
    });
  };

  const clearFormForNextEstimate = () => {
    setProductName("");
    setQuantity(1);
    setUnitPrice(0);
    setItems([createEmptyLineItem()]);
    setVatMode("included");

    setClientName("");
    setManagerName("");
    setPhone("");
    setEmail("");
    setDeliveryCondition("");
    setValidUntil("");
  };

  const handleResetEstimate = () => {
    clearFormForNextEstimate();
    localStorage.removeItem(ESTIMATE_DRAFT_KEY);
  };

  const handleSaveEstimate = () => {
    if (activeItems.length === 0) {
      alert("제품명을 입력해주세요.");
      return;
    }

    const finalEstimateNumber = ensureEstimateNumber(estimateNumber);

    if (typeof window !== "undefined") {
      localStorage.setItem(CURRENT_ESTIMATE_NUMBER_KEY, finalEstimateNumber);
    }

    const firstItem = activeItems[0] || createEmptyLineItem();

    const newEstimate: EstimateItem = {
      id: Date.now(),
      estimateNumber: finalEstimateNumber,

      productName: estimateTitle,
      quantity: firstItem.quantity,
      unitPrice: firstItem.unitPrice,
      vatMode,

      supplyPrice,
      vat,
      totalAmount,

      clientName,
      managerName,
      phone,
      email,
      deliveryCondition,
      validUntil,

      companyName: displayCompanyName,
      ceoName: displayCeoName,
      businessNumber: displayBusinessNumber,
      address: displayAddress,
      companyPhone: displayCompanyPhone,
      companyEmail: displayCompanyEmail,

      date: new Date().toLocaleDateString("ko-KR"),
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: EstimateItem[] = raw ? JSON.parse(raw) : [];
      const updated = [newEstimate, ...(Array.isArray(parsed) ? parsed : [])];

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      refreshSavedEstimates();

      alert("견적이 저장되었습니다.");

      localStorage.removeItem(CURRENT_ESTIMATE_NUMBER_KEY);
      const nextNumber = peekNextEstimateNumber();
      setEstimateNumber(String(nextNumber));

      clearFormForNextEstimate();
      localStorage.removeItem(ESTIMATE_DRAFT_KEY);
    } catch {
      alert("견적 저장 중 오류가 발생했습니다.");
    }
  };

  const handleLoadEstimate = (item: EstimateItem) => {
    setEstimateNumber(item.estimateNumber || "");
    setProductName(item.productName || "");
    setQuantity(Number(item.quantity || 1));
    setUnitPrice(Number(item.unitPrice || 0));
    setItems([
      {
        productName: item.productName || "",
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || 0),
      },
    ]);
    setVatMode(item.vatMode || "included");

    setClientName(item.clientName || "");
    setManagerName(item.managerName || "");
    setPhone(item.phone || "");
    setEmail(item.email || "");
    setDeliveryCondition(item.deliveryCondition || "");
    setValidUntil(item.validUntil || "");

    setCompanyName(item.companyName || "");
    setCeoName(item.ceoName || "");
    setBusinessNumber(item.businessNumber || "");
    setAddress(item.address || "");
    setCompanyPhone(item.companyPhone || "");
    setCompanyEmail(item.companyEmail || "");

    if (typeof window !== "undefined") {
      localStorage.setItem(CURRENT_ESTIMATE_NUMBER_KEY, item.estimateNumber || "");
    }

    alert("저장된 견적을 불러왔습니다.");
  };

  const handleDeleteEstimate = (id: number) => {
    const ok = confirm("이 견적을 삭제하시겠습니까?");
    if (!ok) return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: EstimateItem[] = raw ? JSON.parse(raw) : [];
      const updated = Array.isArray(parsed) ? parsed.filter((item) => item.id !== id) : [];

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      refreshSavedEstimates();
    } catch {
      alert("견적 삭제 중 오류가 발생했습니다.");
    }
  };

  const getSuggestedFileName = (extension: "png" | "jpg" | "pdf") => {
    const safeEstimateNumber = (estimateNumber || "WB-ESTIMATE").replace(/\s+/g, "-");
    const safeProductName = (estimateTitle || "estimate")
      .replace(/[\\/:*?"<>|]/g, "")
      .trim();

    return `${safeEstimateNumber}_${safeProductName || "estimate"}.${extension}`;
  };

  const htmlToCanvas = async () => {
    const target = document.getElementById("estimate-print-area");
    if (!target) {
      throw new Error("견적 미리보기 영역을 찾을 수 없습니다.");
    }

    const html2canvasModule = await import("html2canvas");
    const html2canvas = html2canvasModule.default;

    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: -window.scrollY,
    });

    return canvas;
  };

  const handleDownloadPng = async () => {
    try {
      const canvas = await htmlToCanvas();
      const url = canvas.toDataURL("image/png");

      const link = document.createElement("a");
      link.href = url;
      link.download = getSuggestedFileName("png");
      link.click();
    } catch {
      alert("PNG 저장 중 오류가 발생했습니다.");
    }
  };

  const handleDownloadJpg = async () => {
    try {
      const canvas = await htmlToCanvas();
      const url = canvas.toDataURL("image/jpeg", 0.95);

      const link = document.createElement("a");
      link.href = url;
      link.download = getSuggestedFileName("jpg");
      link.click();
    } catch {
      alert("JPG 저장 중 오류가 발생했습니다.");
    }
  };

  const handleSavePDF = async () => {
    const stampHtml = companySettings.stampDataUrl
      ? `<img src="${companySettings.stampDataUrl}" style="width:54px; height:54px; object-fit:contain; margin-left:8px; vertical-align:middle;" />`
      : `<span class="stamp">직인</span>`;

    const bottomLogoHtml = companySettings.logoDataUrl
      ? `
        <div class="bottom-logo-wrap">
          <img src="${companySettings.logoDataUrl}" class="bottom-logo" />
        </div>
      `
      : "";

    const rowsHtml = previewRows
      .map(
        (row) => `
          <tr>
            <td class="c-center">${row.category || "&nbsp;"}</td>
            <td class="c-left">${row.item || "&nbsp;"}</td>
            <td class="c-center">${row.spec || "&nbsp;"}</td>
            <td class="c-center">${row.unit || "&nbsp;"}</td>
            <td class="c-center">${row.quantity || "&nbsp;"}</td>
            <td class="c-right">${row.price ? `${row.price}` : "&nbsp;"}</td>
            <td class="c-right">${row.supplyAmount ? `${row.supplyAmount}` : "&nbsp;"}</td>
            <td class="c-left">${row.note || "&nbsp;"}</td>
          </tr>
        `
      )
      .join("");

    const pdfVatSummaryText =
      vatMode === "included"
        ? `일금 ${formatNumber(totalAmount)}원 (VAT 포함)`
        : vatMode === "separate"
        ? `공급가 ${formatNumber(supplyPrice)}원 + VAT ${formatNumber(vat)}원 = 합계 ${formatNumber(
            totalAmount
          )}원`
        : `일금 ${formatNumber(totalAmount)}원 (부가세 없음)`;

    const html = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <title>견적서 (ESTIMATE)</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 12px;
            background: #fff;
            color: #111;
            font-family: Arial, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
          }
          .sheet {
            width: 794px;
            min-height: 1123px;
            margin: 0 auto;
            background: #fff;
            padding: 26px 24px 20px 24px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-bottom: 10px;
          }
          .title {
            font-size: 28px;
            font-weight: 800;
            letter-spacing: -0.5px;
          }
          .company-name {
            font-size: 20px;
            font-weight: 800;
            letter-spacing: -0.3px;
            text-align: right;
          }
          .divider {
            height: 2px;
            background: #111;
            margin-bottom: 12px;
          }
          .top-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            column-gap: 20px;
            margin-bottom: 10px;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
          }
          .info-table td {
            padding: 4px 4px;
            vertical-align: top;
            font-size: 13px;
            line-height: 1.45;
          }
          .label {
            width: 70px;
            font-weight: 700;
            white-space: nowrap;
          }
          .value-strong {
            font-weight: 800;
          }
          .stamp {
            display: inline-block;
            border: 2px solid #d11;
            color: #d11;
            border-radius: 50%;
            width: 54px;
            height: 54px;
            line-height: 50px;
            text-align: center;
            font-size: 12px;
            font-weight: 700;
            margin-left: 8px;
            transform: rotate(-16deg);
          }
          .main-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin-top: 8px;
          }
          .main-table th,
          .main-table td {
            border: 1px solid #111;
            font-size: 12px;
            padding: 2px 4px;
            height: 32px;
          }
          .main-table th {
            background: #f2f2f2;
            font-weight: 700;
          }
          .c-left { text-align: left; }
          .c-center { text-align: center; }
          .c-right { text-align: right; }

          .total-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1px;
          }
          .total-table td {
            border: 1px solid #111;
            font-size: 14px;
            font-weight: 800;
            padding: 7px 10px;
            background: #f2f2f2;
          }

          .notes {
            margin-top: 12px;
            font-size: 13px;
            line-height: 1.7;
          }

          .notes .note-title {
            font-weight: 700;
            margin-bottom: 2px;
          }

          .bottom-logo-wrap {
            margin-top: 18px;
            text-align: right;
          }

          .bottom-logo {
            max-width: 150px;
            max-height: 48px;
            object-fit: contain;
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="header">
            <div class="title">견적서 (ESTIMATE)</div>
            <div class="company-name">${displayCompanyName}</div>
          </div>

          <div class="divider"></div>

          <div class="top-grid">
            <table class="info-table">
              <tr>
                <td class="label">작성일</td>
                <td>${today}</td>
              </tr>
              <tr>
                <td class="label">상호</td>
                <td>${clientName || "-"}</td>
              </tr>
              <tr>
                <td class="label">제목</td>
                <td>${estimateTitle || "-"}</td>
              </tr>
              <tr>
                <td class="label">합계</td>
                <td class="value-strong">${pdfVatSummaryText}</td>
              </tr>
            </table>

            <table class="info-table">
              <tr>
                <td>${displayCompanyName}</td>
              </tr>
              <tr>
                <td>등록번호 ${displayBusinessNumber}</td>
              </tr>
              <tr>
                <td>${displayAddress}</td>
              </tr>
              <tr>
                <td>TEL : ${displayCompanyPhone}</td>
              </tr>
              <tr>
                <td>대표 : ${displayCeoName} ${stampHtml}</td>
              </tr>
            </table>
          </div>

          <table class="main-table">
            <colgroup>
              <col style="width: 10%">
              <col style="width: 22%">
              <col style="width: 15%">
              <col style="width: 7%">
              <col style="width: 7%">
              <col style="width: 14%">
              <col style="width: 13%">
              <col style="width: 12%">
            </colgroup>
            <thead>
              <tr>
                <th>구분</th>
                <th>품목</th>
                <th>규격</th>
                <th>단위</th>
                <th>수량</th>
                <th>단가</th>
                <th>공급가액</th>
                <th>비고</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <table class="total-table">
            <tr>
              <td class="c-center" style="width: 70%;">총 금 액</td>
              <td class="c-right" style="width: 30%;">${formatNumber(totalAmount)}</td>
            </tr>
          </table>

          <div class="notes">
            <div class="note-title">고객 준수사항</div>
            <div>1. ${getVatModeLabel(vatMode)}</div>
            <div>2. 납품조건 : ${deliveryCondition || "-"}</div>
            <div>3. 유효기간 : ${getDisplayDate(validUntil)}</div>
            <div>문의사항 : ${displayCompanyPhone} / ${displayCompanyEmail}</div>
            <div>계좌정보 : ${displayAccountInfo}</div>
          </div>

          ${bottomLogoHtml}
        </div>
      </body>
      </html>
    `;

    const printArea = document.createElement("div");
    printArea.style.position = "fixed";
    printArea.style.left = "-99999px";
    printArea.style.top = "0";
    printArea.style.width = "820px";
    printArea.innerHTML = html;
    document.body.appendChild(printArea);

    try {
      const html2canvasModule = await import("html2canvas");
      const jsPDFModule = await import("jspdf");

      const html2canvas = html2canvasModule.default;
      const JsPDFClass = jsPDFModule.default;

      const canvas = await html2canvas(printArea, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new JsPDFClass("p", "mm", "a4");

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 6;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;
      const imgHeight = (canvas.height * contentWidth) / canvas.width;

      if (imgHeight <= contentHeight) {
        pdf.addImage(imgData, "PNG", margin, margin, contentWidth, imgHeight);
      } else {
        let heightLeft = imgHeight;
        let position = margin;

        pdf.addImage(imgData, "PNG", margin, position, contentWidth, imgHeight);
        heightLeft -= contentHeight;

        while (heightLeft > 0) {
          pdf.addPage();
          position = margin - (imgHeight - heightLeft);
          pdf.addImage(imgData, "PNG", margin, position, contentWidth, imgHeight);
          heightLeft -= contentHeight;
        }
      }

      pdf.save(getSuggestedFileName("pdf"));
    } finally {
      document.body.removeChild(printArea);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      await handleSavePDF();
    } catch {
      alert("PDF 저장 중 오류가 발생했습니다.");
    }
  };

  const handlePrint = async () => {
    try {
      const canvas = await htmlToCanvas();
      const imgData = canvas.toDataURL("image/png");

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) {
        document.body.removeChild(iframe);
        alert("인쇄 프레임을 생성할 수 없습니다.");
        return;
      }

      iframeDoc.open();
      iframeDoc.write(`
        <html>
          <head>
            <title>Print</title>
            <style>
              html, body {
                margin: 0;
                padding: 0;
                background: #ffffff;
              }
              body {
                display: flex;
                justify-content: center;
                align-items: flex-start;
              }
              img {
                width: 794px;
                max-width: 100%;
                height: auto;
                display: block;
              }
              @page {
                size: A4;
                margin: 6mm;
              }
            </style>
          </head>
          <body>
            <img src="${imgData}" />
          </body>
        </html>
      `);
      iframeDoc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();

        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }, 300);
    } catch {
      alert("인쇄 중 오류가 발생했습니다.");
    }
  };

  let vatSummaryText = "";

  if (vatMode === "included") {
    vatSummaryText = `일금 ${formatNumber(totalAmount)}원 (VAT 포함)`;
  } else if (vatMode === "separate") {
    vatSummaryText = `공급가 ${formatNumber(supplyPrice)}원 + VAT ${formatNumber(vat)}원 = 합계 ${formatNumber(totalAmount)}원`;
  } else {
    vatSummaryText = `일금 ${formatNumber(totalAmount)}원 (부가세 없음)`;
  }

  return (
    <div className="min-h-screen bg-[#f3f5f8] px-4 py-4 xl:px-5 xl:py-5">
      <div className="mx-auto grid max-w-[1920px] grid-cols-1 gap-5 xl:grid-cols-[780px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-[26px] border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <h1 className="text-[19px] font-bold text-gray-900">견적서</h1>
            <p className="mt-1 text-[12px] text-gray-500">
              견적 생성 및 저장 / 출력
            </p>
          </div>

          <div className="rounded-[26px] border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <h2 className="mb-3 text-[16px] font-semibold text-gray-900">기본 정보</h2>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-gray-700">견적번호</span>
                <input
                  value={estimateNumber}
                  onChange={(e) => setEstimateNumber(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                  placeholder="WB-2026-0001"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                  저장된 제품 불러오기
                </span>
                <select
                  value={items[0]?.productName || ""}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                >
                  <option value="">제품 선택</option>
                  {savedProducts.map((item) => (
                    <option key={item.id} value={item.productName}>
                      {item.productName}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-[26px] border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-gray-900">품목 정보</h2>
              <button
                type="button"
                onClick={handleAddItem}
                className="rounded-2xl bg-gray-900 px-4 py-2 text-[13px] font-medium text-white"
              >
                품목 추가
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="rounded-[22px] border border-gray-200 bg-[#fbfbfc] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-gray-800">
                      품목 {index + 1}
                    </p>
                    {items.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-[13px] font-medium text-red-500"
                      >
                        삭제
                      </button>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr_1fr]">
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-semibold text-gray-600">제품명</span>
                      <input
                        value={item.productName}
                        onChange={(e) => handleItemChange(index, "productName", e.target.value)}
                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                        placeholder="제품명을 입력하세요"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-semibold text-gray-600">수량</span>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(index, "quantity", Number(e.target.value || 0))
                        }
                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-semibold text-gray-600">단가</span>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleItemChange(index, "unitPrice", Number(e.target.value || 0))
                        }
                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-gray-700">부가세 방식</span>
                <select
                  value={vatMode}
                  onChange={(e) => setVatMode(e.target.value as VatMode)}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                >
                  <option value="included">부가세 포함</option>
                  <option value="separate">부가세 별도</option>
                  <option value="none">부가세 없음</option>
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-[26px] border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <h2 className="mb-3 text-[16px] font-semibold text-gray-900">거래처 정보</h2>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-gray-700">상호</span>
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                  placeholder="거래처명"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-gray-700">담당자명</span>
                <input
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                  placeholder="담당자명"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-gray-700">연락처</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                  placeholder="연락처"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-gray-700">이메일</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                  placeholder="이메일"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-gray-700">납품조건</span>
                <input
                  value={deliveryCondition}
                  onChange={(e) => setDeliveryCondition(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                  placeholder="예: 선입금 후 제작"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-gray-700">유효기간</span>
                <input
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                  placeholder="예: 발행일 기준 7일 / 2026-03-31"
                />
              </label>
            </div>
          </div>

          <div className="rounded-[26px] border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <h2 className="mb-3 text-[16px] font-semibold text-gray-900">자동 계산 결과</h2>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[22px] border border-gray-200 bg-gray-50 p-4">
                <div className="text-[12px] text-gray-500">공급가</div>
                <div className="mt-2 text-[24px] font-bold text-gray-900">
                  {formatNumber(supplyPrice)}원
                </div>
              </div>

              <div className="rounded-[22px] border border-gray-200 bg-gray-50 p-4">
                <div className="text-[12px] text-gray-500">VAT</div>
                <div className="mt-2 text-[24px] font-bold text-gray-900">
                  {formatNumber(vat)}원
                </div>
              </div>

              <div className="rounded-[22px] border border-gray-200 bg-gray-50 p-4">
                <div className="text-[12px] text-gray-500">총금액</div>
                <div className="mt-2 text-[24px] font-bold text-gray-900">
                  {formatNumber(totalAmount)}원
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <h2 className="mb-3 text-[16px] font-semibold text-gray-900">저장 / 출력</h2>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <button
                onClick={handleResetEstimate}
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] font-semibold text-red-600"
              >
                초기화
              </button>

              <button
                onClick={handleDownloadPng}
                className="rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-[13px] font-semibold text-gray-900"
              >
                PNG 저장
              </button>

              <button
                onClick={handleDownloadJpg}
                className="rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-[13px] font-semibold text-gray-900"
              >
                JPG 저장
              </button>

              <button
                onClick={handleDownloadPdf}
                className="rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-[13px] font-semibold text-gray-900"
              >
                PDF 저장
              </button>

              <button
                onClick={handlePrint}
                className="rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-[13px] font-semibold text-gray-900"
              >
                인쇄
              </button>

              <button
                onClick={() => {
                  const subject = encodeURIComponent(`[견적서] ${estimateTitle || "견적서"}`);
                  const body = encodeURIComponent(
                    "안녕하세요.\n\n견적서를 전달드립니다.\n\n" +
                      `견적번호: ${estimateNumber}\n` +
                      `제품: ${estimateTitle}\n` +
                      `총금액: ${formatNumber(totalAmount)}원\n\n` +
                      "감사합니다."
                  );

                  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
                }}
                className="rounded-2xl border border-blue-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-blue-700"
              >
                메일 발송
              </button>
            </div>

            <button
              onClick={handleSaveEstimate}
              className="mt-3 w-full rounded-2xl bg-gray-900 px-4 py-2.5 text-[13px] font-semibold text-white"
            >
              견적 저장
            </button>
          </div>

          <div className="rounded-[26px] border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <h2 className="mb-3 text-[16px] font-semibold text-gray-900">저장된 견적 목록</h2>

            {savedEstimates.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-gray-300 p-6 text-[13px] text-gray-500">
                저장된 견적이 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {savedEstimates.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[22px] border border-gray-200 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-[14px] font-semibold text-gray-900">
                          {item.estimateNumber} / {item.productName}
                        </div>
                        <div className="mt-1 text-[13px] text-gray-500">
                          거래처: {item.clientName || "-"} / 총금액: {formatNumber(item.totalAmount)}원 / 저장일: {item.date}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleLoadEstimate(item)}
                          className="rounded-2xl bg-gray-900 px-4 py-2 text-[13px] font-medium text-white"
                        >
                          불러오기
                        </button>
                        <button
                          onClick={() => handleDeleteEstimate(item.id)}
                          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-[13px] font-medium text-red-600"
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

        <div className="xl:sticky xl:top-5 xl:self-start">
          <div className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-[18px] font-semibold text-gray-900">A4 미리보기</h2>
              <p className="text-[11px] text-gray-500">견적서 문서형 미리보기</p>
            </div>

            <div className="overflow-auto rounded-[22px] bg-[#edf1f6] p-3">
              <div className="mx-auto flex justify-center">
                <div
                  id="estimate-print-area"
                  className="w-[794px] min-h-[1123px] bg-white px-6 py-7 text-black"
                >
                  <div className="mb-4 flex items-end justify-between">
                    <div className="text-[28px] font-extrabold tracking-[-0.02em] text-gray-900">
                      견적서 (ESTIMATE)
                    </div>

                    <div className="text-[20px] font-extrabold tracking-[-0.01em] text-gray-900">
                      {displayCompanyName}
                    </div>
                  </div>

                  <div className="mb-3 h-[2px] w-full bg-gray-900"></div>

                  <div className="mb-4 grid grid-cols-2 gap-5">
                    <table className="w-full border-collapse">
                      <tbody>
                        <tr>
                          <td className="w-[70px] py-1 text-[13px] font-bold text-gray-900">작성일</td>
                          <td className="py-1 text-[13px] text-gray-900">{today}</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-[13px] font-bold text-gray-900">상호</td>
                          <td className="py-1 text-[13px] text-gray-900">{clientName || "-"}</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-[13px] font-bold text-gray-900">제목</td>
                          <td className="py-1 text-[13px] text-gray-900">{estimateTitle || "-"}</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-[13px] font-bold text-gray-900">합계</td>
                          <td className="py-1 text-[13px] font-extrabold text-gray-900">
                            {vatSummaryText}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <table className="w-full border-collapse">
                      <tbody>
                        <tr>
                          <td className="py-1 text-[13px] text-gray-900">{displayCompanyName}</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-[13px] text-gray-900">
                            등록번호 {displayBusinessNumber}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-1 text-[13px] text-gray-900">{displayAddress}</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-[13px] text-gray-900">
                            TEL : {displayCompanyPhone}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-1 text-[13px] text-gray-900">
                            대표 : {displayCeoName}
                            {companySettings.stampDataUrl ? (
                              <img
                                src={companySettings.stampDataUrl}
                                alt="도장"
                                className="ml-2 inline-block h-[54px] w-[54px] object-contain align-middle"
                              />
                            ) : (
                              <span className="ml-2 inline-flex h-[54px] w-[54px] rotate-[-16deg] items-center justify-center rounded-full border-2 border-red-600 text-[12px] font-bold text-red-600">
                                직인
                              </span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <table className="w-full table-fixed border-collapse border border-gray-900">
                    <colgroup>
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "22%" }} />
                      <col style={{ width: "15%" }} />
                      <col style={{ width: "7%" }} />
                      <col style={{ width: "7%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "13%" }} />
                      <col style={{ width: "12%" }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-900 px-2 py-1.5 text-center text-[12px] font-bold">
                          구분
                        </th>
                        <th className="border border-gray-900 px-2 py-1.5 text-center text-[12px] font-bold">
                          품목
                        </th>
                        <th className="border border-gray-900 px-2 py-1.5 text-center text-[12px] font-bold">
                          규격
                        </th>
                        <th className="border border-gray-900 px-2 py-1.5 text-center text-[12px] font-bold">
                          단위
                        </th>
                        <th className="border border-gray-900 px-2 py-1.5 text-center text-[12px] font-bold">
                          수량
                        </th>
                        <th className="border border-gray-900 px-2 py-1.5 text-center text-[12px] font-bold">
                          단가
                        </th>
                        <th className="border border-gray-900 px-2 py-1.5 text-center text-[12px] font-bold">
                          공급가액
                        </th>
                        <th className="border border-gray-900 px-2 py-1.5 text-center text-[12px] font-bold">
                          비고
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, index) => (
                        <tr key={index}>
                          <td className="h-[30px] border border-gray-900 px-2 py-1 text-center text-[12px]">
                            {row.category || ""}
                          </td>
                          <td className="h-[30px] border border-gray-900 px-2 py-1 text-left text-[12px]">
                            {row.item || ""}
                          </td>
                          <td className="h-[30px] border border-gray-900 px-2 py-1 text-center text-[12px]">
                            {row.spec || ""}
                          </td>
                          <td className="h-[30px] border border-gray-900 px-2 py-1 text-center text-[12px]">
                            {row.unit || ""}
                          </td>
                          <td className="h-[30px] border border-gray-900 px-2 py-1 text-center text-[12px]">
                            {row.quantity || ""}
                          </td>
                          <td className="h-[30px] border border-gray-900 px-2 py-1 text-right text-[12px]">
                            {row.price || ""}
                          </td>
                          <td className="h-[30px] border border-gray-900 px-2 py-1 text-right text-[12px]">
                            {row.supplyAmount || ""}
                          </td>
                          <td className="h-[30px] border border-gray-900 px-2 py-1 text-left text-[12px]">
                            {row.note || ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <table className="mt-[1px] w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="w-[70%] border border-gray-900 bg-gray-100 px-3 py-2 text-center text-[14px] font-extrabold text-gray-900">
                          총 금 액
                        </td>
                        <td className="w-[30%] border border-gray-900 bg-gray-100 px-3 py-2 text-right text-[14px] font-extrabold text-gray-900">
                          {formatNumber(totalAmount)}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="mt-4 text-[13px] leading-6 text-gray-900">
                    <div className="font-bold">고객 준수사항</div>
                    <div>1. {getVatModeLabel(vatMode)}</div>
                    <div>2. 납품조건 : {deliveryCondition || "-"}</div>
                    <div>3. 유효기간 : {getDisplayDate(validUntil)}</div>
                    <div>문의사항 : {displayCompanyPhone} / {displayCompanyEmail}</div>
                    <div>계좌정보 : {displayAccountInfo}</div>
                  </div>

                  {companySettings.logoDataUrl ? (
                    <div className="mt-5 flex justify-end">
                      <img
                        src={companySettings.logoDataUrl}
                        alt="회사 로고"
                        className="max-h-[48px] max-w-[150px] object-contain"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}