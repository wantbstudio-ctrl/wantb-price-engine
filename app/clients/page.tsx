"use client";

import { useEffect, useMemo, useState } from "react";

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

const STORAGE_KEYS = {
  clients: "wantb-clients",
  selectedClient: "wantb-selected-client",
};

function safeParseClients(value: string | null): ClientRecord[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item) => ({
      id: String(item.id || crypto.randomUUID()),
      name: String(item.name || ""),
      owner: String(item.owner || ""),
      businessNumber: String(item.businessNumber || ""),
      address: String(item.address || ""),
      phone: String(item.phone || ""),
      email: String(item.email || ""),
      memo: String(item.memo || ""),
      createdAt: String(item.createdAt || new Date().toISOString()),
    }));
  } catch {
    return [];
  }
}

function makeEmptyForm(): Omit<ClientRecord, "id" | "createdAt"> {
  return {
    name: "",
    owner: "",
    businessNumber: "",
    address: "",
    phone: "",
    email: "",
    memo: "",
  };
}

function normalizeText(value: string) {
  return value.trim();
}

function includesKeyword(client: ClientRecord, keyword: string) {
  const source = [
    client.name,
    client.owner,
    client.businessNumber,
    client.address,
    client.phone,
    client.email,
    client.memo,
  ]
    .join(" ")
    .toLowerCase();

  return source.includes(keyword.toLowerCase());
}

export default function ClientsPage() {
  const [mounted, setMounted] = useState(false);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState<Omit<ClientRecord, "id" | "createdAt">>(
    makeEmptyForm()
  );

  useEffect(() => {
    const savedClients = safeParseClients(
      localStorage.getItem(STORAGE_KEYS.clients)
    );
    const selectedClientRaw = localStorage.getItem(STORAGE_KEYS.selectedClient);

    let selectedClientId = "";
    if (selectedClientRaw) {
      try {
        const parsed = JSON.parse(selectedClientRaw);
        selectedClientId = parsed?.id || "";
      } catch {}
    }

    setClients(savedClients);
    setSelectedId(selectedClientId);
    setMounted(true);
  }, []);

  const filteredClients = useMemo(() => {
    const keyword = search.trim();
    if (!keyword) return clients;

    return clients.filter((client) => includesKeyword(client, keyword));
  }, [clients, search]);

  const persistClients = (next: ClientRecord[]) => {
    setClients(next);
    localStorage.setItem(STORAGE_KEYS.clients, JSON.stringify(next));
  };

  const resetForm = () => {
    setForm(makeEmptyForm());
    setEditingId("");
  };

  const handleFormChange = (
    key: keyof Omit<ClientRecord, "id" | "createdAt">,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveClient = () => {
    const nextName = normalizeText(form.name);
    const nextOwner = normalizeText(form.owner);
    const nextBusinessNumber = normalizeText(form.businessNumber);
    const nextAddress = normalizeText(form.address);
    const nextPhone = normalizeText(form.phone);
    const nextEmail = normalizeText(form.email);
    const nextMemo = normalizeText(form.memo);

    if (!nextName) {
      alert("거래처명을 입력해주세요.");
      return;
    }

    const duplicated = clients.find((client) => {
      if (editingId && client.id === editingId) return false;

      const sameName = normalizeText(client.name) === nextName;
      const sameBusinessNumber =
        nextBusinessNumber &&
        normalizeText(client.businessNumber) === nextBusinessNumber;

      return sameName || !!sameBusinessNumber;
    });

    if (duplicated) {
      alert(
        "같은 거래처명 또는 같은 사업자번호를 가진 거래처가 이미 존재합니다."
      );
      return;
    }

    if (editingId) {
      const next = clients.map((client) =>
        client.id === editingId
          ? {
              ...client,
              name: nextName,
              owner: nextOwner,
              businessNumber: nextBusinessNumber,
              address: nextAddress,
              phone: nextPhone,
              email: nextEmail,
              memo: nextMemo,
            }
          : client
      );

      persistClients(next);

      if (selectedId === editingId) {
        const selected = next.find((client) => client.id === editingId);
        if (selected) {
          localStorage.setItem(
            STORAGE_KEYS.selectedClient,
            JSON.stringify(selected)
          );
        }
      }

      alert("거래처가 수정되었습니다.");
      resetForm();
      return;
    }

    const newClient: ClientRecord = {
      id: crypto.randomUUID(),
      name: nextName,
      owner: nextOwner,
      businessNumber: nextBusinessNumber,
      address: nextAddress,
      phone: nextPhone,
      email: nextEmail,
      memo: nextMemo,
      createdAt: new Date().toISOString(),
    };

    const next = [newClient, ...clients];
    persistClients(next);
    alert("거래처가 저장되었습니다.");
    resetForm();
  };

  const handleEditClient = (client: ClientRecord) => {
    setEditingId(client.id);
    setForm({
      name: client.name,
      owner: client.owner,
      businessNumber: client.businessNumber,
      address: client.address,
      phone: client.phone,
      email: client.email,
      memo: client.memo,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDeleteClient = (id: string) => {
    const target = clients.find((client) => client.id === id);
    if (!target) return;

    const ok = window.confirm(`"${target.name}" 거래처를 삭제하시겠습니까?`);
    if (!ok) return;

    const next = clients.filter((client) => client.id !== id);
    persistClients(next);

    if (selectedId === id) {
      setSelectedId("");
      localStorage.removeItem(STORAGE_KEYS.selectedClient);
    }

    if (editingId === id) {
      resetForm();
    }

    alert("거래처가 삭제되었습니다.");
  };

  const handleSelectClient = (client: ClientRecord) => {
    setSelectedId(client.id);
    localStorage.setItem(STORAGE_KEYS.selectedClient, JSON.stringify(client));
    alert(`"${client.name}" 거래처가 선택되었습니다.`);
  };

  const handleClearSelectedClient = () => {
    setSelectedId("");
    localStorage.removeItem(STORAGE_KEYS.selectedClient);
    alert("선택된 거래처가 해제되었습니다.");
  };

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
      <div className="mx-auto grid max-w-[2360px] grid-cols-1 gap-5 xl:grid-cols-[760px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-[26px] border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <h1 className="text-[19px] font-bold text-gray-900">거래처 관리</h1>
            <p className="mt-1 text-[12px] text-gray-500">
              견적서/거래명세서에서 바로 불러올 거래처를 저장하고 관리합니다.
            </p>
          </div>

          <div className="rounded-[26px] border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-gray-900">
                  {editingId ? "거래처 수정" : "거래처 등록"}
                </h2>
                <p className="mt-1 text-[12px] text-gray-500">
                  거래처명과 사업자번호 기준으로 중복 저장을 방지합니다.
                </p>
              </div>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-[13px] font-medium text-gray-800"
              >
                새로 입력
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                    거래처명
                  </span>
                  <input
                    value={form.name}
                    onChange={(e) => handleFormChange("name", e.target.value)}
                    placeholder="예: 바우치"
                    className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                    대표자명
                  </span>
                  <input
                    value={form.owner}
                    onChange={(e) => handleFormChange("owner", e.target.value)}
                    placeholder="예: 방원우"
                    className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                    사업자번호
                  </span>
                  <input
                    value={form.businessNumber}
                    onChange={(e) =>
                      handleFormChange("businessNumber", e.target.value)
                    }
                    placeholder="예: 664-24-01226"
                    className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                    전화번호
                  </span>
                  <input
                    value={form.phone}
                    onChange={(e) => handleFormChange("phone", e.target.value)}
                    placeholder="예: 031-572-7488"
                    className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                  주소
                </span>
                <input
                  value={form.address}
                  onChange={(e) => handleFormChange("address", e.target.value)}
                  placeholder="예: 경기도 남양주시 덕송2로 10번길 15-22"
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                  이메일
                </span>
                <input
                  value={form.email}
                  onChange={(e) => handleFormChange("email", e.target.value)}
                  placeholder="예: example@company.com"
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                  메모
                </span>
                <textarea
                  value={form.memo}
                  onChange={(e) => handleFormChange("memo", e.target.value)}
                  rows={4}
                  placeholder="거래처 관련 메모를 적어두세요."
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-[14px] outline-none focus:border-gray-900"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSaveClient}
                className="rounded-2xl bg-gray-900 px-4 py-2.5 text-[13px] font-medium text-white"
              >
                {editingId ? "거래처 수정 저장" : "거래처 저장"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-[13px] font-medium text-gray-800"
              >
                입력 초기화
              </button>

              <button
                type="button"
                onClick={handleClearSelectedClient}
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] font-medium text-red-600"
              >
                선택 거래처 해제
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[26px] border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-gray-900">
                  저장된 거래처
                </h2>
                <p className="mt-1 text-[12px] text-gray-500">
                  거래명세서/견적서에서 바로 선택할 거래처 목록입니다.
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="거래처명 / 대표자 / 번호 / 전화 검색"
                className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900 lg:w-[360px]"
              />
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-[13px] text-gray-700">
              총 거래처 수:{" "}
              <span className="font-semibold text-gray-900">{clients.length}</span>
              {" / "}
              검색 결과:{" "}
              <span className="font-semibold text-gray-900">
                {filteredClients.length}
              </span>
            </div>

            {filteredClients.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-gray-300 p-10 text-center text-[13px] text-gray-500">
                {clients.length === 0
                  ? "저장된 거래처가 없습니다."
                  : "검색 결과가 없습니다."}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {filteredClients.map((client) => {
                  const isSelected = selectedId === client.id;

                  return (
                    <div
                      key={client.id}
                      className={`rounded-[22px] border p-4 transition ${
                        isSelected
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-200 bg-[#fbfbfc] text-gray-900"
                      }`}
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-[17px] font-semibold">
                              {client.name || "-"}
                            </div>
                            {isSelected ? (
                              <span className="rounded-full border border-white/30 px-2 py-0.5 text-[11px] font-medium text-white">
                                현재 선택됨
                              </span>
                            ) : null}
                          </div>

                          <div
                            className={`text-[13px] ${
                              isSelected ? "text-white/80" : "text-gray-600"
                            }`}
                          >
                            대표자: {client.owner || "-"}
                          </div>

                          <div
                            className={`text-[13px] ${
                              isSelected ? "text-white/80" : "text-gray-600"
                            }`}
                          >
                            사업자번호: {client.businessNumber || "-"}
                          </div>

                          <div
                            className={`text-[13px] ${
                              isSelected ? "text-white/80" : "text-gray-600"
                            }`}
                          >
                            전화번호: {client.phone || "-"}
                          </div>

                          <div
                            className={`text-[13px] ${
                              isSelected ? "text-white/80" : "text-gray-600"
                            }`}
                          >
                            이메일: {client.email || "-"}
                          </div>

                          <div
                            className={`text-[13px] ${
                              isSelected ? "text-white/80" : "text-gray-600"
                            }`}
                          >
                            주소: {client.address || "-"}
                          </div>

                          {client.memo ? (
                            <div
                              className={`pt-1 text-[13px] ${
                                isSelected ? "text-white/80" : "text-gray-600"
                              }`}
                            >
                              메모: {client.memo}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectClient(client)}
                            className={`rounded-2xl px-4 py-2 text-[13px] font-medium ${
                              isSelected
                                ? "border border-white/30 bg-white/10 text-white"
                                : "border border-blue-200 bg-blue-50 text-blue-600"
                            }`}
                          >
                            거래처 선택
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEditClient(client)}
                            className={`rounded-2xl px-4 py-2 text-[13px] font-medium ${
                              isSelected
                                ? "border border-white/30 bg-white/10 text-white"
                                : "border border-gray-300 bg-white text-gray-800"
                            }`}
                          >
                            수정
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteClient(client.id)}
                            className={`rounded-2xl px-4 py-2 text-[13px] font-medium ${
                              isSelected
                                ? "border border-red-200/40 bg-red-500/20 text-white"
                                : "border border-red-200 bg-red-50 text-red-600"
                            }`}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}