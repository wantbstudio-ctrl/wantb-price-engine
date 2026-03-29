"use client";

import { useEffect, useMemo, useState } from "react";

type Client = {
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

const STORAGE_KEY = "wantb-clients";
const SELECT_KEY = "wantb-selected-client";

const emptyForm: Client = {
  id: "",
  name: "",
  owner: "",
  businessNumber: "",
  address: "",
  phone: "",
  email: "",
  memo: "",
  createdAt: "",
};

function formatDate(dateString: string) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");

  return `${y}-${m}-${d} ${hh}:${mm}`;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<Client>(emptyForm);

  useEffect(() => {
    const savedClients = localStorage.getItem(STORAGE_KEY);
    if (savedClients) {
      try {
        const parsed = JSON.parse(savedClients);
        if (Array.isArray(parsed)) {
          setClients(parsed);
        }
      } catch {}
    }

    const savedSelectedClient = localStorage.getItem(SELECT_KEY);
    if (savedSelectedClient) {
      try {
        const parsed = JSON.parse(savedSelectedClient);
        if (parsed?.id) {
          setSelectedClientId(parsed.id);
        }
      } catch {}
    }
  }, []);

  const saveClients = (data: Client[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setClients(data);
  };

  const handleChange = (key: keyof Client, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      alert("거래처명을 입력하세요");
      return;
    }

    if (editingId) {
      const updated = clients.map((client) =>
        client.id === editingId
          ? {
              ...client,
              name: form.name.trim(),
              owner: form.owner.trim(),
              businessNumber: form.businessNumber.trim(),
              address: form.address.trim(),
              phone: form.phone.trim(),
              email: form.email.trim(),
              memo: form.memo.trim(),
            }
          : client
      );

      saveClients(updated);

      const currentSelected = localStorage.getItem(SELECT_KEY);
      if (currentSelected) {
        try {
          const parsed = JSON.parse(currentSelected);
          if (parsed?.id === editingId) {
            const editedClient = updated.find((client) => client.id === editingId);
            if (editedClient) {
              localStorage.setItem(SELECT_KEY, JSON.stringify(editedClient));
            }
          }
        } catch {}
      }

      alert("거래처가 수정되었습니다.");
      resetForm();
      return;
    }

    const newClient: Client = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      owner: form.owner.trim(),
      businessNumber: form.businessNumber.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      memo: form.memo.trim(),
      createdAt: new Date().toISOString(),
    };

    saveClients([newClient, ...clients]);
    alert("거래처가 등록되었습니다.");
    resetForm();
  };

  const handleEdit = (client: Client) => {
    setForm(client);
    setEditingId(client.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id: string) => {
    const ok = window.confirm("삭제하시겠습니까?");
    if (!ok) return;

    const filtered = clients.filter((client) => client.id !== id);
    saveClients(filtered);

    if (selectedClientId === id) {
      localStorage.removeItem(SELECT_KEY);
      setSelectedClientId(null);
    }

    if (editingId === id) {
      resetForm();
    }
  };

  const handleSelect = (client: Client) => {
    localStorage.setItem(SELECT_KEY, JSON.stringify(client));
    setSelectedClientId(client.id);
    alert("거래처 선택 완료");
  };

  const selectedClient = useMemo(() => {
    return clients.find((client) => client.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  const filteredClients = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return clients;

    return clients.filter((client) => {
      return [
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
        .includes(keyword);
    });
  }, [clients, search]);

  return (
    <div className="min-h-screen bg-[#f3f5f8] px-4 py-4 xl:px-5 xl:py-5">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <div className="rounded-[26px] border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <h1 className="text-[19px] font-bold text-gray-900">거래처 관리</h1>
          <p className="mt-1 text-[12px] text-gray-500">
            거래처 저장 / 선택 / 견적서 · 거래명세서 연동용 관리 페이지입니다.
          </p>
        </div>

        <div className="rounded-[26px] border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-[16px] font-semibold text-gray-900">
                현재 선택된 거래처
              </h2>
              <p className="mt-1 text-[12px] text-gray-500">
                거래명세서와 견적서에서 바로 불러올 거래처입니다.
              </p>
            </div>

            <div className="rounded-[22px] border border-gray-200 bg-gray-50 px-4 py-3 text-[13px] text-gray-700">
              {selectedClient ? (
                <div className="flex flex-col gap-1">
                  <div className="font-semibold text-gray-900">
                    {selectedClient.name}
                  </div>
                  <div>
                    {selectedClient.owner || "-"} /{" "}
                    {selectedClient.businessNumber || "-"}
                  </div>
                  <div>{selectedClient.phone || "-"}</div>
                </div>
              ) : (
                <div className="text-gray-500">선택된 거래처가 없습니다.</div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[520px_minmax(0,1fr)]">
          <div className="rounded-[26px] border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-gray-900">
                  {editingId ? "거래처 수정" : "거래처 등록"}
                </h2>
                <p className="mt-1 text-[12px] text-gray-500">
                  거래처 기본 정보를 저장해 두고 바로 불러올 수 있습니다.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                  거래처명
                </span>
                <input
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="거래처명"
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                />
              </label>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                    대표자
                  </span>
                  <input
                    value={form.owner}
                    onChange={(e) => handleChange("owner", e.target.value)}
                    placeholder="대표자"
                    className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                    사업자번호
                  </span>
                  <input
                    value={form.businessNumber}
                    onChange={(e) =>
                      handleChange("businessNumber", e.target.value)
                    }
                    placeholder="사업자번호"
                    className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                    전화번호
                  </span>
                  <input
                    value={form.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="전화번호"
                    className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                    이메일
                  </span>
                  <input
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="이메일"
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
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="주소"
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-gray-700">
                  메모
                </span>
                <textarea
                  value={form.memo}
                  onChange={(e) => handleChange("memo", e.target.value)}
                  placeholder="메모"
                  rows={4}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-[14px] outline-none focus:border-gray-900"
                />
              </label>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                onClick={handleSave}
                className="rounded-2xl bg-gray-900 px-4 py-3 text-[14px] font-semibold text-white"
              >
                {editingId ? "거래처 수정하기" : "거래처 등록하기"}
              </button>

              <button
                onClick={resetForm}
                className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-[14px] font-semibold text-gray-800"
              >
                입력 초기화
              </button>
            </div>
          </div>

          <div className="rounded-[26px] border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-gray-900">
                  거래처 목록
                </h2>
                <p className="mt-1 text-[12px] text-gray-500">
                  등록된 거래처를 검색하고 바로 선택할 수 있습니다.
                </p>
              </div>

              <div className="w-full lg:w-[320px]">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="거래처명 / 대표자 / 번호 검색"
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none focus:border-gray-900"
                />
              </div>
            </div>

            <div className="space-y-3">
              {filteredClients.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-gray-300 p-6 text-[13px] text-gray-500">
                  {clients.length === 0
                    ? "등록된 거래처가 없습니다."
                    : "검색 결과가 없습니다."}
                </div>
              ) : (
                filteredClients.map((client) => {
                  const isSelected = selectedClientId === client.id;

                  return (
                    <div
                      key={client.id}
                      className={`rounded-[22px] border p-4 transition ${
                        isSelected
                          ? "border-gray-900 bg-gray-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="text-[18px] font-semibold text-gray-900">
                              {client.name}
                            </div>
                            {isSelected ? (
                              <span className="rounded-full bg-gray-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                                선택됨
                              </span>
                            ) : null}
                          </div>

                          <div className="text-[13px] text-gray-500">
                            {client.owner || "-"} /{" "}
                            {client.businessNumber || "-"}
                          </div>

                          <div className="text-[13px] text-gray-700">
                            전화번호: {client.phone || "-"}
                          </div>

                          <div className="text-[13px] text-gray-700">
                            이메일: {client.email || "-"}
                          </div>

                          <div className="text-[13px] text-gray-700">
                            주소: {client.address || "-"}
                          </div>

                          <div className="text-[12px] text-gray-500">
                            메모: {client.memo || "-"}
                          </div>

                          <div className="pt-1 text-[11px] text-gray-400">
                            등록일: {formatDate(client.createdAt)}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 xl:w-[240px] xl:justify-end">
                          <button
                            onClick={() => handleSelect(client)}
                            className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-[13px] font-semibold text-blue-600"
                          >
                            선택
                          </button>

                          <button
                            onClick={() => handleEdit(client)}
                            className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-[13px] font-semibold text-gray-800"
                          >
                            수정
                          </button>

                          <button
                            onClick={() => handleDelete(client.id)}
                            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-[13px] font-semibold text-red-600"
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
        </div>
      </div>
    </div>
  );
}