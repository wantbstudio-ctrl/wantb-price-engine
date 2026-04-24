"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

type ProductItem = {
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

const STORAGE_KEY = "wantb-product-library";

const titleClass = "text-[29px] font-light tracking-tight text-[#38BDF8]";
const sectionTitleClass =
  "text-[18px] font-light tracking-tight text-[#38BDF8]";
const descClass = "mt-1 text-xs leading-5 text-[#9aa4b2]";

const labelClass = "mb-1.5 block text-xs font-medium text-white";
const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0b1118] px-3 py-2 text-sm text-white placeholder:text-white/45 outline-none transition focus:border-[#38BDF8]/70 focus:ring-2 focus:ring-[#38BDF8]/15";

function createEmptyForm(): ProductItem {
  return {
    id: "",
    group: "",
    category: "",
    name: "",
    spec: "",
    weight: "",
    packType: "",
    unit: "",
    origin: "",
    cost: 0,
    wholesale: 0,
    retail: 0,
    supply: 0,
    headline: "",
    description: "",
    imageUrl: "",
    memo: "",
    createdAt: "",
  };
}

function normalizeProductItem(raw: Partial<ProductItem>): ProductItem {
  return {
    ...createEmptyForm(),
    ...raw,
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

function toNumber(value: string) {
  const num = Number(String(value).replace(/,/g, "").trim());
  return Number.isNaN(num) ? 0 : num;
}

function formatNumber(value: number) {
  if (!value) return "";
  return value.toLocaleString();
}

export default function ProductLibraryPage() {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [form, setForm] = useState<ProductItem>(createEmptyForm());
  const [keyword, setKeyword] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const imageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setItems(parsed.map((item) => normalizeProductItem(item)));
      }
    } catch {
      setItems([]);
    }
  }, []);

  const filteredItems = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return items;

    return items.filter((item) =>
      [
        item.group,
        item.category,
        item.name,
        item.spec,
        item.unit,
        item.origin,
        item.headline,
        item.memo,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [items, keyword]);

  function updateField<K extends keyof ProductItem>(
    key: K,
    value: ProductItem[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function resetForm() {
    setForm(createEmptyForm());
    setSelectedId("");

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 등록할 수 있습니다.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result === "string") {
        updateField("imageUrl", result);
      }
    };

    reader.onerror = () => {
      alert("이미지 파일을 불러오지 못했습니다.");
    };

    reader.readAsDataURL(file);
  }

  function removeImage() {
    updateField("imageUrl", "");

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }

  function saveItem() {
    if (!form.name.trim()) {
      alert("제품명을 입력해주세요.");
      return;
    }

    const cleanForm = normalizeProductItem(form);

    let currentItems: ProductItem[] = [];

    try {
      const currentRaw = localStorage.getItem(STORAGE_KEY);
      const parsed = currentRaw ? JSON.parse(currentRaw) : [];
      currentItems = Array.isArray(parsed)
        ? parsed.map((item) => normalizeProductItem(item))
        : [];
    } catch {
      currentItems = [];
    }

    if (selectedId) {
      const updated = currentItems.map((item) =>
        item.id === selectedId
          ? {
              ...cleanForm,
              id: selectedId,
              createdAt: item.createdAt || new Date().toISOString(),
            }
          : item
      );

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setItems(updated);
      resetForm();
      alert("제품이 수정되었습니다.");
      return;
    }

    const newItem: ProductItem = {
      ...cleanForm,
      id: `product-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    const updated = [newItem, ...currentItems];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setItems(updated);
    resetForm();

    alert("제품이 저장되었습니다.");
  }

  function editItem(item: ProductItem) {
    setForm(normalizeProductItem(item));
    setSelectedId(item.id);

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }

  function deleteItem(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;

    const updated = items.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setItems(updated);

    if (selectedId === id) {
      resetForm();
    }
  }

  function duplicateItem(item: ProductItem) {
    const copied: ProductItem = {
      ...normalizeProductItem(item),
      id: `product-${Date.now()}`,
      name: `${item.name} 복사본`,
      createdAt: new Date().toISOString(),
    };

    const updated = [copied, ...items];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setItems(updated);
  }

  return (
    <div className="space-y-6 text-white">
      <div>
        <h1 className={titleClass}>Product Library</h1>
        <p className={descClass}>제품 라이브러리 (유통 단가표 전용)</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[560px_1fr]">
        <section className="rounded-2xl border border-white/10 bg-[#111821] p-5">
          <h2 className={sectionTitleClass}>제품 등록 / 수정</h2>
          <p className={descClass}>
            유통 단가표에서 불러올 제품 마스터 데이터를 관리합니다.
          </p>

          <div className="mt-5 grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>제품군</label>
                <input
                  value={form.group}
                  onChange={(e) => updateField("group", e.target.value)}
                  placeholder="예: 차류, 건강식품, OEM"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>하위 카테고리</label>
                <input
                  value={form.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  placeholder="예: 대추차, 쌍화차, 황칠차"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>제품명</label>
              <input
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="제품명을 입력하세요"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>규격</label>
                <input
                  value={form.spec}
                  onChange={(e) => updateField("spec", e.target.value)}
                  placeholder="예: 100ml x 20포"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>중량</label>
                <input
                  value={form.weight}
                  onChange={(e) => updateField("weight", e.target.value)}
                  placeholder="예: 2kg"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>포장형태</label>
                <input
                  value={form.packType}
                  onChange={(e) => updateField("packType", e.target.value)}
                  placeholder="예: 박스, 파우치, 티백"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>단위</label>
                <input
                  value={form.unit}
                  onChange={(e) => updateField("unit", e.target.value)}
                  placeholder="예: 박스, 개, 팩"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>원산지</label>
              <input
                value={form.origin}
                onChange={(e) => updateField("origin", e.target.value)}
                placeholder="예: 국내산, 중국산, 베트남산"
                className={inputClass}
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0b1118] p-4">
              <div className="mb-3 text-[13px] font-medium text-[#38BDF8]">
                가격 정보
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>원가</label>
                  <input
                    value={formatNumber(form.cost)}
                    onChange={(e) =>
                      updateField("cost", toNumber(e.target.value))
                    }
                    placeholder="0"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>도매가</label>
                  <input
                    value={formatNumber(form.wholesale)}
                    onChange={(e) =>
                      updateField("wholesale", toNumber(e.target.value))
                    }
                    placeholder="0"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>소매가</label>
                  <input
                    value={formatNumber(form.retail)}
                    onChange={(e) =>
                      updateField("retail", toNumber(e.target.value))
                    }
                    placeholder="0"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>납품가</label>
                  <input
                    value={formatNumber(form.supply)}
                    onChange={(e) =>
                      updateField("supply", toNumber(e.target.value))
                    }
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>대표문구</label>
              <input
                value={form.headline}
                onChange={(e) => updateField("headline", e.target.value)}
                placeholder="유통 단가표 비고 또는 제품 소개에 활용할 문구"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>상세설명</label>
              <textarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="제품 설명을 입력하세요"
                rows={3}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>제품 이미지</label>

              <div className="rounded-2xl border border-white/10 bg-[#0b1118] p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#1a2230]">
                    {form.imageUrl ? (
                      <img
                        src={form.imageUrl}
                        alt="제품 이미지 미리보기"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-slate-500">
                        이미지 없음
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-5 text-[#9aa4b2]">
                      제품 이미지를 선택하면 유통 단가표에서 그대로 불러올 수
                      있습니다.
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="rounded-xl border border-[#38BDF8]/40 bg-[#38BDF8]/10 px-4 py-2 text-xs font-medium text-[#38BDF8] transition hover:bg-[#38BDF8]/15"
                      >
                        이미지 선택
                      </button>

                      {form.imageUrl ? (
                        <button
                          type="button"
                          onClick={removeImage}
                          className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-300 transition hover:border-red-400/40"
                        >
                          이미지 삭제
                        </button>
                      ) : null}
                    </div>

                    <p className="mt-2 text-[11px] text-slate-500">
                      저장 필드는 기존과 동일하게 imageUrl을 사용합니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>메모</label>
              <textarea
                value={form.memo}
                onChange={(e) => updateField("memo", e.target.value)}
                placeholder="내부 관리용 메모"
                rows={2}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={saveItem}
                className="rounded-xl bg-[#38BDF8] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#7DD3FC]"
              >
                {selectedId ? "수정 저장" : "제품 저장"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-white/10 bg-[#1a2230] px-4 py-2.5 text-sm text-white transition hover:border-[#38BDF8]/40"
              >
                새 입력
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#111821] p-5">
          <h2 className={sectionTitleClass}>저장된 제품 목록</h2>
          <p className={descClass}>
            저장된 제품은 이후 유통 단가표에서 불러올 수 있습니다.
          </p>

          <div className="mt-4">
            <label className={labelClass}>제품 검색</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="제품명, 제품군, 카테고리, 규격, 원산지로 검색"
              className={inputClass}
            />
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
            <div className="grid grid-cols-[46px_1.2fr_0.7fr_0.6fr_0.55fr_0.55fr_0.55fr_0.9fr] items-center gap-2 bg-[#0b1118] px-3 py-2 text-[11px] font-medium text-[#38BDF8]">
              <div>이미지</div>
              <div>제품명</div>
              <div>규격</div>
              <div>단위</div>
              <div>원산지</div>
              <div className="text-right">도매가</div>
              <div className="text-right">소매가</div>
              <div className="text-center">관리</div>
            </div>

            <div className="max-h-[760px] overflow-y-auto">
              {filteredItems.length === 0 ? (
                <div className="p-6 text-sm text-slate-400">
                  저장된 제품이 없습니다.
                </div>
              ) : (
                filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[46px_1.2fr_0.7fr_0.6fr_0.55fr_0.55fr_0.55fr_0.9fr] items-center gap-2 border-t border-white/10 px-3 py-2 text-[12px] text-slate-200"
                  >
                    <div>
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-9 w-9 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#1a2230] text-[9px] text-slate-500">
                          없음
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium text-white">
                        {item.name || "-"}
                      </div>
                      <div className="truncate text-[10px] text-slate-500">
                        {item.group || "-"} / {item.category || "-"}
                      </div>
                    </div>

                    <div className="truncate text-slate-300">
                      {item.spec || "-"}
                    </div>

                    <div className="truncate text-slate-300">
                      {item.unit || "-"}
                    </div>

                    <div className="truncate text-slate-300">
                      {item.origin || "-"}
                    </div>

                    <div className="text-right text-slate-300">
                      {item.wholesale ? item.wholesale.toLocaleString() : "-"}
                    </div>

                    <div className="text-right text-slate-300">
                      {item.retail ? item.retail.toLocaleString() : "-"}
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => editItem(item)}
                        className="rounded-md border border-white/10 bg-[#1a2230] px-1.5 py-1 text-[10px] text-white transition hover:border-[#38BDF8]/40"
                      >
                        수정
                      </button>

                      <button
                        type="button"
                        onClick={() => duplicateItem(item)}
                        className="rounded-md border border-white/10 bg-[#1a2230] px-1.5 py-1 text-[10px] text-white transition hover:border-[#38BDF8]/40"
                      >
                        복제
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteItem(item.id)}
                        className="rounded-md border border-red-500/20 bg-red-500/10 px-1.5 py-1 text-[10px] text-red-300 transition hover:border-red-400/40"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}