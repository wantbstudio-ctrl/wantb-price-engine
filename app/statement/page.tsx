"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type VatMode = "included" | "separate";

type EditableField =
  | "dateYear"
  | "dateMonth"
  | "dateDay"
  | "productName"
  | "spec"
  | "unit"
  | "quantity"
  | "unitPrice"
  | "supplyAmount";

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

type CompanySettings = {
  companyName?: string;
  ceo?: string;
  businessNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  fax?: string;
  logo?: string;
  stamp?: string;
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

type PreviewSpread = {
  topRows: StatementItem[];
  bottomRows: StatementItem[];
};

type StatementPagePreviewProps = {
  pageIndex: number;
  pageRows: PreviewSpread;
  receiver: ClientData;
  supplier: SupplierData;
  vatMode: VatMode;
  totalAmount: number;
  unpaidAmount: number;
  receiverSigner: string;
  supplierSigner: string;
  notes: string;
  companySettings: CompanySettings;
  setPageRef: (index: number, el: HTMLDivElement | null) => void;
};

type ItemRowProps = {
  item: StatementItem;
  index: number;
  vatMode: VatMode;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onChange: (
    id: string,
    key: keyof StatementItem,
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

type ItemTableProps = {
  items: StatementItem[];
  selectedRowIds: string[];
  vatMode: VatMode;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  onChange: (
    id: string,
    key: keyof StatementItem,
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
  onPasteRows: (text: string) => void;
};

const STORAGE_KEYS = {
  statements: "wantb-statements",
  statementSeq: "wantb-statement-seq",
  selectedClient: "wantb-selected-client",
  clients: "wantb-clients",
  companySettings: "wantb-company-settings",
  estimateDraft: "estimate-draft",
};

const HALF_PREVIEW_ROW_COUNT = 12;
const EXPORT_PAGE_WIDTH = 1000;
const EXPORT_PAGE_HEIGHT = 1414;

const EDITABLE_FIELDS: EditableField[] = [
  "dateYear",
  "dateMonth",
  "dateDay",
  "productName",
  "spec",
  "unit",
  "quantity",
  "unitPrice",
  "supplyAmount",
];

const previewColWidths = [40, 40, 40, 220, 100, 60, 60, 100, 120, 120];

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("ko-KR");
}

function parseNumber(value: string | number) {
  const normalized =
    typeof value === "string" ? value.replace(/,/g, "").trim() : value;
  const num = Number(normalized);
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
  const current =
    Number(localStorage.getItem(STORAGE_KEYS.statementSeq) || "0") + 1;
  localStorage.setItem(STORAGE_KEYS.statementSeq, String(current));
  const compactDate = date.replaceAll("-", "");
  return `WB-ST-${compactDate}-${String(current).padStart(4, "0")}`;
}

function calcFromUnitPrice(
  quantity: number,
  unitPrice: number,
  vatMode: VatMode
) {
  const safeQty = Math.max(1, parseNumber(quantity));
  const safeUnitPrice = parseNumber(unitPrice);
  const total = safeQty * safeUnitPrice;

  if (vatMode === "included") {
    const supplyAmount = Math.round(total / 1.1);
    const taxAmount = total - supplyAmount;
    return {
      quantity: safeQty,
      unitPrice: safeUnitPrice,
      supplyAmount,
      taxAmount,
    };
  }

  return {
    quantity: safeQty,
    unitPrice: safeUnitPrice,
    supplyAmount: total,
    taxAmount: 0,
  };
}

function calcFromSupplyAmount(
  quantity: number,
  supplyAmount: number,
  vatMode: VatMode
) {
  const safeQty = Math.max(1, parseNumber(quantity));
  const safeSupply = parseNumber(supplyAmount);

  if (vatMode === "included") {
    const taxAmount = Math.round(safeSupply * 0.1);
    const total = safeSupply + taxAmount;
    const unitPrice = Math.round(total / safeQty);

    return {
      quantity: safeQty,
      unitPrice,
      supplyAmount: safeSupply,
      taxAmount,
    };
  }

  const unitPrice = safeQty > 0 ? Math.round(safeSupply / safeQty) : 0;

  return {
    quantity: safeQty,
    unitPrice,
    supplyAmount: safeSupply,
    taxAmount: 0,
  };
}

function makeItem(date = todayString()): StatementItem {
  const { year, month, day } = getDateParts(date);

  return {
    id: crypto.randomUUID(),
    dateYear: year.slice(-2),
    dateMonth: String(Number(month) || ""),
    dateDay: String(Number(day) || ""),
    productName: "",
    spec: "",
    unit: "ea",
    quantity: 1,
    unitPrice: 0,
    supplyAmount: 0,
    taxAmount: 0,
  };
}

function makeEmptyPreviewRow(): StatementItem {
  return {
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
  };
}

function sanitizeLoadedItem(
  item: Partial<StatementItem>,
  vatMode: VatMode,
  fallbackDate: string
): StatementItem {
  const { year, month, day } = getDateParts(fallbackDate);
  const quantity = Math.max(1, parseNumber(item.quantity ?? 1));
  const hasSupplyAmount = parseNumber(item.supplyAmount ?? 0) > 0;

  const normalized = hasSupplyAmount
    ? calcFromSupplyAmount(
        quantity,
        parseNumber(item.supplyAmount ?? 0),
        vatMode
      )
    : calcFromUnitPrice(quantity, parseNumber(item.unitPrice ?? 0), vatMode);

  return {
    id: item.id || crypto.randomUUID(),
    dateYear: item.dateYear || year.slice(-2),
    dateMonth: item.dateMonth || String(Number(month) || ""),
    dateDay: item.dateDay || String(Number(day) || ""),
    productName: item.productName || "",
    spec: item.spec || "",
    unit: item.unit || "ea",
    quantity: normalized.quantity,
    unitPrice: normalized.unitPrice,
    supplyAmount: normalized.supplyAmount,
    taxAmount: normalized.taxAmount,
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

function isEffectivelyEmptyItem(item: StatementItem) {
  return (
    !item.productName &&
    !item.spec &&
    !item.unit &&
    item.quantity === 1 &&
    item.unitPrice === 0 &&
    item.supplyAmount === 0 &&
    item.taxAmount === 0
  );
}

function parsePastedStatementRows(
  text: string,
  vatMode: VatMode,
  statementDate: string
) {
  const rows = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((row) => row.split("\t"))
    .filter(isMeaningfulPastedRow);

  if (rows.length === 0) return [];

  return rows.map((columns) => {
    const [
      dateYear = "",
      dateMonth = "",
      dateDay = "",
      productName = "",
      spec = "",
      unit = "ea",
      quantityRaw = "1",
      unitPriceRaw = "0",
      supplyAmountRaw = "0",
    ] = columns;

    const quantity = Math.max(1, parsePastedNumber(quantityRaw) || 1);
    const unitPrice = parsePastedNumber(unitPriceRaw);
    const supplyAmount = parsePastedNumber(supplyAmountRaw);

    const normalized =
      supplyAmount > 0
        ? calcFromSupplyAmount(quantity, supplyAmount, vatMode)
        : calcFromUnitPrice(quantity, unitPrice, vatMode);

    return sanitizeLoadedItem(
      {
        id: crypto.randomUUID(),
        dateYear: dateYear.trim(),
        dateMonth: dateMonth.trim(),
        dateDay: dateDay.trim(),
        productName: productName.trim(),
        spec: spec.trim(),
        unit: (unit || "ea").trim(),
        quantity: normalized.quantity,
        unitPrice: normalized.unitPrice,
        supplyAmount: normalized.supplyAmount,
      },
      vatMode,
      statementDate
    );
  });
}

function padHalfRows(rows: StatementItem[]) {
  const next = [...rows];
  while (next.length < HALF_PREVIEW_ROW_COUNT) {
    next.push(makeEmptyPreviewRow());
  }
  return next;
}

function chunkPreviewRows(items: StatementItem[]): PreviewSpread[] {
  const source = items.length > 0 ? items : [makeItem(todayString())];
  const spreads: PreviewSpread[] = [];
  const unit = HALF_PREVIEW_ROW_COUNT;

  for (let i = 0; i < source.length; i += unit) {
    const pageRows = source.slice(i, i + HALF_PREVIEW_ROW_COUNT);
    const paddedRows = padHalfRows(pageRows);

    spreads.push({
      topRows: paddedRows,
      bottomRows: [...paddedRows],
    });
  }

  if (spreads.length === 0) {
    const emptyRows = padHalfRows([]);
    spreads.push({
      topRows: emptyRows,
      bottomRows: [...emptyRows],
    });
  }

  return spreads;
}

function toReceiverFromClient(client: ClientRecord): ClientData {
  return {
    id: client.id,
    companyName: client.name || "",
    managerName: client.owner || "",
    phone: client.phone || "",
    email: client.email || "",
    address: client.address || "",
    fax: "",
    businessNumber: client.businessNumber || "",
    memo: client.memo || "",
  };
}

function getCellMoveAllowed(
  e: React.KeyboardEvent<HTMLInputElement>,
  direction: "left" | "right"
) {
  const input = e.currentTarget;
  const selectionStart = input.selectionStart ?? 0;
  const selectionEnd = input.selectionEnd ?? 0;
  const length = input.value.length;

  if (input.type === "number") return true;

  if (direction === "left") {
    return selectionStart === 0 && selectionEnd === 0;
  }

  return selectionStart === length && selectionEnd === length;
}

const pageCardClass =
  "rounded-[30px] border border-[#3a424b] bg-[#1b2026] px-5 py-5 shadow-[0_18px_34px_rgba(0,0,0,0.28)] ring-1 ring-[rgba(255,255,255,0.02)]";

const inputClass =
  "h-[44px] w-full rounded-2xl border border-[#34404b] bg-[#0c1117] px-4 text-[14px] text-[#f4f8fb] outline-none placeholder:text-[#6f7b88] transition focus:border-[#22b7ff] focus:bg-[#10161d]";

const textareaClass =
  "w-full rounded-2xl border border-[#34404b] bg-[#0c1117] px-4 py-3 text-[14px] text-[#f4f8fb] outline-none placeholder:text-[#6f7b88] transition focus:border-[#22b7ff] focus:bg-[#10161d]";

const titleClass =
  "text-[18px] font-light tracking-tight text-[#38BDF8]";

const descClass =
  "mt-2 text-[13px] leading-6 text-[#a9b4bf]";

const primaryButtonClass =
  "inline-flex h-[42px] items-center justify-center rounded-2xl border border-[#22b7ff] bg-[#1aa7f7] px-4 text-[13px] font-semibold text-white transition hover:bg-[#2eb5ff] hover:shadow-[0_0_18px_rgba(34,183,255,0.18)]";

const blueOutlineButtonClass =
  "inline-flex h-[42px] items-center justify-center rounded-2xl border border-[#2b82b6] bg-[#0d1319] px-4 text-[13px] font-semibold text-[#6fd6ff] transition hover:border-[#22b7ff] hover:text-white";

const subtleButtonClass =
  "inline-flex h-[42px] items-center justify-center rounded-2xl border border-[#34404b] bg-[#11161d] px-4 text-[13px] font-semibold text-[#dce6ef] transition hover:border-[#22b7ff] hover:text-white";

const miniChipClass =
  "inline-flex h-8 items-center justify-center rounded-full border border-[#2b82b6] bg-[#0d1319] px-3 text-[10px] font-semibold tracking-[0.12em] text-[#6fd6ff] transition hover:border-[#22b7ff] hover:text-white";

function StatementHalfDocument({
  rows,
  color,
  receiver,
  supplier,
  vatMode,
  totalAmount,
  unpaidAmount,
  receiverSigner,
  supplierSigner,
  notes,
  companySettings,
}: {
  rows: StatementItem[];
  color: string;
  receiver: ClientData;
  supplier: SupplierData;
  vatMode: VatMode;
  totalAmount: number;
  unpaidAmount: number;
  receiverSigner: string;
  supplierSigner: string;
  notes: string;
  companySettings: CompanySettings;
}) {
  const border = `1px solid ${color}`;
  const outerBorder = `2px solid ${color}`;
  const halfHeight = "646px";

  const textColor = "#111111";
  const subTextColor = "#222222";

  const renderVerticalLabel = (text: string) => {
    return (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0px",
            fontSize: "14px",
            fontWeight: 700,
            lineHeight: 1,
            color,
          }}
        >
          {text.split("").map((char, index) => (
            <span
              key={`${text}-${index}`}
              style={{
                display: "block",
                height: "14px",
                lineHeight: "14px",
              }}
            >
              {char}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        width: "100%",
        height: halfHeight,
        border: outerBorder,
        background: "#fff",
        boxSizing: "border-box",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          height: "52px",
          minHeight: "52px",
          borderBottom: border,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: "28px",
          color,
          letterSpacing: "-0.5px",
          gap: "4px",
          lineHeight: 1,
        }}
      >
        <span>거래명세서</span>
        <span style={{ fontSize: "15px", fontWeight: 700 }}>
          {color === "#ff3b30" ? "(공급자 보관용)" : "(공급받는자 보관용)"}
        </span>
      </div>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
        }}
      >
        <colgroup>
          <col style={{ width: "44px" }} />
          <col style={{ width: "84px" }} />
          <col style={{ width: "250px" }} />
          <col style={{ width: "52px" }} />
          <col style={{ width: "92px" }} />
          <col style={{ width: "206px" }} />
          <col style={{ width: "92px" }} />
          <col style={{ width: "154px" }} />
        </colgroup>

        <tbody>
          <tr>
            <td
              rowSpan={4}
              style={{
                borderRight: border,
                borderBottom: border,
                textAlign: "center",
                padding: 0,
                verticalAlign: "middle",
              }}
            >
              {renderVerticalLabel("공급받는자")}
            </td>

            <td
              style={{
                borderRight: border,
                borderBottom: border,
                color,
                fontWeight: 700,
                textAlign: "center",
                fontSize: "15px",
                height: "32px",
                lineHeight: 1,
              }}
            >
              상호명
            </td>
            <td
              style={{
                borderRight: border,
                borderBottom: border,
                color: textColor,
                fontSize: "17px",
                fontWeight: 500,
                padding: "6px 10px",
                height: "40px",
                lineHeight: 1.25,
                verticalAlign: "middle",
              }}
            >
              {receiver.companyName || ""}
            </td>

            <td
              rowSpan={4}
              style={{
                borderRight: border,
                borderBottom: border,
                textAlign: "center",
                padding: 0,
                verticalAlign: "middle",
              }}
            >
              {renderVerticalLabel("공급자")}
            </td>

            <td
              style={{
                borderRight: border,
                borderBottom: border,
                color,
                fontWeight: 700,
                textAlign: "center",
                fontSize: "15px",
                height: "32px",
                lineHeight: 1,
              }}
            >
              사업자번호
            </td>
            <td
              style={{
                borderRight: border,
                borderBottom: border,
                color: textColor,
                fontSize: "17px",
                fontWeight: 500,
                padding: "6px 10px",
                height: "40px",
                lineHeight: 1.25,
                verticalAlign: "middle",
              }}
            >
              {supplier.businessNumber || ""}
            </td>
            <td
              style={{
                borderRight: border,
                borderBottom: border,
                color,
                fontWeight: 700,
                textAlign: "center",
                fontSize: "15px",
                height: "32px",
                lineHeight: 1,
              }}
            >
              성명
            </td>
            <td
              style={{
                borderBottom: border,
                color: textColor,
                fontSize: "17px",
                fontWeight: 500,
                padding: "6px 10px",
                height: "40px",
                lineHeight: 1.25,
                verticalAlign: "middle",
              }}
            >
              {supplier.ceoName || ""}
            </td>
          </tr>

          <tr>
            <td
              style={{
                borderRight: border,
                borderBottom: border,
                color,
                fontWeight: 700,
                textAlign: "center",
                fontSize: "15px",
                height: "52px",
                lineHeight: 1,
              }}
            >
              사업장주소
            </td>
            <td
              style={{
                borderRight: border,
                borderBottom: border,
                color: subTextColor,
                fontSize: "15px",
                fontWeight: 500,
                padding: "6px 10px",
                height: "52px",
                lineHeight: 1.2,
                verticalAlign: "middle",
              }}
            >
              {receiver.address || ""}
            </td>

            <td
              style={{
                borderRight: border,
                borderBottom: border,
                color,
                fontWeight: 700,
                textAlign: "center",
                fontSize: "15px",
                height: "32px",
                lineHeight: 1,
              }}
            >
              상호명
            </td>
            <td
              style={{
                borderRight: border,
                borderBottom: border,
                color: textColor,
                fontSize: "17px",
                fontWeight: 500,
                padding: 0,
                height: "40px",
                lineHeight: 1.25,
                verticalAlign: "middle",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: "10px",
                  paddingRight: "52px",
                  boxSizing: "border-box",
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    color: textColor,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {supplier.companyName || ""}
                </span>

                {companySettings?.stamp && (
                  <img
                    src={companySettings.stamp}
                    alt="stamp"
                    style={{
                      position: "absolute",
                      right: "6px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: "42px",
                      height: "42px",
                      objectFit: "contain",
                      opacity: 0.95,
                    }}
                  />
                )}
              </div>
            </td>
            <td
              style={{
                borderRight: border,
                borderBottom: border,
                color,
                fontWeight: 700,
                textAlign: "center",
                fontSize: "15px",
                height: "32px",
                lineHeight: 1,
              }}
            >
              팩스
            </td>
            <td
              style={{
                borderBottom: border,
                color: textColor,
                fontSize: "17px",
                fontWeight: 500,
                padding: "6px 10px",
                height: "40px",
                lineHeight: 1.25,
                verticalAlign: "middle",
              }}
            >
              {supplier.fax || ""}
            </td>
          </tr>

          <tr>
            <td
              style={{
                borderRight: border,
                borderBottom: border,
                color,
                fontWeight: 700,
                textAlign: "center",
                fontSize: "15px",
                height: "32px",
                lineHeight: 1,
              }}
            >
              전화번호
            </td>
            <td
              style={{
                borderRight: border,
                borderBottom: border,
                color: textColor,
                fontSize: "17px",
                fontWeight: 500,
                padding: "6px 10px",
                height: "40px",
                lineHeight: 1.25,
                verticalAlign: "middle",
              }}
            >
              {receiver.phone || ""}
            </td>

            <td
              style={{
                borderRight: border,
                borderBottom: border,
                color,
                fontWeight: 700,
                textAlign: "center",
                fontSize: "15px",
                height: "52px",
                lineHeight: 1,
              }}
            >
              사업장주소
            </td>
            <td
              style={{
                borderRight: border,
                borderBottom: border,
                color: subTextColor,
                fontSize: "15px",
                fontWeight: 500,
                padding: "6px 10px",
                height: "52px",
                lineHeight: 1.2,
                verticalAlign: "middle",
              }}
            >
              {supplier.address || ""}
            </td>
            <td
              style={{
                borderRight: border,
                borderBottom: border,
                color,
                fontWeight: 700,
                textAlign: "center",
                fontSize: "15px",
                height: "32px",
                lineHeight: 1,
              }}
            >
              VAT
            </td>
            <td
              style={{
                borderBottom: border,
                color: textColor,
                fontSize: "17px",
                fontWeight: 500,
                padding: "6px 10px",
                height: "40px",
                lineHeight: 1.25,
                verticalAlign: "middle",
              }}
            >
              {vatMode === "included" ? "포함" : "별도"}
            </td>
          </tr>

          <tr>
            <td
              style={{
                borderRight: border,
                borderBottom: border,
                color,
                fontWeight: 700,
                textAlign: "center",
                fontSize: "15px",
                height: "32px",
                lineHeight: 1,
              }}
            >
              합계금액
            </td>
            <td
              style={{
                borderRight: border,
                borderBottom: border,
                color: textColor,
                fontSize: "17px",
                fontWeight: 700,
                padding: "6px 10px",
                height: "40px",
                lineHeight: 1.25,
                verticalAlign: "middle",
              }}
            >
              {formatNumber(totalAmount)}
            </td>

            <td
              style={{
                borderRight: border,
                borderBottom: border,
                color,
                fontWeight: 700,
                textAlign: "center",
                fontSize: "15px",
                height: "32px",
                lineHeight: 1,
              }}
            >
              전화
            </td>
            <td
              style={{
                borderRight: border,
                borderBottom: border,
                color: textColor,
                fontSize: "17px",
                fontWeight: 500,
                padding: "6px 10px",
                height: "40px",
                lineHeight: 1.25,
                verticalAlign: "middle",
              }}
            >
              {supplier.phone || ""}
            </td>
            <td
              style={{
                borderRight: border,
                borderBottom: border,
                color,
                fontWeight: 700,
                textAlign: "center",
                fontSize: "15px",
                height: "32px",
                lineHeight: 1,
              }}
            >
              비고
            </td>
            <td
              style={{
                borderBottom: border,
                color: subTextColor,
                fontSize: "15px",
                fontWeight: 500,
                padding: "6px 10px",
                height: "40px",
                lineHeight: 1.2,
                verticalAlign: "middle",
              }}
            >
              {notes || ""}
            </td>
          </tr>
        </tbody>
      </table>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
          marginTop: "-1px",
          flex: 1,
        }}
      >
        <colgroup>
          {previewColWidths.map((width, index) => (
            <col key={index} style={{ width: `${width}px` }} />
          ))}
        </colgroup>

        <thead>
          <tr>
            {["년", "월", "일", "품목", "규격", "단위", "수량", "단가", "공급가액", "세액"].map(
              (label) => (
                <th
                  key={label}
                  style={{
                    border: border,
                    color,
                    fontWeight: 700,
                    textAlign: "center",
                    fontSize: "17px",
                    height: "32px",
                    lineHeight: 1,
                    padding: 0,
                  }}
                >
                  {label}
                </th>
              )
            )}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.id}-${index}`}>
              <td
                style={{
                  border: border,
                  height: "26px",
                  textAlign: "center",
                  fontSize: "15px",
                  fontWeight: 500,
                  color: textColor,
                  lineHeight: 1.1,
                  padding: 0,
                }}
              >
                {row.dateYear || ""}
              </td>
              <td
                style={{
                  border: border,
                  height: "26px",
                  textAlign: "center",
                  fontSize: "15px",
                  fontWeight: 500,
                  color: textColor,
                  lineHeight: 1.1,
                  padding: 0,
                }}
              >
                {row.dateMonth || ""}
              </td>
              <td
                style={{
                  border: border,
                  height: "26px",
                  textAlign: "center",
                  fontSize: "15px",
                  fontWeight: 500,
                  color: textColor,
                  lineHeight: 1.1,
                  padding: 0,
                }}
              >
                {row.dateDay || ""}
              </td>
              <td
                style={{
                  border: border,
                  height: "26px",
                  textAlign: "left",
                  fontSize: "15px",
                  fontWeight: 500,
                  color: textColor,
                  lineHeight: 1.1,
                  padding: "0 8px",
                }}
              >
                {row.productName || ""}
              </td>
              <td
                style={{
                  border: border,
                  height: "26px",
                  textAlign: "center",
                  fontSize: "15px",
                  fontWeight: 500,
                  color: textColor,
                  lineHeight: 1.1,
                  padding: 0,
                }}
              >
                {row.spec || ""}
              </td>
              <td
                style={{
                  border: border,
                  height: "26px",
                  textAlign: "center",
                  fontSize: "15px",
                  fontWeight: 500,
                  color: textColor,
                  lineHeight: 1.1,
                  padding: 0,
                }}
              >
                {row.unit || ""}
              </td>
              <td
                style={{
                  border: border,
                  height: "26px",
                  textAlign: "center",
                  fontSize: "15px",
                  fontWeight: 500,
                  color: textColor,
                  lineHeight: 1.1,
                  padding: 0,
                }}
              >
                {row.quantity ? formatNumber(row.quantity) : ""}
              </td>
              <td
                style={{
                  border: border,
                  height: "26px",
                  textAlign: "center",
                  fontSize: "15px",
                  fontWeight: 500,
                  color: textColor,
                  lineHeight: 1.1,
                  padding: 0,
                }}
              >
                {row.unitPrice ? formatNumber(row.unitPrice) : ""}
              </td>
              <td
                style={{
                  border: border,
                  height: "26px",
                  textAlign: "center",
                  fontSize: "15px",
                  fontWeight: 500,
                  color: textColor,
                  lineHeight: 1.1,
                  padding: 0,
                }}
              >
                {row.supplyAmount ? formatNumber(row.supplyAmount) : ""}
              </td>
              <td
                style={{
                  border: border,
                  height: "26px",
                  textAlign: "center",
                  fontSize: "15px",
                  fontWeight: 500,
                  color: textColor,
                  lineHeight: 1.1,
                  padding: 0,
                }}
              >
                {row.taxAmount ? formatNumber(row.taxAmount) : ""}
              </td>
            </tr>
          ))}

          <tr>
            <td
              colSpan={3}
              style={{
                border: border,
                height: "26px",
                textAlign: "center",
                fontSize: "15px",
                fontWeight: 700,
                color,
                padding: 0,
              }}
            >
              인수자
            </td>

            <td
              style={{
                border: border,
                height: "26px",
                textAlign: "center",
                fontSize: "15px",
                fontWeight: 500,
                color: textColor,
                padding: 0,
              }}
            >
              <div style={{ position: "relative", width: "100%", height: "100%" }}>
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  {receiverSigner || ""}
                </div>

                <div
                  style={{
                    position: "absolute",
                    right: "6px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "11px",
                    color: subTextColor,
                  }}
                >
                  서명
                </div>
              </div>
            </td>

            <td
              colSpan={2}
              style={{
                border: border,
                height: "26px",
                textAlign: "center",
                fontSize: "15px",
                fontWeight: 700,
                color,
                padding: 0,
              }}
            >
              납품자
            </td>

            <td
              colSpan={2}
              style={{
                border: border,
                height: "26px",
                textAlign: "center",
                fontSize: "15px",
                fontWeight: 500,
                color: textColor,
                padding: 0,
              }}
            >
              <div style={{ position: "relative", width: "100%", height: "100%" }}>
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  {supplierSigner || ""}
                </div>

                <div
                  style={{
                    position: "absolute",
                    right: "6px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "11px",
                    color: subTextColor,
                  }}
                >
                  서명
                </div>
              </div>
            </td>

            <td
              style={{
                border: border,
                height: "26px",
                textAlign: "center",
                fontSize: "15px",
                fontWeight: 700,
                color,
                padding: 0,
              }}
            >
              미수금
            </td>

            <td
              style={{
                border: border,
                height: "26px",
                textAlign: "center",
                fontSize: "15px",
                fontWeight: 500,
                color: textColor,
                padding: 0,
              }}
            >
              {formatNumber(unpaidAmount || 0)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
function StatementPagePreview({
  pageIndex,
  pageRows,
  receiver,
  supplier,
  vatMode,
  totalAmount,
  unpaidAmount,
  receiverSigner,
  supplierSigner,
  notes,
  companySettings,
  setPageRef,
}: StatementPagePreviewProps) {
  return (
    <div
      ref={(el) => setPageRef(pageIndex, el)}
      style={{
        width: "1000px",
        minHeight: "1414px",
        height: "1414px",
        background: "#ffffff",
        boxSizing: "border-box",
        padding: "24px 28px 24px 28px",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "grid",
          gridTemplateRows: "646px 646px",
          rowGap: "16px",
          alignContent: "start",
          justifyContent: "stretch",
        }}
      >
        <StatementHalfDocument
          rows={pageRows.topRows}
          color="#4b65ff"
          receiver={receiver}
          supplier={supplier}
          vatMode={vatMode}
          totalAmount={totalAmount}
          unpaidAmount={unpaidAmount}
          receiverSigner={receiverSigner}
          supplierSigner={supplierSigner}
          notes={notes}
          companySettings={companySettings}
        />

        <StatementHalfDocument
          rows={pageRows.bottomRows}
          color="#ff3b30"
          receiver={receiver}
          supplier={supplier}
          vatMode={vatMode}
          totalAmount={totalAmount}
          unpaidAmount={unpaidAmount}
          receiverSigner={receiverSigner}
          supplierSigner={supplierSigner}
          notes={notes}
          companySettings={companySettings}
        />
      </div>
    </div>
  );
}
const ItemRow = memo(function ItemRow({
  item,
  index,
  vatMode,
  isSelected,
  onToggleSelect,
  onChange,
  onRemove,
  onDuplicate,
  registerInput,
  onCellNavigate,
}: ItemRowProps) {
  const yearValue = item.dateYear || "";
  const monthValue = item.dateMonth || "";
  const dayValue = item.dateDay || "";
  const productNameValue = item.productName || "";
  const specValue = item.spec || "";
  const unitValue = item.unit || "";
  const quantityValue = item.quantity ? String(item.quantity) : "";
  const unitPriceValue = item.unitPrice ? String(item.unitPrice) : "";
  const supplyAmountValue = item.supplyAmount ? String(item.supplyAmount) : "";
  const taxAmountValue = item.taxAmount ? String(item.taxAmount) : "";

  const handleKeyDown =
    (field: EditableField) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onCellNavigate(index, field, "enter");
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
      if (e.key === "ArrowLeft") {
        if (getCellMoveAllowed(e, "left")) {
          e.preventDefault();
          onCellNavigate(index, field, "left");
        }
        return;
      }
      if (e.key === "ArrowRight") {
        if (getCellMoveAllowed(e, "right")) {
          e.preventDefault();
          onCellNavigate(index, field, "right");
        }
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        onCellNavigate(index, field, e.shiftKey ? "shiftTab" : "tab");
      }
    };

  const rowInputClass =
    "h-11 w-full border-r border-b border-[#27313b] bg-[#0c1117] px-3 text-[13px] text-[#f4f8fb] outline-none placeholder:text-[#6f7b88] focus:bg-[#10161d]";
  const centerClass = `${rowInputClass} text-center`;
  const rightClass = `${rowInputClass} text-right`;

  return (
    <div className="grid grid-cols-[54px_64px_64px_64px_minmax(220px,2.1fr)_minmax(130px,1fr)_90px_100px_140px_150px_140px_140px]">
      <div className="flex h-11 items-center justify-center border-r border-b border-[#27313b] bg-[#0c1117]">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(item.id)}
          className="h-4 w-4"
        />
      </div>

      <input
        ref={(el) => registerInput(item.id, "dateYear", el)}
        value={yearValue}
        onChange={(e) => onChange(item.id, "dateYear", e.target.value)}
        onKeyDown={handleKeyDown("dateYear")}
        placeholder="년"
        className={centerClass}
      />

      <input
        ref={(el) => registerInput(item.id, "dateMonth", el)}
        value={monthValue}
        onChange={(e) => onChange(item.id, "dateMonth", e.target.value)}
        onKeyDown={handleKeyDown("dateMonth")}
        placeholder="월"
        className={centerClass}
      />

      <input
        ref={(el) => registerInput(item.id, "dateDay", el)}
        value={dayValue}
        onChange={(e) => onChange(item.id, "dateDay", e.target.value)}
        onKeyDown={handleKeyDown("dateDay")}
        placeholder="일"
        className={centerClass}
      />

      <input
        ref={(el) => registerInput(item.id, "productName", el)}
        value={productNameValue}
        onChange={(e) => onChange(item.id, "productName", e.target.value)}
        onKeyDown={handleKeyDown("productName")}
        placeholder="품목명"
        className={rowInputClass}
      />

      <input
        ref={(el) => registerInput(item.id, "spec", el)}
        value={specValue}
        onChange={(e) => onChange(item.id, "spec", e.target.value)}
        onKeyDown={handleKeyDown("spec")}
        placeholder="규격"
        className={rowInputClass}
      />

      <input
        ref={(el) => registerInput(item.id, "unit", el)}
        value={unitValue}
        onChange={(e) => onChange(item.id, "unit", e.target.value)}
        onKeyDown={handleKeyDown("unit")}
        placeholder="단위"
        className={centerClass}
      />

      <input
        ref={(el) => registerInput(item.id, "quantity", el)}
        value={quantityValue}
        onChange={(e) => onChange(item.id, "quantity", e.target.value)}
        onKeyDown={handleKeyDown("quantity")}
        placeholder="수량"
        inputMode="numeric"
        className={rightClass}
      />

      <input
        ref={(el) => registerInput(item.id, "unitPrice", el)}
        value={unitPriceValue}
        onChange={(e) => onChange(item.id, "unitPrice", e.target.value)}
        onKeyDown={handleKeyDown("unitPrice")}
        placeholder={vatMode === "included" ? "단가(VAT포함)" : "단가(VAT별도)"}
        inputMode="numeric"
        className={rightClass}
      />

      <input
        ref={(el) => registerInput(item.id, "supplyAmount", el)}
        value={supplyAmountValue}
        onChange={(e) => onChange(item.id, "supplyAmount", e.target.value)}
        onKeyDown={handleKeyDown("supplyAmount")}
        placeholder="공급가액"
        inputMode="numeric"
        className={rightClass}
      />

      <input
        value={taxAmountValue}
        onChange={() => {}}
        readOnly
        placeholder="세액"
        className={`${rightClass} bg-[#0a0f15] text-[#c6d2dd]`}
      />

      <div className="flex h-11 items-center justify-center gap-2 border-b border-[#27313b] bg-[#0c1117] px-2">
        <button
          type="button"
          onClick={() => onDuplicate(item.id)}
          className="rounded-lg border border-[#2b82b6] bg-[#0d1319] px-2 py-1 text-[11px] text-[#6fd6ff]"
        >
          복제
        </button>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="rounded-lg border border-[#2b82b6] bg-[#0d1319] px-2 py-1 text-[11px] text-[#6fd6ff]"
        >
          삭제
        </button>
      </div>
    </div>
  );
});

const ItemTable = memo(function ItemTable({
  items,
  selectedRowIds,
  vatMode,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onDeleteSelected,
  onDuplicateSelected,
  onChange,
  onRemove,
  onDuplicate,
  registerInput,
  onCellNavigate,
  onPasteRows,
}: ItemTableProps) {
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      const text = e.clipboardData.getData("text");
      if (!text || !text.includes("\t")) return;
      e.preventDefault();
      onPasteRows(text);
    },
    [onPasteRows]
  );

  const allSelected =
    items.length > 0 && selectedRowIds.length === items.length;

  return (
    <div
      className="rounded-[24px] border border-[#27313b] bg-[#0f141a]"
      onPaste={handlePaste}
    >
      <div className="border-b border-[#27313b] px-4 py-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[12px] text-[#8d9aaa]">
              견적서와 동일하게 Tab / Enter / 방향키 이동, 자동 행 추가, 붙여넣기를 지원합니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onSelectAll}
              className={`rounded-2xl border px-4 py-2 text-[13px] font-medium ${
                allSelected
                  ? "border-[#22b7ff] bg-[#102433] text-[#74ddff]"
                  : "border-[#2b82b6] bg-[#0d1319] text-[#6fd6ff]"
              }`}
            >
              전체 선택
            </button>

            <button
              type="button"
              onClick={onClearSelection}
              className={blueOutlineButtonClass}
            >
              선택 해제
            </button>

            <button
              type="button"
              onClick={onDeleteSelected}
              className={blueOutlineButtonClass}
            >
              선택 행 삭제
            </button>

            <button
              type="button"
              onClick={onDuplicateSelected}
              className={blueOutlineButtonClass}
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
        <div className="min-w-[1606px]">
          <div className="grid grid-cols-[54px_64px_64px_64px_minmax(220px,2.1fr)_minmax(130px,1fr)_90px_100px_140px_150px_140px_140px] border-b border-[#27313b] bg-[linear-gradient(135deg,#1d232b_0%,#171d24_100%)] text-[12px] font-semibold text-[#dce6ef]">
            <div className="flex h-11 items-center justify-center border-r border-[#27313b]">
              선택
            </div>
            <div className="flex h-11 items-center justify-center border-r border-[#27313b]">
              년
            </div>
            <div className="flex h-11 items-center justify-center border-r border-[#27313b]">
              월
            </div>
            <div className="flex h-11 items-center justify-center border-r border-[#27313b]">
              일
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
              {vatMode === "included" ? "단가(VAT포함)" : "단가(VAT별도)"}
            </div>
            <div className="flex h-11 items-center justify-center border-r border-[#27313b]">
              공급가액
            </div>
            <div className="flex h-11 items-center justify-center border-r border-[#27313b]">
              세액
            </div>
            <div className="flex h-11 items-center justify-center">작업</div>
          </div>

          <div className="max-h-[540px] overflow-y-auto bg-[#10151b]">
            {items.map((item, index) => (
              <ItemRow
                key={item.id}
                item={item}
                index={index}
                vatMode={vatMode}
                isSelected={selectedRowIds.includes(item.id)}
                onToggleSelect={onToggleSelect}
                onChange={onChange}
                onRemove={onRemove}
                onDuplicate={onDuplicate}
                registerInput={registerInput}
                onCellNavigate={onCellNavigate}
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
  );
});

export default function StatementPage() {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const itemsRef = useRef<StatementItem[]>([]);
  const statementDateRef = useRef(todayString());
  const vatModeRef = useRef<VatMode>("included");
  const pendingFocusRef = useRef<{
    rowIndex: number;
    field: EditableField;
  } | null>(null);

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
  const [items, setItems] = useState<StatementItem[]>([makeItem(todayString())]);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [unpaidAmount, setUnpaidAmount] = useState(0);

  const [companySettings, setCompanySettings] = useState<CompanySettings>({});
  const [savedStatements, setSavedStatements] = useState<SavedStatement[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientSearch, setShowClientSearch] = useState(false);

  const requestFocus = useCallback((rowIndex: number, field: EditableField) => {
    const targetItem = itemsRef.current[rowIndex];
    if (!targetItem) return;

    const key = `${targetItem.id}-${field}`;
    requestAnimationFrame(() => {
      const target = inputRefs.current[key];
      if (!target) return;
      target.focus();
      target.select();
    });
  }, []);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    if (!pendingFocusRef.current) return;
    const pending = pendingFocusRef.current;
    pendingFocusRef.current = null;
    requestFocus(
      Math.min(pending.rowIndex, Math.max(itemsRef.current.length - 1, 0)),
      pending.field
    );
  }, [items, requestFocus]);

  useEffect(() => {
    const initialDate = todayString();
    statementDateRef.current = initialDate;
    vatModeRef.current = "included";

    let nextCompanySettings: CompanySettings = {};
    const companySettingsRaw = localStorage.getItem(STORAGE_KEYS.companySettings);
    if (companySettingsRaw) {
      try {
        nextCompanySettings = JSON.parse(companySettingsRaw) || {};
      } catch {}
    }

    let nextClients: ClientRecord[] = [];
    const clientsRaw = localStorage.getItem(STORAGE_KEYS.clients);
    if (clientsRaw) {
      try {
        const parsed = JSON.parse(clientsRaw);
        if (Array.isArray(parsed)) nextClients = parsed;
      } catch {}
    }

    let selectedClient: ClientRecord | null = null;
    const selectedClientRaw = localStorage.getItem(STORAGE_KEYS.selectedClient);
    if (selectedClientRaw) {
      try {
        selectedClient = JSON.parse(selectedClientRaw);
      } catch {}
    }

    let estimateDraft: EstimateDraft | null = null;
    const estimateDraftRaw = localStorage.getItem(STORAGE_KEYS.estimateDraft);
    if (estimateDraftRaw) {
      try {
        estimateDraft = JSON.parse(estimateDraftRaw);
      } catch {}
    }

    const nextReceiver: ClientData = selectedClient
      ? toReceiverFromClient(selectedClient)
      : {
          companyName: estimateDraft?.clientName || "",
          managerName: estimateDraft?.contactPerson || "",
          phone: estimateDraft?.phone || "",
          email: estimateDraft?.email || "",
          address: "",
          fax: "",
          businessNumber: "",
          memo: "",
        };

    const nextSupplier: SupplierData = {
      companyName: nextCompanySettings.companyName || "",
      ceoName: nextCompanySettings.ceo || "",
      businessNumber: nextCompanySettings.businessNumber || "",
      address: nextCompanySettings.address || "",
      phone: nextCompanySettings.phone || "",
      fax: nextCompanySettings.fax || "",
    };

    const nextReceiverSigner =
      selectedClient?.owner || estimateDraft?.contactPerson || "";
    const nextSupplierSigner = nextCompanySettings.ceo || "";

    const draftItems =
      estimateDraft?.items?.length && estimateDraft.items.length > 0
        ? estimateDraft.items.map((draftItem) =>
            sanitizeLoadedItem(
              {
                productName: draftItem.productName || "",
                quantity: Math.max(1, parseNumber(draftItem.quantity || 1)),
                unitPrice: parseNumber(
                  draftItem.unitPrice ?? draftItem.supplyPrice ?? 0
                ),
              },
              "included",
              initialDate
            )
          )
        : [makeItem(initialDate)];

    setCompanySettings(nextCompanySettings);

    const savedStatementsRaw = localStorage.getItem(STORAGE_KEYS.statements);
    if (savedStatementsRaw) {
      try {
        setSavedStatements(JSON.parse(savedStatementsRaw));
      } catch {}
    }

    setClients(nextClients);
    setReceiver(nextReceiver);
    setSupplier(nextSupplier);
    setReceiverSigner(nextReceiverSigner);
    setSupplierSigner(nextSupplierSigner);
    setItems(draftItems);
    setStatementId(crypto.randomUUID());
    setStatementNumber(makeStatementNumber(initialDate));
    setNotes("");
    setMounted(true);
  }, []);

  const normalizedItems = useMemo(() => {
    return items.map((item) => sanitizeLoadedItem(item, vatMode, statementDate));
  }, [items, vatMode, statementDate]);

  const totalSupplyAmount = useMemo(
    () => normalizedItems.reduce((sum, item) => sum + item.supplyAmount, 0),
    [normalizedItems]
  );

  const totalTaxAmount = useMemo(
    () => normalizedItems.reduce((sum, item) => sum + item.taxAmount, 0),
    [normalizedItems]
  );

  const totalAmount = useMemo(
    () => totalSupplyAmount + totalTaxAmount,
    [totalSupplyAmount, totalTaxAmount]
  );

  const previewPages = useMemo(
    () => chunkPreviewRows(normalizedItems),
    [normalizedItems]
  );

  const filteredClients = useMemo(() => {
    const keyword = clientSearch.trim().toLowerCase();
    if (!keyword) return clients;

    return clients.filter((client) =>
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
  }, [clients, clientSearch]);

  const syncSavedStatements = useCallback((next: SavedStatement[]) => {
    setSavedStatements(next);
    localStorage.setItem(STORAGE_KEYS.statements, JSON.stringify(next));
  }, []);

  const handleReceiverChange = useCallback(
    <K extends keyof ClientData>(key: K, value: ClientData[K]) => {
      setReceiver((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSupplierChange = useCallback(
    (key: keyof SupplierData, value: string) => {
      setSupplier((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleStatementDateChange = useCallback((nextDate: string) => {
    statementDateRef.current = nextDate;
    setStatementDate(nextDate);
    const { year, month, day } = getDateParts(nextDate);

    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        dateYear: year.slice(-2),
        dateMonth: String(Number(month) || ""),
        dateDay: String(Number(day) || ""),
      }))
    );
  }, []);

  const handleVatModeChange = useCallback((nextMode: VatMode) => {
    vatModeRef.current = nextMode;
    setVatMode(nextMode);

    setItems((prev) =>
      prev.map((item) => {
        const hasSupply = item.supplyAmount > 0;

        const next = hasSupply
          ? calcFromSupplyAmount(item.quantity, item.supplyAmount, nextMode)
          : calcFromUnitPrice(item.quantity, item.unitPrice, nextMode);

        return {
          ...item,
          quantity: next.quantity,
          unitPrice: next.unitPrice,
          supplyAmount: next.supplyAmount,
          taxAmount: next.taxAmount,
        };
      })
    );
  }, []);

  const handleItemChange = useCallback(
    (id: string, key: keyof StatementItem, value: string | number) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;

          const base = { ...item, [key]: value };

          if (key === "quantity" || key === "unitPrice") {
            const next = calcFromUnitPrice(
              key === "quantity" ? Number(value || 1) : base.quantity,
              key === "unitPrice" ? Number(value || 0) : base.unitPrice,
              vatModeRef.current
            );
            return { ...base, ...next };
          }

          if (key === "supplyAmount") {
            const next = calcFromSupplyAmount(
              base.quantity,
              Number(value || 0),
              vatModeRef.current
            );
            return { ...base, ...next };
          }

          return base;
        })
      );
    },
    []
  );

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, makeItem(statementDateRef.current)]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      if (prev.length === 1) {
        return [makeItem(statementDateRef.current)];
      }
      return prev.filter((item) => item.id !== id);
    });
    setSelectedRowIds((prev) => prev.filter((rowId) => rowId !== id));
  }, []);

  const duplicateItem = useCallback((id: string) => {
    setItems((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index === -1) return prev;

      const target = prev[index];
      const duplicated: StatementItem = {
        ...target,
        id: crypto.randomUUID(),
      };

      const next = [...prev];
      next.splice(index + 1, 0, duplicated);
      return next;
    });
  }, []);

  const toggleRowSelect = useCallback((id: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  }, []);

  const selectAllRows = useCallback(() => {
    setSelectedRowIds(itemsRef.current.map((item) => item.id));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRowIds([]);
  }, []);

  const deleteSelectedRows = useCallback(() => {
    const currentItems = itemsRef.current;
    if (selectedRowIds.length === 0) {
      alert("선택된 행이 없습니다.");
      return;
    }

    const ok = window.confirm(
      `선택된 ${selectedRowIds.length}개 행을 삭제하시겠습니까?`
    );
    if (!ok) return;

    const next = currentItems.filter((item) => !selectedRowIds.includes(item.id));

    if (next.length === 0) {
      setItems([makeItem(statementDateRef.current)]);
    } else {
      setItems(next);
    }

    setSelectedRowIds([]);
  }, [selectedRowIds]);

  const resetItemsOnly = useCallback(() => {
    const ok = window.confirm("품목 정보만 초기화하시겠습니까?");
    if (!ok) return;

    setItems([makeItem(statementDateRef.current)]);
    setSelectedRowIds([]);
  }, []);

  const duplicateSelectedRows = useCallback(() => {
    if (selectedRowIds.length === 0) {
      alert("선택된 행이 없습니다.");
      return;
    }

    setItems((prev) => {
      const selectedSet = new Set(selectedRowIds);
      const next: StatementItem[] = [];

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
  }, [selectedRowIds]);

  const registerInput = useCallback(
    (itemId: string, field: EditableField, el: HTMLInputElement | null) => {
      inputRefs.current[`${itemId}-${field}`] = el;
    },
    []
  );

  const onCellNavigate = useCallback(
    (
      rowIndex: number,
      field: EditableField,
      action: "enter" | "up" | "down" | "left" | "right" | "tab" | "shiftTab"
    ) => {
      const currentItems = itemsRef.current;
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
        setItems((prev) => [...prev, makeItem(statementDateRef.current)]);
        return;
      }

      requestFocus(nextRowIndex, EDITABLE_FIELDS[nextColIndex]);
    },
    [requestFocus]
  );

  const handlePasteRows = useCallback((text: string) => {
    const parsedRows = parsePastedStatementRows(
      text,
      vatModeRef.current,
      statementDateRef.current
    );
    if (parsedRows.length === 0) return;

    setItems((prev) => {
      const next = [...prev];

      let startIndex = next.findIndex((item) => isEffectivelyEmptyItem(item));
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
  }, []);

  const handleSelectClient = useCallback((client: ClientRecord) => {
    const nextReceiver = toReceiverFromClient(client);
    setReceiver(nextReceiver);
    setReceiverSigner(client.owner || "");
    setShowClientSearch(false);
    localStorage.setItem(STORAGE_KEYS.selectedClient, JSON.stringify(client));
  }, []);

  const clearSelectedClientInForm = useCallback(() => {
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
  }, []);

  const resetForm = useCallback(() => {
    const nextDate = todayString();
    statementDateRef.current = nextDate;
    vatModeRef.current = "included";

    setStatementId(crypto.randomUUID());
    setStatementNumber(makeStatementNumber(nextDate));
    setStatementDate(nextDate);
    setVatMode("included");
    clearSelectedClientInForm();

    setSupplier({
      companyName: companySettings.companyName || "",
      ceoName: companySettings.ceo || "",
      businessNumber: companySettings.businessNumber || "",
      address: companySettings.address || "",
      phone: companySettings.phone || "",
      fax: companySettings.fax || "",
    });

    setSupplierSigner(companySettings.ceo || "");
    setItems([makeItem(nextDate)]);
    setSelectedRowIds([]);
    setNotes("");
    setUnpaidAmount(0);
    setClientSearch("");
    setShowClientSearch(false);
  }, [clearSelectedClientInForm, companySettings]);

  const saveStatement = useCallback(() => {
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

    const existingIndex = savedStatements.findIndex(
      (item) => item.id === payload.id
    );

    const next =
      existingIndex >= 0
        ? savedStatements.map((item, index) =>
            index === existingIndex ? payload : item
          )
        : [payload, ...savedStatements];

    syncSavedStatements(next);
    alert("거래명세서가 저장되었습니다.");
  }, [
    normalizedItems,
    notes,
    receiver,
    receiverSigner,
    savedStatements,
    statementDate,
    statementId,
    statementNumber,
    supplier,
    supplierSigner,
    syncSavedStatements,
    totalAmount,
    totalSupplyAmount,
    totalTaxAmount,
    unpaidAmount,
    vatMode,
  ]);

  const loadStatement = useCallback((data: SavedStatement) => {
    const safeVatMode: VatMode = data.vatMode || "included";
    const safeDate = data.statementDate || todayString();

    statementDateRef.current = safeDate;
    vatModeRef.current = safeVatMode;

    const safeReceiver: ClientData = {
      companyName: data.receiver?.companyName || "",
      managerName: data.receiver?.managerName || "",
      phone: data.receiver?.phone || "",
      email: data.receiver?.email || "",
      address: data.receiver?.address || "",
      fax: data.receiver?.fax || "",
      businessNumber: data.receiver?.businessNumber || "",
      memo: data.receiver?.memo || "",
      id: data.receiver?.id,
    };

    const safeSupplier: SupplierData = {
      companyName: data.supplier?.companyName || "",
      ceoName: data.supplier?.ceoName || "",
      businessNumber: data.supplier?.businessNumber || "",
      address: data.supplier?.address || "",
      phone: data.supplier?.phone || "",
      fax: data.supplier?.fax || "",
    };

    const safeItems =
      Array.isArray(data.items) && data.items.length > 0
        ? data.items.map((item) =>
            sanitizeLoadedItem(item, safeVatMode, safeDate)
          )
        : [makeItem(safeDate)];

    setStatementId(data.id || crypto.randomUUID());
    setStatementNumber(data.statementNumber || makeStatementNumber(safeDate));
    setStatementDate(safeDate);
    setVatMode(safeVatMode);
    setReceiver(safeReceiver);
    setSupplier(safeSupplier);
    setItems(safeItems);
    setSelectedRowIds([]);
    setNotes(data.notes || "");
    setUnpaidAmount(parseNumber(data.unpaidAmount || 0));
    setReceiverSigner(data.receiverSigner || safeReceiver.managerName || "");
    setSupplierSigner(data.supplierSigner || safeSupplier.ceoName || "");
    setShowClientSearch(false);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const deleteStatement = useCallback(
    (id: string) => {
      const ok = window.confirm("이 거래명세서를 삭제하시겠습니까?");
      if (!ok) return;
      syncSavedStatements(savedStatements.filter((item) => item.id !== id));
    },
    [savedStatements, syncSavedStatements]
  );

  const setPageRef = useCallback((index: number, el: HTMLDivElement | null) => {
    pageRefs.current[index] = el;
  }, []);

  const renderStatementPageCanvases = useCallback(async () => {
    const nodes = pageRefs.current.filter(Boolean) as HTMLDivElement[];
    if (nodes.length === 0) {
      throw new Error("미리보기 페이지를 찾을 수 없습니다.");
    }

    const canvases = [];
    for (const node of nodes) {
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        width: EXPORT_PAGE_WIDTH,
        height: EXPORT_PAGE_HEIGHT,
        windowWidth: EXPORT_PAGE_WIDTH,
        windowHeight: EXPORT_PAGE_HEIGHT,
      });
      canvases.push(canvas);
    }
    return canvases;
  }, []);

  const handleSavePng = useCallback(async () => {
    const canvases = await renderStatementPageCanvases();
    canvases.forEach((canvas, index) => {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `${statementNumber || "statement"}_page_${index + 1}.png`;
      link.click();
    });
  }, [renderStatementPageCanvases, statementNumber]);

  const handleSaveJpg = useCallback(async () => {
    const canvases = await renderStatementPageCanvases();
    canvases.forEach((canvas, index) => {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/jpeg", 0.98);
      link.download = `${statementNumber || "statement"}_page_${index + 1}.jpg`;
      link.click();
    });
  }, [renderStatementPageCanvases, statementNumber]);

  const createPdfBlob = useCallback(async () => {
    const canvases = await renderStatementPageCanvases();
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = 210;
    const pageHeight = 297;

    canvases.forEach((canvas, index) => {
      if (index > 0) pdf.addPage();
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);
    });

    return pdf.output("blob");
  }, [renderStatementPageCanvases]);

  const handleSavePdf = useCallback(async () => {
    const blob = await createPdfBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${statementNumber || "statement"}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }, [createPdfBlob, statementNumber]);

  const handlePrint = useCallback(async () => {
    try {
      if (typeof window === "undefined") return;

      const canvases = await renderStatementPageCanvases();
      const imageUrls = canvases.map((canvas) => canvas.toDataURL("image/png"));

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";

      const html = `
        <!doctype html>
        <html lang="ko">
          <head>
            <meta charset="UTF-8" />
            <title>거래명세서 인쇄</title>
            <style>
              @page {
                size: A4 portrait;
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
                min-height: 297mm;
                margin: 0 auto;
                page-break-after: always;
                display: flex;
                align-items: flex-start;
                justify-content: center;
                background: #ffffff;
              }

              .page:last-child {
                page-break-after: auto;
              }

              img {
                width: 210mm;
                height: auto;
                display: block;
              }
            </style>
          </head>
          <body>
            ${imageUrls
              .map(
                (src) => `
                  <div class="page">
                    <img src="${src}" />
                  </div>
                `
              )
              .join("")}
          </body>
        </html>
      `;

      iframe.srcdoc = html;

      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (error) {
            console.error("인쇄 실패:", error);
            alert("인쇄 중 오류가 발생했습니다.");
          } finally {
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            }, 1500);
          }
        }, 700);
      };

      document.body.appendChild(iframe);
    } catch (error) {
      console.error("인쇄 실패:", error);
      alert("인쇄 중 오류가 발생했습니다.");
    }
  }, [renderStatementPageCanvases]);

  const handleSendEmail = useCallback(async () => {
    try {
      if (typeof window === "undefined") return;

      const subject = encodeURIComponent(
        `거래명세서 ${statementNumber || ""}`.trim()
      );

      const bodyLines = [
        "안녕하세요.",
        "",
        `거래명세서 번호: ${statementNumber || "-"}`,
        `작성일: ${statementDate || "-"}`,
        `거래처: ${receiver.companyName || "-"}`,
        "",
        "거래명세서를 확인해주세요.",
      ];

      const body = encodeURIComponent(bodyLines.join("\n"));
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    } catch (error) {
      console.error("이메일 발송 실패:", error);
      alert("이메일 발송 중 오류가 발생했습니다.");
    }
  }, [receiver.companyName, statementDate, statementNumber]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#07090c] px-4 py-4 xl:px-5 xl:py-5">
      <div className="mx-auto grid max-w-[2520px] grid-cols-1 gap-5 xl:grid-cols-[1180px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-[30px] border border-[#26313b] bg-[linear-gradient(135deg,#1d2127_0%,#161b22_100%)] px-6 py-6 shadow-[0_20px_40px_rgba(0,0,0,0.34)] ring-1 ring-[rgba(255,255,255,0.02)]">
            <h1 className="text-[29px] font-light tracking-tight text-[#38BDF8]">
  거래명세서
</h1>
            <p className="mt-2 text-[13px] leading-6 text-[#a9b4bf]">
              기존 거래명세서 문서 구조와 출력 엔진은 유지하면서, 좌측 작업 영역만 Dashboard/Estimate 기준의 다크 블루톤으로 정리한 화면
            </p>
          </div>

          <div className={pageCardClass}>
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className={titleClass}>거래처 선택</h2>
                <p className={descClass}>
                  저장된 거래처를 선택하면 공급받는자 정보에 자동 반영됩니다.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowClientSearch((prev) => !prev)}
                  className={blueOutlineButtonClass}
                >
                  {showClientSearch ? "거래처 검색 닫기" : "거래처 검색 열기"}
                </button>

                <button
                  type="button"
                  onClick={clearSelectedClientInForm}
                  className={blueOutlineButtonClass}
                >
                  거래처 초기화
                </button>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#27313b] bg-[#0f141a] px-4 py-4">
              {receiver.companyName ? (
                <div className="grid grid-cols-1 gap-2 text-[13px] text-[#dce6ef] md:grid-cols-2">
                  <div>
                    <span className="font-semibold text-[#f7f8fb]">업체명:</span>{" "}
                    {receiver.companyName}
                  </div>
                  <div>
                    <span className="font-semibold text-[#f7f8fb]">담당자:</span>{" "}
                    {receiver.managerName || "-"}
                  </div>
                  <div>
                    <span className="font-semibold text-[#f7f8fb]">전화:</span>{" "}
                    {receiver.phone || "-"}
                  </div>
                  <div>
                    <span className="font-semibold text-[#f7f8fb]">이메일:</span>{" "}
                    {receiver.email || "-"}
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
                    className={inputClass}
                  />
                </div>

                <div className="max-h-[320px] overflow-y-auto p-4">
                  {filteredClients.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-[#34404b] p-6 text-center text-[13px] text-[#8391a0]">
                      {clients.length === 0
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
                              className={blueOutlineButtonClass}
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

          <div className={pageCardClass}>
            <h2 className={titleClass}>기본 정보</h2>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-[12px] font-semibold text-[#d8e2eb]">
                  문서번호
                </span>
                <input
                  value={statementNumber}
                  onChange={(e) => setStatementNumber(e.target.value)}
                  className={inputClass}
                  placeholder="WB-ST-20260421-0001"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[12px] font-semibold text-[#d8e2eb]">
                  작성일
                </span>
                <input
                  type="date"
                  value={statementDate}
                  onChange={(e) => handleStatementDateChange(e.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[12px] font-semibold text-[#d8e2eb]">
                  VAT 방식
                </span>
                <select
                  value={vatMode}
                  onChange={(e) => handleVatModeChange(e.target.value as VatMode)}
                  className={inputClass}
                >
                  <option value="included">부가세 포함</option>
                  <option value="separate">부가세 별도</option>
                </select>
              </label>
            </div>
          </div>

          <div className={pageCardClass}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className={titleClass}>품목 정보</h2>
                <button
                  type="button"
                  onClick={resetItemsOnly}
                  className={miniChipClass}
                >
                  RESET
                </button>
              </div>

              <button
                type="button"
                onClick={addItem}
                className={primaryButtonClass}
              >
                행 추가
              </button>
            </div>

            <ItemTable
              items={items}
              selectedRowIds={selectedRowIds}
              vatMode={vatMode}
              onToggleSelect={toggleRowSelect}
              onSelectAll={selectAllRows}
              onClearSelection={clearSelection}
              onDeleteSelected={deleteSelectedRows}
              onDuplicateSelected={duplicateSelectedRows}
              onChange={handleItemChange}
              onRemove={removeItem}
              onDuplicate={duplicateItem}
              registerInput={registerInput}
              onCellNavigate={onCellNavigate}
              onPasteRows={handlePasteRows}
            />
          </div>

          <div className={pageCardClass}>
            <h2 className={titleClass}>공급받는자 정보</h2>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[12px] font-semibold text-[#d8e2eb]">
                  상호명
                </span>
                <input
                  value={receiver.companyName}
                  onChange={(e) =>
                    handleReceiverChange("companyName", e.target.value)
                  }
                  className={inputClass}
                  placeholder="거래처명"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[12px] font-semibold text-[#d8e2eb]">
                  담당자
                </span>
                <input
                  value={receiver.managerName}
                  onChange={(e) =>
                    handleReceiverChange("managerName", e.target.value)
                  }
                  className={inputClass}
                  placeholder="담당자명"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[12px] font-semibold text-[#d8e2eb]">
                  전화번호
                </span>
                <input
                  value={receiver.phone}
                  onChange={(e) => handleReceiverChange("phone", e.target.value)}
                  className={inputClass}
                  placeholder="연락처"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[12px] font-semibold text-[#d8e2eb]">
                  이메일
                </span>
                <input
                  value={receiver.email}
                  onChange={(e) => handleReceiverChange("email", e.target.value)}
                  className={inputClass}
                  placeholder="이메일"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-[12px] font-semibold text-[#d8e2eb]">
                  주소
                </span>
                <input
                  value={receiver.address || ""}
                  onChange={(e) =>
                    handleReceiverChange("address", e.target.value)
                  }
                  className={inputClass}
                  placeholder="주소"
                />
              </label>
            </div>
          </div>

          <div className={pageCardClass}>
            <h2 className={titleClass}>공급자 정보</h2>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[12px] font-semibold text-[#d8e2eb]">
                  상호명
                </span>
                <input
                  value={supplier.companyName}
                  onChange={(e) =>
                    handleSupplierChange("companyName", e.target.value)
                  }
                  className={inputClass}
                  placeholder="회사명"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[12px] font-semibold text-[#d8e2eb]">
                  대표자
                </span>
                <input
                  value={supplier.ceoName}
                  onChange={(e) =>
                    handleSupplierChange("ceoName", e.target.value)
                  }
                  className={inputClass}
                  placeholder="대표자명"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[12px] font-semibold text-[#d8e2eb]">
                  사업자번호
                </span>
                <input
                  value={supplier.businessNumber}
                  onChange={(e) =>
                    handleSupplierChange("businessNumber", e.target.value)
                  }
                  className={inputClass}
                  placeholder="사업자번호"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[12px] font-semibold text-[#d8e2eb]">
                  전화번호
                </span>
                <input
                  value={supplier.phone}
                  onChange={(e) => handleSupplierChange("phone", e.target.value)}
                  className={inputClass}
                  placeholder="전화번호"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[12px] font-semibold text-[#d8e2eb]">
                  팩스
                </span>
                <input
                  value={supplier.fax}
                  onChange={(e) => handleSupplierChange("fax", e.target.value)}
                  className={inputClass}
                  placeholder="팩스번호"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-[12px] font-semibold text-[#d8e2eb]">
                  주소
                </span>
                <input
                  value={supplier.address}
                  onChange={(e) => handleSupplierChange("address", e.target.value)}
                  className={inputClass}
                  placeholder="사업장 주소"
                />
              </label>
            </div>
          </div>

          <div className={pageCardClass}>
            <h2 className={titleClass}>추가 정보</h2>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-[12px] font-semibold text-[#d8e2eb]">
                  공급받는자 서명
                </span>
                <input
                  value={receiverSigner}
                  onChange={(e) => setReceiverSigner(e.target.value)}
                  className={inputClass}
                  placeholder="인수자명"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[12px] font-semibold text-[#d8e2eb]">
                  공급자 서명
                </span>
                <input
                  value={supplierSigner}
                  onChange={(e) => setSupplierSigner(e.target.value)}
                  className={inputClass}
                  placeholder="납품자명"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[12px] font-semibold text-[#d8e2eb]">
                  미수금
                </span>
                <input
                  value={unpaidAmount === 0 ? "" : String(unpaidAmount)}
                  onChange={(e) => setUnpaidAmount(parseNumber(e.target.value))}
                  className={inputClass}
                  placeholder="0"
                />
              </label>

              <label className="block md:col-span-3">
                <span className="mb-2 block text-[12px] font-semibold text-[#d8e2eb]">
                  비고
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={textareaClass}
                  rows={4}
                  placeholder="거래명세서 메모"
                />
              </label>
            </div>
          </div>

          <div className={pageCardClass}>
            <h2 className={titleClass}>자동 계산 결과</h2>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-[22px] border border-[#27313b] bg-[#0f141a] p-4">
                <div className="text-[12px] font-semibold tracking-[0.08em] text-[#8d9aaa]">
                  공급가액
                </div>
                <div className="mt-2 text-[24px] font-bold tracking-[-0.03em] text-[#f7f8fb]">
                  {formatNumber(totalSupplyAmount)}
                </div>
              </div>

              <div className="rounded-[22px] border border-[#27313b] bg-[#0f141a] p-4">
                <div className="text-[12px] font-semibold tracking-[0.08em] text-[#8d9aaa]">
                  세액
                </div>
                <div className="mt-2 text-[24px] font-bold tracking-[-0.03em] text-[#f7f8fb]">
                  {formatNumber(totalTaxAmount)}
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
          </div>

          <div className={pageCardClass}>
            <h2 className={titleClass}>저장 / 출력</h2>

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={handleSavePng} className={blueOutlineButtonClass}>
                PNG 저장
              </button>
              <button type="button" onClick={handleSaveJpg} className={blueOutlineButtonClass}>
                JPG 저장
              </button>
              <button type="button" onClick={handleSavePdf} className={blueOutlineButtonClass}>
                PDF 저장
              </button>
              <button type="button" onClick={handlePrint} className={blueOutlineButtonClass}>
                인쇄
              </button>
              <button type="button" onClick={handleSendEmail} className={blueOutlineButtonClass}>
                메일 발송
              </button>
            </div>

            <button
              type="button"
              onClick={saveStatement}
              className="mt-3 inline-flex h-[46px] w-full items-center justify-center rounded-2xl border border-[#22b7ff] bg-[#1aa7f7] px-4 text-[13px] font-bold text-white transition hover:bg-[#2eb5ff] hover:shadow-[0_0_18px_rgba(34,183,255,0.18)]"
            >
              거래명세서 저장
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="mt-3 inline-flex h-[42px] w-full items-center justify-center rounded-2xl border border-[#2b82b6] bg-[#0d1319] px-4 text-[13px] font-semibold text-[#6fd6ff] transition hover:border-[#22b7ff] hover:text-white"
            >
              새 문서 작성
            </button>
          </div>

          <div className={pageCardClass}>
            <h2 className={titleClass}>저장된 거래명세서 목록</h2>

            {savedStatements.length === 0 ? (
              <div className="mt-4 rounded-[22px] border border-dashed border-[#34404b] p-6 text-[13px] text-[#8391a0]">
                저장된 거래명세서가 없습니다.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {savedStatements.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[22px] border border-[#27313b] bg-[#0f141a] p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-[14px] font-semibold text-[#f7f8fb]">
                          {item.statementNumber}
                        </div>
                        <div className="mt-1 text-[13px] text-[#a9b4bf]">
                          거래처: {item.receiver.companyName || "-"} / 총금액:{" "}
                          {formatNumber(item.totalAmount)}원 / 저장일:{" "}
                          {item.createdAt.slice(0, 10)}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => loadStatement(item)}
                          className={blueOutlineButtonClass}
                        >
                          불러오기
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteStatement(item.id)}
                          className={blueOutlineButtonClass}
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
          <div className="rounded-[30px] border border-[#26313b] bg-[#171c22] px-1 py-1 shadow-[0_18px_34px_rgba(0,0,0,0.28)] ring-1 ring-[rgba(255,255,255,0.02)]">
            <div className="mb-4">
              <h2 className={titleClass}>거래명세서 미리보기</h2>
              <p className={descClass}>
                기존 파랑/빨강 2분할 A4 미리보기 구조를 유지한 상태로 우측에서 실시간 확인합니다.
              </p>
            </div>

            <div className="max-h-[calc(100vh-120px)] overflow-auto rounded-[26px] border border-[#27313b] bg-[#0b0f14] p-2">
              <div className="space-y-2">
                {previewPages.map((pageRows, index) => (
                  <div
                    key={`preview-page-${index}`}
                    className="mx-auto w-[980px] scale-[0.99] origin-top"
                  >
                    <StatementPagePreview
                      pageIndex={index}
                      pageRows={pageRows}
                      receiver={receiver}
                      supplier={supplier}
                      vatMode={vatMode}
                      totalAmount={totalAmount}
                      unpaidAmount={unpaidAmount}
                      receiverSigner={receiverSigner}
                      supplierSigner={supplierSigner}
                      notes={notes}
                      companySettings={companySettings}
                      setPageRef={setPageRef}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}