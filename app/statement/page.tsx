"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type VatMode = "included" | "separate";

type StatementItem = {
  id: string;
  dateYear: string;
  dateMonth: string;
  dateDay: string;
  productName: string;
  spec: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  supplyAmount: number;
  taxAmount: number;
};

type ClientData = {
  id?: string;
  companyName: string;
  managerName: string;
  phone: string;
  email: string;
  address?: string;
  fax?: string;
  businessNumber?: string;
  memo?: string;
};

type CompanySettings = {
  companyName?: string;
  ceoName?: string;
  businessNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  fax?: string;
  logoDataUrl?: string;
  stampDataUrl?: string;
};

type SupplierData = {
  companyName: string;
  ceoName: string;
  businessNumber: string;
  address: string;
  phone: string;
  fax: string;
};

type SavedStatement = {
  id: string;
  statementNumber: string;
  statementDate: string;
  vatMode: VatMode;
  receiver: ClientData;
  supplier: SupplierData;
  items: StatementItem[];
  notes: string;
  unpaidAmount: number;
  totalSupplyAmount: number;
  totalTaxAmount: number;
  totalAmount: number;
  receiverSigner: string;
  supplierSigner: string;
  createdAt: string;
};

type EstimateDraftProduct = {
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  supplyPrice?: number;
};

type EstimateDraft = {
  clientName?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  items?: EstimateDraftProduct[];
};

const STORAGE_KEYS = {
  statements: "wantb-statements",
  statementSeq: "wantb-statement-seq",
  selectedClient: "wantb-selected-client",
  companySettings: "wantb-company-settings",
  estimateDraft: "estimate-draft",
};

const PREVIEW_ROW_COUNT = 13;

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("ko-KR");
}

function parseNumber(value: string | number) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function todayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDateParts(dateStr: string) {
  const [year = "", month = "", day = ""] = dateStr.split("-");
  return { year, month, day };
}

function makeStatementNumber(date = todayString()) {
  const current = Number(localStorage.getItem(STORAGE_KEYS.statementSeq) || "0") + 1;
  localStorage.setItem(STORAGE_KEYS.statementSeq, String(current));
  const compactDate = date.replaceAll("-", "");
  return `WB-ST-${compactDate}-${String(current).padStart(4, "0")}`;
}

function calculateLineAmounts(quantity: number, unitPrice: number, vatMode: VatMode) {
  const safeQuantity = parseNumber(quantity);
  const safeUnitPrice = parseNumber(unitPrice);
  const rawAmount = safeQuantity * safeUnitPrice;

  if (vatMode === "included") {
    const totalAmount = rawAmount;
    const supplyAmount = Math.round(totalAmount / 1.1);
    const taxAmount = totalAmount - supplyAmount;
    return {
      quantity: safeQuantity,
      unitPrice: safeUnitPrice,
      supplyAmount,
      taxAmount,
    };
  }

  const supplyAmount = rawAmount;
  const taxAmount = Math.round(supplyAmount * 0.1);

  return {
    quantity: safeQuantity,
    unitPrice: safeUnitPrice,
    supplyAmount,
    taxAmount,
  };
}

function makeItem(date = todayString()): StatementItem {
  const { year, month, day } = getDateParts(date);

  return {
    id: crypto.randomUUID(),
    dateYear: year,
    dateMonth: month,
    dateDay: day,
    productName: "",
    spec: "",
    unit: "EA",
    quantity: 0,
    unitPrice: 0,
    supplyAmount: 0,
    taxAmount: 0,
  };
}

function makePreviewRows(items: StatementItem[]) {
  const rows = [...items];
  while (rows.length < PREVIEW_ROW_COUNT) {
    rows.push({
      id: crypto.randomUUID(),
      dateYear: "",
      dateMonth: "",
      dateDay: "",
      productName: "",
      spec: "",
      unit: "",
      quantity: 0,
      unitPrice: 0,
      supplyAmount: 0,
      taxAmount: 0,
    });
  }
  return rows.slice(0, PREVIEW_ROW_COUNT);
}

type SlipPreviewProps = {
  color: string;
  titleNote: string;
  receiver: ClientData;
  supplier: SupplierData;
  previewRows: StatementItem[];
  vatMode: VatMode;
  totalSupplyAmount: number;
  totalTaxAmount: number;
  totalAmount: number;
  unpaidAmount: number;
  receiverSigner: string;
  supplierSigner: string;
  companySettings: CompanySettings;
};

function SlipPreview({
  color,
  titleNote,
  receiver,
  supplier,
  previewRows,
  vatMode,
  totalSupplyAmount,
  totalTaxAmount,
  totalAmount,
  unpaidAmount,
  receiverSigner,
  supplierSigner,
  companySettings,
}: SlipPreviewProps) {
  const totalLabel =
    vatMode === "included" ? "합계금액\n(VAT포함)" : "합계금액\n(VAT별도)";

  return (
    <div className="border-[1.5px]" style={{ borderColor: color }}>
      <div
        className="flex h-[40px] items-center justify-center border-b-[1.5px]"
        style={{ borderColor: color }}
      >
        <div className="flex items-end gap-2">
          <span
            className="text-[22px] font-bold tracking-[8px]"
            style={{ color }}
          >
            거 래 명 세 서
          </span>
          <span
            className="mb-[2px] text-[12px] font-semibold"
            style={{ color }}
          >
            ({titleNote})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[24px_1fr_24px_1.06fr]">
        <div
          className="flex items-center justify-center border-r border-b-[1.5px] text-[11px] font-bold [writing-mode:vertical-rl]"
          style={{ borderColor: color, color }}
        >
          공급받는자
        </div>

        <div className="border-r-[1.5px] border-b-[1.5px]" style={{ borderColor: color }}>
          <div className="grid grid-cols-[98px_1fr] border-b" style={{ borderColor: color }}>
            <div
              className="flex h-[32px] items-center justify-center border-r text-center text-[10px] font-bold leading-[13px]"
              style={{ borderColor: color, color }}
            >
              상 호
              <br />
              (법인명)
            </div>
            <div className="flex h-[32px] items-center px-2 text-[10px] text-[#222]">
              {receiver.companyName || ""}
            </div>
          </div>

          <div className="grid grid-cols-[98px_1fr] border-b" style={{ borderColor: color }}>
            <div
              className="flex h-[32px] items-center justify-center border-r text-center text-[10px] font-bold"
              style={{ borderColor: color, color }}
            >
              등록번호
            </div>
            <div className="flex h-[32px] items-center px-2 text-[10px] text-[#222]">
              {receiver.businessNumber || ""}
            </div>
          </div>

          <div className="grid grid-cols-[98px_1fr] border-b" style={{ borderColor: color }}>
            <div
              className="flex h-[32px] items-center justify-center border-r text-center text-[10px] font-bold leading-[13px]"
              style={{ borderColor: color, color }}
            >
              사업장
              <br />
              주 소
            </div>
            <div className="flex h-[32px] items-center px-2 text-[10px] text-[#222]">
              {receiver.address || ""}
            </div>
          </div>

          <div className="grid grid-cols-[98px_1fr] border-b" style={{ borderColor: color }}>
            <div
              className="flex h-[32px] items-center justify-center border-r text-center text-[10px] font-bold"
              style={{ borderColor: color, color }}
            >
              전화번호
            </div>
            <div className="flex h-[32px] items-center px-2 text-[10px] text-[#222]">
              {receiver.phone || ""}
            </div>
          </div>

          <div className="grid grid-cols-[98px_1fr]" style={{ borderColor: color }}>
            <div
              className="flex h-[32px] items-center justify-center border-r whitespace-pre-line text-center text-[10px] font-bold leading-[13px]"
              style={{ borderColor: color, color }}
            >
              {totalLabel}
            </div>
            <div className="flex h-[32px] items-center justify-end px-2 text-[11px] font-semibold text-[#222]">
              {formatNumber(totalAmount)}
            </div>
          </div>
        </div>

        <div
          className="flex items-center justify-center border-r border-b-[1.5px] text-[11px] font-bold [writing-mode:vertical-rl]"
          style={{ borderColor: color, color }}
        >
          공급자
        </div>

        <div className="border-b-[1.5px]" style={{ borderColor: color }}>
          <div className="grid grid-cols-[90px_1fr] border-b" style={{ borderColor: color }}>
            <div
              className="flex h-[32px] items-center justify-center border-r text-center text-[10px] font-bold"
              style={{ borderColor: color, color }}
            >
              등록번호
            </div>
            <div className="flex h-[32px] items-center px-2 text-[10px] font-semibold text-[#222]">
              {supplier.businessNumber || ""}
            </div>
          </div>

          <div className="grid grid-cols-[90px_1fr_44px_1fr] border-b" style={{ borderColor: color }}>
            <div
              className="flex h-[32px] items-center justify-center border-r text-center text-[10px] font-bold leading-[13px]"
              style={{ borderColor: color, color }}
            >
              상 호
              <br />
              (법인명)
            </div>
            <div className="flex h-[32px] items-center px-2 text-[10px] text-[#222]">
              {supplier.companyName || ""}
            </div>
            <div
              className="flex h-[32px] items-center justify-center border-l border-r text-center text-[10px] font-bold"
              style={{ borderColor: color, color }}
            >
              성 명
            </div>
            <div className="relative flex h-[32px] items-center px-2 text-[10px] text-[#222]">
              <span>{supplier.ceoName || ""}</span>
              {companySettings.stampDataUrl ? (
                <img
                  src={companySettings.stampDataUrl}
                  alt="stamp"
                  className="absolute right-2 top-1/2 h-[24px] -translate-y-1/2 object-contain opacity-90"
                />
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-[90px_1fr] border-b" style={{ borderColor: color }}>
            <div
              className="flex h-[32px] items-center justify-center border-r text-center text-[10px] font-bold leading-[13px]"
              style={{ borderColor: color, color }}
            >
              사업장
              <br />
              주 소
            </div>
            <div className="flex h-[32px] items-center px-2 text-[10px] text-[#222]">
              {supplier.address || ""}
            </div>
          </div>

          <div className="grid grid-cols-[90px_1fr_42px_1fr_42px_1fr]" style={{ borderColor: color }}>
            <div
              className="flex h-[32px] items-center justify-center border-r text-center text-[10px] font-bold"
              style={{ borderColor: color, color }}
            >
              전 화
            </div>
            <div className="flex h-[32px] items-center px-2 text-[10px] text-[#222]">
              {supplier.phone || ""}
            </div>
            <div
              className="flex h-[32px] items-center justify-center border-l border-r text-center text-[10px] font-bold"
              style={{ borderColor: color, color }}
            >
              팩 스
            </div>
            <div className="flex h-[32px] items-center px-2 text-[10px] text-[#222]">
              {supplier.fax || ""}
            </div>
            <div
              className="flex h-[32px] items-center justify-center border-l border-r text-center text-[10px] font-bold"
              style={{ borderColor: color, color }}
            >
              VAT
            </div>
            <div className="flex h-[32px] items-center px-2 text-[10px] font-semibold text-[#222]">
              {vatMode === "included" ? "포함" : "별도"}
            </div>
          </div>
        </div>
      </div>

      <div
        className="grid grid-cols-[22px_22px_22px_1.72fr_0.82fr_0.68fr_0.76fr_0.9fr_0.98fr_0.9fr] border-b"
        style={{ borderColor: color, color }}
      >
        <div className="flex h-[23px] items-center justify-center border-r text-[9px] font-bold" style={{ borderColor: color }}>년</div>
        <div className="flex h-[23px] items-center justify-center border-r text-[9px] font-bold" style={{ borderColor: color }}>월</div>
        <div className="flex h-[23px] items-center justify-center border-r text-[9px] font-bold" style={{ borderColor: color }}>일</div>
        <div className="flex h-[23px] items-center justify-center border-r text-[9px] font-bold" style={{ borderColor: color }}>품 목</div>
        <div className="flex h-[23px] items-center justify-center border-r text-[9px] font-bold" style={{ borderColor: color }}>규격</div>
        <div className="flex h-[23px] items-center justify-center border-r text-[9px] font-bold" style={{ borderColor: color }}>단위</div>
        <div className="flex h-[23px] items-center justify-center border-r text-[9px] font-bold" style={{ borderColor: color }}>수량</div>
        <div className="flex h-[23px] items-center justify-center border-r text-[9px] font-bold" style={{ borderColor: color }}>단가</div>
        <div className="flex h-[23px] items-center justify-center border-r text-[9px] font-bold" style={{ borderColor: color }}>공급가액</div>
        <div className="flex h-[23px] items-center justify-center text-[9px] font-bold">세액</div>
      </div>

      {previewRows.map((row, idx) => (
        <div
          key={`${titleNote}-${row.id}-${idx}`}
          className="grid grid-cols-[22px_22px_22px_1.72fr_0.82fr_0.68fr_0.76fr_0.9fr_0.98fr_0.9fr] border-b text-[#222]"
          style={{ borderColor: color }}
        >
          <div className="flex h-[19px] items-center justify-center border-r text-[8px]" style={{ borderColor: color }}>
            {row.dateYear ? row.dateYear.slice(-2) : ""}
          </div>
          <div className="flex h-[19px] items-center justify-center border-r text-[8px]" style={{ borderColor: color }}>
            {row.dateMonth || ""}
          </div>
          <div className="flex h-[19px] items-center justify-center border-r text-[8px]" style={{ borderColor: color }}>
            {row.dateDay || ""}
          </div>
          <div className="flex h-[19px] items-center border-r px-1.5 text-[8px]" style={{ borderColor: color }}>
            {row.productName || ""}
          </div>
          <div className="flex h-[19px] items-center border-r px-1.5 text-[8px]" style={{ borderColor: color }}>
            {row.spec || ""}
          </div>
          <div className="flex h-[19px] items-center justify-center border-r px-1 text-[8px]" style={{ borderColor: color }}>
            {row.unit || ""}
          </div>
          <div className="flex h-[19px] items-center justify-end border-r px-1.5 text-[8px]" style={{ borderColor: color }}>
            {row.quantity ? formatNumber(row.quantity) : ""}
          </div>
          <div className="flex h-[19px] items-center justify-end border-r px-1.5 text-[8px]" style={{ borderColor: color }}>
            {row.unitPrice ? formatNumber(row.unitPrice) : ""}
          </div>
          <div className="flex h-[19px] items-center justify-end border-r px-1.5 text-[8px]" style={{ borderColor: color }}>
            {row.supplyAmount ? formatNumber(row.supplyAmount) : ""}
          </div>
          <div className="flex h-[19px] items-center justify-end px-1.5 text-[8px]">
            {row.taxAmount ? formatNumber(row.taxAmount) : ""}
          </div>
        </div>
      ))}

      <div
        className="grid grid-cols-[1fr_1fr_1.1fr] border-b"
        style={{ borderColor: color }}
      >
        <div className="flex h-[26px] items-center justify-between border-r px-2 text-[10px] font-bold" style={{ borderColor: color, color }}>
          <span>공급가액</span>
          <span className="text-[#222]">{formatNumber(totalSupplyAmount)}</span>
        </div>
        <div className="flex h-[26px] items-center justify-between border-r px-2 text-[10px] font-bold" style={{ borderColor: color, color }}>
          <span>세액</span>
          <span className="text-[#222]">{formatNumber(totalTaxAmount)}</span>
        </div>
        <div className="flex h-[26px] items-center justify-between px-2 text-[10px] font-bold" style={{ color }}>
          <span>{vatMode === "included" ? "총합계(VAT포함)" : "총합계(VAT별도)"}</span>
          <span className="text-[#222]">{formatNumber(totalAmount)}</span>
        </div>
      </div>

      <div
        className="grid grid-cols-[1fr_0.8fr_1fr_0.8fr_0.95fr_1.15fr]"
        style={{ color }}
      >
        <div
          className="flex h-[28px] items-center justify-center border-r border-t text-[10px] font-bold"
          style={{ borderColor: color }}
        >
          인 수 자
        </div>
        <div
          className="flex h-[28px] items-center justify-center border-r border-t px-2 text-[10px] font-semibold text-[#222]"
          style={{ borderColor: color }}
        >
          {receiverSigner}
        </div>
        <div
          className="flex h-[28px] items-center justify-center border-r border-t text-[10px] font-bold"
          style={{ borderColor: color }}
        >
          납 품 자
        </div>
        <div
          className="flex h-[28px] items-center justify-center border-r border-t px-2 text-[10px] font-semibold text-[#222]"
          style={{ borderColor: color }}
        >
          {supplierSigner}
        </div>
        <div
          className="flex h-[28px] items-center justify-center border-r border-t text-[10px] font-bold"
          style={{ borderColor: color }}
        >
          미 수 금
        </div>
        <div
          className="flex h-[28px] items-center justify-end border-t px-3 text-[10px] font-bold text-[#222]"
          style={{ borderColor: color }}
        >
          {formatNumber(unpaidAmount)}
        </div>
      </div>
    </div>
  );
}

export default function StatementPage() {
  const previewRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);

  const [statementId, setStatementId] = useState("");
  const [statementNumber, setStatementNumber] = useState("");
  const [statementDate, setStatementDate] = useState(todayString());
  const [vatMode, setVatMode] = useState<VatMode>("included");

  const [receiver, setReceiver] = useState<ClientData>({
    companyName: "",
    managerName: "",
    phone: "",
    email: "",
    address: "",
    fax: "",
    businessNumber: "",
    memo: "",
  });

  const [supplier, setSupplier] = useState<SupplierData>({
    companyName: "",
    ceoName: "",
    businessNumber: "",
    address: "",
    phone: "",
    fax: "",
  });

  const [receiverSigner, setReceiverSigner] = useState("");
  const [supplierSigner, setSupplierSigner] = useState("");

  const [items, setItems] = useState<StatementItem[]>([
    makeItem(),
    makeItem(),
    makeItem(),
  ]);

  const [notes, setNotes] = useState("상기와 같이 거래명세 내역을 확인드립니다.");
  const [unpaidAmount, setUnpaidAmount] = useState(0);

  const [companySettings, setCompanySettings] = useState<CompanySettings>({});
  const [savedStatements, setSavedStatements] = useState<SavedStatement[]>([]);

  useEffect(() => {
    setMounted(true);

    const savedCompany = localStorage.getItem(STORAGE_KEYS.companySettings);
    if (savedCompany) {
      try {
        const parsed: CompanySettings = JSON.parse(savedCompany);
        setCompanySettings(parsed);
        setSupplier({
          companyName: parsed.companyName || "",
          ceoName: parsed.ceoName || "",
          businessNumber: parsed.businessNumber || "",
          address: parsed.address || "",
          phone: parsed.phone || "",
          fax: parsed.fax || "",
        });
        setSupplierSigner(parsed.ceoName || "");
      } catch {}
    }

    const savedSelectedClient = localStorage.getItem(STORAGE_KEYS.selectedClient);
    if (savedSelectedClient) {
      try {
        const parsed = JSON.parse(savedSelectedClient);
        setReceiver((prev) => ({
          ...prev,
          companyName: parsed.companyName || "",
          managerName: parsed.managerName || "",
          phone: parsed.phone || "",
          email: parsed.email || "",
          address: parsed.address || "",
          fax: parsed.fax || "",
          businessNumber: parsed.businessNumber || "",
          memo: parsed.memo || "",
        }));
        setReceiverSigner(parsed.managerName || "");
      } catch {}
    }

    const savedEstimateDraft = localStorage.getItem(STORAGE_KEYS.estimateDraft);
    if (savedEstimateDraft) {
      try {
        const parsed: EstimateDraft = JSON.parse(savedEstimateDraft);

        setReceiver((prev) => ({
          ...prev,
          companyName: prev.companyName || parsed.clientName || "",
          managerName: prev.managerName || parsed.contactPerson || "",
          phone: prev.phone || parsed.phone || "",
          email: prev.email || parsed.email || "",
        }));

        if (!receiverSigner) {
          setReceiverSigner(parsed.contactPerson || "");
        }

        if (Array.isArray(parsed.items) && parsed.items.length > 0) {
          const currentDate = todayString();
          const mapped = parsed.items.map((item) => {
            const quantity = parseNumber(item.quantity || 0);
            const unitPrice = parseNumber(item.unitPrice ?? item.supplyPrice ?? 0);
            const amounts = calculateLineAmounts(quantity, unitPrice, "included");

            return {
              ...makeItem(currentDate),
              productName: item.productName || "",
              unit: "EA",
              quantity: amounts.quantity,
              unitPrice: amounts.unitPrice,
              supplyAmount: amounts.supplyAmount,
              taxAmount: amounts.taxAmount,
            };
          });

          setItems(mapped);
        }
      } catch {}
    }

    const savedStatementsRaw = localStorage.getItem(STORAGE_KEYS.statements);
    if (savedStatementsRaw) {
      try {
        setSavedStatements(JSON.parse(savedStatementsRaw));
      } catch {}
    }

    setStatementId(crypto.randomUUID());
    setStatementNumber(makeStatementNumber(todayString()));
  }, []);

  const normalizedItems = useMemo(() => {
    return items.map((item) => {
      const amounts = calculateLineAmounts(item.quantity, item.unitPrice, vatMode);

      return {
        ...item,
        quantity: amounts.quantity,
        unitPrice: amounts.unitPrice,
        supplyAmount: amounts.supplyAmount,
        taxAmount: amounts.taxAmount,
      };
    });
  }, [items, vatMode]);

  const totalSupplyAmount = useMemo(
    () => normalizedItems.reduce((sum, item) => sum + item.supplyAmount, 0),
    [normalizedItems]
  );

  const totalTaxAmount = useMemo(
    () => normalizedItems.reduce((sum, item) => sum + item.taxAmount, 0),
    [normalizedItems]
  );

  const totalAmount = useMemo(() => {
    return totalSupplyAmount + totalTaxAmount;
  }, [totalSupplyAmount, totalTaxAmount]);

  const previewRows = useMemo(() => makePreviewRows(normalizedItems), [normalizedItems]);

  function syncSavedStatements(next: SavedStatement[]) {
    setSavedStatements(next);
    localStorage.setItem(STORAGE_KEYS.statements, JSON.stringify(next));
  }

  function handleReceiverChange<K extends keyof ClientData>(key: K, value: ClientData[K]) {
    setReceiver((prev) => ({ ...prev, [key]: value }));
  }

  function handleSupplierChange(key: keyof SupplierData, value: string) {
    setSupplier((prev) => ({ ...prev, [key]: value }));
  }

  function handleStatementDateChange(nextDate: string) {
    setStatementDate(nextDate);
    const { year, month, day } = getDateParts(nextDate);

    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        dateYear: year,
        dateMonth: month,
        dateDay: day,
      }))
    );
  }

  function handleVatModeChange(nextMode: VatMode) {
    setVatMode(nextMode);
  }

  function handleItemChange(
    id: string,
    key: keyof StatementItem,
    value: string | number
  ) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const next = {
          ...item,
          [key]: value,
        };

        const amounts = calculateLineAmounts(next.quantity, next.unitPrice, vatMode);

        return {
          ...next,
          quantity: amounts.quantity,
          unitPrice: amounts.unitPrice,
          supplyAmount: amounts.supplyAmount,
          taxAmount: amounts.taxAmount,
        };
      })
    );
  }

  function addItem() {
    setItems((prev) => [...prev, makeItem(statementDate)]);
  }

  function removeItem(id: string) {
    if (items.length === 1) {
      setItems([makeItem(statementDate)]);
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function resetForm() {
    const nextDate = todayString();

    setStatementId(crypto.randomUUID());
    setStatementNumber(makeStatementNumber(nextDate));
    setStatementDate(nextDate);
    setVatMode("included");
    setReceiver({
      companyName: "",
      managerName: "",
      phone: "",
      email: "",
      address: "",
      fax: "",
      businessNumber: "",
      memo: "",
    });
    setReceiverSigner("");
    setSupplierSigner(companySettings.ceoName || "");
    setItems([makeItem(nextDate), makeItem(nextDate), makeItem(nextDate)]);
    setNotes("상기와 같이 거래명세 내역을 확인드립니다.");
    setUnpaidAmount(0);
  }

  function saveStatement() {
    const payload: SavedStatement = {
      id: statementId || crypto.randomUUID(),
      statementNumber,
      statementDate,
      vatMode,
      receiver,
      supplier,
      items: normalizedItems,
      notes,
      unpaidAmount,
      totalSupplyAmount,
      totalTaxAmount,
      totalAmount,
      receiverSigner,
      supplierSigner,
      createdAt: new Date().toISOString(),
    };

    const existingIndex = savedStatements.findIndex((item) => item.id === payload.id);
    let next: SavedStatement[] = [];

    if (existingIndex >= 0) {
      next = [...savedStatements];
      next[existingIndex] = payload;
    } else {
      next = [payload, ...savedStatements];
    }

    syncSavedStatements(next);
    alert("거래명세표가 저장되었습니다.");
  }

  function loadStatement(data: SavedStatement) {
    setStatementId(data.id);
    setStatementNumber(data.statementNumber);
    setStatementDate(data.statementDate);
    setVatMode(data.vatMode || "included");
    setReceiver(data.receiver);
    setSupplier(data.supplier);
    setItems(
      data.items.map((item) => ({
        ...item,
        unit: item.unit || "EA",
      }))
    );
    setNotes(data.notes);
    setUnpaidAmount(data.unpaidAmount || 0);
    setReceiverSigner(data.receiverSigner || data.receiver.managerName || "");
    setSupplierSigner(data.supplierSigner || data.supplier.ceoName || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteStatement(id: string) {
    const ok = window.confirm("이 거래명세표를 삭제하시겠습니까?");
    if (!ok) return;
    syncSavedStatements(savedStatements.filter((item) => item.id !== id));
  }

  async function renderStatementCanvas() {
    if (!previewRef.current) {
      throw new Error("미리보기 영역을 찾을 수 없습니다.");
    }

    const canvas = await html2canvas(previewRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0,
    });

    return canvas;
  }

  async function handleSavePng() {
    const canvas = await renderStatementCanvas();
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${statementNumber || "statement"}.png`;
    link.click();
  }

  async function handleSaveJpg() {
    const canvas = await renderStatementCanvas();
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/jpeg", 0.95);
    link.download = `${statementNumber || "statement"}.jpg`;
    link.click();
  }

  async function createPdfBlob() {
    const canvas = await renderStatementCanvas();
    const imgData = canvas.toDataURL("image/jpeg", 1.0);

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = 210;
    const pdfHeight = 297;

    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
    return pdf.output("blob");
  }

  async function handleSavePdf() {
    const blob = await createPdfBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${statementNumber || "statement"}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handlePrint() {
    const blob = await createPdfBlob();
    const url = URL.createObjectURL(blob);

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = url;

    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } finally {
          setTimeout(() => {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(url);
          }, 1000);
        }
      }, 300);
    };
  }

  function handleSendEmail() {
    const vatLabel = vatMode === "included" ? "VAT 포함" : "VAT 별도";
    const subject = encodeURIComponent(`[거래명세표] ${statementNumber}`);
    const body = encodeURIComponent(
      [
        `거래명세표 번호: ${statementNumber}`,
        `작성일: ${statementDate}`,
        `거래처: ${receiver.companyName}`,
        `VAT 구분: ${vatLabel}`,
        `공급가액: ${formatNumber(totalSupplyAmount)}원`,
        `세액: ${formatNumber(totalTaxAmount)}원`,
        `합계금액: ${formatNumber(totalAmount)}원`,
        `미수금: ${formatNumber(unpaidAmount)}원`,
        "",
        "원프앤에서 작성된 거래명세표입니다.",
      ].join("\n")
    );

    const email = receiver.email || "";
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  }

  if (!mounted) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-500">
          불러오는 중...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6fa] p-6">
      <div className="mx-auto grid max-w-[1720px] grid-cols-1 gap-6 xl:grid-cols-[560px_1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900">거래명세표</h1>
            <p className="mt-2 text-sm text-gray-500">
              상단 파란 보관용 + 하단 빨간 보관용 2단 출력 버전입니다.
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">기본 정보</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-gray-700">
                  거래명세표 번호
                </span>
                <input
                  value={statementNumber}
                  onChange={(e) => setStatementNumber(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">
                  작성일
                </span>
                <input
                  type="date"
                  value={statementDate}
                  onChange={(e) => handleStatementDateChange(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                />
              </label>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">VAT 선택</span>
                <select
                  value={vatMode}
                  onChange={(e) => handleVatModeChange(e.target.value as VatMode)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                >
                  <option value="included">VAT 포함</option>
                  <option value="separate">VAT 별도</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">인수자</span>
                <input
                  value={receiverSigner}
                  onChange={(e) => setReceiverSigner(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">납품자</span>
                <input
                  value={supplierSigner}
                  onChange={(e) => setSupplierSigner(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                />
              </label>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">공급받는자 정보</h2>

            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">상호(법인명)</span>
                  <input
                    value={receiver.companyName}
                    onChange={(e) => handleReceiverChange("companyName", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">등록번호</span>
                  <input
                    value={receiver.businessNumber || ""}
                    onChange={(e) => handleReceiverChange("businessNumber", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">사업장 주소</span>
                <input
                  value={receiver.address || ""}
                  onChange={(e) => handleReceiverChange("address", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                />
              </label>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">성명</span>
                  <input
                    value={receiver.managerName}
                    onChange={(e) => {
                      handleReceiverChange("managerName", e.target.value);
                      if (!receiverSigner) setReceiverSigner(e.target.value);
                    }}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-gray-700">전화번호</span>
                  <input
                    value={receiver.phone}
                    onChange={(e) => handleReceiverChange("phone", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">팩스</span>
                  <input
                    value={receiver.fax || ""}
                    onChange={(e) => handleReceiverChange("fax", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">이메일</span>
                <input
                  value={receiver.email}
                  onChange={(e) => handleReceiverChange("email", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                />
              </label>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">공급자 정보</h2>

            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">상호(법인명)</span>
                  <input
                    value={supplier.companyName}
                    onChange={(e) => handleSupplierChange("companyName", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">등록번호</span>
                  <input
                    value={supplier.businessNumber}
                    onChange={(e) => handleSupplierChange("businessNumber", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">사업장 주소</span>
                <input
                  value={supplier.address}
                  onChange={(e) => handleSupplierChange("address", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                />
              </label>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">대표자</span>
                  <input
                    value={supplier.ceoName}
                    onChange={(e) => {
                      handleSupplierChange("ceoName", e.target.value);
                      if (!supplierSigner) setSupplierSigner(e.target.value);
                    }}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">전화번호</span>
                  <input
                    value={supplier.phone}
                    onChange={(e) => handleSupplierChange("phone", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">팩스</span>
                  <input
                    value={supplier.fax}
                    onChange={(e) => handleSupplierChange("fax", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">품목 정보</h2>
              <button
                onClick={addItem}
                className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white"
              >
                품목 추가
              </button>
            </div>

            <div className="space-y-4">
              {normalizedItems.map((item, index) => (
                <div key={item.id} className="rounded-2xl border border-gray-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-800">품목 {index + 1}</p>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-sm font-medium text-red-500"
                    >
                      삭제
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:grid-cols-10">
                    <input
                      placeholder="년"
                      value={item.dateYear}
                      onChange={(e) => handleItemChange(item.id, "dateYear", e.target.value)}
                      className="rounded-xl border border-gray-300 px-3 py-3 text-center outline-none focus:border-gray-900"
                    />
                    <input
                      placeholder="월"
                      value={item.dateMonth}
                      onChange={(e) => handleItemChange(item.id, "dateMonth", e.target.value)}
                      className="rounded-xl border border-gray-300 px-3 py-3 text-center outline-none focus:border-gray-900"
                    />
                    <input
                      placeholder="일"
                      value={item.dateDay}
                      onChange={(e) => handleItemChange(item.id, "dateDay", e.target.value)}
                      className="rounded-xl border border-gray-300 px-3 py-3 text-center outline-none focus:border-gray-900"
                    />
                    <input
                      placeholder="품목"
                      value={item.productName}
                      onChange={(e) => handleItemChange(item.id, "productName", e.target.value)}
                      className="rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-gray-900 md:col-span-2"
                    />
                    <input
                      placeholder="규격"
                      value={item.spec}
                      onChange={(e) => handleItemChange(item.id, "spec", e.target.value)}
                      className="rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-gray-900"
                    />
                    <input
                      placeholder="단위"
                      value={item.unit}
                      onChange={(e) => handleItemChange(item.id, "unit", e.target.value)}
                      className="rounded-xl border border-gray-300 px-3 py-3 text-center outline-none focus:border-gray-900"
                    />
                    <input
                      type="number"
                      placeholder="수량"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(item.id, "quantity", Number(e.target.value || 0))}
                      className="rounded-xl border border-gray-300 px-3 py-3 text-right outline-none focus:border-gray-900"
                    />
                    <input
                      type="number"
                      placeholder={vatMode === "included" ? "단가(VAT포함)" : "단가(VAT별도)"}
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(item.id, "unitPrice", Number(e.target.value || 0))}
                      className="rounded-xl border border-gray-300 px-3 py-3 text-right outline-none focus:border-gray-900"
                    />
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-right text-sm font-medium text-gray-700">
                      공급가액 {formatNumber(item.supplyAmount)}
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-right text-sm font-medium text-gray-700">
                      세액 {formatNumber(item.taxAmount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">정리 정보</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">미수금</span>
                <input
                  type="number"
                  value={unpaidAmount}
                  onChange={(e) => setUnpaidAmount(Number(e.target.value || 0))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-right outline-none focus:border-gray-900"
                />
              </label>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between py-1 text-sm">
                  <span className="text-gray-500">공급가액</span>
                  <span className="font-semibold text-gray-900">{formatNumber(totalSupplyAmount)}원</span>
                </div>
                <div className="flex items-center justify-between py-1 text-sm">
                  <span className="text-gray-500">세액</span>
                  <span className="font-semibold text-gray-900">{formatNumber(totalTaxAmount)}원</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-3">
                  <span className="font-semibold text-gray-800">
                    {vatMode === "included" ? "합계금액(VAT 포함)" : "합계금액(VAT 별도)"}
                  </span>
                  <span className="text-lg font-bold text-gray-900">{formatNumber(totalAmount)}원</span>
                </div>
              </div>
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-medium text-gray-700">비고</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
              />
            </label>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">저장 / 출력</h2>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <button
                onClick={saveStatement}
                className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white"
              >
                거래명세표 저장
              </button>

              <button
                onClick={handleSavePng}
                className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900"
              >
                PNG 저장
              </button>

              <button
                onClick={handleSaveJpg}
                className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900"
              >
                JPG 저장
              </button>

              <button
                onClick={handleSavePdf}
                className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900"
              >
                PDF 저장
              </button>

              <button
                onClick={handlePrint}
                className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900"
              >
                인쇄
              </button>

              <button
                onClick={handleSendEmail}
                className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900"
              >
                이메일 발송
              </button>
            </div>

            <button
              onClick={resetForm}
              className="mt-4 w-full rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600"
            >
              새 거래명세표 작성
            </button>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">저장된 거래명세표</h2>

            <div className="space-y-3">
              {savedStatements.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
                  저장된 거래명세표가 없습니다.
                </div>
              ) : (
                savedStatements.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{item.statementNumber}</p>
                        <p className="mt-1 text-sm text-gray-500">
                          거래처: {item.receiver.companyName || "-"}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          합계금액: {formatNumber(item.totalAmount)}원
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => loadStatement(item)}
                          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white"
                        >
                          불러오기
                        </button>
                        <button
                          onClick={() => deleteStatement(item.id)}
                          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600"
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
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between px-2">
              <h2 className="text-lg font-semibold text-gray-900">A4 미리보기</h2>
              <p className="text-xs text-gray-500">파란 보관용 + 빨간 보관용</p>
            </div>

            <div className="overflow-auto rounded-2xl bg-[#eef2f7] p-3">
              <div
                ref={previewRef}
                className="mx-auto w-[980px] bg-white p-3 text-black"
                style={{ fontFamily: "Arial, 'Malgun Gothic', sans-serif" }}
              >
                <SlipPreview
                  color="#355cff"
                  titleNote="공급받는자 보관용"
                  receiver={receiver}
                  supplier={supplier}
                  previewRows={previewRows}
                  vatMode={vatMode}
                  totalSupplyAmount={totalSupplyAmount}
                  totalTaxAmount={totalTaxAmount}
                  totalAmount={totalAmount}
                  unpaidAmount={unpaidAmount}
                  receiverSigner={receiverSigner}
                  supplierSigner={supplierSigner}
                  companySettings={companySettings}
                />

                <div className="h-[12px]" />

                <SlipPreview
                  color="#ff4b4b"
                  titleNote="공급자 보관용"
                  receiver={receiver}
                  supplier={supplier}
                  previewRows={previewRows}
                  vatMode={vatMode}
                  totalSupplyAmount={totalSupplyAmount}
                  totalTaxAmount={totalTaxAmount}
                  totalAmount={totalAmount}
                  unpaidAmount={unpaidAmount}
                  receiverSigner={receiverSigner}
                  supplierSigner={supplierSigner}
                  companySettings={companySettings}
                />

                <div className="mt-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-[10px] leading-4 text-gray-600">
                  <div>비고: {notes}</div>
                  <div>거래명세표 번호: {statementNumber}</div>
                  <div>작성일: {statementDate}</div>
                  <div>VAT 구분: {vatMode === "included" ? "포함" : "별도"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}