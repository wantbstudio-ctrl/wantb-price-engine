"use client";

import { useEffect, useMemo, useState } from "react";

type DayValue = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
type TargetPage =
  | "all"
  | "dashboard"
  | "estimate"
  | "statement"
  | "pricelist"
  | "clients"
  | "company-settings"
  | "about";
type SlotValue = "sidebar-bottom" | "sidebar-top" | "dashboard-banner" | "modal";

type AdItem = {
  id: string;
  name: string;
  slot: SlotValue | string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
  priority: number;
  sortOrder: number;
  startDate: string;
  endDate: string;
  daysOfWeek: string;
  startTime: string;
  endTime: string;
  displaySeconds: number;
  targetPage: TargetPage | string;
  notes: string;
  updatedAt: string;
};

type AdForm = {
  id: string;
  name: string;
  slot: SlotValue;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
  priority: number;
  sortOrder: number;
  startDate: string;
  endDate: string;
  daysOfWeek: DayValue[];
  startTime: string;
  endTime: string;
  displaySeconds: number;
  targetPage: TargetPage;
  notes: string;
};

const API_BASE = "/api/ad-manager";

const DAY_OPTIONS: { value: DayValue; label: string }[] = [
  { value: "sun", label: "일" },
  { value: "mon", label: "월" },
  { value: "tue", label: "화" },
  { value: "wed", label: "수" },
  { value: "thu", label: "목" },
  { value: "fri", label: "금" },
  { value: "sat", label: "토" },
];

const SLOT_OPTIONS: { value: SlotValue; label: string }[] = [
  { value: "sidebar-bottom", label: "Sidebar Bottom" },
  { value: "sidebar-top", label: "Sidebar Top" },
  { value: "dashboard-banner", label: "Dashboard Banner" },
  { value: "modal", label: "Modal" },
];

const TARGET_PAGE_OPTIONS: { value: TargetPage; label: string }[] = [
  { value: "all", label: "전체 페이지" },
  { value: "dashboard", label: "Dashboard" },
  { value: "estimate", label: "Estimate" },
  { value: "statement", label: "Statement" },
  { value: "pricelist", label: "Price List" },
  { value: "clients", label: "Clients" },
  { value: "company-settings", label: "Company Settings" },
  { value: "about", label: "About" },
];

const createEmptyForm = (): AdForm => ({
  id: "",
  name: "",
  slot: "sidebar-bottom",
  imageUrl: "",
  linkUrl: "",
  isActive: true,
  priority: 1,
  sortOrder: 1,
  startDate: "",
  endDate: "",
  daysOfWeek: [],
  startTime: "",
  endTime: "",
  displaySeconds: 8,
  targetPage: "all",
  notes: "",
});

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.toLowerCase() === "true" || value === "TRUE";
  }
  return false;
}

function normalizeNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeAd(raw: any): AdItem {
  return {
    id: String(raw?.id ?? ""),
    name: String(raw?.name ?? ""),
    slot: String(raw?.slot ?? "sidebar-bottom"),
    imageUrl: String(raw?.imageUrl ?? ""),
    linkUrl: String(raw?.linkUrl ?? ""),
    isActive: normalizeBoolean(raw?.isActive),
    priority: normalizeNumber(raw?.priority, 1),
    sortOrder: normalizeNumber(raw?.sortOrder, 1),
    startDate: String(raw?.startDate ?? ""),
    endDate: String(raw?.endDate ?? ""),
    daysOfWeek: String(raw?.daysOfWeek ?? ""),
    startTime: String(raw?.startTime ?? ""),
    endTime: String(raw?.endTime ?? ""),
    displaySeconds: normalizeNumber(raw?.displaySeconds, 8),
    targetPage: String(raw?.targetPage ?? "all"),
    notes: String(raw?.notes ?? ""),
    updatedAt: String(raw?.updatedAt ?? ""),
  };
}

function formFromAd(ad: AdItem): AdForm {
  return {
    id: ad.id,
    name: ad.name,
    slot: (ad.slot as SlotValue) || "sidebar-bottom",
    imageUrl: ad.imageUrl,
    linkUrl: ad.linkUrl,
    isActive: ad.isActive,
    priority: ad.priority,
    sortOrder: ad.sortOrder,
    startDate: ad.startDate,
    endDate: ad.endDate,
    daysOfWeek: ad.daysOfWeek
      ? ad.daysOfWeek
          .split(",")
          .map((v) => v.trim().toLowerCase())
          .filter(Boolean) as DayValue[]
      : [],
    startTime: ad.startTime,
    endTime: ad.endTime,
    displaySeconds: ad.displaySeconds,
    targetPage: (ad.targetPage as TargetPage) || "all",
    notes: ad.notes,
  };
}

function payloadFromForm(form: AdForm) {
  return {
    id: form.id,
    name: form.name.trim(),
    slot: form.slot,
    imageUrl: form.imageUrl.trim(),
    linkUrl: form.linkUrl.trim(),
    isActive: form.isActive,
    priority: Number(form.priority || 0),
    sortOrder: Number(form.sortOrder || 0),
    startDate: form.startDate,
    endDate: form.endDate,
    daysOfWeek: form.daysOfWeek.join(","),
    startTime: form.startTime,
    endTime: form.endTime,
    displaySeconds: Number(form.displaySeconds || 0),
    targetPage: form.targetPage,
    notes: form.notes.trim(),
  };
}

async function apiGet(action: string, extraParams?: Record<string, string>) {
  const params = new URLSearchParams({ action, ...(extraParams || {}) });

  const res = await fetch(`${API_BASE}?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  const text = await res.text();

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`응답 JSON 파싱 실패: ${text.slice(0, 120)}`);
  }

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || `GET ${action} 실패`);
  }

  return data;
}

async function apiPost(action: string, payload: Record<string, any>) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      action,
      ...payload,
    }),
  });

  const text = await res.text();

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`응답 JSON 파싱 실패: ${text.slice(0, 120)}`);
  }

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || `POST ${action} 실패`);
  }

  return data;
}

function AdPreview({ form }: { form: AdForm }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#10151d] shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
      <div className="border-b border-white/10 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
          Live Preview
        </p>
<h3 className="mt-2 text-[18px] font-light tracking-tight text-[#38BDF8]">
  광고 미리보기
</h3>
        <p className="mt-1 text-sm text-slate-400">
          실제 등록 전에 슬롯/페이지/이미지/링크 상태를 먼저 확인합니다.
        </p>
      </div>

      <div className="space-y-4 p-5">
        <div className="rounded-2xl border border-cyan-400/20 bg-[#0b1017] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Slot
              </p>
              <p className="mt-1 text-sm font-semibold text-white">{form.slot}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Target Page
              </p>
              <p className="mt-1 text-sm font-semibold text-cyan-300">
                {form.targetPage}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f141c]">
            <div className="flex min-h-[220px] items-center justify-center bg-[#0b1017]">
              {form.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.imageUrl}
                  alt={form.name || "광고 이미지"}
                  className="max-h-[300px] w-full object-cover"
                />
              ) : (
                <div className="flex h-[220px] w-full items-center justify-center px-6 text-center text-sm text-slate-500">
                  이미지 URL을 입력하면 여기에 미리보기가 표시됩니다.
                </div>
              )}
            </div>

            <div className="space-y-3 border-t border-white/10 p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Name
                </p>
                <p className="mt-1 break-all text-sm text-white">
  {form.name || "광고명 미입력"}
</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Link
                </p>
                <p className="mt-1 break-all text-sm text-white">
  {form.linkUrl || "링크 미입력"}
</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-slate-500">활성 상태</p>
                  <p className="mt-1 font-semibold text-white">
                    {form.isActive ? "ON" : "OFF"}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-slate-500">노출 시간</p>
                  <p className="mt-1 font-semibold text-white">
                    {form.displaySeconds}초
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
                <p className="text-slate-500">예약 정보</p>
                <p className="mt-1 text-white">
                  날짜: {form.startDate || "-"} ~ {form.endDate || "-"}
                </p>
                <p className="mt-1 text-white">
                  시간: {form.startTime || "-"} ~ {form.endTime || "-"}
                </p>
                <p className="mt-1 text-white">
                  요일:{" "}
                  {form.daysOfWeek.length > 0
                    ? form.daysOfWeek.join(", ")
                    : "전체"}
                </p>
              </div>

              <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3 text-sm text-slate-200">
                <p className="font-semibold text-white">메모</p>
                <p className="mt-1 whitespace-pre-wrap">
                  {form.notes || "메모 없음"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0b1017] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            운영 기준
          </p>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>• Google Sheets는 DB 역할만 수행합니다.</li>
            <li>• 실제 광고 관리는 이 페이지에서 진행하는 구조입니다.</li>
            <li>• 시간/요일/날짜/페이지/우선순위 조건으로 노출됩니다.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function AdManagerPage() {
  const [ads, setAds] = useState<AdItem[]>([]);
  const [form, setForm] = useState<AdForm>(createEmptyForm());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const [keyword, setKeyword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const filteredAds = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return ads;

    return ads.filter((ad) => {
      return [
        ad.name,
        ad.slot,
        ad.targetPage,
        ad.imageUrl,
        ad.linkUrl,
        ad.notes,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [ads, keyword]);

  const loadAds = async () => {
    try {
      setLoading(true);
      setStatusMessage("광고 목록을 불러오는 중입니다...");

      const data = await apiGet("allAds");
      const rows = Array.isArray(data?.data)
        ? data.data.map(normalizeAd)
        : [];

      setAds(rows);
      setStatusMessage("광고 목록을 불러왔습니다.");
    } catch (error: any) {
      console.error(error);
      setStatusMessage(error?.message || "광고 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAds();
  }, []);

  const handleChange = <K extends keyof AdForm>(key: K, value: AdForm[K]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleDayToggle = (day: DayValue) => {
    setForm((prev) => {
      const exists = prev.daysOfWeek.includes(day);
      return {
        ...prev,
        daysOfWeek: exists
          ? prev.daysOfWeek.filter((v) => v !== day)
          : [...prev.daysOfWeek, day],
      };
    });
  };

  const resetForm = () => {
    setForm(createEmptyForm());
    setSelectedId("");
    setStatusMessage("입력 폼을 초기화했습니다.");
  };

  const handleEdit = (ad: AdItem) => {
    setForm(formFromAd(ad));
    setSelectedId(ad.id);
    setStatusMessage(`"${ad.name}" 광고를 수정 모드로 불러왔습니다.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      alert("광고명을 입력해 주세요.");
      return false;
    }
    if (!form.imageUrl.trim()) {
      alert("이미지 URL을 입력해 주세요.");
      return false;
    }
    if (!form.slot) {
      alert("광고 슬롯을 선택해 주세요.");
      return false;
    }
    if (!form.targetPage) {
      alert("노출 페이지를 선택해 주세요.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const payload = payloadFromForm(form);
      const action = selectedId ? "updateAd" : "createAd";

      await apiPost(action, payload);

      setStatusMessage(
        selectedId
          ? "광고 수정이 완료되었습니다."
          : "광고 등록이 완료되었습니다."
      );

      resetForm();
      await loadAds();
    } catch (error: any) {
      console.error(error);
      setStatusMessage(error?.message || "광고 저장 중 오류가 발생했습니다.");
      alert(error?.message || "광고 저장 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (ad: AdItem) => {
    try {
      setStatusMessage(`"${ad.name}" 광고 상태를 변경하는 중입니다...`);

      await apiPost("toggleAd", {
        id: ad.id,
        isActive: !ad.isActive,
      });

      await loadAds();
      setStatusMessage(`"${ad.name}" 광고 상태를 변경했습니다.`);
    } catch (error: any) {
      console.error(error);
      setStatusMessage(error?.message || "상태 변경 중 오류가 발생했습니다.");
      alert(error?.message || "상태 변경 중 오류가 발생했습니다.");
    }
  };

  const handleDelete = async (ad: AdItem) => {
    const ok = confirm(`"${ad.name}" 광고를 삭제하시겠습니까?`);
    if (!ok) return;

    try {
      setStatusMessage(`"${ad.name}" 광고를 삭제하는 중입니다...`);

      await apiPost("deleteAd", { id: ad.id });

      if (selectedId === ad.id) {
        resetForm();
      }

      await loadAds();
      setStatusMessage(`"${ad.name}" 광고를 삭제했습니다.`);
    } catch (error: any) {
      console.error(error);
      setStatusMessage(error?.message || "삭제 중 오류가 발생했습니다.");
      alert(error?.message || "삭제 중 오류가 발생했습니다.");
    }
  };

  const handleSortSave = async (ad: AdItem) => {
    try {
      await apiPost("updateSortOrder", {
        id: ad.id,
        sortOrder: ad.sortOrder,
      });

      setStatusMessage(`"${ad.name}" 정렬순서를 저장했습니다.`);
      await loadAds();
    } catch (error: any) {
      console.error(error);
      setStatusMessage(error?.message || "정렬 저장 중 오류가 발생했습니다.");
      alert(error?.message || "정렬 저장 중 오류가 발생했습니다.");
    }
  };

  const updateRowSortOrder = (id: string, nextValue: number) => {
    setAds((prev) =>
      prev.map((ad) =>
        ad.id === id
          ? {
              ...ad,
              sortOrder: nextValue,
            }
          : ad
      )
    );
  };

  return (
    <div className="space-y-8">
      <div className="rounded-[28px] border border-white/10 bg-[#121821] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
              Ad Manager
            </p>
            <h1 className="mt-2 text-[29px] font-light tracking-tight text-[#38BDF8]">
  광고관리
</h1>
            <p className="mt-2 text-sm text-slate-400">
              원프앤 내부에서 광고를 직접 관리하고, Google Sheets는 저장소로만 사용하는 운영형 광고 시스템입니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadAds}
              className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/20"
            >
              새로고침
            </button>
            <button
              onClick={resetForm}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]"
            >
              새 광고 작성
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-[#0d131a] px-4 py-3 text-sm text-slate-300">
          {loading ? "불러오는 중..." : statusMessage || "준비 완료"}
        </div>
      </div>

      <div className="grid gap-8 2xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-8">
          <div className="rounded-[28px] border border-white/10 bg-[#121821] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Editor
                </p>
                <h2 className="mt-2 text-[18px] font-light tracking-tight text-[#38BDF8]">
  {selectedId ? "광고 수정" : "광고 등록"}
</h2>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0d131a] px-4 py-3 text-sm text-slate-400">
                {selectedId ? `수정 ID: ${selectedId}` : "신규 광고 작성 중"}
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  광고명
                </label>
                <input
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="예: 4월 이벤트 메인 배너"
                  className="w-full rounded-2xl border border-white/10 bg-[#0d131a] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  슬롯
                </label>
                <select
                  value={form.slot}
                  onChange={(e) => handleChange("slot", e.target.value as SlotValue)}
                  className="w-full rounded-2xl border border-white/10 bg-[#0d131a] px-4 py-3 text-white outline-none focus:border-cyan-400/50"
                >
                  {SLOT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  이미지 URL
                </label>
                <input
                  value={form.imageUrl}
                  onChange={(e) => handleChange("imageUrl", e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-2xl border border-white/10 bg-[#0d131a] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  링크 URL
                </label>
                <input
                  value={form.linkUrl}
                  onChange={(e) => handleChange("linkUrl", e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-2xl border border-white/10 bg-[#0d131a] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  우선순위
                </label>
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) =>
                    handleChange("priority", Number(e.target.value || 0))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#0d131a] px-4 py-3 text-white outline-none focus:border-cyan-400/50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  정렬순서
                </label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    handleChange("sortOrder", Number(e.target.value || 0))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#0d131a] px-4 py-3 text-white outline-none focus:border-cyan-400/50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  시작일
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => handleChange("startDate", e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#0d131a] px-4 py-3 text-white outline-none focus:border-cyan-400/50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  종료일
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => handleChange("endDate", e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#0d131a] px-4 py-3 text-white outline-none focus:border-cyan-400/50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  시작시간
                </label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => handleChange("startTime", e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#0d131a] px-4 py-3 text-white outline-none focus:border-cyan-400/50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  종료시간
                </label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => handleChange("endTime", e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#0d131a] px-4 py-3 text-white outline-none focus:border-cyan-400/50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  노출 시간(초)
                </label>
                <input
                  type="number"
                  value={form.displaySeconds}
                  onChange={(e) =>
                    handleChange("displaySeconds", Number(e.target.value || 0))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#0d131a] px-4 py-3 text-white outline-none focus:border-cyan-400/50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  노출 페이지
                </label>
                <select
                  value={form.targetPage}
                  onChange={(e) =>
                    handleChange("targetPage", e.target.value as TargetPage)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#0d131a] px-4 py-3 text-white outline-none focus:border-cyan-400/50"
                >
                  {TARGET_PAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <label className="mb-3 block text-sm font-medium text-slate-300">
                  요일 예약
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAY_OPTIONS.map((day) => {
                    const active = form.daysOfWeek.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => handleDayToggle(day.value)}
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                          active
                            ? "border border-cyan-400/40 bg-cyan-400/15 text-cyan-300"
                            : "border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  메모
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  placeholder="이 광고의 운영 메모를 입력하세요."
                  rows={4}
                  className="w-full rounded-2xl border border-white/10 bg-[#0d131a] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0d131a] px-4 py-4 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => handleChange("isActive", e.target.checked)}
                    className="h-4 w-4 accent-cyan-400"
                  />
                  광고 활성화(ON/OFF)
                </label>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? "저장 중..."
                  : selectedId
                  ? "광고 수정 저장"
                  : "새 광고 등록"}
              </button>

              <button
                onClick={resetForm}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]"
              >
                입력 초기화
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#121821] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Ads List
                </p>
                <h2 className="mt-2 text-[18px] font-light tracking-tight text-[#38BDF8]">
  등록된 광고 목록
</h2>
              </div>

              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="광고명 / 슬롯 / 페이지 검색"
                className="w-full max-w-[320px] rounded-2xl border border-white/10 bg-[#0d131a] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50"
              />
            </div>

            <div className="space-y-4">
              {filteredAds.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-[#0d131a] px-5 py-10 text-center text-sm text-slate-500">
                  등록된 광고가 없습니다.
                </div>
              ) : (
                filteredAds.map((ad) => (
                  <div
                    key={ad.id}
                    className="rounded-3xl border border-white/10 bg-[#0d131a] p-4"
                  >
                    <div className="grid gap-4 xl:grid-cols-[220px_1fr]">
                      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f15]">
                        <div className="flex h-[140px] items-center justify-center bg-[#0a0f15]">
                          {ad.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={ad.imageUrl}
                              alt={ad.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="px-4 text-center text-xs text-slate-500">
                              이미지 없음
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-bold text-white">
                                {ad.name}
                              </h3>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  ad.isActive
                                    ? "bg-cyan-400/15 text-cyan-300"
                                    : "bg-rose-400/15 text-rose-300"
                                }`}
                              >
                                {ad.isActive ? "ON" : "OFF"}
                              </span>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                              <span className="rounded-full border border-white/10 px-3 py-1">
                                Slot: {ad.slot}
                              </span>
                              <span className="rounded-full border border-white/10 px-3 py-1">
                                Page: {ad.targetPage}
                              </span>
                              <span className="rounded-full border border-white/10 px-3 py-1">
                                Priority: {ad.priority}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleEdit(ad)}
                              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleToggle(ad)}
                              className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/20"
                            >
                              {ad.isActive ? "OFF로 변경" : "ON으로 변경"}
                            </button>
                            <button
                              onClick={() => handleDelete(ad)}
                              className="rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-400/20"
                            >
                              삭제
                            </button>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                              날짜
                            </p>
                            <p className="mt-2 text-sm text-white">
                              {ad.startDate || "-"} ~ {ad.endDate || "-"}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                              시간
                            </p>
                            <p className="mt-2 text-sm text-white">
                              {ad.startTime || "-"} ~ {ad.endTime || "-"}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                              요일
                            </p>
                            <p className="mt-2 text-sm text-white">
                              {ad.daysOfWeek || "전체"}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                              노출 시간
                            </p>
                            <p className="mt-2 text-sm text-white">
                              {ad.displaySeconds}초
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-[160px_1fr_auto]">
                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                              Sort Order
                            </p>
                            <input
                              type="number"
                              value={ad.sortOrder}
                              onChange={(e) =>
                                updateRowSortOrder(
                                  ad.id,
                                  Number(e.target.value || 0)
                                )
                              }
                              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1017] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
                            />
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                              Link URL
                            </p>
                            <p className="mt-2 break-all text-sm text-cyan-300">
                              {ad.linkUrl || "-"}
                            </p>
                          </div>

                          <div className="flex items-end">
                            <button
                              onClick={() => handleSortSave(ad)}
                              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]"
                            >
                              정렬 저장
                            </button>
                          </div>
                        </div>

                        {ad.notes ? (
                          <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-3 text-sm text-slate-200">
                            <p className="font-semibold text-cyan-300">메모</p>
                            <p className="mt-1 whitespace-pre-wrap">{ad.notes}</p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <AdPreview form={form} />
      </div>
    </div>
  );
}