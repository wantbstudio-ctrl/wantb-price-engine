"use client";

import {
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
  ceoName?: string;
  businessNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
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
  clients: "wantb-clients",
  companySettings: "wantb-company-settings",
  estimateDraft: "estimate-draft",
};

const PREVIEW_ROW_COUNT = 7;
const EXPORT_PAGE_WIDTH = 794;
const EXPORT_PAGE_HEIGHT = 1123;

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

  const unitPrice = Math.round(safeSupply / safeQty);

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
    dateYear: year,
    dateMonth: month,
    dateDay: day,
    productName: "",
    spec: "",
    unit: "EA",
    quantity: 1,
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
    dateYear: item.dateYear || year,
    dateMonth: item.dateMonth || month,
    dateDay: item.dateDay || day,
    productName: item.productName || "",
    spec: item.spec || "",
    unit: item.unit || "EA",
    quantity: normalized.quantity,
    unitPrice: normalized.unitPrice,
    supplyAmount: normalized.supplyAmount,
    taxAmount: normalized.taxAmount,
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

function chunkPreviewRows(items: StatementItem[]) {
  const pages: StatementItem[][] = [];

  for (let i = 0; i < items.length; i += PREVIEW_ROW_COUNT) {
    pages.push(items.slice(i, i + PREVIEW_ROW_COUNT));
  }

  if (pages.length === 0) {
    pages.push([]);
  }

  return pages.map((page) => makePreviewRows(page));
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
        unit: (unit || "EA").trim(),
        quantity: normalized.quantity,
        unitPrice: normalized.unitPrice,
        supplyAmount: normalized.supplyAmount,
      },
      vatMode,
      statementDate
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

type LabelValueRowProps = {
  color: string;
  label: string;
  value?: string;
  last?: boolean;
};

function ReceiverInfoRow({
  color,
  label,
  value = "",
  last = false,
}: LabelValueRowProps) {
  return (
    <div className="grid grid-cols-[118px_1fr]">
      <div
        className="flex h-[38px] items-center justify-center border-r text-center text-[12px] font-semibold whitespace-pre-line leading-[14px]"
        style={{
          color,
          borderRight: `1px solid ${color}`,
          borderBottom: last ? "none" : `1px solid ${color}`,
        }}
      >
        {label}
      </div>
      <div
        className="flex h-[38px] items-center px-3 text-[12px] text-[#222]"
        style={{
          borderBottom: last ? "none" : `1px solid ${color}`,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SupplierSingleRow({
  color,
  label,
  value = "",
  last = false,
}: LabelValueRowProps) {
  return (
    <div className="grid grid-cols-[108px_1fr]">
      <div
        className="flex h-[38px] items-center justify-center border-r text-center text-[12px] font-semibold whitespace-pre-line leading-[14px]"
        style={{
          color,
          borderRight: `1px solid ${color}`,
          borderBottom: last ? "none" : `1px solid ${color}`,
        }}
      >
        {label}
      </div>
      <div
        className="flex h-[38px] items-center px-3 text-[12px] text-[#222]"
        style={{
          borderBottom: last ? "none" : `1px solid ${color}`,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SupplierPairRow({
  color,
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
}: {
  color: string;
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
}) {
  return (
    <div className="grid grid-cols-[108px_1fr_56px_1fr]">
      <div
        className="flex h-[38px] items-center justify-center text-center text-[12px] font-semibold whitespace-pre-line leading-[14px]"
        style={{
          color,
          borderRight: `1px solid ${color}`,
          borderBottom: `1px solid ${color}`,
        }}
      >
        {leftLabel}
      </div>
      <div
        className="flex h-[38px] items-center px-3 text-[12px] text-[#222]"
        style={{
          borderBottom: `1px solid ${color}`,
        }}
      >
        {leftValue}
      </div>
      <div
        className="flex h-[38px] items-center justify-center text-center text-[12px] font-semibold"
        style={{
          color,
          borderLeft: `1px solid ${color}`,
          borderRight: `1px solid ${color}`,
          borderBottom: `1px solid ${color}`,
        }}
      >
        {rightLabel}
      </div>
      <div
        className="flex h-[38px] items-center px-3 text-[12px] text-[#222]"
        style={{
          borderBottom: `1px solid ${color}`,
        }}
      >
        {rightValue}
      </div>
    </div>
  );
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

const SlipPreview = memo(function SlipPreview({
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
    <div className="border-[1.5px] bg-white" style={{ borderColor: color }}>
      <div
        className="flex h-[50px] items-center justify-center border-b-[1.5px]"
        style={{ borderColor: color }}
      >
        <div className="flex items-end gap-2">
          <span
            className="text-[26px] font-bold tracking-[6px]"
            style={{ color }}
          >
            거 래 명 세 서
          </span>
          <span className="mb-[2px] text-[13px] font-semibold" style={{ color }}>
            ({titleNote})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[28px_1fr_28px_1.12fr]">
        <div
          className="flex items-center justify-center border-r border-b-[1.5px] text-[12px] font-semibold [writing-mode:vertical-rl]"
          style={{ borderColor: color, color }}
        >
          공급받는자
        </div>

        <div
          className="border-r-[1.5px] border-b-[1.5px]"
          style={{ borderColor: color }}
        >
          <ReceiverInfoRow
            color={color}
            label={"상 호\n(법인명)"}
            value={receiver.companyName || ""}
          />
          <ReceiverInfoRow
            color={color}
            label="등록번호"
            value={receiver.businessNumber || ""}
          />
          <ReceiverInfoRow
            color={color}
            label={"사업장\n주 소"}
            value={receiver.address || ""}
          />
          <ReceiverInfoRow
            color={color}
            label="전화번호"
            value={receiver.phone || ""}
          />
          <ReceiverInfoRow color={color} label="팩스" value={receiver.fax || ""} />
          <ReceiverInfoRow
            color={color}
            label={totalLabel}
            value={formatNumber(totalAmount)}
            last
          />
        </div>

        <div
          className="flex items-center justify-center border-r border-b-[1.5px] text-[12px] font-semibold [writing-mode:vertical-rl]"
          style={{ borderColor: color, color }}
        >
          공급자
        </div>

        <div className="border-b-[1.5px]" style={{ borderColor: color }}>
          <SupplierSingleRow
            color={color}
            label="등록번호"
            value={supplier.businessNumber || ""}
          />

          <SupplierPairRow
            color={color}
            leftLabel={"상 호\n(법인명)"}
            leftValue={supplier.companyName || ""}
            rightLabel="성 명"
            rightValue={supplier.ceoName || ""}
          />

          <SupplierSingleRow
            color={color}
            label={"사업장\n주 소"}
            value={supplier.address || ""}
          />

          <div className="grid grid-cols-[108px_1fr_56px_1fr]">
            <div
              className="flex h-[40px] items-center justify-center text-center text-[12px] font-semibold"
              style={{
                color,
                borderRight: `1px solid ${color}`,
                borderBottom: `1px solid ${color}`,
              }}
            >
              전 화
            </div>
            <div
              className="flex h-[40px] items-center px-3 text-[14px] text-[#222]"
              style={{
                borderRight: `1px solid ${color}`,
                borderBottom: `1px solid ${color}`,
              }}
            >
              {supplier.phone || ""}
            </div>
            <div
              className="flex h-[40px] items-center justify-center text-center text-[12px] font-semibold"
              style={{
                color,
                borderRight: `1px solid ${color}`,
                borderBottom: `1px solid ${color}`,
              }}
            >
              팩 스
            </div>
            <div
              className="flex h-[40px] items-center px-3 text-[14px] text-[#222]"
              style={{
                borderBottom: `1px solid ${color}`,
              }}
            >
              {supplier.fax || ""}
            </div>
          </div>

          <div className="grid grid-cols-[108px_1fr]">
            <div
              className="flex h-[34px] items-center justify-center border-r text-center text-[12px] font-semibold"
              style={{
                color,
                borderRight: `1px solid ${color}`,
                borderBottom: `1px solid ${color}`,
              }}
            >
              VAT
            </div>
            <div
              className="flex h-[34px] items-center px-3 text-[12px] text-[#222]"
              style={{
                borderBottom: `1px solid ${color}`,
              }}
            >
              {vatMode === "included" ? "포함" : "별도"}
            </div>
          </div>

          {companySettings.stampDataUrl ? (
            <div className="relative h-0">
              <img
                src={companySettings.stampDataUrl}
                alt="stamp"
                className="absolute right-3 top-[-103px] h-[28px] object-contain opacity-90"
              />
            </div>
          ) : null}
        </div>
      </div>

      <div
        className="grid grid-cols-[28px_28px_28px_2.1fr_0.95fr_0.8fr_0.9fr_1.1fr_1.15fr_1.05fr] border-b"
        style={{ borderColor: color, color }}
      >
        <div
          className="flex h-[28px] items-center justify-center border-r text-[11px] font-semibold"
          style={{ borderColor: color }}
        >
          년
        </div>
        <div
          className="flex h-[28px] items-center justify-center border-r text-[11px] font-semibold"
          style={{ borderColor: color }}
        >
          월
        </div>
        <div
          className="flex h-[28px] items-center justify-center border-r text-[11px] font-semibold"
          style={{ borderColor: color }}
        >
          일
        </div>
        <div
          className="flex h-[28px] items-center justify-center border-r text-[11px] font-semibold"
          style={{ borderColor: color }}
        >
          품 목
        </div>
        <div
          className="flex h-[28px] items-center justify-center border-r text-[11px] font-semibold"
          style={{ borderColor: color }}
        >
          규격
        </div>
        <div
          className="flex h-[28px] items-center justify-center border-r text-[11px] font-semibold"
          style={{ borderColor: color }}
        >
          단위
        </div>
        <div
          className="flex h-[28px] items-center justify-center border-r text-[11px] font-semibold"
          style={{ borderColor: color }}
        >
          수량
        </div>
        <div
          className="flex h-[28px] items-center justify-center border-r text-[11px] font-semibold"
          style={{ borderColor: color }}
        >
          단가
        </div>
        <div
          className="flex h-[28px] items-center justify-center border-r text-[11px] font-semibold"
          style={{ borderColor: color }}
        >
          공급가액
        </div>
        <div className="flex h-[28px] items-center justify-center text-[11px] font-semibold">
          세액
        </div>
      </div>

      {previewRows.map((row, idx) => (
        <div
          key={`${titleNote}-${row.id}-${idx}`}
          className="grid grid-cols-[28px_28px_28px_2.1fr_0.95fr_0.8fr_0.9fr_1.1fr_1.15fr_1.05fr] border-b text-[#222]"
          style={{ borderColor: color }}
        >
          <div
            className="flex h-[24px] items-center justify-center border-r text-[10px]"
            style={{ borderColor: color }}
          >
            {row.dateYear ? row.dateYear.slice(-2) : ""}
          </div>
          <div
            className="flex h-[24px] items-center justify-center border-r text-[10px]"
            style={{ borderColor: color }}
          >
            {row.dateMonth || ""}
          </div>
          <div
            className="flex h-[24px] items-center justify-center border-r text-[10px]"
            style={{ borderColor: color }}
          >
            {row.dateDay || ""}
          </div>
          <div
            className="flex h-[24px] items-center border-r px-2 text-[10px]"
            style={{ borderColor: color }}
          >
            {row.productName || ""}
          </div>
          <div
            className="flex h-[24px] items-center border-r px-2 text-[10px]"
            style={{ borderColor: color }}
          >
            {row.spec || ""}
          </div>
          <div
            className="flex h-[24px] items-center justify-center border-r px-1 text-[10px]"
            style={{ borderColor: color }}
          >
            {row.unit || ""}
          </div>
          <div
            className="flex h-[24px] items-center justify-end border-r px-2 text-[10px]"
            style={{ borderColor: color }}
          >
            {row.quantity ? formatNumber(row.quantity) : ""}
          </div>
          <div
            className="flex h-[24px] items-center justify-end border-r px-2 text-[10px]"
            style={{ borderColor: color }}
          >
            {row.unitPrice ? formatNumber(row.unitPrice) : ""}
          </div>
          <div
            className="flex h-[24px] items-center justify-end border-r px-2 text-[10px]"
            style={{ borderColor: color }}
          >
            {row.supplyAmount ? formatNumber(row.supplyAmount) : ""}
          </div>
          <div className="flex h-[24px] items-center justify-end px-2 text-[10px]">
            {row.taxAmount ? formatNumber(row.taxAmount) : ""}
          </div>
        </div>
      ))}

      <div
        className="grid grid-cols-[1fr_1fr_1.1fr] border-b"
        style={{ borderColor: color }}
      >
        <div
          className="flex h-[30px] items-center justify-between border-r px-3 text-[12px] font-semibold"
          style={{ borderColor: color, color }}
        >
          <span>공급가액</span>
          <span className="text-[#222]">{formatNumber(totalSupplyAmount)}</span>
        </div>
        <div
          className="flex h-[30px] items-center justify-between border-r px-3 text-[12px] font-semibold"
          style={{ borderColor: color, color }}
        >
          <span>세액</span>
          <span className="text-[#222]">{formatNumber(totalTaxAmount)}</span>
        </div>
        <div
          className="flex h-[30px] items-center justify-between px-3 text-[12px] font-semibold"
          style={{ color }}
        >
          <span>
            {vatMode === "included" ? "총합계(VAT포함)" : "총합계(VAT별도)"}
          </span>
          <span className="text-[#222]">{formatNumber(totalAmount)}</span>
        </div>
      </div>

      <div
        className="grid grid-cols-[1fr_0.8fr_1fr_0.8fr_0.95fr_1.15fr]"
        style={{ color }}
      >
        <div
          className="flex h-[32px] items-center justify-center border-r border-t text-[12px] font-semibold"
          style={{ borderColor: color }}
        >
          인 수 자
        </div>
        <div
          className="flex h-[32px] items-center justify-center border-r border-t px-2 text-[12px] text-[#222]"
          style={{ borderColor: color }}
        >
          {receiverSigner}
        </div>
        <div
          className="flex h-[32px] items-center justify-center border-r border-t text-[12px] font-semibold"
          style={{ borderColor: color }}
        >
          납 품 자
        </div>
        <div
          className="flex h-[32px] items-center justify-center border-r border-t px-2 text-[12px] text-[#222]"
          style={{ borderColor: color }}
        >
          {supplierSigner}
        </div>
        <div
          className="flex h-[32px] items-center justify-center border-r border-t text-[12px] font-semibold"
          style={{ borderColor: color }}
        >
          미 수 금
        </div>
        <div
          className="flex h-[32px] items-center justify-end border-t px-3 text-[12px] text-[#222]"
          style={{ borderColor: color }}
        >
          {formatNumber(unpaidAmount)}
        </div>
      </div>
    </div>
  );
});

type ItemRowProps = {
  item: StatementItem;
  index: number;
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

const ItemRow = memo(
  function ItemRow({
    item,
    index,
    isSelected,
    onToggleSelect,
    onChange,
    onRemove,
    onDuplicate,
    registerInput,
    onCellNavigate,
  }: ItemRowProps) {
    const handleTextChange = useCallback(
      (key: keyof StatementItem, value: string) => {
        onChange(item.id, key, value);
      },
      [item.id, onChange]
    );

    const handleNumberChange = useCallback(
      (key: keyof StatementItem, value: number) => {
        onChange(item.id, key, value);
      },
      [item.id, onChange]
    );

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

    const handleRemove = useCallback(() => {
      onRemove(item.id);
    }, [item.id, onRemove]);

    const handleDuplicate = useCallback(() => {
      onDuplicate(item.id);
    }, [item.id, onDuplicate]);

    const handleToggleSelect = useCallback(() => {
      onToggleSelect(item.id);
    }, [item.id, onToggleSelect]);

    return (
      <div
        className={`grid grid-cols-[54px_64px_64px_64px_minmax(220px,2.1fr)_minmax(130px,1fr)_90px_100px_140px_150px_140px_140px] border-b text-[13px] ${
          isSelected ? "bg-gray-100" : "bg-white"
        }`}
      >
        <div className="border-r border-gray-200 p-2">
          <button
            type="button"
            onClick={handleToggleSelect}
            className={`flex h-10 w-full items-center justify-center rounded-xl border text-[12px] font-semibold ${
              isSelected
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-300 bg-white text-gray-700"
            }`}
          >
            선택
          </button>
        </div>

        <div className="border-r border-gray-200 p-2">
          <input
            ref={(el) => registerInput(item.id, "dateYear", el)}
            value={item.dateYear}
            onChange={(e) => handleTextChange("dateYear", e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "dateYear")}
            className="h-10 w-full rounded-xl border border-gray-300 bg-white px-2 text-center outline-none focus:border-gray-900"
          />
        </div>

        <div className="border-r border-gray-200 p-2">
          <input
            ref={(el) => registerInput(item.id, "dateMonth", el)}
            value={item.dateMonth}
            onChange={(e) => handleTextChange("dateMonth", e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "dateMonth")}
            className="h-10 w-full rounded-xl border border-gray-300 bg-white px-2 text-center outline-none focus:border-gray-900"
          />
        </div>

        <div className="border-r border-gray-200 p-2">
          <input
            ref={(el) => registerInput(item.id, "dateDay", el)}
            value={item.dateDay}
            onChange={(e) => handleTextChange("dateDay", e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "dateDay")}
            className="h-10 w-full rounded-xl border border-gray-300 bg-white px-2 text-center outline-none focus:border-gray-900"
          />
        </div>

        <div className="border-r border-gray-200 p-2">
          <input
            ref={(el) => registerInput(item.id, "productName", el)}
            value={item.productName}
            onChange={(e) => handleTextChange("productName", e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "productName")}
            placeholder={`품목 ${index + 1}`}
            className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 outline-none focus:border-gray-900"
          />
        </div>

        <div className="border-r border-gray-200 p-2">
          <input
            ref={(el) => registerInput(item.id, "spec", el)}
            value={item.spec}
            onChange={(e) => handleTextChange("spec", e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "spec")}
            placeholder="규격"
            className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 outline-none focus:border-gray-900"
          />
        </div>

        <div className="border-r border-gray-200 p-2">
          <input
            ref={(el) => registerInput(item.id, "unit", el)}
            value={item.unit}
            onChange={(e) => handleTextChange("unit", e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "unit")}
            className="h-10 w-full rounded-xl border border-gray-300 bg-white px-2 text-center outline-none focus:border-gray-900"
          />
        </div>

        <div className="border-r border-gray-200 p-2">
          <input
            ref={(el) => registerInput(item.id, "quantity", el)}
            type="number"
            value={item.quantity === 0 ? "" : item.quantity}
            onFocus={(e) => {
              if (item.quantity === 0) e.target.value = "";
            }}
            onBlur={(e) => {
              if (e.target.value === "") {
                handleNumberChange("quantity", 1);
              }
            }}
            onChange={(e) =>
              handleNumberChange("quantity", Number(e.target.value || 1))
            }
            onKeyDown={(e) => handleKeyDown(e, "quantity")}
            className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-right outline-none focus:border-gray-900"
          />
        </div>

        <div className="border-r border-gray-200 p-2">
          <input
            ref={(el) => registerInput(item.id, "unitPrice", el)}
            type="number"
            value={item.unitPrice === 0 ? "" : item.unitPrice}
            onFocus={(e) => {
              if (item.unitPrice === 0) e.target.value = "";
            }}
            onBlur={(e) => {
              if (e.target.value === "") {
                handleNumberChange("unitPrice", 0);
              }
            }}
            onChange={(e) =>
              handleNumberChange("unitPrice", Number(e.target.value || 0))
            }
            onKeyDown={(e) => handleKeyDown(e, "unitPrice")}
            className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-right outline-none focus:border-gray-900"
          />
        </div>

        <div className="border-r border-gray-200 p-2">
          <input
            ref={(el) => registerInput(item.id, "supplyAmount", el)}
            type="number"
            value={item.supplyAmount === 0 ? "" : item.supplyAmount}
            onFocus={(e) => {
              if (item.supplyAmount === 0) e.target.value = "";
            }}
            onBlur={(e) => {
              if (e.target.value === "") {
                handleNumberChange("supplyAmount", 0);
              }
            }}
            onChange={(e) =>
              handleNumberChange("supplyAmount", Number(e.target.value || 0))
            }
            onKeyDown={(e) => handleKeyDown(e, "supplyAmount")}
            className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-right outline-none focus:border-gray-900"
          />
        </div>

        <div className="border-r border-gray-200 p-2">
          <div className="flex h-10 items-center justify-end rounded-xl border border-gray-200 bg-gray-100 px-3 text-[13px] text-gray-700">
            {formatNumber(item.taxAmount)}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 p-2">
          <button
            onClick={handleDuplicate}
            className="rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-[12px] font-semibold text-gray-700"
          >
            복제
          </button>
          <button
            onClick={handleRemove}
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600"
          >
            삭제
          </button>
        </div>
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.item === next.item &&
      prev.index === next.index &&
      prev.isSelected === next.isSelected &&
      prev.onToggleSelect === next.onToggleSelect &&
      prev.onChange === next.onChange &&
      prev.onRemove === next.onRemove &&
      prev.onDuplicate === next.onDuplicate &&
      prev.registerInput === next.registerInput &&
      prev.onCellNavigate === next.onCellNavigate
    );
  }
);

type ItemTableProps = {
  items: StatementItem[];
  selectedRowIds: string[];
  vatMode: VatMode;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  onMoveSelectedUp: () => void;
  onMoveSelectedDown: () => void;
  onChange: (
    id: string,
    key: keyof StatementItem,
    value: string | number
  ) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onAdd: () => void;
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

const ItemTable = memo(function ItemTable({
  items,
  selectedRowIds,
  vatMode,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onDeleteSelected,
  onDuplicateSelected,
  onMoveSelectedUp,
  onMoveSelectedDown,
  onChange,
  onRemove,
  onDuplicate,
  onAdd,
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
      className="rounded-[24px] border border-gray-200 bg-[#fbfbfc]"
      onPaste={handlePaste}
    >
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-gray-900">품목 정보</h2>
            <p className="mt-1 text-[12px] text-gray-500">
              단가 또는 공급가액 중 편한 방식으로 입력할 수 있습니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={onSelectAll}
              className={`rounded-2xl border px-4 py-2 text-[13px] font-medium ${
                allSelected
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-300 bg-white text-gray-800"
              }`}
            >
              전체 선택
            </button>
            <button
              onClick={onClearSelection}
              className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-[13px] font-medium text-gray-800"
            >
              선택 해제
            </button>
            <button
              onClick={onDeleteSelected}
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-[13px] font-medium text-red-600"
            >
              선택 행 삭제
            </button>
            <button
              onClick={onDuplicateSelected}
              className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-[13px] font-medium text-gray-800"
            >
              선택 복제
            </button>
            <button
              onClick={onMoveSelectedUp}
              className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-[13px] font-medium text-gray-800"
            >
              ▲ 위로
            </button>
            <button
              onClick={onMoveSelectedDown}
              className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-[13px] font-medium text-gray-800"
            >
              ▼ 아래로
            </button>
            <button
              onClick={onAdd}
              className="rounded-2xl bg-gray-900 px-4 py-2 text-[13px] font-medium text-white"
            >
              행 추가
            </button>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[12px] text-gray-600">
          현재 선택된 행: <span className="font-semibold">{selectedRowIds.length}</span>개
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1606px]">
          <div className="grid grid-cols-[54px_64px_64px_64px_minmax(220px,2.1fr)_minmax(130px,1fr)_90px_100px_140px_150px_140px_140px] border-b border-gray-200 bg-[#f3f5f8] text-[12px] font-semibold text-gray-700">
            <div className="flex h-11 items-center justify-center border-r border-gray-200">
              선택
            </div>
            <div className="flex h-11 items-center justify-center border-r border-gray-200">
              년
            </div>
            <div className="flex h-11 items-center justify-center border-r border-gray-200">
              월
            </div>
            <div className="flex h-11 items-center justify-center border-r border-gray-200">
              일
            </div>
            <div className="flex h-11 items-center border-r border-gray-200 px-3">
              품목
            </div>
            <div className="flex h-11 items-center border-r border-gray-200 px-3">
              규격
            </div>
            <div className="flex h-11 items-center justify-center border-r border-gray-200">
              단위
            </div>
            <div className="flex h-11 items-center justify-center border-r border-gray-200">
              수량
            </div>
            <div className="flex h-11 items-center justify-center border-r border-gray-200">
              {vatMode === "included" ? "단가(VAT포함)" : "단가(VAT별도)"}
            </div>
            <div className="flex h-11 items-center justify-center border-r border-gray-200">
              공급가액
            </div>
            <div className="flex h-11 items-center justify-center border-r border-gray-200">
              세액
            </div>
            <div className="flex h-11 items-center justify-center">작업</div>
          </div>

          <div className="max-h-[540px] overflow-y-auto">
            {items.map((item, index) => (
              <ItemRow
                key={item.id}
                item={item}
                index={index}
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
              <div className="p-6 text-center text-[13px] text-gray-500">
                품목이 없습니다.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
});

type StatementPrintPageProps = {
  pageIndex: number;
  totalPages: number;
  pageRows: StatementItem[];
  receiver: ClientData;
  supplier: SupplierData;
  vatMode: VatMode;
  totalSupplyAmount: number;
  totalTaxAmount: number;
  totalAmount: number;
  unpaidAmount: number;
  receiverSigner: string;
  supplierSigner: string;
  companySettings: CompanySettings;
  notes: string;
  statementNumber: string;
  statementDate: string;
  setPageRef: (index: number, el: HTMLDivElement | null) => void;
};

const StatementPrintPage = memo(function StatementPrintPage({
  pageIndex,
  totalPages,
  pageRows,
  receiver,
  supplier,
  vatMode,
  totalSupplyAmount,
  totalTaxAmount,
  totalAmount,
  unpaidAmount,
  receiverSigner,
  supplierSigner,
  companySettings,
  notes,
  statementNumber,
  statementDate,
  setPageRef,
}: StatementPrintPageProps) {
  return (
    <div
      ref={(el) => setPageRef(pageIndex, el)}
      className="relative overflow-hidden bg-white"
      style={{
        width: `${EXPORT_PAGE_WIDTH}px`,
        height: `${EXPORT_PAGE_HEIGHT}px`,
        fontFamily: "Arial, 'Malgun Gothic', sans-serif",
      }}
    >
      <div className="absolute inset-0 bg-white px-[10px] pt-[10px] pb-[8px]">
        <SlipPreview
          color="#355cff"
          titleNote="공급받는자 보관용"
          receiver={receiver}
          supplier={supplier}
          previewRows={pageRows}
          vatMode={vatMode}
          totalSupplyAmount={totalSupplyAmount}
          totalTaxAmount={totalTaxAmount}
          totalAmount={totalAmount}
          unpaidAmount={unpaidAmount}
          receiverSigner={receiverSigner}
          supplierSigner={supplierSigner}
          companySettings={companySettings}
        />

        <div className="h-[10px]" />

        <SlipPreview
          color="#ff4b4b"
          titleNote="공급자 보관용"
          receiver={receiver}
          supplier={supplier}
          previewRows={pageRows}
          vatMode={vatMode}
          totalSupplyAmount={totalSupplyAmount}
          totalTaxAmount={totalTaxAmount}
          totalAmount={totalAmount}
          unpaidAmount={unpaidAmount}
          receiverSigner={receiverSigner}
          supplierSigner={supplierSigner}
          companySettings={companySettings}
        />

        <div className="mt-[8px] rounded-lg border border-dashed border-gray-300 px-3 py-2 text-[12px] leading-[1.55] text-gray-600">
          <div>비고: {notes}</div>
          <div>거래명세서 번호: {statementNumber}</div>
          <div>작성일: {statementDate}</div>
          <div>VAT 구분: {vatMode === "included" ? "포함" : "별도"}</div>
          <div>
            페이지: {pageIndex + 1} / {totalPages}
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
  const [items, setItems] = useState<StatementItem[]>([
    makeItem(),
    makeItem(),
    makeItem(),
  ]);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("상기와 같이 거래명세 내역을 확인드립니다.");
  const [unpaidAmount, setUnpaidAmount] = useState(0);

  const [companySettings, setCompanySettings] = useState<CompanySettings>({});
  const [savedStatements, setSavedStatements] = useState<SavedStatement[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientSearch, setShowClientSearch] = useState(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    statementDateRef.current = statementDate;
  }, [statementDate]);

  useEffect(() => {
    vatModeRef.current = vatMode;
  }, [vatMode]);

  useEffect(() => {
    setSelectedRowIds((prev) =>
      prev.filter((id) => items.some((item) => item.id === id))
    );
  }, [items]);

  const focusCellImmediately = useCallback(
    (rowIndex: number, field: EditableField) => {
      const currentItems = itemsRef.current;
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

  useEffect(() => {
    setMounted(true);

    const initialDate = todayString();
    let nextReceiverSigner = "";
    let nextSupplierSigner = "";
    let nextReceiver: ClientData = {
      companyName: "",
      managerName: "",
      phone: "",
      email: "",
      address: "",
      fax: "",
      businessNumber: "",
      memo: "",
    };
    let nextSupplier: SupplierData = {
      companyName: "",
      ceoName: "",
      businessNumber: "",
      address: "",
      phone: "",
      fax: "",
    };
    let nextItems: StatementItem[] = [makeItem(), makeItem(), makeItem()];
    let nextClients: ClientRecord[] = [];

    const savedClients = localStorage.getItem(STORAGE_KEYS.clients);
    if (savedClients) {
      try {
        const parsed = JSON.parse(savedClients);
        if (Array.isArray(parsed)) {
          nextClients = parsed;
        }
      } catch {}
    }

    const savedCompany = localStorage.getItem(STORAGE_KEYS.companySettings);
    if (savedCompany) {
      try {
        const parsed: CompanySettings = JSON.parse(savedCompany);
        setCompanySettings(parsed);
        nextSupplier = {
          companyName: parsed.companyName || "",
          ceoName: parsed.ceoName || "",
          businessNumber: parsed.businessNumber || "",
          address: parsed.address || "",
          phone: parsed.phone || "",
          fax: parsed.fax || "",
        };
        nextSupplierSigner = parsed.ceoName || "";
      } catch {}
    }

    const savedEstimateDraft = localStorage.getItem(STORAGE_KEYS.estimateDraft);
    if (savedEstimateDraft) {
      try {
        const parsed: EstimateDraft = JSON.parse(savedEstimateDraft);

        nextReceiver = {
          ...nextReceiver,
          companyName: parsed.clientName || "",
          managerName: parsed.contactPerson || "",
          phone: parsed.phone || "",
          email: parsed.email || "",
        };

        nextReceiverSigner = parsed.contactPerson || "";

        if (Array.isArray(parsed.items) && parsed.items.length > 0) {
          nextItems = parsed.items.map((item) =>
            sanitizeLoadedItem(
              {
                productName: item.productName || "",
                quantity: parseNumber(item.quantity || 1),
                unitPrice: parseNumber(item.unitPrice ?? item.supplyPrice ?? 0),
                unit: "EA",
              },
              "included",
              initialDate
            )
          );
        }
      } catch {}
    }

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
    setItems(nextItems);
    setStatementId(crypto.randomUUID());
    setStatementNumber(makeStatementNumber(initialDate));
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

  const deferredReceiver = useDeferredValue(receiver);
  const deferredSupplier = useDeferredValue(supplier);
  const deferredPreviewPages = useDeferredValue(previewPages);
  const deferredVatMode = useDeferredValue(vatMode);
  const deferredTotalSupplyAmount = useDeferredValue(totalSupplyAmount);
  const deferredTotalTaxAmount = useDeferredValue(totalTaxAmount);
  const deferredTotalAmount = useDeferredValue(totalAmount);
  const deferredUnpaidAmount = useDeferredValue(unpaidAmount);
  const deferredReceiverSigner = useDeferredValue(receiverSigner);
  const deferredSupplierSigner = useDeferredValue(supplierSigner);
  const deferredCompanySettings = useDeferredValue(companySettings);
  const deferredNotes = useDeferredValue(notes);
  const deferredStatementNumber = useDeferredValue(statementNumber);
  const deferredStatementDate = useDeferredValue(statementDate);

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
        dateYear: year,
        dateMonth: month,
        dateDay: day,
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

  const moveSelectedRowsUp = useCallback(() => {
    if (selectedRowIds.length === 0) {
      alert("선택된 행이 없습니다.");
      return;
    }

    setItems((prev) => {
      const next = [...prev];
      const selectedSet = new Set(selectedRowIds);

      for (let i = 1; i < next.length; i++) {
        if (selectedSet.has(next[i].id) && !selectedSet.has(next[i - 1].id)) {
          [next[i - 1], next[i]] = [next[i], next[i - 1]];
        }
      }

      return next;
    });
  }, [selectedRowIds]);

  const moveSelectedRowsDown = useCallback(() => {
    if (selectedRowIds.length === 0) {
      alert("선택된 행이 없습니다.");
      return;
    }

    setItems((prev) => {
      const next = [...prev];
      const selectedSet = new Set(selectedRowIds);

      for (let i = next.length - 2; i >= 0; i--) {
        if (selectedSet.has(next[i].id) && !selectedSet.has(next[i + 1].id)) {
          [next[i], next[i + 1]] = [next[i + 1], next[i]];
        }
      }

      return next;
    });
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
    setSupplierSigner(companySettings.ceoName || "");
    setItems([makeItem(nextDate), makeItem(nextDate), makeItem(nextDate)]);
    setSelectedRowIds([]);
    setNotes("상기와 같이 거래명세 내역을 확인드립니다.");
    setUnpaidAmount(0);
    setClientSearch("");
    setShowClientSearch(false);
  }, [clearSelectedClientInForm, companySettings.ceoName]);

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
    setNotes(data.notes || "상기와 같이 거래명세 내역을 확인드립니다.");
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
        scale: 3,
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
  }, [createPdfBlob]);

  const handleSendEmail = useCallback(() => {
    const vatLabel = vatMode === "included" ? "VAT 포함" : "VAT 별도";
    const subject = encodeURIComponent(`[거래명세서] ${statementNumber}`);
    const body = encodeURIComponent(
      [
        `거래명세서 번호: ${statementNumber}`,
        `작성일: ${statementDate}`,
        `거래처: ${receiver.companyName}`,
        `VAT 구분: ${vatLabel}`,
        `공급가액: ${formatNumber(totalSupplyAmount)}원`,
        `세액: ${formatNumber(totalTaxAmount)}원`,
        `합계금액: ${formatNumber(totalAmount)}원`,
        `미수금: ${formatNumber(unpaidAmount)}원`,
        "",
        "원프앤에서 작성된 거래명세서입니다.",
      ].join("\n")
    );

    window.location.href = `mailto:${receiver.email || ""}?subject=${subject}&body=${body}`;
  }, [
    receiver.companyName,
    receiver.email,
    statementDate,
    statementNumber,
    totalAmount,
    totalSupplyAmount,
    totalTaxAmount,
    unpaidAmount,
    vatMode,
  ]);

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
    <div className="min-h-screen bg-[#f3f5f8] px-4 py-4 xl:px-5 xl:py-5">
      <div className="mx-auto grid max-w-[2360px] grid-cols-1 gap-5 xl:grid-cols-[980px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-[26px] border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <h1 className="text-[19px] font-bold text-gray-900">거래명세서</h1>
            <p className="mt-1 text-[12px] text-gray-500">
              유통단가표처럼 넓은 작업창과 표 기반 품목 입력으로 정리한 실무형
              거래명세서입니다.
            </p>
          </div>

          <div className="rounded-[26px] border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-gray-900">
                  거래처 선택
                </h2>
                <p className="mt-1 text-[12px] text-gray-500">
                  거래처 관리에 저장된 업체를 검색하고 선택하면 공급받는자 정보에
                  자동 반영됩니다.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowClientSearch((prev) => !prev)}
                  className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-[13px] font-medium text-gray-800"
                >
                  {showClientSearch ? "거래처 검색 닫기" : "거래처 검색 열기"}
                </button>

                <button
                  onClick={clearSelectedClientInForm}
                  className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-[13px] font-medium text-red-600"
                >
                  거래처 초기화
                </button>
              </div>
            </div>

            <div className="rounded-[22px] border border-gray-200 bg-gray-50 px-4 py-3">
              {receiver.companyName ? (
                <div className="grid grid-cols-1 gap-1 text-[13px] text-gray-700 md:grid-cols-2">
                  <div>
                    <span className="font-semibold text-gray-900">업체명:</span>{" "}
                    {receiver.companyName}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">대표자:</span>{" "}
                    {receiver.managerName || "-"}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">전화:</span>{" "}
                    {receiver.phone || "-"}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">사업자번호:</span>{" "}
                    {receiver.businessNumber || "-"}
                  </div>
                </div>
              ) : (
                <div className="text-[13px] text-gray-500">
                  아직 선택된 거래처가 없습니다.
                </div>
              )}
            </div>

            {showClientSearch ? (
              <div className="mt-4 rounded-[24px] border border-gray-200 bg-[#fbfbfc]">
                <div className="border-b border-gray-200 px-4 py-3">
                  <input
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="거래처명 / 대표자 / 번호 / 전화 검색"
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                  />
                </div>

                <div className="max-h-[320px] overflow-y-auto p-4">
                  {filteredClients.length === 0 ? (
                    <div className="rounded-[20px] border border-dashed border-gray-300 p-6 text-center text-[13px] text-gray-500">
                      {clients.length === 0
                        ? "등록된 거래처가 없습니다."
                        : "검색 결과가 없습니다."}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredClients.map((client) => (
                        <div
                          key={client.id}
                          className="rounded-[20px] border border-gray-200 bg-white p-4"
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-1">
                              <div className="text-[16px] font-semibold text-gray-900">
                                {client.name}
                              </div>
                              <div className="text-[13px] text-gray-600">
                                {client.owner || "-"} /{" "}
                                {client.businessNumber || "-"}
                              </div>
                              <div className="text-[13px] text-gray-600">
                                전화번호: {client.phone || "-"}
                              </div>
                              <div className="text-[13px] text-gray-600">
                                이메일: {client.email || "-"}
                              </div>
                              <div className="text-[13px] text-gray-600">
                                주소: {client.address || "-"}
                              </div>
                            </div>

                            <button
                              onClick={() => handleSelectClient(client)}
                              className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-[13px] font-semibold text-blue-600"
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

          <div className="rounded-[26px] border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <h2 className="mb-3 text-[16px] font-semibold text-gray-900">
              기본 정보
            </h2>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="block md:col-span-2">
                <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                  거래명세서 번호
                </span>
                <input
                  value={statementNumber}
                  onChange={(e) => setStatementNumber(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                  작성일
                </span>
                <input
                  type="date"
                  value={statementDate}
                  onChange={(e) => handleStatementDateChange(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                />
              </label>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                  VAT 선택
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleVatModeChange("included")}
                    className={`rounded-2xl border px-4 py-2.5 text-[13px] font-semibold transition ${
                      vatMode === "included"
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-300 bg-gray-100 text-gray-700"
                    }`}
                  >
                    VAT 포함
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVatModeChange("separate")}
                    className={`rounded-2xl border px-4 py-2.5 text-[13px] font-semibold transition ${
                      vatMode === "separate"
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-300 bg-gray-100 text-gray-700"
                    }`}
                  >
                    VAT 별도
                  </button>
                </div>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                  인수자
                </span>
                <input
                  value={receiverSigner}
                  onChange={(e) => setReceiverSigner(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                  납품자
                </span>
                <input
                  value={supplierSigner}
                  onChange={(e) => setSupplierSigner(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                />
              </label>
            </div>
          </div>

          <div className="rounded-[26px] border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <h2 className="mb-3 text-[16px] font-semibold text-gray-900">
              공급받는자 정보
            </h2>

            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                    상호(법인명)
                  </span>
                  <input
                    value={receiver.companyName}
                    onChange={(e) =>
                      handleReceiverChange("companyName", e.target.value)
                    }
                    className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                    등록번호
                  </span>
                  <input
                    value={receiver.businessNumber || ""}
                    onChange={(e) =>
                      handleReceiverChange("businessNumber", e.target.value)
                    }
                    className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                  사업장 주소
                </span>
                <input
                  value={receiver.address || ""}
                  onChange={(e) =>
                    handleReceiverChange("address", e.target.value)
                  }
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                />
              </label>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                    성명
                  </span>
                  <input
                    value={receiver.managerName}
                    onChange={(e) => {
                      handleReceiverChange("managerName", e.target.value);
                    }}
                    className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                    전화번호
                  </span>
                  <input
                    value={receiver.phone}
                    onChange={(e) =>
                      handleReceiverChange("phone", e.target.value)
                    }
                    className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                    팩스
                  </span>
                  <input
                    value={receiver.fax || ""}
                    onChange={(e) => handleReceiverChange("fax", e.target.value)}
                    className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                  이메일
                </span>
                <input
                  value={receiver.email}
                  onChange={(e) => handleReceiverChange("email", e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                />
              </label>
            </div>
          </div>

          <div className="rounded-[26px] border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <h2 className="mb-3 text-[16px] font-semibold text-gray-900">
              공급자 정보
            </h2>

            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                    상호(법인명)
                  </span>
                  <input
                    value={supplier.companyName}
                    onChange={(e) =>
                      handleSupplierChange("companyName", e.target.value)
                    }
                    className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                    등록번호
                  </span>
                  <input
                    value={supplier.businessNumber}
                    onChange={(e) =>
                      handleSupplierChange("businessNumber", e.target.value)
                    }
                    className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                  사업장 주소
                </span>
                <input
                  value={supplier.address}
                  onChange={(e) =>
                    handleSupplierChange("address", e.target.value)
                  }
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                />
              </label>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                    대표자
                  </span>
                  <input
                    value={supplier.ceoName}
                    onChange={(e) => {
                      handleSupplierChange("ceoName", e.target.value);
                    }}
                    className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                    전화번호
                  </span>
                  <input
                    value={supplier.phone}
                    onChange={(e) =>
                      handleSupplierChange("phone", e.target.value)
                    }
                    className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                    팩스
                  </span>
                  <input
                    value={supplier.fax}
                    onChange={(e) => handleSupplierChange("fax", e.target.value)}
                    className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                  />
                </label>
              </div>
            </div>
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
            onMoveSelectedUp={moveSelectedRowsUp}
            onMoveSelectedDown={moveSelectedRowsDown}
            onChange={handleItemChange}
            onRemove={removeItem}
            onDuplicate={duplicateItem}
            onAdd={addItem}
            registerInput={registerInput}
            onCellNavigate={onCellNavigate}
            onPasteRows={handlePasteRows}
          />

          <div className="rounded-[26px] border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <h2 className="mb-3 text-[16px] font-semibold text-gray-900">
              정리 정보
            </h2>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                  미수금
                </span>
                <input
                  type="number"
                  value={unpaidAmount === 0 ? "" : unpaidAmount}
                  onFocus={(e) => {
                    if (unpaidAmount === 0) e.target.value = "";
                  }}
                  onBlur={(e) => {
                    if (e.target.value === "") {
                      setUnpaidAmount(0);
                    }
                  }}
                  onChange={(e) => setUnpaidAmount(Number(e.target.value || 0))}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-right text-[14px] outline-none focus:border-gray-900"
                />
              </label>

              <div className="rounded-[22px] border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between py-1 text-[13px]">
                  <span className="text-gray-500">공급가액</span>
                  <span className="text-gray-900">
                    {formatNumber(totalSupplyAmount)}원
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 text-[13px]">
                  <span className="text-gray-500">세액</span>
                  <span className="text-gray-900">
                    {formatNumber(totalTaxAmount)}원
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-3">
                  <span className="text-gray-800">
                    {vatMode === "included"
                      ? "합계금액(VAT 포함)"
                      : "합계금액(VAT 별도)"}
                  </span>
                  <span className="text-[20px] text-gray-900">
                    {formatNumber(totalAmount)}원
                  </span>
                </div>
              </div>
            </div>

            <label className="mt-3 block">
              <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                비고
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-[14px] outline-none focus:border-gray-900"
              />
            </label>
          </div>

          <div className="rounded-[26px] border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <h2 className="mb-3 text-[16px] font-semibold text-gray-900">
              저장 / 출력
            </h2>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <button
                onClick={saveStatement}
                className="rounded-2xl bg-gray-900 px-4 py-2.5 text-[13px] font-semibold text-white"
              >
                거래명세서 저장
              </button>
              <button
                onClick={handleSavePng}
                className="rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-[13px] font-semibold text-gray-900"
              >
                PNG 저장
              </button>
              <button
                onClick={handleSaveJpg}
                className="rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-[13px] font-semibold text-gray-900"
              >
                JPG 저장
              </button>
              <button
                onClick={handleSavePdf}
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
                onClick={handleSendEmail}
                className="rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-[13px] font-semibold text-gray-900"
              >
                이메일 발송
              </button>
            </div>

            <button
              onClick={resetForm}
              className="mt-3 w-full rounded-2xl bg-red-50 px-4 py-2.5 text-[13px] font-semibold text-red-600"
            >
              새 거래명세서 작성
            </button>
          </div>

          <div className="rounded-[26px] border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <h2 className="mb-3 text-[16px] font-semibold text-gray-900">
              저장된 거래명세서
            </h2>

            <div className="space-y-3">
              {savedStatements.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-gray-300 p-6 text-[13px] text-gray-500">
                  저장된 거래명세서가 없습니다.
                </div>
              ) : (
                savedStatements.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[22px] border border-gray-200 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {item.statementNumber}
                        </p>
                        <p className="mt-1 text-[13px] text-gray-500">
                          거래처: {item.receiver.companyName || "-"}
                        </p>
                        <p className="mt-1 text-[13px] text-gray-500">
                          합계금액: {formatNumber(item.totalAmount)}원
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => loadStatement(item)}
                          className="rounded-2xl bg-gray-900 px-4 py-2 text-[13px] font-medium text-white"
                        >
                          불러오기
                        </button>
                        <button
                          onClick={() => deleteStatement(item.id)}
                          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-[13px] font-medium text-red-600"
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

        <div className="xl:sticky xl:top-5 xl:self-start">
          <div className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-[18px] font-semibold text-gray-900">
                A4 미리보기
              </h2>
              <p className="text-[11px] text-gray-500">
                파란 보관용 + 빨간 보관용
              </p>
            </div>

            <div className="overflow-auto rounded-[22px] bg-[#edf1f6] p-3">
              <div className="mx-auto flex w-full flex-col items-center gap-6">
                {deferredPreviewPages.map((pageRows, pageIndex) => (
                  <StatementPrintPage
                    key={pageIndex}
                    pageIndex={pageIndex}
                    totalPages={deferredPreviewPages.length}
                    pageRows={pageRows}
                    receiver={deferredReceiver}
                    supplier={deferredSupplier}
                    vatMode={deferredVatMode}
                    totalSupplyAmount={deferredTotalSupplyAmount}
                    totalTaxAmount={deferredTotalTaxAmount}
                    totalAmount={deferredTotalAmount}
                    unpaidAmount={deferredUnpaidAmount}
                    receiverSigner={deferredReceiverSigner}
                    supplierSigner={deferredSupplierSigner}
                    companySettings={deferredCompanySettings}
                    notes={deferredNotes}
                    statementNumber={deferredStatementNumber}
                    statementDate={deferredStatementDate}
                    setPageRef={setPageRef}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}