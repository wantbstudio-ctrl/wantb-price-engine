"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

type VatMode = "included" | "separate" | "none";

type EditableField =
  | "productName"
  | "spec"
  | "unit"
  | "quantity"
  | "unitPrice"
  | "supplyAmount";

type EstimateLineItem = {
  id: string;
  productName: string;
  spec: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  supplyAmount: number;
  vat: number;
  totalAmount: number;
};

type SavedEstimateItem = {
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

  lineItems?: EstimateLineItem[];
};

type CompanySettings = {
  companyName?: string;
  ceo?: string;
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
  logo?: string | null;
  stamp?: string | null;
  logoDataUrl?: string | null;
  stampDataUrl?: string | null;
};

type ClientRecord = {
  id: string;
  name: string;
  owner: string;
  businessNumber: string;
  address: string;
  phone: string;
  email: string;
  memo: string;
  createdAt: string;
};

const STORAGE_KEY = "wantb-estimates";
const COMPANY_KEY = "wantb-company-settings";
const ESTIMATE_DRAFT_KEY = "estimate-draft";
const SELECTED_CLIENT_KEY = "wantb-selected-client";
const CLIENTS_KEY = "wantb-clients";

const ESTIMATE_SEQ_KEY = "wantb-estimate-seq";
const CURRENT_ESTIMATE_NUMBER_KEY = "wantb-current-estimate-number";

const EDITABLE_FIELDS: EditableField[] = [
  "productName",
  "spec",
  "unit",
  "quantity",
  "unitPrice",
  "supplyAmount",
];

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
    id: crypto.randomUUID(),
    productName: "",
    spec: "",
    unit: "EA",
    quantity: 1,
    unitPrice: 0,
    supplyAmount: 0,
    vat: 0,
    totalAmount: 0,
  };
}

function parseNumber(value: string | number) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function calcRowFromUnitPrice(
  quantity: number,
  unitPrice: number,
  vatMode: VatMode
) {
  const safeQty = Math.max(1, parseNumber(quantity));
  const safeUnitPrice = parseNumber(unitPrice);
  const gross = safeQty * safeUnitPrice;

  if (vatMode === "included") {
    const supplyAmount = Math.round(gross / 1.1);
    const vat = gross - supplyAmount;
    return {
      quantity: safeQty,
      unitPrice: safeUnitPrice,
      supplyAmount,
      vat,
      totalAmount: supplyAmount + vat,
    };
  }

  if (vatMode === "separate") {
    const supplyAmount = gross;
    const vat = Math.round(supplyAmount * 0.1);
    return {
      quantity: safeQty,
      unitPrice: safeUnitPrice,
      supplyAmount,
      vat,
      totalAmount: supplyAmount + vat,
    };
  }

  return {
    quantity: safeQty,
    unitPrice: safeUnitPrice,
    supplyAmount: gross,
    vat: 0,
    totalAmount: gross,
  };
}

function calcRowFromSupplyAmount(
  quantity: number,
  supplyAmount: number,
  vatMode: VatMode
) {
  const safeQty = Math.max(1, parseNumber(quantity));
  const safeSupply = parseNumber(supplyAmount);

  if (vatMode === "included") {
    const vat = Math.round(safeSupply * 0.1);
    const totalAmount = safeSupply + vat;
    const unitPrice = Math.round(totalAmount / safeQty);
    return {
      quantity: safeQty,
      unitPrice,
      supplyAmount: safeSupply,
      vat,
      totalAmount,
    };
  }

  if (vatMode === "separate") {
    const vat = Math.round(safeSupply * 0.1);
    const unitPrice = Math.round(safeSupply / safeQty);
    return {
      quantity: safeQty,
      unitPrice,
      supplyAmount: safeSupply,
      vat,
      totalAmount: safeSupply + vat,
    };
  }

  const unitPrice = Math.round(safeSupply / safeQty);
  return {
    quantity: safeQty,
    unitPrice,
    supplyAmount: safeSupply,
    vat: 0,
    totalAmount: safeSupply,
  };
}

function sanitizeLineItem(
  item: Partial<EstimateLineItem>,
  vatMode: VatMode
): EstimateLineItem {
  const quantity = Math.max(1, parseNumber(item.quantity ?? 1));
  const hasSupplyAmount = parseNumber(item.supplyAmount ?? 0) > 0;

  const normalized = hasSupplyAmount
    ? calcRowFromSupplyAmount(
        quantity,
        parseNumber(item.supplyAmount ?? 0),
        vatMode
      )
    : calcRowFromUnitPrice(quantity, parseNumber(item.unitPrice ?? 0), vatMode);

  return {
    id: item.id || crypto.randomUUID(),
    productName: item.productName || "",
    spec: item.spec || "",
    unit: item.unit || "EA",
    quantity: normalized.quantity,
    unitPrice: normalized.unitPrice,
    supplyAmount: normalized.supplyAmount,
    vat: normalized.vat,
    totalAmount: normalized.totalAmount,
  };
}

function parsePastedNumber(value?: string) {
  if (!value) return 0;
  const normalized = value.replace(/,/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isMeaningfulPastedRow(columns: string[]) {
  return columns.some((column) => column.trim() !== "");
}

function parsePastedEstimateRows(text: string, vatMode: VatMode) {
  const rows = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((row) => row.split("\t"))
    .filter(isMeaningfulPastedRow);

  if (rows.length === 0) return [];

  return rows.map((columns) => {
    const [
      productName = "",
      spec = "",
      unit = "EA",
      quantityRaw = "1",
      unitPriceRaw = "0",
      supplyAmountRaw = "0",
    ] = columns;

    const quantity = Math.max(1, parsePastedNumber(quantityRaw) || 1);
    const unitPrice = parsePastedNumber(unitPriceRaw);
    const supplyAmount = parsePastedNumber(supplyAmountRaw);

    const normalized =
      supplyAmount > 0
        ? calcRowFromSupplyAmount(quantity, supplyAmount, vatMode)
        : calcRowFromUnitPrice(quantity, unitPrice, vatMode);

    return sanitizeLineItem(
      {
        id: crypto.randomUUID(),
        productName: productName.trim(),
        spec: spec.trim(),
        unit: (unit || "EA").trim(),
        quantity: normalized.quantity,
        unitPrice: normalized.unitPrice,
        supplyAmount: normalized.supplyAmount,
      },
      vatMode
    );
  });
}

function canMoveLeftRightCell(
  e: React.KeyboardEvent<HTMLInputElement>,
  direction: "left" | "right"
) {
  const input = e.currentTarget;
  const value = input.value ?? "";
  const isNumberInput = input.type === "number";

  if (isNumberInput) {
    return true;
  }

  const selectionStart = input.selectionStart ?? 0;
  const selectionEnd = input.selectionEnd ?? 0;

  if (direction === "left") {
    return selectionStart === 0 && selectionEnd === 0;
  }

  return selectionStart === value.length && selectionEnd === value.length;
}

type EstimateRowProps = {
  item: EstimateLineItem;
  index: number;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onChange: (
    id: string,
    key: keyof EstimateLineItem,
    value: string | number
  ) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  registerInput: (
    itemId: string,
    field: EditableField,
    el: HTMLInputElement | null
  ) => void;
  onCellNavigate: (
    rowIndex: number,
    field: EditableField,
    action: "enter" | "up" | "down" | "left" | "right" | "tab" | "shiftTab"
  ) => void;
};

const fieldInputClass =
  "h-[44px] w-full rounded-2xl border border-[#3b4552] bg-[#0b1016] px-4 text-[14px] text-[#f3f7fb] outline-none placeholder:text-[#6f7b88] transition focus:border-[#22b7ff] focus:bg-[#0d131a] focus:shadow-[0_0_0_3px_rgba(34,183,255,0.10)]";

const sectionTitleClass =
  "text-[18px] font-light tracking-tight text-[#38BDF8]";

const sectionDescriptionClass =
  "mt-1 text-xs leading-5 text-[#9aa4b2]";

const primaryButtonClass =
  "inline-flex h-[42px] items-center justify-center rounded-2xl border border-[#22b7ff] bg-[#1aa7f7] px-4 text-[13px] font-semibold text-white transition hover:bg-[#2eb5ff] hover:shadow-[0_0_18px_rgba(34,183,255,0.18)]";

const outlineBlueButtonClass =
  "inline-flex h-[42px] items-center justify-center rounded-2xl border border-[#2b82b6] bg-[#0d1319] px-4 text-[13px] font-semibold text-[#6fd6ff] transition hover:border-[#22b7ff] hover:bg-[#111b24] hover:text-white";

const mutedBlueButtonClass =
  "inline-flex h-[42px] items-center justify-center rounded-2xl border border-[#37424d] bg-[#11161d] px-4 text-[13px] font-semibold text-[#dce6ef] transition hover:border-[#22b7ff] hover:bg-[#131b24] hover:text-white";

const miniBlueChipClass =
  "inline-flex h-8 items-center justify-center rounded-full border border-[#2b82b6] bg-[#0d1319] px-3 text-[10px] font-semibold tracking-[0.12em] text-[#6fd6ff] transition hover:border-[#22b7ff] hover:text-white";

const cardClass =
  "rounded-[30px] border border-[#3a424b] bg-[#1b2026] px-5 py-5 shadow-[0_18px_34px_rgba(0,0,0,0.28)] ring-1 ring-[rgba(255,255,255,0.02)]";

const EstimateRow = memo(function EstimateRow({
  item,
  index,
  isSelected,
  onToggleSelect,
  onChange,
  onRemove,
  onDuplicate,
  registerInput,
  onCellNavigate,
}: EstimateRowProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, field: EditableField) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onCellNavigate(index, field, "enter");
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        onCellNavigate(index, field, e.shiftKey ? "shiftTab" : "tab");
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        onCellNavigate(index, field, "up");
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        onCellNavigate(index, field, "down");
        return;
      }

      if (e.key === "ArrowLeft" && canMoveLeftRightCell(e, "left")) {
        e.preventDefault();
        onCellNavigate(index, field, "left");
        return;
      }

      if (e.key === "ArrowRight" && canMoveLeftRightCell(e, "right")) {
        e.preventDefault();
        onCellNavigate(index, field, "right");
      }
    },
    [index, onCellNavigate]
  );

  return (
    <div
      className={`grid grid-cols-[60px_minmax(260px,2.2fr)_minmax(160px,1.2fr)_90px_90px_140px_150px_110px_150px] items-center min-h-[58px] border-b border-[#27303a] text-[13px] ${
        isSelected ? "bg-[#121c26]" : "bg-[#10151b]"
      }`}
    >
      <div className="border-r border-[#27303a] p-2">
        <button
          type="button"
          onClick={() => onToggleSelect(item.id)}
          className={`flex h-10 w-full items-center justify-center rounded-xl border text-[12px] font-semibold transition ${
            isSelected
              ? "border-[#22b7ff] bg-[#0f2430] text-[#74ddff]"
              : "border-[#34404b] bg-[#0c1117] text-[#d6e2ec]"
          }`}
        >
          선택
        </button>
      </div>

      <div className="border-r border-[#27303a] p-2 pt-[10px]">
        <input
          ref={(el) => registerInput(item.id, "productName", el)}
          value={item.productName}
          onChange={(e) => onChange(item.id, "productName", e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "productName")}
          placeholder={`품목 ${index + 1}`}
          className="h-[42px] w-full rounded-xl border border-[#34404b] bg-[#0c1117] px-3 text-[#f4f8fb] outline-none placeholder:text-[#6f7b88] transition focus:border-[#22b7ff]"
        />
      </div>

      <div className="border-r border-[#27303a] p-2 pt-[10px]">
        <input
          ref={(el) => registerInput(item.id, "spec", el)}
          value={item.spec}
          onChange={(e) => onChange(item.id, "spec", e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "spec")}
          placeholder="규격"
          className="h-[42px] w-full rounded-xl border border-[#34404b] bg-[#0c1117] px-3 text-[#f4f8fb] outline-none placeholder:text-[#6f7b88] transition focus:border-[#22b7ff]"
        />
      </div>

      <div className="border-r border-[#27303a] p-2 pt-[10px]">
        <input
          ref={(el) => registerInput(item.id, "unit", el)}
          value={item.unit}
          onChange={(e) => onChange(item.id, "unit", e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "unit")}
          className="h-[42px] w-full rounded-xl border border-[#34404b] bg-[#0c1117] px-2 text-center text-[#f4f8fb] outline-none placeholder:text-[#6f7b88] transition focus:border-[#22b7ff]"
        />
      </div>

      <div className="border-r border-[#27303a] p-2 pt-[10px]">
        <input
          ref={(el) => registerInput(item.id, "quantity", el)}
          type="number"
          value={item.quantity === 0 ? "" : item.quantity}
          onFocus={(e) => {
            if (item.quantity === 0) e.target.value = "";
          }}
          onBlur={(e) => {
            if (e.target.value === "") {
              onChange(item.id, "quantity", 1);
            }
          }}
          onChange={(e) =>
            onChange(item.id, "quantity", Number(e.target.value || 1))
          }
          onKeyDown={(e) => handleKeyDown(e, "quantity")}
          className="h-[42px] w-full rounded-xl border border-[#34404b] bg-[#0c1117] px-3 text-right text-[#f4f8fb] outline-none placeholder:text-[#6f7b88] transition focus:border-[#22b7ff]"
        />
      </div>

      <div className="border-r border-[#27303a] p-2 pt-[10px]">
        <input
          ref={(el) => registerInput(item.id, "unitPrice", el)}
          type="number"
          value={item.unitPrice === 0 ? "" : item.unitPrice}
          onFocus={(e) => {
            if (item.unitPrice === 0) e.target.value = "";
          }}
          onBlur={(e) => {
            if (e.target.value === "") {
              onChange(item.id, "unitPrice", 0);
            }
          }}
          onChange={(e) =>
            onChange(item.id, "unitPrice", Number(e.target.value || 0))
          }
          onKeyDown={(e) => handleKeyDown(e, "unitPrice")}
          className="h-[42px] w-full rounded-xl border border-[#34404b] bg-[#0c1117] px-3 text-right text-[#f4f8fb] outline-none placeholder:text-[#6f7b88] transition focus:border-[#22b7ff]"
        />
      </div>

      <div className="border-r border-[#27303a] p-2 pt-[10px]">
        <input
          ref={(el) => registerInput(item.id, "supplyAmount", el)}
          type="number"
          value={item.supplyAmount === 0 ? "" : item.supplyAmount}
          onFocus={(e) => {
            if (item.supplyAmount === 0) e.target.value = "";
          }}
          onBlur={(e) => {
            if (e.target.value === "") {
              onChange(item.id, "supplyAmount", 0);
            }
          }}
          onChange={(e) =>
            onChange(item.id, "supplyAmount", Number(e.target.value || 0))
          }
          onKeyDown={(e) => handleKeyDown(e, "supplyAmount")}
          className="h-[42px] w-full rounded-xl border border-[#34404b] bg-[#0c1117] px-3 text-right text-[#f4f8fb] outline-none placeholder:text-[#6f7b88] transition focus:border-[#22b7ff]"
        />
      </div>

      <div className="border-r border-[#27303a] p-2 pt-[10px]">
        <div className="flex h-[42px] items-center justify-end rounded-xl border border-[#2c3640] bg-[#0a0f15] px-3 text-[13px] text-[#d7e1ea]">
          {formatNumber(item.vat)}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 p-2 pt-[10px]">
        <button
          type="button"
          onClick={() => onDuplicate(item.id)}
          className="rounded-xl border border-[#2b82b6] bg-[#0d1319] px-3 py-2 text-[12px] font-semibold text-[#6fd6ff] transition hover:border-[#22b7ff] hover:text-white"
        >
          복제
        </button>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="rounded-xl border border-[#2b82b6] bg-[#0d1319] px-3 py-2 text-[12px] font-semibold text-[#6fd6ff] transition hover:border-[#22b7ff] hover:text-white"
        >
          삭제
        </button>
      </div>
    </div>
  );
});

export default function EstimatePage() {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const itemRefs = useRef<EstimateLineItem[]>([]);
  const pendingFocusRef = useRef<{
    rowIndex: number;
    field: EditableField;
  } | null>(null);

  const [savedEstimates, setSavedEstimates] = useState<SavedEstimateItem[]>([]);
  const [savedClients, setSavedClients] = useState<ClientRecord[]>([]);

  const [estimateNumber, setEstimateNumber] = useState("");
  const [vatMode, setVatMode] = useState<VatMode>("included");
  const [items, setItems] = useState<EstimateLineItem[]>([createEmptyLineItem()]);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

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

  const [clientSearch, setClientSearch] = useState("");
  const [showClientSearch, setShowClientSearch] = useState(false);

  useEffect(() => {
    itemRefs.current = items;
  }, [items]);

  const activeItems = useMemo(() => {
    return items.filter(
      (item) =>
        item.productName.trim() !== "" ||
        Number(item.quantity || 0) > 0 ||
        Number(item.unitPrice || 0) > 0 ||
        Number(item.supplyAmount || 0) > 0
    );
  }, [items]);

  const estimateTitle = useMemo(() => {
    if (activeItems.length === 0) return "";
    if (activeItems.length === 1) return activeItems[0].productName || "";
    return `${activeItems[0].productName || "품목"} 외 ${activeItems.length - 1}건`;
  }, [activeItems]);

  const supplyPrice = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.supplyAmount || 0), 0);
  }, [items]);

  const vat = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.vat || 0), 0);
  }, [items]);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
  }, [items]);

  const today = useMemo(() => new Date().toLocaleDateString("ko-KR"), []);

  const resolvedStamp =
    companySettings.stamp || companySettings.stampDataUrl || null;

  const resolvedLogo =
    companySettings.logo || companySettings.logoDataUrl || null;

  const resolvedCeo =
    companySettings.ceo ||
    companySettings.ownerName ||
    companySettings.ceoName ||
    ceoName ||
    "-";

  const displayCompanyName = companySettings.companyName || companyName || "회사명";
  const displayCeoName = resolvedCeo;
  const displayBusinessNumber =
    companySettings.businessNumber || businessNumber || "-";
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
        Number(item.unitPrice || 0) > 0 ||
        Number(item.supplyAmount || 0) > 0;

      if (!hasContent) return;

      rows[index] = {
        category: String(index + 1),
        item: item.productName || "",
        spec: item.spec || "-",
        unit: item.unit || "EA",
        quantity: item.quantity ? String(item.quantity) : "",
        price: item.unitPrice ? formatNumber(item.unitPrice) : "",
        supplyAmount: item.supplyAmount ? formatNumber(item.supplyAmount) : "",
        note: index === 0 ? getVatModeLabel(vatMode) : "",
      };
    });

    return rows;
  }, [items, vatMode]);

  const filteredClients = useMemo(() => {
    const keyword = clientSearch.trim().toLowerCase();
    if (!keyword) return savedClients;

    return savedClients.filter((client) =>
      [
        client.name,
        client.owner,
        client.businessNumber,
        client.phone,
        client.email,
        client.address,
        client.memo,
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [clientSearch, savedClients]);

  const refreshSavedEstimates = () => {
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: SavedEstimateItem[] = raw ? JSON.parse(raw) : [];
      setSavedEstimates(
        Array.isArray(parsed) ? parsed.sort((a, b) => b.id - a.id) : []
      );
    } catch {
      setSavedEstimates([]);
    }
  };

  const refreshSavedClients = () => {
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(CLIENTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setSavedClients(Array.isArray(parsed) ? parsed : []);
    } catch {
      setSavedClients([]);
    }
  };

  const syncCurrentEstimateNumber = (value: string) => {
    setEstimateNumber(value);
    if (typeof window !== "undefined") {
      localStorage.setItem(CURRENT_ESTIMATE_NUMBER_KEY, value);
    }
  };

  const updateLineItem = useCallback(
    (id: string, key: keyof EstimateLineItem, value: string | number) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;

          const base = { ...item, [key]: value };

          if (key === "quantity" || key === "unitPrice") {
            const normalized = calcRowFromUnitPrice(
              key === "quantity" ? Number(value || 1) : base.quantity,
              key === "unitPrice" ? Number(value || 0) : base.unitPrice,
              vatMode
            );

            return {
              ...base,
              quantity: normalized.quantity,
              unitPrice: normalized.unitPrice,
              supplyAmount: normalized.supplyAmount,
              vat: normalized.vat,
              totalAmount: normalized.totalAmount,
            };
          }

          if (key === "supplyAmount") {
            const normalized = calcRowFromSupplyAmount(
              base.quantity,
              Number(value || 0),
              vatMode
            );

            return {
              ...base,
              quantity: normalized.quantity,
              unitPrice: normalized.unitPrice,
              supplyAmount: normalized.supplyAmount,
              vat: normalized.vat,
              totalAmount: normalized.totalAmount,
            };
          }

          return base;
        })
      );
    },
    [vatMode]
  );

  const focusCellImmediately = useCallback(
    (rowIndex: number, field: EditableField) => {
      const currentItems = itemRefs.current;
      const targetItem = currentItems[rowIndex];
      if (!targetItem) return false;

      const key = `${targetItem.id}-${field}`;
      const el = inputRefs.current[key];
      if (!el) return false;

      requestAnimationFrame(() => {
        el.focus();
        el.select?.();
      });

      return true;
    },
    []
  );

  const requestFocus = useCallback(
    (rowIndex: number, field: EditableField) => {
      const focused = focusCellImmediately(rowIndex, field);
      if (!focused) {
        pendingFocusRef.current = { rowIndex, field };
      }
    },
    [focusCellImmediately]
  );

  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending) return;

    const success = focusCellImmediately(pending.rowIndex, pending.field);
    if (success) {
      pendingFocusRef.current = null;
    }
  }, [items, focusCellImmediately]);

  const handleCellNavigate = useCallback(
    (
      rowIndex: number,
      field: EditableField,
      action: "enter" | "up" | "down" | "left" | "right" | "tab" | "shiftTab"
    ) => {
      const currentItems = itemRefs.current;
      const colIndex = EDITABLE_FIELDS.indexOf(field);
      if (colIndex < 0) return;

      let nextRowIndex = rowIndex;
      let nextColIndex = colIndex;

      if (action === "enter" || action === "down") {
        nextRowIndex += 1;
      } else if (action === "up") {
        nextRowIndex -= 1;
      } else if (action === "left" || action === "shiftTab") {
        nextColIndex -= 1;
        if (nextColIndex < 0) {
          nextRowIndex -= 1;
          nextColIndex = EDITABLE_FIELDS.length - 1;
        }
      } else if (action === "right" || action === "tab") {
        nextColIndex += 1;
        if (nextColIndex >= EDITABLE_FIELDS.length) {
          nextRowIndex += 1;
          nextColIndex = 0;
        }
      }

      if (nextRowIndex < 0) nextRowIndex = 0;

      if (nextRowIndex >= currentItems.length) {
        pendingFocusRef.current = {
          rowIndex: nextRowIndex,
          field: EDITABLE_FIELDS[nextColIndex],
        };
        setItems((prev) => [...prev, createEmptyLineItem()]);
        return;
      }

      requestFocus(nextRowIndex, EDITABLE_FIELDS[nextColIndex]);
    },
    [requestFocus]
  );

  const handlePasteRows = useCallback(
    (text: string) => {
      const parsedRows = parsePastedEstimateRows(text, vatMode);
      if (parsedRows.length === 0) return;

      setItems((prev) => {
        const next = [...prev];
        let startIndex = next.findIndex(
          (item) =>
            !item.productName &&
            !item.spec &&
            item.quantity === 1 &&
            item.unitPrice === 0 &&
            item.supplyAmount === 0
        );

        if (startIndex < 0) startIndex = next.length;

        parsedRows.forEach((row, offset) => {
          const targetIndex = startIndex + offset;
          if (targetIndex < next.length) {
            next[targetIndex] = row;
          } else {
            next.push(row);
          }
        });

        return next;
      });

      pendingFocusRef.current = { rowIndex: 0, field: "productName" };
    },
    [vatMode]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const currentSavedNumber = localStorage.getItem(CURRENT_ESTIMATE_NUMBER_KEY);
    if (currentSavedNumber && currentSavedNumber.trim()) {
      setEstimateNumber(currentSavedNumber);
    } else {
      const nextNumber = peekNextEstimateNumber();
      setEstimateNumber(String(nextNumber));
    }

    refreshSavedEstimates();
    refreshSavedClients();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const rawCompany = localStorage.getItem(COMPANY_KEY);
      if (!rawCompany) return;

      const parsed: CompanySettings = JSON.parse(rawCompany);

      setCompanySettings(parsed || {});
      setCompanyName(parsed?.companyName || "");
      setCeoName(parsed?.ceo || parsed?.ownerName || parsed?.ceoName || "");
      setBusinessNumber(parsed?.businessNumber || "");
      setAddress(parsed?.address || "");
      setCompanyPhone(parsed?.phone || parsed?.companyPhone || "");
      setCompanyEmail(parsed?.email || parsed?.companyEmail || "");
    } catch {
      //
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const rawDraft = localStorage.getItem(ESTIMATE_DRAFT_KEY);
      if (!rawDraft) return;

      const draft = JSON.parse(rawDraft);

      const draftEstimateNumber =
        draft?.estimateNumber && String(draft.estimateNumber).trim()
          ? String(draft.estimateNumber)
          : null;

      if (draftEstimateNumber) {
        syncCurrentEstimateNumber(draftEstimateNumber);
      }

      setClientName(draft?.clientName || "");
      setManagerName(draft?.managerName || draft?.contactPerson || "");
      setPhone(draft?.phone || "");
      setEmail(draft?.email || "");
      setDeliveryCondition(draft?.deliveryCondition || "");
      setValidUntil(draft?.validUntil || "");

      if (Array.isArray(draft?.items) && draft.items.length > 0) {
        setItems(
          draft.items.map((item: any) =>
            sanitizeLineItem(
              {
                productName: item?.productName || "",
                spec: item?.spec || "",
                unit: item?.unit || "EA",
                quantity: Number(item?.quantity ?? 1),
                unitPrice: Number(item?.unitPrice ?? 0),
                supplyAmount: Number(item?.supplyPrice ?? item?.supplyAmount ?? 0),
              },
              (draft?.vatMode as VatMode) || "included"
            )
          )
        );
      } else if (draft?.productName || draft?.unitPrice || draft?.quantity) {
        setItems([
          sanitizeLineItem(
            {
              productName: draft?.productName || "",
              spec: draft?.spec || "",
              unit: draft?.unit || "EA",
              quantity: Number(draft?.quantity ?? 1),
              unitPrice: Number(draft?.unitPrice ?? 0),
              supplyAmount: Number(draft?.supplyPrice ?? draft?.supplyAmount ?? 0),
            },
            (draft?.vatMode as VatMode) || "included"
          ),
        ]);
      }

      setVatMode((draft?.vatMode as VatMode) || "included");
    } catch {
      //
    }
  }, []);

  const handleSelectClient = useCallback((client: ClientRecord) => {
    setClientName(client.name || "");
    setManagerName(client.owner || "");
    setPhone(client.phone || "");
    setEmail(client.email || "");
    setShowClientSearch(false);
    localStorage.setItem(SELECTED_CLIENT_KEY, JSON.stringify(client));
  }, []);

  const clearSelectedClient = useCallback(() => {
    setClientName("");
    setManagerName("");
    setPhone("");
    setEmail("");
  }, []);

  const handleAddItem = () => {
    setItems((prev) => [...prev, createEmptyLineItem()]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => {
      if (prev.length === 1) {
        return [createEmptyLineItem()];
      }
      return prev.filter((item) => item.id !== id);
    });

    setSelectedRowIds((prev) => prev.filter((rowId) => rowId !== id));
  };

  const handleDuplicateItem = (id: string) => {
    setItems((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index === -1) return prev;

      const duplicated = {
        ...prev[index],
        id: crypto.randomUUID(),
      };

      const next = [...prev];
      next.splice(index + 1, 0, duplicated);
      return next;
    });
  };

  const handleToggleSelect = (id: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedRowIds(items.map((item) => item.id));
  };

  const handleClearSelection = () => {
    setSelectedRowIds([]);
  };

  const handleDeleteSelected = () => {
    if (selectedRowIds.length === 0) {
      alert("선택된 행이 없습니다.");
      return;
    }

    const ok = confirm(`선택된 ${selectedRowIds.length}개 행을 삭제하시겠습니까?`);
    if (!ok) return;

    setItems((prev) => {
      const next = prev.filter((item) => !selectedRowIds.includes(item.id));
      return next.length === 0 ? [createEmptyLineItem()] : next;
    });

    setSelectedRowIds([]);
  };

  const handleDuplicateSelected = () => {
    if (selectedRowIds.length === 0) {
      alert("선택된 행이 없습니다.");
      return;
    }

    setItems((prev) => {
      const selectedSet = new Set(selectedRowIds);
      const next: EstimateLineItem[] = [];

      prev.forEach((item) => {
        next.push(item);
        if (selectedSet.has(item.id)) {
          next.push({
            ...item,
            id: crypto.randomUUID(),
          });
        }
      });

      return next;
    });

    setSelectedRowIds([]);
  };

  const resetItemsOnly = () => {
    const ok = window.confirm("품목 정보만 초기화하시겠습니까?");
    if (!ok) return;

    setItems([
      createEmptyLineItem(),
      createEmptyLineItem(),
      createEmptyLineItem(),
    ]);

    setSelectedRowIds([]);
  };

  useEffect(() => {
    setSelectedRowIds((prev) =>
      prev.filter((id) => items.some((item) => item.id === id))
    );
  }, [items]);

  const clearFormForNextEstimate = () => {
    setItems([createEmptyLineItem()]);
    setVatMode("included");
    clearSelectedClient();
    setDeliveryCondition("");
    setValidUntil("");
    setShowClientSearch(false);
    setClientSearch("");
  };

  const handleResetEstimate = () => {
    clearFormForNextEstimate();
    localStorage.removeItem(ESTIMATE_DRAFT_KEY);
  };

  const handleSaveEstimate = () => {
    if (activeItems.length === 0) {
      alert("품목을 입력해주세요.");
      return;
    }

    const finalEstimateNumber = ensureEstimateNumber(estimateNumber);

    if (typeof window !== "undefined") {
      localStorage.setItem(CURRENT_ESTIMATE_NUMBER_KEY, finalEstimateNumber);
    }

    const firstItem = activeItems[0] || createEmptyLineItem();

    const newEstimate: SavedEstimateItem = {
      id: Date.now(),
      estimateNumber: finalEstimateNumber,

      productName: estimateTitle || firstItem.productName || "",
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
      lineItems: activeItems,
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: SavedEstimateItem[] = raw ? JSON.parse(raw) : [];
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

  const handleLoadEstimate = (item: SavedEstimateItem) => {
    syncCurrentEstimateNumber(item.estimateNumber || "");

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

    if (Array.isArray(item.lineItems) && item.lineItems.length > 0) {
      setItems(
        item.lineItems.map((line) =>
          sanitizeLineItem(line, item.vatMode || "included")
        )
      );
    } else {
      setItems([
        sanitizeLineItem(
          {
            productName: item.productName || "",
            spec: "",
            unit: "EA",
            quantity: Number(item.quantity || 1),
            unitPrice: Number(item.unitPrice || 0),
            supplyAmount: Number(item.supplyPrice || 0),
          },
          item.vatMode || "included"
        ),
      ]);
    }

    setShowClientSearch(false);
    alert("저장된 견적을 불러왔습니다.");
  };

  const handleDeleteEstimate = (id: number) => {
    const ok = confirm("이 견적을 삭제하시겠습니까?");
    if (!ok) return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: SavedEstimateItem[] = raw ? JSON.parse(raw) : [];
      const updated = Array.isArray(parsed)
        ? parsed.filter((item) => item.id !== id)
        : [];

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
    const stampHtml = resolvedStamp
      ? `<img src="${resolvedStamp}" style="width:56px; height:56px; object-fit:contain; margin-left:10px; flex-shrink:0;" />`
      : `<span class="stamp" style="margin-left:10px; flex-shrink:0;">직인</span>`;

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
            padding: 10px;
            background: #fff;
            color: #111;
            font-family: Arial, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
          }
          .sheet {
            width: 794px;
            min-height: 1123px;
            margin: 0 auto;
            background: #fff;
            padding: 22px 20px 16px 20px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-bottom: 8px;
          }
          .title {
            font-size: 31px;
            font-weight: 800;
            letter-spacing: -0.4px;
          }
          .company-name {
            font-size: 23px;
            font-weight: 800;
            letter-spacing: -0.25px;
            text-align: right;
          }
          .divider {
            height: 1.5px;
            background: #111;
            margin-bottom: 10px;
          }
          .top-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            column-gap: 16px;
            margin-bottom: 10px;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
          }
          .info-table td {
            padding: 3px 4px;
            vertical-align: top;
            font-size: 14px;
            line-height: 1.45;
          }
          .label {
            width: 64px;
            font-weight: 700;
            white-space: nowrap;
          }
          .value-strong {
            font-weight: 900;
            letter-spacing: -0.2px;
            font-size: 15px;
          }
          .stamp {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 1.8px solid #d11;
            color: #d11;
            border-radius: 50%;
            width: 56px;
            height: 56px;
            font-size: 12px;
            font-weight: 700;
            transform: rotate(-16deg);
          }
          .ceo-line {
            display: inline-flex;
            align-items: center;
            white-space: nowrap;
          }
          .main-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin-top: 8px;
            border: none;
          }
          .main-table th,
          .main-table td {
            border: 1px solid #333;
            font-size: 13px;
            padding: 3px 5px;
            height: 35px;
          }
          .main-table th {
            background: #f5f5f5;
            font-weight: 700;
            font-size: 13px;
          }
          .c-left { text-align: left; }
          .c-center { text-align: center; }
          .c-right { text-align: right; }

          .total-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1px;
            border: none;
          }
          .total-table td {
            border: 1px solid #333;
            font-size: 15px;
            font-weight: 800;
            padding: 8px 12px;
            background: #f5f5f5;
          }

          .notes {
            margin-top: 14px;
            font-size: 14px;
            line-height: 1.7;
          }
          .notes .note-title {
            font-weight: 800;
            margin-bottom: 6px;
            font-size: 14px;
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
                <td>
                  <span class="ceo-line">대표 : ${displayCeoName}${stampHtml}</span>
                </td>
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
              <td class="c-center" style="width: 65%;">총 금 액</td>
              <td class="c-right" style="width: 35%;">${formatNumber(totalAmount)}</td>
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
      const html2canvas = html2canvasModule.default;
      const jsPDFModule = await import("jspdf");
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

  const vatSummaryText = useMemo(() => {
    if (vatMode === "included") {
      return `일금 ${formatNumber(totalAmount)}원 (VAT 포함)`;
    }
    if (vatMode === "separate") {
      return `공급가 ${formatNumber(supplyPrice)}원 + VAT ${formatNumber(vat)}원 = 합계 ${formatNumber(totalAmount)}원`;
    }
    return `일금 ${formatNumber(totalAmount)}원 (부가세 없음)`;
  }, [supplyPrice, totalAmount, vat, vatMode]);

  return (
    <div className="min-h-screen bg-[#07090c] px-4 py-4 xl:px-5 xl:py-5">
   <div className="mx-auto grid max-w-[2520px] grid-cols-1 gap-5 xl:grid-cols-[1180px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-[30px] border border-[#26313b] bg-[linear-gradient(135deg,#1d2127_0%,#161b22_100%)] px-6 py-6 shadow-[0_20px_40px_rgba(0,0,0,0.34)] ring-1 ring-[rgba(255,255,255,0.02)]">
 <h1 className="text-[29px] font-light tracking-tight text-[#38BDF8]">
  견적서
</h1>
            <p className="mt-2 text-[13px] leading-6 text-[#a9b4bf]">
              거래명세서 기준의 문서형 미리보기를 유지하되, 좌측 입력 작업감은 기존 견적서처럼 넓고 편하게 구성한 화면
            </p>
          </div>

          <div className={cardClass}>
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className={sectionTitleClass}>거래처 선택</h2>
                <p className={sectionDescriptionClass}>
                  저장된 거래처를 검색하고 선택하면 거래처 정보에 자동 반영됩니다.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowClientSearch((prev) => !prev)}
                  className={outlineBlueButtonClass}
                >
                  거래처 검색 열기
                </button>

                <button
                  type="button"
                  onClick={clearSelectedClient}
                  className={outlineBlueButtonClass}
                >
                  거래처 초기화
                </button>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#27313b] bg-[#0f141a] px-4 py-4">
              {clientName ? (
                <div className="grid grid-cols-1 gap-2 text-[13px] text-[#dce6ef] md:grid-cols-2">
                  <div>
                    <span className="font-semibold text-[#f7f8fb]">업체명:</span> {clientName}
                  </div>
                  <div>
                    <span className="font-semibold text-[#f7f8fb]">대표자:</span>{" "}
                    {managerName || "-"}
                  </div>
                  <div>
                    <span className="font-semibold text-[#f7f8fb]">전화:</span> {phone || "-"}
                  </div>
                  <div>
                    <span className="font-semibold text-[#f7f8fb]">이메일:</span> {email || "-"}
                  </div>
                </div>
              ) : (
                <div className="text-[13px] text-[#8391a0]">
                  아직 선택된 거래처가 없습니다.
                </div>
              )}
            </div>

            {showClientSearch ? (
              <div className="mt-4 rounded-[24px] border border-[#27313b] bg-[#0f141a]">
                <div className="border-b border-[#27313b] px-4 py-3">
                  <input
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="거래처명 / 대표자 / 번호 / 전화 검색"
                    className={fieldInputClass}
                  />
                </div>

                <div className="max-h-[320px] overflow-y-auto p-4">
                  {filteredClients.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-[#34404b] p-6 text-center text-[13px] text-[#8391a0]">
                      {savedClients.length === 0
                        ? "등록된 거래처가 없습니다."
                        : "검색 결과가 없습니다."}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredClients.map((client) => (
                        <div
                          key={client.id}
                          className="rounded-[22px] border border-[#27313b] bg-[#131921] p-4"
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-1">
                              <div className="text-[17px] font-semibold text-[#f7f8fb]">
                                {client.name}
                              </div>
                              <div className="text-[13px] text-[#c0cdd8]">
                                {client.owner || "-"} / {client.businessNumber || "-"}
                              </div>
                              <div className="text-[13px] text-[#c0cdd8]">
                                전화번호: {client.phone || "-"}
                              </div>
                              <div className="text-[13px] text-[#c0cdd8]">
                                이메일: {client.email || "-"}
                              </div>
                              <div className="text-[13px] text-[#c0cdd8]">
                                주소: {client.address || "-"}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSelectClient(client)}
                              className={outlineBlueButtonClass}
                            >
                              이 거래처 선택
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className={cardClass}>
            <h2 className={sectionTitleClass}>기본 정보</h2>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <label className="block">
                <span className="mb-2 block text-[12px] font-semibold tracking-[0.01em] text-[#d8e2eb]">
                  견적번호
                </span>
                <input
                  value={estimateNumber}
                  onChange={(e) => syncCurrentEstimateNumber(e.target.value)}
                  className={fieldInputClass}
                  placeholder="WB-2026-0001"
                />
              </label>
            </div>
          </div>

          <div className={cardClass}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className={sectionTitleClass}>품목 정보</h2>

                <button
                  type="button"
                  onClick={resetItemsOnly}
                  className={miniBlueChipClass}
                >
                  RESET
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className={primaryButtonClass}
              >
                행 추가
              </button>
            </div>

            <div
              className="rounded-[24px] border border-[#27313b] bg-[#0f141a]"
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                if (!text || !text.includes("\t")) return;
                e.preventDefault();
                handlePasteRows(text);
              }}
            >
              <div className="border-b border-[#27313b] px-4 py-3">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <p className="text-[12px] leading-5 text-[#8d9aaa]">
                      거래명세서처럼 탭 / 엔터 / 방향키 이동, 규격 / 단위 입력, 선택 행 이동을 지원합니다.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className={`inline-flex h-[42px] items-center justify-center rounded-2xl border px-4 text-[13px] font-semibold transition ${
                        items.length > 0 && selectedRowIds.length === items.length
                          ? "border-[#22b7ff] bg-[#102433] text-[#74ddff]"
                          : "border-[#2b82b6] bg-[#0d1319] text-[#6fd6ff] hover:border-[#22b7ff] hover:text-white"
                      }`}
                    >
                      전체 선택
                    </button>

                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className={outlineBlueButtonClass}
                    >
                      선택 해제
                    </button>

                    <button
                      type="button"
                      onClick={handleDeleteSelected}
                      className={outlineBlueButtonClass}
                    >
                      선택 행 삭제
                    </button>

                    <button
                      type="button"
                      onClick={handleDuplicateSelected}
                      className={outlineBlueButtonClass}
                    >
                      선택 복제
                    </button>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-[#27313b] bg-[#0b1016] px-4 py-3 text-[12px] text-[#a8b4c1]">
                  현재 선택된 행:{" "}
                  <span className="font-semibold text-[#f7f8fb]">{selectedRowIds.length}</span>
                  개
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[1400px]">
                  <div className="grid grid-cols-[60px_minmax(260px,2.2fr)_minmax(160px,1.2fr)_90px_90px_140px_150px_110px_150px] border-b border-[#27313b] bg-[linear-gradient(135deg,#1d232b_0%,#171d24_100%)] text-[12px] font-semibold text-[#dce6ef]">
                    <div className="flex h-11 items-center justify-center border-r border-[#27313b]">
                      선택
                    </div>
                    <div className="flex h-11 items-center border-r border-[#27313b] px-3">
                      품목
                    </div>
                    <div className="flex h-11 items-center border-r border-[#27313b] px-3">
                      규격
                    </div>
                    <div className="flex h-11 items-center justify-center border-r border-[#27313b]">
                      단위
                    </div>
                    <div className="flex h-11 items-center justify-center border-r border-[#27313b]">
                      수량
                    </div>
                    <div className="flex h-11 items-center justify-center border-r border-[#27313b]">
                      {vatMode === "included"
                        ? "단가(VAT포함)"
                        : vatMode === "separate"
                        ? "단가(VAT별도)"
                        : "단가"}
                    </div>
                    <div className="flex h-11 items-center justify-center border-r border-[#27313b]">
                      공급가액
                    </div>
                    <div className="flex h-11 items-center justify-center border-r border-[#27313b]">
                      세액
                    </div>
                    <div className="flex h-11 items-center justify-center">작업</div>
                  </div>

                  <div className="max-h-[560px] overflow-y-auto bg-[#10151b]">
                    {items.map((item, index) => (
                      <EstimateRow
                        key={item.id}
                        item={item}
                        index={index}
                        isSelected={selectedRowIds.includes(item.id)}
                        onToggleSelect={handleToggleSelect}
                        onChange={updateLineItem}
                        onRemove={handleRemoveItem}
                        onDuplicate={handleDuplicateItem}
                        registerInput={(itemId, field, el) => {
                          inputRefs.current[`${itemId}-${field}`] = el;
                        }}
                        onCellNavigate={handleCellNavigate}
                      />
                    ))}

                    {items.length === 0 ? (
                      <div className="p-6 text-center text-[13px] text-[#8391a0]">
                        품목이 없습니다.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block">
                <span className="mb-2 block text-[12px] font-semibold tracking-[0.01em] text-[#d8e2eb]">
                  부가세 방식
                </span>
                <select
                  value={vatMode}
                  onChange={(e) => {
                    const nextMode = e.target.value as VatMode;
                    setVatMode(nextMode);
                    setItems((prev) =>
                      prev.map((item) => sanitizeLineItem(item, nextMode))
                    );
                  }}
                  className={fieldInputClass}
                >
                  <option value="included">부가세 포함</option>
                  <option value="separate">부가세 별도</option>
                  <option value="none">부가세 없음</option>
                </select>
              </label>
            </div>
          </div>

          <div className={cardClass}>
            <h2 className={sectionTitleClass}>견적 상세 정보</h2>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[12px] font-semibold text-[#d8e2eb]">
                  납품조건
                </span>
                <input
                  value={deliveryCondition}
                  onChange={(e) => setDeliveryCondition(e.target.value)}
                  className={fieldInputClass}
                  placeholder="예: 택배 / 직납 / 화물"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[12px] font-semibold text-[#d8e2eb]">
                  유효기간
                </span>
                <input
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className={fieldInputClass}
                  placeholder="예: 2026-04-30"
                />
              </label>
            </div>
          </div>

          <div className={cardClass}>
            <h2 className={sectionTitleClass}>자동 계산 결과</h2>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-[22px] border border-[#27313b] bg-[#0f141a] p-4">
                <div className="text-[12px] font-semibold tracking-[0.08em] text-[#8d9aaa]">
                  공급가액
                </div>
                <div className="mt-2 text-[24px] font-bold tracking-[-0.03em] text-[#f7f8fb]">
                  {formatNumber(supplyPrice)}
                </div>
              </div>

              <div className="rounded-[22px] border border-[#27313b] bg-[#0f141a] p-4">
                <div className="text-[12px] font-semibold tracking-[0.08em] text-[#8d9aaa]">
                  부가세
                </div>
                <div className="mt-2 text-[24px] font-bold tracking-[-0.03em] text-[#f7f8fb]">
                  {formatNumber(vat)}
                </div>
              </div>

              <div className="rounded-[22px] border border-[#22b7ff]/50 bg-[linear-gradient(135deg,#0d1e2c_0%,#0a1822_100%)] p-4">
                <div className="text-[12px] font-semibold tracking-[0.08em] text-[#7fe4ff]">
                  총금액
                </div>
                <div className="mt-2 text-[26px] font-bold tracking-[-0.03em] text-white">
                  {formatNumber(totalAmount)}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[22px] border border-[#27313b] bg-[#0f141a] px-4 py-4 text-[13px] leading-6 text-[#dce6ef]">
              {vatSummaryText}
            </div>
          </div>

          <div className={cardClass}>
            <h2 className={sectionTitleClass}>저장 / 출력</h2>

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={handleDownloadPng} className={outlineBlueButtonClass}>
                PNG 저장
              </button>

              <button type="button" onClick={handleDownloadJpg} className={outlineBlueButtonClass}>
                JPG 저장
              </button>

              <button type="button" onClick={handleDownloadPdf} className={outlineBlueButtonClass}>
                PDF 저장
              </button>

              <button type="button" onClick={handlePrint} className={outlineBlueButtonClass}>
                인쇄
              </button>

              <button
                type="button"
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
                className={outlineBlueButtonClass}
              >
                메일 발송
              </button>
            </div>

            <button
              type="button"
              onClick={handleSaveEstimate}
              className="mt-3 inline-flex h-[46px] w-full items-center justify-center rounded-2xl border border-[#22b7ff] bg-[#1aa7f7] px-4 text-[13px] font-bold text-white transition hover:bg-[#2eb5ff] hover:shadow-[0_0_18px_rgba(34,183,255,0.18)]"
            >
              견적 저장
            </button>

            <button
              type="button"
              onClick={handleResetEstimate}
              className="mt-3 inline-flex h-[42px] w-full items-center justify-center rounded-2xl border border-[#2b82b6] bg-[#0d1319] px-4 text-[13px] font-semibold text-[#6fd6ff] transition hover:border-[#22b7ff] hover:text-white"
            >
              새 견적 작성
            </button>
          </div>

          <div className={cardClass}>
            <h2 className={sectionTitleClass}>저장된 견적 목록</h2>

            {savedEstimates.length === 0 ? (
              <div className="mt-4 rounded-[22px] border border-dashed border-[#34404b] p-6 text-[13px] text-[#8391a0]">
                저장된 견적이 없습니다.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {savedEstimates.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[22px] border border-[#27313b] bg-[#0f141a] p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-[14px] font-semibold text-[#f7f8fb]">
                          {item.estimateNumber} / {item.productName}
                        </div>
                        <div className="mt-1 text-[13px] text-[#a9b4bf]">
                          거래처: {item.clientName || "-"} / 총금액: {formatNumber(item.totalAmount)}
                          원 / 저장일: {item.date}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleLoadEstimate(item)}
                          className={outlineBlueButtonClass}
                        >
                          불러오기
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteEstimate(item.id)}
                          className={outlineBlueButtonClass}
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
          <div className="rounded-[30px] border border-[#26313b] bg-[#171c22] px-5 py-5 shadow-[0_18px_34px_rgba(0,0,0,0.28)] ring-1 ring-[rgba(255,255,255,0.02)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className={sectionTitleClass}>견적서 미리보기</h2>
                <p className={sectionDescriptionClass}>
                  우측 A4 문서 내용은 조금 키워서 가독성을 높인 최종 미리보기입니다.
                </p>
              </div>
            </div>

            <div className="overflow-auto rounded-[26px] border border-[#27313b] bg-[#0b0f14] p-4">
              <div className="mx-auto w-[860px] scale-[1.02] origin-top">
                <div
                  id="estimate-print-area"
                  className="min-h-[1123px] rounded-[8px] bg-white p-[24px] text-[#111]"
                >
                  <div className="flex items-end justify-between gap-4">
                    <div className="text-[32px] font-extrabold tracking-[-0.04em]">
                      견적서 (ESTIMATE)
                    </div>
                    <div className="text-right">
                      {resolvedLogo ? (
                        <div className="mb-2 flex justify-end">
                          <img
                            src={resolvedLogo}
                            alt="회사 로고"
                            className="h-[52px] object-contain"
                          />
                        </div>
                      ) : null}
                      <div className="text-[24px] font-extrabold tracking-[-0.03em]">
                        {displayCompanyName}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 h-[2px] bg-[#111]" />

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <table className="w-full border-collapse text-[14px]">
                      <tbody>
                        <tr>
                          <td className="w-[70px] py-[3px] pr-2 font-bold">작성일</td>
                          <td className="py-[3px]">{today}</td>
                        </tr>
                        <tr>
                          <td className="w-[70px] py-[3px] pr-2 font-bold">상호</td>
                          <td className="py-[3px]">{clientName || "-"}</td>
                        </tr>
                        <tr>
                          <td className="w-[70px] py-[3px] pr-2 font-bold">제목</td>
                          <td className="py-[3px]">{estimateTitle || "-"}</td>
                        </tr>
                        <tr>
                          <td className="w-[70px] py-[3px] pr-2 font-bold">합계</td>
                          <td className="py-[3px] text-[15px] font-extrabold">
                            {vatSummaryText}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <table className="w-full border-collapse text-[14px]">
                      <tbody>
                        <tr>
                          <td className="py-[3px]">{displayCompanyName}</td>
                        </tr>
                        <tr>
                          <td className="py-[3px]">등록번호 {displayBusinessNumber}</td>
                        </tr>
                        <tr>
                          <td className="py-[3px]">{displayAddress}</td>
                        </tr>
                        <tr>
                          <td className="py-[3px]">TEL : {displayCompanyPhone}</td>
                        </tr>
                        <tr>
                          <td className="py-[3px]">
                            <span className="inline-flex items-center whitespace-nowrap">
                              대표 : {displayCeoName}
                              {resolvedStamp ? (
                                <img
                                  src={resolvedStamp}
                                  alt="직인"
                                  className="ml-[10px] h-[56px] w-[56px] object-contain"
                                />
                              ) : (
                                <span className="ml-[10px] inline-flex h-[56px] w-[56px] items-center justify-center rounded-full border-[1.8px] border-red-600 text-[12px] font-bold text-red-600">
                                  직인
                                </span>
                              )}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <table className="mt-3 w-full table-fixed border-collapse text-[13px]">
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
                      <tr className="bg-[#f5f5f5]">
                        <th className="h-[36px] border border-[#333] px-[5px] font-bold">
                          구분
                        </th>
                        <th className="h-[36px] border border-[#333] px-[5px] font-bold">
                          품목
                        </th>
                        <th className="h-[36px] border border-[#333] px-[5px] font-bold">
                          규격
                        </th>
                        <th className="h-[36px] border border-[#333] px-[5px] font-bold">
                          단위
                        </th>
                        <th className="h-[36px] border border-[#333] px-[5px] font-bold">
                          수량
                        </th>
                        <th className="h-[36px] border border-[#333] px-[5px] font-bold">
                          단가
                        </th>
                        <th className="h-[36px] border border-[#333] px-[5px] font-bold">
                          공급가액
                        </th>
                        <th className="h-[36px] border border-[#333] px-[5px] font-bold">
                          비고
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, index) => (
                        <tr key={`${row.item}-${index}`}>
                          <td className="h-[35px] border border-[#333] px-[5px] text-center">
                            {row.category || "\u00A0"}
                          </td>
                          <td className="h-[35px] border border-[#333] px-[5px] text-left">
                            {row.item || "\u00A0"}
                          </td>
                          <td className="h-[35px] border border-[#333] px-[5px] text-center">
                            {row.spec || "\u00A0"}
                          </td>
                          <td className="h-[35px] border border-[#333] px-[5px] text-center">
                            {row.unit || "\u00A0"}
                          </td>
                          <td className="h-[35px] border border-[#333] px-[5px] text-center">
                            {row.quantity || "\u00A0"}
                          </td>
                          <td className="h-[35px] border border-[#333] px-[5px] text-right">
                            {row.price || "\u00A0"}
                          </td>
                          <td className="h-[35px] border border-[#333] px-[5px] text-right">
                            {row.supplyAmount || "\u00A0"}
                          </td>
                          <td className="h-[35px] border border-[#333] px-[5px] text-left">
                            {row.note || "\u00A0"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <table className="mt-[1px] w-full border-collapse text-[15px] font-extrabold">
                    <tbody>
                      <tr>
                        <td className="w-[65%] border border-[#333] bg-[#f5f5f5] px-3 py-2 text-center">
                          총 금 액
                        </td>
                        <td className="w-[35%] border border-[#333] bg-[#f5f5f5] px-3 py-2 text-right">
                          {formatNumber(totalAmount)}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="mt-4 text-[14px] leading-[1.7]">
                    <div className="mb-1 text-[14px] font-extrabold">고객 준수사항</div>
                    <div>1. {getVatModeLabel(vatMode)}</div>
                    <div>2. 납품조건 : {deliveryCondition || "-"}</div>
                    <div>3. 유효기간 : {getDisplayDate(validUntil)}</div>
                    <div>
                      문의사항 : {displayCompanyPhone} / {displayCompanyEmail}
                    </div>
                    <div>계좌정보 : {displayAccountInfo}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}