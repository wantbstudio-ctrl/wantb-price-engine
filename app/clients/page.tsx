"use client";

import { useEffect, useMemo, useState } from "react";

type StoredClientItem = {
  id: string;
  clientName?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  businessNumber?: string;
  note?: string;
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

const toStoredClient = (item: ClientItem): StoredClientItem => ({
  id: item.id,
  clientName: item.clientName,
  contactName: item.contactName,
  phone: item.phone,
  email: item.email,
  address: item.address,
  businessNumber: item.businessNumber,
  note: item.note,
  name: item.clientName,
  owner: item.contactName,
  memo: item.note,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const pageCardClass = "wb-card px-5 py-5";

const inputClass =
  "h-[44px] w-full rounded-2xl border border-[#34404b] bg-[#0c1117] px-4 text-[14px] text-[#f4f8fb] outline-none placeholder:text-[#6f7b88] transition focus:border-[#22b7ff] focus:bg-[#10161d]";

const textareaClass =
  "w-full rounded-2xl border border-[#34404b] bg-[#0c1117] px-4 py-3 text-[14px] text-[#f4f8fb] outline-none placeholder:text-[#6f7b88] transition focus:border-[#22b7ff] focus:bg-[#10161d]";

const titleClass = "text-[18px] font-light tracking-tight text-[#38BDF8]";
const descClass = "mt-1 text-xs leading-5 text-[#9aa4b2]";

const primaryButtonClass =
  "wb-btn wb-btn-primary inline-flex h-[44px] items-center justify-center px-4 text-[13px] font-semibold";

const blueOutlineButtonClass =
  "wb-btn wb-btn-secondary inline-flex h-[44px] items-center justify-center px-4 text-[13px] font-semibold";

const subtleButtonClass =
  "wb-btn wb-btn-secondary inline-flex h-[44px] items-center justify-center px-4 text-[13px] font-semibold";

const dangerButtonClass =
  "wb-btn wb-btn-danger inline-flex h-[44px] items-center justify-center px-4 text-[13px] font-semibold";

function formatDate(dateString: string) {
  if (!dateString) return "-";
  return dateString.slice(0, 10);
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [form, setForm] = useState<ClientItem>(createEmptyClient());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        setMounted(true);
        return;
      }

      const parsed = JSON.parse(saved) as StoredClientItem[];
      const normalized = Array.isArray(parsed)
        ? parsed.map(normalizeClient)
        : [];

      setClients(normalized);

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(normalized.map(toStoredClient))
      );
    } catch (error) {
      console.error(error);
    } finally {
      setMounted(true);
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

    return clients.filter((client) =>
      [
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
        .includes(keyword)
    );
  }, [clients, searchKeyword]);

  const updateForm = (key: keyof ClientItem, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setSelectedId("");
    setForm(createEmptyClient());
  };

  const handleSave = () => {
    if (!form.clientName.trim()) {
      alert("거래처명을 입력해 주세요.");
      return;
    }

    const now = new Date().toISOString();

    if (selectedId) {
      const next = clients.map((client) =>
        client.id === selectedId
          ? {
              ...client,
              ...form,
              updatedAt: now,
            }
          : client
      );

      persistClients(next);
      alert("거래처가 수정되었습니다.");
      return;
    }

    const newClient: ClientItem = {
      ...form,
      id: `client-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };

    persistClients([newClient, ...clients]);
    setSelectedId(newClient.id);
    setForm(newClient);
    alert("거래처가 저장되었습니다.");
  };

  const handleLoad = (id: string) => {
    const found = clients.find((item) => item.id === id);
    if (!found) return;

    setSelectedId(id);
    setForm(found);
  };

  const handleDelete = (id: string) => {
    const ok = window.confirm("이 거래처를 삭제하시겠습니까?");
    if (!ok) return;

    const next = clients.filter((item) => item.id !== id);
    persistClients(next);

    if (selectedId === id) resetForm();
  };

  return (
    <div className="min-h-screen bg-[#11161c] px-6 py-6 text-white">
      <div className="mx-auto flex w-full max-w-[1900px] gap-6">
        {/* 좌측 */}
        <section className="w-[620px] shrink-0">
          <div className={pageCardClass}>
 <h1 className="text-[29px] font-light tracking-tight text-[#38BDF8]">
  거래처 저장
</h1>
            <p className={descClass}>
              견적서 / 거래명세서에서 불러올 거래처 정보를 관리합니다.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-[13px] text-[#dbe7f1]">
                  거래처명
                </label>
                <input
                  className={inputClass}
                  value={form.clientName}
                  onChange={(e) => updateForm("clientName", e.target.value)}
                  placeholder="거래처명"
                />
              </div>

              <div>
                <label className="mb-2 block text-[13px] text-[#dbe7f1]">
                  담당자명
                </label>
                <input
                  className={inputClass}
                  value={form.contactName}
                  onChange={(e) => updateForm("contactName", e.target.value)}
                  placeholder="담당자명"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input
                  className={inputClass}
                  value={form.phone}
                  onChange={(e) => updateForm("phone", e.target.value)}
                  placeholder="연락처"
                />
                <input
                  className={inputClass}
                  value={form.email}
                  onChange={(e) => updateForm("email", e.target.value)}
                  placeholder="이메일"
                />
              </div>

              <input
                className={inputClass}
                value={form.address}
                onChange={(e) => updateForm("address", e.target.value)}
                placeholder="주소"
              />

              <input
                className={inputClass}
                value={form.businessNumber}
                onChange={(e) => updateForm("businessNumber", e.target.value)}
                placeholder="사업자번호"
              />

              <textarea
                rows={6}
                className={textareaClass}
                value={form.note}
                onChange={(e) => updateForm("note", e.target.value)}
                placeholder="비고"
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button onClick={handleSave} className={primaryButtonClass}>
                {selectedId ? "거래처 수정 저장" : "거래처 저장"}
              </button>

              <button onClick={resetForm} className={subtleButtonClass}>
                새 거래처 작성
              </button>
            </div>
          </div>
        </section>

        {/* 우측 */}
        <section className="min-w-0 flex-1">
          <div className={pageCardClass}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className={titleClass}>저장된 거래처 목록</h2>
                <p className={descClass}>
                  저장된 거래처를 검색하고 불러오거나 삭제할 수 있습니다.
                </p>
              </div>

              <div className="w-[320px]">
                <input
                  className={inputClass}
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="거래처명 / 담당자 / 연락처 검색"
                />
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {!mounted ? (
                <div className="rounded-3xl border border-[#33414d] bg-[#222a33] px-5 py-10 text-center text-[#9db0c2]">
                  거래처 목록을 불러오는 중입니다.
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="rounded-3xl border border-[#33414d] bg-[#222a33] px-5 py-10 text-center text-[#9db0c2]">
                  저장된 거래처가 없습니다.
                </div>
              ) : (
                filteredClients.map((client) => {
                  const isSelected = selectedId === client.id;

                  return (
                    <div
                      key={client.id}
                      className={`rounded-[28px] border p-5 transition ${
                        isSelected
                          ? "border-[#22b7ff] bg-[linear-gradient(135deg,#2f3945_0%,#26303b_100%)] ring-1 ring-[rgba(34,183,255,0.25)]"
                          : "border-[#3f4a56] bg-[linear-gradient(135deg,#36414d_0%,#2e3843_100%)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[26px] font-bold text-white">
                            {client.clientName}
                          </h3>

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl bg-[#2a333d] px-4 py-3">
                              담당자
                              <div className="mt-1 text-white">
                                {client.contactName || "-"}
                              </div>
                            </div>

                            <div className="rounded-2xl bg-[#2a333d] px-4 py-3">
                              연락처
                              <div className="mt-1 text-white">
                                {client.phone || "-"}
                              </div>
                            </div>

                            <div className="rounded-2xl bg-[#2a333d] px-4 py-3">
                              이메일
                              <div className="mt-1 break-all text-white">
                                {client.email || "-"}
                              </div>
                            </div>

                            <div className="rounded-2xl bg-[#2a333d] px-4 py-3">
                              사업자번호
                              <div className="mt-1 text-white">
                                {client.businessNumber || "-"}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 rounded-2xl bg-[#2a333d] px-4 py-3">
                            주소
                            <div className="mt-1 text-white">
                              {client.address || "-"}
                            </div>
                          </div>

                          <div className="mt-3 rounded-2xl bg-[#2a333d] px-4 py-3">
                            비고
                            <div className="mt-1 whitespace-pre-wrap text-white">
                              {client.note || "-"}
                            </div>
                          </div>

                          <div className="mt-3 text-[12px] text-[#d1d9e0]">
                            생성일: {formatDate(client.createdAt)} / 수정일:{" "}
                            {formatDate(client.updatedAt)}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleLoad(client.id)}
                            className={blueOutlineButtonClass}
                          >
                            불러오기
                          </button>

                          <button
                            onClick={() => handleDelete(client.id)}
                            className={dangerButtonClass}
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