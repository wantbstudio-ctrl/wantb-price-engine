"use client";

import { useEffect, useMemo, useState } from "react";

const ESTIMATE_KEY = "wantb-estimates";
const ESTIMATE_DRAFT_KEY = "estimate-draft";
const COMPANY_KEY = "wantb-company-settings";
const ESTIMATE_SEQ_KEY = "wantb-estimate-seq";
const PRODUCT_KEY = "wantb-products";

type SavedProduct = {
  id: number;
  productName: string;
  totalCost?: number;
  channels?: string[];
  online?: { price?: number; profit?: number; middleFee?: number };
  offline?: { price?: number; profit?: number; middleFee?: number };
  distribution?: { price?: number; profit?: number; middleFee?: number };
  date?: string;
};

type EstimateItem = {
  id: number;
  estimateNumber: string;
  productName: string;
  quantity: number;
  unitPrice: number;
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
  logoDataUrl?: string;
  stampDataUrl?: string;
  date: string;
};

type CompanySettings = {
  companyName?: string;
  ceoName?: string;
  businessNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  logoDataUrl?: string;
  logoImage?: string;
  logoPreview?: string;
  stamp?: string;
  stampDataUrl?: string;
  stampImage?: string;
  stampPreview?: string;
};

declare global {
  interface Window {
    electronAPI?: {
      sendEstimateEmail?: (payload: {
        to: string;
        subject: string;
        text: string;
        html: string;
        pngDataUrl?: string;
        jpgDataUrl?: string;
        pdfBase64?: string;
        filenameBase?: string;
      }) => Promise<{ success?: boolean; message?: string }>;
    };
  }
}

export default function EstimatePage() {
  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([]);
  const [savedEstimates, setSavedEstimates] = useState<EstimateItem[]>([]);

  const [selectedProductId, setSelectedProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);

  const [clientName, setClientName] = useState("");
  const [managerName, setManagerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [emailTo, setEmailTo] = useState("");
  const [deliveryCondition, setDeliveryCondition] = useState("");
  const [validUntil, setValidUntil] = useState("");

  const [companyName, setCompanyName] = useState("WantB");
  const [ceoName, setCeoName] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [address, setAddress] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");

  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [stampDataUrl, setStampDataUrl] = useState("");

  const [estimateNumber, setEstimateNumber] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const supplyPrice = useMemo(() => quantity * unitPrice, [quantity, unitPrice]);
  const vat = useMemo(() => Math.round(supplyPrice * 0.1), [supplyPrice]);
  const totalAmount = useMemo(() => supplyPrice + vat, [supplyPrice, vat]);

  const formatNumber = (value: number) => Number(value || 0).toLocaleString("ko-KR");

  const getImageFromCompany = (company: CompanySettings, keys: string[]) => {
    for (const key of keys) {
      const value = (company as Record<string, unknown>)[key];
      if (typeof value === "string" && value.trim()) {
        return value;
      }
    }
    return "";
  };

  const getSequenceMap = () => {
    if (typeof window === "undefined") return {};
    const raw = localStorage.getItem(ESTIMATE_SEQ_KEY);
    return raw ? JSON.parse(raw) : {};
  };

  const saveSequenceMap = (map: Record<string, number>) => {
    localStorage.setItem(ESTIMATE_SEQ_KEY, JSON.stringify(map));
  };

  const peekNextEstimateNumber = () => {
    const year = new Date().getFullYear().toString();
    const map = getSequenceMap();
    const next = (map[year] || 0) + 1;
    return `WB-${year}-${String(next).padStart(4, "0")}`;
  };

  const reserveNextEstimateNumber = () => {
    const year = new Date().getFullYear().toString();
    const map = getSequenceMap();
    const next = (map[year] || 0) + 1;
    map[year] = next;
    saveSequenceMap(map);
    return `WB-${year}-${String(next).padStart(4, "0")}`;
  };

  const ensureEstimateNumber = () => {
    if (estimateNumber) return estimateNumber;
    const next = reserveNextEstimateNumber();
    setEstimateNumber(next);
    return next;
  };

  useEffect(() => {
    try {
      const rawProducts = localStorage.getItem(PRODUCT_KEY);
      if (rawProducts) {
        setSavedProducts(JSON.parse(rawProducts));
      }

      const rawEstimates = localStorage.getItem(ESTIMATE_KEY);
      if (rawEstimates) {
        setSavedEstimates(JSON.parse(rawEstimates));
      }

      const rawCompany = localStorage.getItem(COMPANY_KEY);
      if (rawCompany) {
        const company: CompanySettings = JSON.parse(rawCompany);

        setCompanyName(company.companyName || "WantB");
        setCeoName(company.ceoName || "");
        setBusinessNumber(company.businessNumber || "");
        setAddress(company.address || "");
        setCompanyPhone(company.phone || "");
        setCompanyEmail(company.email || "");

        setLogoDataUrl(
          getImageFromCompany(company, [
            "logoDataUrl",
            "logoImage",
            "logoPreview",
            "logo",
          ])
        );

        setStampDataUrl(
          getImageFromCompany(company, [
            "stampDataUrl",
            "stampImage",
            "stampPreview",
            "stamp",
          ])
        );
      }

      const rawDraft = localStorage.getItem(ESTIMATE_DRAFT_KEY);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft);

        setSelectedProductId(draft.selectedProductId || "");
        setProductName(draft.productName || "");
        setQuantity(Number(draft.quantity || 1));
        setUnitPrice(Number(draft.unitPrice || 0));
        setClientName(draft.clientName || "");
        setManagerName(draft.managerName || "");
        setPhone(draft.phone || "");
        setEmail(draft.email || "");
        setEmailTo(draft.emailTo || draft.email || "");
        setDeliveryCondition(draft.deliveryCondition || "");
        setValidUntil(draft.validUntil || "");

        if (draft.estimateNumber) {
          setEstimateNumber(draft.estimateNumber);
        } else {
          setEstimateNumber(peekNextEstimateNumber());
        }
      } else {
        setEstimateNumber(peekNextEstimateNumber());
      }
    } catch (error) {
      console.error("Estimate 초기 로딩 실패:", error);
      setEstimateNumber(peekNextEstimateNumber());
    }
  }, []);

  useEffect(() => {
    const draft = {
      selectedProductId,
      productName,
      quantity,
      unitPrice,
      clientName,
      managerName,
      phone,
      email,
      emailTo,
      deliveryCondition,
      validUntil,
      estimateNumber,
    };

    localStorage.setItem(ESTIMATE_DRAFT_KEY, JSON.stringify(draft));
  }, [
    selectedProductId,
    productName,
    quantity,
    unitPrice,
    clientName,
    managerName,
    phone,
    email,
    emailTo,
    deliveryCondition,
    validUntil,
    estimateNumber,
  ]);

  const handleSelectProduct = (id: string) => {
    setSelectedProductId(id);

    const selected = savedProducts.find((item) => String(item.id) === id);
    if (!selected) return;

    setProductName(selected.productName || "");

    const suggestedPrice =
      selected.online?.price ||
      selected.offline?.price ||
      selected.distribution?.price ||
      0;

    setUnitPrice(Number(suggestedPrice || 0));
    setQuantity(1);
  };

  const handleSaveEstimate = () => {
    const finalEstimateNumber = ensureEstimateNumber();

    const newEstimate: EstimateItem = {
      id: Date.now(),
      estimateNumber: finalEstimateNumber,
      productName,
      quantity,
      unitPrice,
      supplyPrice,
      vat,
      totalAmount,
      clientName,
      managerName,
      phone,
      email,
      deliveryCondition,
      validUntil,
      companyName,
      ceoName,
      businessNumber,
      address,
      companyPhone,
      companyEmail,
      logoDataUrl,
      stampDataUrl,
      date: new Date().toLocaleDateString("ko-KR"),
    };

    const raw = localStorage.getItem(ESTIMATE_KEY);
    const list: EstimateItem[] = raw ? JSON.parse(raw) : [];
    const updated = [newEstimate, ...list];

    localStorage.setItem(ESTIMATE_KEY, JSON.stringify(updated));
    setSavedEstimates(updated);

    alert("견적서가 저장되었습니다.");
  };

  const handleLoadEstimate = (item: EstimateItem) => {
    setEstimateNumber(item.estimateNumber || peekNextEstimateNumber());
    setProductName(item.productName || "");
    setQuantity(Number(item.quantity || 1));
    setUnitPrice(Number(item.unitPrice || 0));
    setClientName(item.clientName || "");
    setManagerName(item.managerName || "");
    setPhone(item.phone || "");
    setEmail(item.email || "");
    setEmailTo(item.email || "");
    setDeliveryCondition(item.deliveryCondition || "");
    setValidUntil(item.validUntil || "");
    setCompanyName(item.companyName || "WantB");
    setCeoName(item.ceoName || "");
    setBusinessNumber(item.businessNumber || "");
    setAddress(item.address || "");
    setCompanyPhone(item.companyPhone || "");
    setCompanyEmail(item.companyEmail || "");
    setLogoDataUrl(item.logoDataUrl || logoDataUrl);
    setStampDataUrl(item.stampDataUrl || stampDataUrl);
  };

  const handleDeleteEstimate = (id: number) => {
    const filtered = savedEstimates.filter((item) => item.id !== id);
    localStorage.setItem(ESTIMATE_KEY, JSON.stringify(filtered));
    setSavedEstimates(filtered);
  };

  const handleResetForm = () => {
    setSelectedProductId("");
    setProductName("");
    setQuantity(1);
    setUnitPrice(0);
    setClientName("");
    setManagerName("");
    setPhone("");
    setEmail("");
    setEmailTo("");
    setDeliveryCondition("");
    setValidUntil("");
    setEstimateNumber(peekNextEstimateNumber());
  };

  const loadImage = (src: string) => {
    return new Promise<HTMLImageElement | null>((resolve) => {
      if (!src) {
        resolve(null);
        return;
      }
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  };

  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fillStyle?: string,
    strokeStyle?: string
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();

    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.stroke();
    }
  };

  const drawWrappedText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ) => {
    const lines = String(text || "-").split("\n");
    let currentY = y;

    for (const line of lines) {
      const words = line.split(" ");
      let currentLine = "";

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine) {
          ctx.fillText(currentLine, x, currentY);
          currentLine = word;
          currentY += lineHeight;
        } else {
          currentLine = testLine;
        }
      }

      ctx.fillText(currentLine, x, currentY);
      currentY += lineHeight;
    }

    return currentY;
  };

  const renderEstimateCanvas = async () => {
    const width = 1600;
    const height = 2260;

    const scaleX = width / 794;
    const scaleY = height / 1123;
    const sx = (n: number) => n * scaleX;
    const sy = (n: number) => n * scaleY;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("canvas context 생성 실패");
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    const finalEstimateNumber = estimateNumber || peekNextEstimateNumber();
    const today = new Date().toLocaleDateString("ko-KR");

    const [logoImg, stampImg] = await Promise.all([
      loadImage(logoDataUrl),
      loadImage(stampDataUrl),
    ]);

    if (logoImg) {
      const maxW = sx(160);
      const maxH = sy(64);
      const ratio = Math.min(maxW / logoImg.width, maxH / logoImg.height);
      const drawW = logoImg.width * ratio;
      const drawH = logoImg.height * ratio;
      ctx.drawImage(logoImg, sx(48), sy(34), drawW, drawH);
    }

    ctx.fillStyle = "#111827";
    ctx.font = `700 ${sx(38)}px Arial`;
    ctx.fillText("견적서", sx(48), sy(120));

    ctx.fillStyle = "#6b7280";
    ctx.font = `${sx(13)}px Arial`;
    ctx.fillText("ESTIMATE", sx(48), sy(145));

    ctx.fillStyle = "#4b5563";
    ctx.font = `${sx(13)}px Arial`;
    ctx.textAlign = "right";
    ctx.fillText(`견적번호: ${finalEstimateNumber}`, sx(746), sy(80));
    ctx.fillText(`작성일: ${today}`, sx(746), sy(105));
    ctx.fillText(`유효기간: ${validUntil || "-"}`, sx(746), sy(130));
    ctx.textAlign = "left";

    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx(48), sy(170));
    ctx.lineTo(sx(746), sy(170));
    ctx.stroke();

    drawRoundedRect(ctx, sx(48), sy(196), sx(698), sy(110), sx(16), "#ffffff", "#e5e7eb");
    drawRoundedRect(ctx, sx(48), sy(320), sx(698), sy(90), sx(16), "#ffffff", "#e5e7eb");
    drawRoundedRect(ctx, sx(48), sy(428), sx(698), sy(240), sx(16), "#ffffff", "#e5e7eb");
    drawRoundedRect(ctx, sx(474), sy(688), sx(272), sy(108), sx(16), "#ffffff", "#e5e7eb");
    drawRoundedRect(ctx, sx(48), sy(818), sx(698), sy(120), sx(16), "#ffffff", "#e5e7eb");

    ctx.fillStyle = "#374151";
    ctx.font = `700 ${sx(13)}px Arial`;
    ctx.fillText("공급자 정보", sx(66), sy(220));
    ctx.fillText("거래처 정보", sx(66), sy(344));

    ctx.font = `${sx(13)}px Arial`;
    ctx.fillStyle = "#374151";
    ctx.fillText(`업체명: ${companyName || "-"}`, sx(66), sy(250));
    ctx.fillText(`대표자: ${ceoName || "-"}`, sx(390), sy(250));
    ctx.fillText(`사업자번호: ${businessNumber || "-"}`, sx(66), sy(275));
    ctx.fillText(`연락처: ${companyPhone || "-"}`, sx(390), sy(275));
    ctx.fillText(`이메일: ${companyEmail || "-"}`, sx(66), sy(300));
    ctx.fillText(`주소: ${address || "-"}`, sx(390), sy(300));

    ctx.fillText(`거래처명: ${clientName || "-"}`, sx(66), sy(374));
    ctx.fillText(`담당자: ${managerName || "-"}`, sx(390), sy(374));
    ctx.fillText(`연락처: ${phone || "-"}`, sx(66), sy(399));
    ctx.fillText(`이메일: ${email || "-"}`, sx(390), sy(399));

    const tableX = sx(48);
    const tableY = sy(428);
    const tableW = sx(698);
    const headerH = sy(46);
    const rowH = sy(62);

    ctx.fillStyle = "#f9fafb";
    ctx.fillRect(tableX, tableY, tableW, headerH);

    const cols = [
      { label: "품목명", x: sx(60), align: "left" as CanvasTextAlign },
      { label: "수량", x: sx(360), align: "center" as CanvasTextAlign },
      { label: "단가", x: sx(470), align: "right" as CanvasTextAlign },
      { label: "공급가액", x: sx(590), align: "right" as CanvasTextAlign },
      { label: "VAT", x: sx(670), align: "right" as CanvasTextAlign },
      { label: "총금액", x: sx(736), align: "right" as CanvasTextAlign },
    ];

    ctx.fillStyle = "#374151";
    ctx.font = `600 ${sx(13)}px Arial`;
    for (const col of cols) {
      ctx.textAlign = col.align;
      ctx.fillText(col.label, col.x, sy(456));
    }

    ctx.textAlign = "left";
    ctx.strokeStyle = "#e5e7eb";
    ctx.beginPath();
    ctx.moveTo(tableX, tableY + headerH);
    ctx.lineTo(tableX + tableW, tableY + headerH);
    ctx.stroke();

    ctx.fillStyle = "#111827";
    ctx.font = `${sx(13)}px Arial`;
    ctx.textAlign = "left";
    ctx.fillText(productName || "-", sx(60), sy(525));
    ctx.textAlign = "center";
    ctx.fillText(formatNumber(quantity), sx(360), sy(525));
    ctx.textAlign = "right";
    ctx.fillText(`${formatNumber(unitPrice)}원`, sx(470), sy(525));
    ctx.fillText(`${formatNumber(supplyPrice)}원`, sx(590), sy(525));
    ctx.fillText(`${formatNumber(vat)}원`, sx(670), sy(525));
    ctx.font = `700 ${sx(13)}px Arial`;
    ctx.fillText(`${formatNumber(totalAmount)}원`, sx(736), sy(525));
    ctx.textAlign = "left";

    ctx.beginPath();
    ctx.moveTo(tableX, tableY + headerH + rowH);
    ctx.lineTo(tableX + tableW, tableY + headerH + rowH);
    ctx.stroke();

    ctx.fillStyle = "#6b7280";
    ctx.font = `${sx(13)}px Arial`;
    ctx.fillText("공급가액", sx(492), sy(720));
    ctx.fillText("부가세", sx(492), sy(758));
    ctx.fillStyle = "#111827";
    ctx.font = `700 ${sx(13)}px Arial`;
    ctx.textAlign = "right";
    ctx.fillText(`${formatNumber(supplyPrice)}원`, sx(726), sy(720));
    ctx.fillText(`${formatNumber(vat)}원`, sx(726), sy(758));

    ctx.fillStyle = "#f9fafb";
    ctx.fillRect(sx(474), sy(760), sx(272), sy(36));
    ctx.fillStyle = "#111827";
    ctx.font = `700 ${sx(15)}px Arial`;
    ctx.fillText(`${formatNumber(totalAmount)}원`, sx(726), sy(785));
    ctx.textAlign = "left";
    ctx.fillText("총 금액", sx(492), sy(785));

    ctx.fillStyle = "#374151";
    ctx.font = `700 ${sx(13)}px Arial`;
    ctx.fillText("납품 조건", sx(66), sy(844));

    ctx.font = `${sx(13)}px Arial`;
    ctx.fillStyle = "#374151";
    drawWrappedText(ctx, deliveryCondition || "-", sx(66), sy(872), sx(650), sy(20));

    ctx.fillStyle = "#111827";
    ctx.font = `700 ${sx(13)}px Arial`;
    ctx.fillText(companyName || "WantB", sx(48), sy(1000));

    ctx.fillStyle = "#4b5563";
    ctx.font = `${sx(13)}px Arial`;
    ctx.fillText("위 견적 내용을 확인드립니다.", sx(48), sy(1028));

    if (stampImg) {
      const maxSize = sx(96);
      const ratio = Math.min(maxSize / stampImg.width, maxSize / stampImg.height);
      const drawW = stampImg.width * ratio;
      const drawH = stampImg.height * ratio;
      ctx.drawImage(stampImg, sx(650), sy(960), drawW, drawH);

      ctx.fillStyle = "#6b7280";
      ctx.font = `${sx(12)}px Arial`;
      ctx.textAlign = "center";
      ctx.fillText("도장", sx(698), sy(950));
      ctx.textAlign = "left";
    }

    return canvas;
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportImage = async (type: "png" | "jpg") => {
    try {
      const finalEstimateNumber = ensureEstimateNumber();
      const canvas = await renderEstimateCanvas();

      const mimeType = type === "png" ? "image/png" : "image/jpeg";
      const quality = type === "png" ? 1 : 0.95;

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, mimeType, quality)
      );

      if (!blob) {
        alert(`${type.toUpperCase()} 파일 생성에 실패했습니다.`);
        return;
      }

      downloadBlob(blob, `${finalEstimateNumber}.${type}`);
    } catch (error) {
      console.error(`${type.toUpperCase()} 저장 실패:`, error);
      alert(`${type.toUpperCase()} 저장 중 오류가 발생했습니다.`);
    }
  };

  const bytesToBase64 = (bytes: Uint8Array) => {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  };

  const buildPdfFromJpegBytes = (jpegBytes: Uint8Array, width: number, height: number) => {
    const enc = new TextEncoder();

    const objects: Uint8Array[] = [];

    const obj1 = enc.encode("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
    const obj2 = enc.encode("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
    const obj3 = enc.encode(
      `3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>
endobj
`
    );
    const obj4Head = enc.encode(
      `4 0 obj
<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>
stream
`
    );
    const obj4Tail = enc.encode("\nendstream\nendobj\n");
    const contentStream = enc.encode(`q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ\n`);
    const obj5 = enc.encode(
      `5 0 obj
<< /Length ${contentStream.length} >>
stream
${new TextDecoder().decode(contentStream)}endstream
endobj
`
    );

    objects.push(obj1, obj2, obj3);

    const obj4 = new Uint8Array(obj4Head.length + jpegBytes.length + obj4Tail.length);
    obj4.set(obj4Head, 0);
    obj4.set(jpegBytes, obj4Head.length);
    obj4.set(obj4Tail, obj4Head.length + jpegBytes.length);
    objects.push(obj4, obj5);

    const header = enc.encode("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n");

    const offsets: number[] = [];
    let totalLength = header.length;

    for (const obj of objects) {
      offsets.push(totalLength);
      totalLength += obj.length;
    }

    let xref = "xref\n0 6\n0000000000 65535 f \n";
    for (const offset of offsets) {
      xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
    }

    const xrefBytes = enc.encode(xref);
    const trailer = enc.encode(
      `trailer
<< /Size 6 /Root 1 0 R >>
startxref
${totalLength}
%%EOF`
    );

    const pdf = new Uint8Array(totalLength + xrefBytes.length + trailer.length);
    let cursor = 0;

    pdf.set(header, cursor);
    cursor += header.length;

    for (const obj of objects) {
      pdf.set(obj, cursor);
      cursor += obj.length;
    }

    pdf.set(xrefBytes, cursor);
    cursor += xrefBytes.length;

    pdf.set(trailer, cursor);

    return pdf;
  };

  const createPdfBytes = async () => {
    const canvas = await renderEstimateCanvas();

    const jpegBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.95)
    );

    if (!jpegBlob) {
      throw new Error("PDF용 JPEG 생성 실패");
    }

    const buffer = await jpegBlob.arrayBuffer();
    const jpegBytes = new Uint8Array(buffer);

    return buildPdfFromJpegBytes(jpegBytes, canvas.width, canvas.height);
  };

  const handleSavePDF = async () => {
    try {
      const finalEstimateNumber = ensureEstimateNumber();
      const pdfBytes = await createPdfBytes();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      downloadBlob(blob, `${finalEstimateNumber}.pdf`);
    } catch (error) {
      console.error("PDF 저장 실패:", error);
      alert("PDF 저장 중 오류가 발생했습니다.");
    }
  };

  const handlePrint = async () => {
    try {
      const pdfBytes = await createPdfBytes();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";

      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            URL.revokeObjectURL(url);
            iframe.remove();
          }, 2000);
        }, 300);
      };

      iframe.src = url;
      document.body.appendChild(iframe);
    } catch (error) {
      console.error("인쇄 실패:", error);
      alert("인쇄 중 오류가 발생했습니다.");
    }
  };

  const getPreviewHtml = () => {
    const finalEstimateNumber = estimateNumber || peekNextEstimateNumber();
    const today = new Date().toLocaleDateString("ko-KR");

    return `
      <div style="width:794px; min-height:1123px; background:white; padding:56px 48px; box-sizing:border-box; color:#111827; font-family:Arial,'Malgun Gothic',sans-serif;">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:24px; border-bottom:1px solid #e5e7eb; padding-bottom:24px; margin-bottom:24px;">
          <div style="display:flex; flex-direction:column; gap:12px;">
            ${
              logoDataUrl
                ? `<img src="${logoDataUrl}" alt="logo" style="max-width:160px; max-height:64px; object-fit:contain;" />`
                : ""
            }
            <div>
              <div style="font-size:38px; font-weight:800; letter-spacing:-0.04em; line-height:1;">견적서</div>
              <div style="font-size:13px; color:#6b7280; margin-top:8px;">ESTIMATE</div>
            </div>
          </div>
          <div style="text-align:right; font-size:13px; line-height:1.9; color:#4b5563;">
            <div>견적번호: <strong style="color:#111827;">${finalEstimateNumber}</strong></div>
            <div>작성일: <strong style="color:#111827;">${today}</strong></div>
            <div>유효기간: <strong style="color:#111827;">${validUntil || "-"}</strong></div>
          </div>
        </div>

        <div style="border:1px solid #e5e7eb; border-radius:16px; padding:18px; margin-bottom:14px;">
          <div style="font-size:13px; font-weight:700; color:#374151; margin-bottom:12px;">공급자 정보</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px 24px; font-size:13px; color:#374151;">
            <div>업체명: <strong style="color:#111827;">${companyName || "-"}</strong></div>
            <div>대표자: <strong style="color:#111827;">${ceoName || "-"}</strong></div>
            <div>사업자번호: <strong style="color:#111827;">${businessNumber || "-"}</strong></div>
            <div>연락처: <strong style="color:#111827;">${companyPhone || "-"}</strong></div>
            <div style="grid-column:span 2;">이메일: <strong style="color:#111827;">${companyEmail || "-"}</strong></div>
            <div style="grid-column:span 2;">주소: <strong style="color:#111827;">${address || "-"}</strong></div>
          </div>
        </div>

        <div style="border:1px solid #e5e7eb; border-radius:16px; padding:18px; margin-bottom:14px;">
          <div style="font-size:13px; font-weight:700; color:#374151; margin-bottom:12px;">거래처 정보</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px 24px; font-size:13px; color:#374151;">
            <div>거래처명: <strong style="color:#111827;">${clientName || "-"}</strong></div>
            <div>담당자: <strong style="color:#111827;">${managerName || "-"}</strong></div>
            <div>연락처: <strong style="color:#111827;">${phone || "-"}</strong></div>
            <div>이메일: <strong style="color:#111827;">${email || "-"}</strong></div>
          </div>
        </div>

        <div style="border:1px solid #e5e7eb; border-radius:16px; overflow:hidden;">
          <table style="width:100%; border-collapse:collapse; font-size:13px;">
            <thead>
              <tr style="background:#f9fafb; color:#374151;">
                <th style="padding:14px 12px; text-align:left; border-bottom:1px solid #e5e7eb;">품목명</th>
                <th style="padding:14px 12px; text-align:center; border-bottom:1px solid #e5e7eb;">수량</th>
                <th style="padding:14px 12px; text-align:right; border-bottom:1px solid #e5e7eb;">단가</th>
                <th style="padding:14px 12px; text-align:right; border-bottom:1px solid #e5e7eb;">공급가액</th>
                <th style="padding:14px 12px; text-align:right; border-bottom:1px solid #e5e7eb;">VAT</th>
                <th style="padding:14px 12px; text-align:right; border-bottom:1px solid #e5e7eb;">총금액</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:14px 12px; border-bottom:1px solid #e5e7eb;">${productName || "-"}</td>
                <td style="padding:14px 12px; text-align:center; border-bottom:1px solid #e5e7eb;">${formatNumber(quantity)}</td>
                <td style="padding:14px 12px; text-align:right; border-bottom:1px solid #e5e7eb;">${formatNumber(unitPrice)}원</td>
                <td style="padding:14px 12px; text-align:right; border-bottom:1px solid #e5e7eb;">${formatNumber(supplyPrice)}원</td>
                <td style="padding:14px 12px; text-align:right; border-bottom:1px solid #e5e7eb;">${formatNumber(vat)}원</td>
                <td style="padding:14px 12px; text-align:right; border-bottom:1px solid #e5e7eb; font-weight:700;">${formatNumber(totalAmount)}원</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="width:320px; margin-left:auto; margin-top:20px; border:1px solid #e5e7eb; border-radius:16px; overflow:hidden;">
          <div style="display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-bottom:1px solid #e5e7eb; font-size:13px;">
            <span style="color:#6b7280;">공급가액</span>
            <strong>${formatNumber(supplyPrice)}원</strong>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-bottom:1px solid #e5e7eb; font-size:13px;">
            <span style="color:#6b7280;">부가세</span>
            <strong>${formatNumber(vat)}원</strong>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; padding:14px 16px; background:#f9fafb; font-size:15px; font-weight:800;">
            <span>총 금액</span>
            <strong>${formatNumber(totalAmount)}원</strong>
          </div>
        </div>

        <div style="margin-top:20px; border:1px solid #e5e7eb; border-radius:16px; padding:18px;">
          <div style="font-size:13px; font-weight:700; color:#374151; margin-bottom:10px;">납품 조건</div>
          <div style="font-size:13px; line-height:1.9; color:#374151; min-height:80px; white-space:pre-wrap;">${deliveryCondition || "-"}</div>
        </div>

        <div style="margin-top:36px; display:flex; align-items:flex-end; justify-content:space-between; gap:24px;">
          <div style="font-size:13px; color:#4b5563; line-height:1.8;">
            <div><strong style="color:#111827;">${companyName || "WantB"}</strong></div>
            <div>위 견적 내용을 확인드립니다.</div>
          </div>

          ${
            stampDataUrl
              ? `
            <div style="text-align:center;">
              <div style="font-size:12px; color:#6b7280; margin-bottom:6px;">도장</div>
              <img src="${stampDataUrl}" alt="stamp" style="width:96px; height:96px; object-fit:contain;" />
            </div>
          `
              : ""
          }
        </div>
      </div>
    `;
  };

  const handleSendEmail = async () => {
    try {
      const to = emailTo || email;
      if (!to) {
        alert("이메일 주소를 입력해주세요.");
        return;
      }

      setIsSendingEmail(true);

      const finalEstimateNumber = ensureEstimateNumber();
      const subject = `[견적서] ${finalEstimateNumber} / ${productName || "품목명 없음"}`;
      const text = [
        `견적번호: ${finalEstimateNumber}`,
        `제품명: ${productName || "-"}`,
        `수량: ${quantity}`,
        `단가: ${formatNumber(unitPrice)}원`,
        `총금액: ${formatNumber(totalAmount)}원`,
        "",
        `${companyName || "WantB"} 드림`,
      ].join("\n");

      const html = getPreviewHtml();

      if (window.electronAPI?.sendEstimateEmail) {
        const pngCanvas = await renderEstimateCanvas();
        const jpgCanvas = await renderEstimateCanvas();
        const pdfBytes = await createPdfBytes();

        const pngDataUrl = pngCanvas.toDataURL("image/png");
        const jpgDataUrl = jpgCanvas.toDataURL("image/jpeg", 0.95);
        const pdfBase64 = bytesToBase64(pdfBytes);

        const result = await window.electronAPI.sendEstimateEmail({
          to,
          subject,
          text,
          html,
          pngDataUrl,
          jpgDataUrl,
          pdfBase64,
          filenameBase: finalEstimateNumber,
        });

        if (result?.success) {
          alert("이메일 발송이 완료되었습니다.");
        } else {
          alert(result?.message || "이메일 발송에 실패했습니다.");
        }
        return;
      }

      const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(text)}`;

      window.location.href = mailto;
      alert("현재 환경에서는 메일 작성 창으로 연결됩니다. 앱 내부 첨부 발송은 Electron 메일 API 연결 시 사용됩니다.");
    } catch (error) {
      console.error("이메일 발송 실패:", error);
      alert("이메일 발송 중 오류가 발생했습니다.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] px-6 py-6">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">견적서</h1>
          <p className="mt-1 text-sm text-gray-500">
            제품 연동 / 견적 저장 / 불러오기 / 이메일 / PNG / JPG / PDF / 인쇄 / 문서형 미리보기
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">입력 정보</h2>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">견적번호</label>
                  <input
                    value={estimateNumber}
                    readOnly
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">저장 제품 불러오기</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => handleSelectProduct(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
                  >
                    <option value="">제품 선택</option>
                    {savedProducts.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.productName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">제품명</label>
                  <input
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">수량</label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value || 0))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">단가</label>
                    <input
                      type="number"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(Number(e.target.value || 0))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400"
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="mb-3 text-sm font-semibold text-gray-800">자동 계산</div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center justify-between">
                      <span>공급가액</span>
                      <strong className="text-gray-900">{formatNumber(supplyPrice)}원</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>VAT</span>
                      <strong className="text-gray-900">{formatNumber(vat)}원</strong>
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-200 pt-2">
                      <span className="font-medium text-gray-800">총금액</span>
                      <strong className="text-base text-gray-900">{formatNumber(totalAmount)}원</strong>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">거래처 정보</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">거래처명</label>
                  <input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">담당자명</label>
                  <input
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">연락처</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">이메일</label>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">이메일 발송 주소</label>
                  <input
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="비워두면 위 이메일 주소 사용"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">납품 조건</label>
                  <textarea
                    value={deliveryCondition}
                    onChange={(e) => setDeliveryCondition(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">견적 유효기간</label>
                  <input
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    placeholder="예: 2026-03-31"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">회사 정보</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">업체명</label>
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">대표자</label>
                    <input
                      value={ceoName}
                      onChange={(e) => setCeoName(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">사업자번호</label>
                    <input
                      value={businessNumber}
                      onChange={(e) => setBusinessNumber(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">주소</label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">회사 연락처</label>
                    <input
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">회사 이메일</label>
                    <input
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-dashed border-gray-300 p-4">
                  <div className="mb-2 text-sm font-medium text-gray-700">로고 미리보기</div>
                  <div className="flex h-[90px] items-center justify-center rounded-xl bg-gray-50">
                    {logoDataUrl ? (
                      <img src={logoDataUrl} alt="logo" className="max-h-[70px] max-w-[160px] object-contain" />
                    ) : (
                      <span className="text-sm text-gray-400">Company Settings 로고 연동</span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-dashed border-gray-300 p-4">
                  <div className="mb-2 text-sm font-medium text-gray-700">도장 미리보기</div>
                  <div className="flex h-[90px] items-center justify-center rounded-xl bg-gray-50">
                    {stampDataUrl ? (
                      <img src={stampDataUrl} alt="stamp" className="h-[72px] w-[72px] object-contain" />
                    ) : (
                      <span className="text-sm text-gray-400">Company Settings 도장 연동</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 저장 그룹 */}
              <div className="mt-6">
                <div className="mb-2 text-xs font-semibold text-gray-400">저장</div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <button
                    onClick={handleSaveEstimate}
                    className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
                  >
                    견적 저장
                  </button>

                  <button
                    onClick={() => exportImage("png")}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    PNG 저장
                  </button>

                  <button
                    onClick={() => exportImage("jpg")}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    JPG 저장
                  </button>

                  <button
                    onClick={handleSavePDF}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    PDF 저장
                  </button>
                </div>
              </div>

              {/* 전송 / 출력 그룹 */}
              <div className="mt-4">
                <div className="mb-2 text-xs font-semibold text-gray-400">전송 / 출력</div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleSendEmail}
                    disabled={isSendingEmail}
                    className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSendingEmail ? "이메일 발송 중..." : "이메일 발송"}
                  </button>

                  <button
                    onClick={handlePrint}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    인쇄
                  </button>
                </div>
              </div>

              {/* 초기화 */}
              <div className="mt-6">
                <button
                  onClick={handleResetForm}
                  className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  새 견적 작성 (초기화)
                </button>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">견적서 미리보기</h2>
                  <p className="mt-1 text-sm text-gray-500">A4 문서형 레이아웃 / 로고 + 도장 반영</p>
                </div>
                <div className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
                  {estimateNumber || peekNextEstimateNumber()}
                </div>
              </div>

              <div className="overflow-auto rounded-2xl bg-[#eef1f5] p-5">
                <div className="mx-auto w-full max-w-[794px] bg-white p-[56px_48px] shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
                  <div className="mb-6 flex items-start justify-between gap-6 border-b border-gray-200 pb-6">
                    <div className="flex flex-col gap-3">
                      {logoDataUrl ? (
                        <img src={logoDataUrl} alt="logo" className="max-h-[64px] max-w-[160px] object-contain" />
                      ) : null}
                      <div>
                        <h3 className="text-[38px] font-extrabold leading-none tracking-[-0.04em] text-gray-900">
                          견적서
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">ESTIMATE</p>
                      </div>
                    </div>

                    <div className="text-right text-sm leading-7 text-gray-600">
                      <div>
                        견적번호:{" "}
                        <strong className="text-gray-900">
                          {estimateNumber || peekNextEstimateNumber()}
                        </strong>
                      </div>
                      <div>
                        작성일:{" "}
                        <strong className="text-gray-900">
                          {new Date().toLocaleDateString("ko-KR")}
                        </strong>
                      </div>
                      <div>
                        유효기간: <strong className="text-gray-900">{validUntil || "-"}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 rounded-2xl border border-gray-200 p-5">
                    <div className="mb-3 text-sm font-semibold text-gray-800">공급자 정보</div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm text-gray-700">
                      <div>업체명: <strong className="text-gray-900">{companyName || "-"}</strong></div>
                      <div>대표자: <strong className="text-gray-900">{ceoName || "-"}</strong></div>
                      <div>사업자번호: <strong className="text-gray-900">{businessNumber || "-"}</strong></div>
                      <div>연락처: <strong className="text-gray-900">{companyPhone || "-"}</strong></div>
                      <div className="col-span-2">이메일: <strong className="text-gray-900">{companyEmail || "-"}</strong></div>
                      <div className="col-span-2">주소: <strong className="text-gray-900">{address || "-"}</strong></div>
                    </div>
                  </div>

                  <div className="mb-4 rounded-2xl border border-gray-200 p-5">
                    <div className="mb-3 text-sm font-semibold text-gray-800">거래처 정보</div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm text-gray-700">
                      <div>거래처명: <strong className="text-gray-900">{clientName || "-"}</strong></div>
                      <div>담당자: <strong className="text-gray-900">{managerName || "-"}</strong></div>
                      <div>연락처: <strong className="text-gray-900">{phone || "-"}</strong></div>
                      <div>이메일: <strong className="text-gray-900">{email || "-"}</strong></div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-gray-200">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-700">
                          <th className="border-b border-gray-200 px-4 py-4 text-left font-semibold">품목명</th>
                          <th className="border-b border-gray-200 px-4 py-4 text-center font-semibold">수량</th>
                          <th className="border-b border-gray-200 px-4 py-4 text-right font-semibold">단가</th>
                          <th className="border-b border-gray-200 px-4 py-4 text-right font-semibold">공급가액</th>
                          <th className="border-b border-gray-200 px-4 py-4 text-right font-semibold">VAT</th>
                          <th className="border-b border-gray-200 px-4 py-4 text-right font-semibold">총금액</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border-b border-gray-200 px-4 py-4">{productName || "-"}</td>
                          <td className="border-b border-gray-200 px-4 py-4 text-center">{formatNumber(quantity)}</td>
                          <td className="border-b border-gray-200 px-4 py-4 text-right">{formatNumber(unitPrice)}원</td>
                          <td className="border-b border-gray-200 px-4 py-4 text-right">{formatNumber(supplyPrice)}원</td>
                          <td className="border-b border-gray-200 px-4 py-4 text-right">{formatNumber(vat)}원</td>
                          <td className="border-b border-gray-200 px-4 py-4 text-right font-bold">{formatNumber(totalAmount)}원</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-5 ml-auto w-full max-w-[320px] overflow-hidden rounded-2xl border border-gray-200">
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 text-sm">
                      <span className="text-gray-600">공급가액</span>
                      <strong className="text-gray-900">{formatNumber(supplyPrice)}원</strong>
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 text-sm">
                      <span className="text-gray-600">부가세</span>
                      <strong className="text-gray-900">{formatNumber(vat)}원</strong>
                    </div>
                    <div className="flex items-center justify-between bg-gray-50 px-4 py-3 text-base font-bold">
                      <span className="text-gray-900">총 금액</span>
                      <strong className="text-gray-900">{formatNumber(totalAmount)}원</strong>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-gray-200 p-5">
                    <div className="mb-3 text-sm font-semibold text-gray-800">납품 조건</div>
                    <div className="min-h-[90px] whitespace-pre-line text-sm leading-7 text-gray-700">
                      {deliveryCondition || "-"}
                    </div>
                  </div>

                  <div className="mt-8 flex items-end justify-between gap-6">
                    <div className="text-sm leading-7 text-gray-600">
                      <div className="font-semibold text-gray-900">{companyName || "WantB"}</div>
                      <div>위 견적 내용을 확인드립니다.</div>
                    </div>

                    {stampDataUrl ? (
                      <div className="text-center">
                        <div className="mb-2 text-xs text-gray-500">도장</div>
                        <img src={stampDataUrl} alt="stamp" className="h-[96px] w-[96px] object-contain" />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">저장된 견적서</h2>
                <div className="text-sm text-gray-500">{savedEstimates.length}건</div>
              </div>

              {savedEstimates.length === 0 ? (
                <div className="rounded-xl bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
                  저장된 견적서가 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {savedEstimates.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-4 rounded-2xl border border-gray-200 p-4 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {item.estimateNumber}
                          </span>
                          <span className="text-xs text-gray-500">{item.date}</span>
                        </div>
                        <div className="truncate text-base font-semibold text-gray-900">
                          {item.productName || "-"}
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          거래처: {item.clientName || "-"} / 총금액: {formatNumber(item.totalAmount || 0)}원
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => handleLoadEstimate(item)}
                          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          불러오기
                        </button>
                        <button
                          onClick={() => handleDeleteEstimate(item.id)}
                          className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}