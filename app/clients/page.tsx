"use client";

import { useEffect, useMemo, useState } from "react";

type StoredClientItem = {
  id: string;

  // 현재 페이지 기준 필드
  clientName?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  businessNumber?: string;
  note?: string;

  // 견적서 / 거래명세서 호환 필드
  name?: string;
  owner?: string;
  memo?: string;

  createdAt: string;
  updatedAt: string;
};

type ClientItem = {
  id: string;
  clientName: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  businessNumber: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "wantb-clients";

const createEmptyClient = (): ClientItem => {
  const now = new Date().toISOString();

  return {
    id: "",
    clientName: "",
    contactName: "",
    phone: "",
    email: "",
    address: "",
    businessNumber: "",
    note: "",
    createdAt: now,
    updatedAt: now,
  };
};

const normalizeClient = (item: Partial<StoredClientItem>): ClientItem => {
  const now = new Date().toISOString();

  return {
    id: String(item.id || ""),
    clientName: String(item.clientName || item.name || "").trim(),
    contactName: String(item.contactName || item.owner || "").trim(),
    phone: String(item.phone || "").trim(),
    email: String(item.email || "").trim(),
    address: String(item.address || "").trim(),
    businessNumber: String(item.businessNumber || "").trim(),
    note: String(item.note || item.memo || "").trim(),
    createdAt: String(item.createdAt || now),
    updatedAt: String(item.updatedAt || item.createdAt || now),
  };
};

const toStoredClient = (item: ClientItem): StoredClientItem => {
  return {
    id: item.id,
    clientName: item.clientName,
    contactName: item.contactName,
    phone: item.phone,
    email: item.email,
    address: item.address,
    businessNumber: item.businessNumber,
    note: item.note,

    // 견적서 / 거래명세서 호환용
    name: item.clientName,
    owner: item.contactName,
    memo: item.note,

    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [form, setForm] = useState<ClientItem>(createEmptyClient());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved) as StoredClientItem[];
      if (!Array.isArray(parsed)) return;

      const normalized = parsed.map(normalizeClient);
      setClients(normalized);

      // 예전 데이터가 있어도 한번 로드 시점에 호환 구조로 정리 저장
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(normalized.map(toStoredClient))
      );
    } catch (error) {
      console.error("거래처 목록 로드 실패:", error);
    }
  }, []);

  const persistClients = (next: ClientItem[]) => {
    setClients(next);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(next.map(toStoredClient))
    );
  };

  const filteredClients = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    if (!keyword) return clients;

    return clients.filter((client) => {
      return [
        client.clientName,
        client.contactName,
        client.phone,
        client.email,
        client.address,
        client.businessNumber,
        client.note,
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [clients, searchKeyword]);

  const updateForm = (key: keyof ClientItem, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetForm = () => {
    setSelectedId("");
    setForm(createEmptyClient());
  };

  const handleSave = () => {
    const trimmedClientName = form.clientName.trim();
    const trimmedContactName = form.contactName.trim();

    if (!trimmedClientName) {
      alert("거래처명을 입력해 주세요.");
      return;
    }

    const now = new Date().toISOString();

    if (selectedId) {
      const next = clients.map((client) =>
        client.id === selectedId
          ? {
              ...client,
              clientName: trimmedClientName,
              contactName: trimmedContactName,
              phone: form.phone.trim(),
              email: form.email.trim(),
              address: form.address.trim(),
              businessNumber: form.businessNumber.trim(),
              note: form.note.trim(),
              updatedAt: now,
            }
          : client
      );

      persistClients(next);
      alert("거래처가 수정되었습니다.");
      return;
    }

    const newClient: ClientItem = {
      id: `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      clientName: trimmedClientName,
      contactName: trimmedContactName,
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      businessNumber: form.businessNumber.trim(),
      note: form.note.trim(),
      createdAt: now,
      updatedAt: now,
    };

    persistClients([newClient, ...clients]);
    setSelectedId(newClient.id);
    setForm(newClient);
    alert("거래처가 저장되었습니다.");
  };

  const handleLoad = (id: string) => {
    const found = clients.find((client) => client.id === id);
    if (!found) return;

    setSelectedId(found.id);
    setForm(found);
  };

  const handleDelete = (id: string) => {
    const found = clients.find((client) => client.id === id);
    if (!found) return;

    const displayName = found.clientName || "이 거래처";
    const ok = window.confirm(`"${displayName}" 거래처를 삭제하시겠습니까?`);
    if (!ok) return;

    const next = clients.filter((client) => client.id !== id);
    persistClients(next);

    if (selectedId === id) {
      resetForm();
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] px-6 py-6">
      <div className="mx-auto flex w-full max-w-[1800px] gap-6">
        <section className="w-[620px] shrink-0 space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-gray-900">거래처 저장</h1>
              <p className="mt-1 text-sm text-gray-500">
                견적서 / 거래명세서에서 불러올 거래처 정보를 관리합니다.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  거래처명
                </label>
                <input
                  value={form.clientName}
                  onChange={(e) => updateForm("clientName", e.target.value)}
                  placeholder="거래처명"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  담당자명
                </label>
                <input
                  value={form.contactName}
                  onChange={(e) => updateForm("contactName", e.target.value)}
                  placeholder="담당자명"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    연락처
                  </label>
                  <input
                    value={form.phone}
                    onChange={(e) => updateForm("phone", e.target.value)}
                    placeholder="연락처"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    이메일
                  </label>
                  <input
                    value={form.email}
                    onChange={(e) => updateForm("email", e.target.value)}
                    placeholder="이메일"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  주소
                </label>
                <input
                  value={form.address}
                  onChange={(e) => updateForm("address", e.target.value)}
                  placeholder="주소"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  사업자번호
                </label>
                <input
                  value={form.businessNumber}
                  onChange={(e) => updateForm("businessNumber", e.target.value)}
                  placeholder="사업자번호"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  비고
                </label>
                <textarea
                  value={form.note}
                  onChange={(e) => updateForm("note", e.target.value)}
                  rows={5}
                  placeholder="비고"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-500"
                />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white"
              >
                {selectedId ? "거래처 수정 저장" : "거래처 저장"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white"
              >
                새 거래처 작성
              </button>
            </div>
          </div>
        </section>

        <section className="min-w-0 flex-1">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">저장된 거래처 목록</h2>
                <p className="text-sm text-gray-500">
                  저장된 거래처를 검색하고 불러오거나 삭제할 수 있습니다.
                </p>
              </div>

              <div className="w-[320px]">
                <input
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="거래처명 / 담당자 / 연락처 검색"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-500"
                />
              </div>
            </div>

            <div className="space-y-3">
              {filteredClients.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-400">
                  저장된 거래처가 없습니다.
                </div>
              ) : (
                filteredClients.map((client) => {
                  const isSelected = selectedId === client.id;
                  const displayName = client.clientName || "거래처명 없음";

                  return (
                    <div
                      key={client.id}
                      className={`rounded-2xl border p-4 ${
                        isSelected
                          ? "border-blue-700 bg-blue-50"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="text-base font-bold text-gray-900">
                            {displayName}
                          </div>

                          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
                            <div>
                              <span className="font-semibold text-gray-800">담당자:</span>{" "}
                              {client.contactName || "-"}
                            </div>
                            <div>
                              <span className="font-semibold text-gray-800">연락처:</span>{" "}
                              {client.phone || "-"}
                            </div>
                            <div>
                              <span className="font-semibold text-gray-800">이메일:</span>{" "}
                              {client.email || "-"}
                            </div>
                            <div>
                              <span className="font-semibold text-gray-800">사업자번호:</span>{" "}
                              {client.businessNumber || "-"}
                            </div>
                          </div>

                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-semibold text-gray-800">주소:</span>{" "}
                            {client.address || "-"}
                          </div>

                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-semibold text-gray-800">비고:</span>{" "}
                            {client.note || "-"}
                          </div>

                          <div className="mt-3 text-xs text-gray-400">
                            수정일: {client.updatedAt.slice(0, 10)}
                          </div>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => handleLoad(client.id)}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700"
                          >
                            불러오기
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(client.id)}
                            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-500"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}