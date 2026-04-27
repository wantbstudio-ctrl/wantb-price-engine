"use client";

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";

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

const INITIAL_GROUPS = [
  "ㄱ",
  "ㄴ",
  "ㄷ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅅ",
  "ㅇ",
  "ㅈ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
  "기타",
] as const;

type InitialGroup = (typeof INITIAL_GROUPS)[number];

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

function getInitialGroup(value: string): InitialGroup {
  const first = value.trim().charAt(0);
  if (!first) return "기타";

  const code = first.charCodeAt(0);
  const start = 0xac00;
  const end = 0xd7a3;

  if (code < start || code > end) return "기타";

  const initials = [
    "ㄱ",
    "ㄲ",
    "ㄴ",
    "ㄷ",
    "ㄸ",
    "ㄹ",
    "ㅁ",
    "ㅂ",
    "ㅃ",
    "ㅅ",
    "ㅆ",
    "ㅇ",
    "ㅈ",
    "ㅉ",
    "ㅊ",
    "ㅋ",
    "ㅌ",
    "ㅍ",
    "ㅎ",
  ];

  const initial = initials[Math.floor((code - start) / 588)];

  if (initial === "ㄲ") return "ㄱ";
  if (initial === "ㄸ") return "ㄷ";
  if (initial === "ㅃ") return "ㅂ";
  if (initial === "ㅆ") return "ㅅ";
  if (initial === "ㅉ") return "ㅈ";

  return INITIAL_GROUPS.includes(initial as InitialGroup)
    ? (initial as InitialGroup)
    : "기타";
}

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
  "wb-btn wb-btn-secondary inline-flex h-[38px] items-center justify-center px-3 text-[12px] font-semibold";

const subtleButtonClass =
  "wb-btn wb-btn-secondary inline-flex h-[44px] items-center justify-center px-4 text-[13px] font-semibold";

const dangerButtonClass =
  "wb-btn wb-btn-danger inline-flex h-[38px] items-center justify-center px-3 text-[12px] font-semibold";

function formatDate(dateString: string) {
  if (!dateString) return "-";
  return dateString.slice(0, 10);
}


const ClientListRow = memo(function ClientListRow({
  client,
  isSelected,
  onLoad,
  onDelete,
}: {
  client: ClientItem;
  isSelected: boolean;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className={`grid grid-cols-[1fr_1.4fr_0.8fr_0.6fr_0.9fr_150px] items-center gap-3 border-b border-[#26313d] px-4 py-3 text-[13px] transition last:border-b-0 ${
        isSelected
          ? "bg-[#102433] ring-1 ring-inset ring-[#22b7ff]/35"
          : "bg-[#111821] hover:bg-[#18212b]"
      }`}
    >
      <div className="min-w-0">
        <div className="truncate text-[15px] font-semibold text-white">
          {client.clientName || "-"}
        </div>
      </div>

      <div className="truncate text-[#dce6ef]">{client.address || "-"}</div>

      <div className="truncate text-[#dce6ef]">{client.phone || "-"}</div>

      <div className="truncate text-[#dce6ef]">{client.contactName || "-"}</div>

      <div className="truncate text-[#dce6ef]">
        {client.businessNumber || "-"}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onLoad(client.id)}
          className={blueOutlineButtonClass}
        >
          불러오기
        </button>

        <button
          type="button"
          onClick={() => onDelete(client.id)}
          className={dangerButtonClass}
        >
          삭제
        </button>
      </div>
    </div>
  );
});

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const deferredClients = useDeferredValue(clients);
  const [selectedId, setSelectedId] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const deferredSearchKeyword = useDeferredValue(searchKeyword);
  const [selectedInitial, setSelectedInitial] = useState<InitialGroup | "전체">(
    "전체"
  );
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

  const persistClients = useCallback((next: ClientItem[]) => {
    setClients(next);

    requestAnimationFrame(() => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(next.map(toStoredClient))
      );
    });
  }, []);

  const filteredClients = useMemo(() => {
    const keyword = deferredSearchKeyword.trim().toLowerCase();

    return deferredClients.filter((client) => {
      const initial = getInitialGroup(client.clientName || client.contactName);
      const matchesInitial =
        selectedInitial === "전체" || initial === selectedInitial;

      if (!matchesInitial) return false;

      if (!keyword) return true;

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
  }, [deferredClients, deferredSearchKeyword, selectedInitial]);

  const groupedClients = useMemo(() => {
    const groups = INITIAL_GROUPS.map((initial) => ({
      initial,
      clients: [] as ClientItem[],
    }));

    filteredClients.forEach((client) => {
      const initial = getInitialGroup(client.clientName || client.contactName);
      const target = groups.find((group) => group.initial === initial);
      if (target) target.clients.push(client);
    });

    return groups.filter((group) => group.clients.length > 0);
  }, [filteredClients]);

  const updateForm = useCallback((key: keyof ClientItem, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setSelectedId("");
    setForm(createEmptyClient());
  }, []);

  const handleSave = useCallback(() => {
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
              id: selectedId,
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
  }, [clients, form, persistClients, selectedId]);

  const handleLoad = useCallback((id: string) => {
    const found = clients.find((item) => item.id === id);
    if (!found) return;

    setSelectedId(id);
    setForm(found);
  }, [clients]);

  const handleDelete = useCallback((id: string) => {
    const ok = window.confirm("이 거래처를 삭제하시겠습니까?");
    if (!ok) return;

    const next = clients.filter((item) => item.id !== id);
    persistClients(next);

    if (selectedId === id) resetForm();
  }, [clients, persistClients, resetForm, selectedId]);

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

            {selectedId ? (
              <div className="mt-4 rounded-2xl border border-[#22b7ff]/35 bg-[#102433] px-4 py-3 text-[13px] text-[#8fdfff]">
                선택된 거래처를 수정 중입니다. 내용을 변경한 뒤 “거래처 수정
                저장”을 누르세요.
              </div>
            ) : null}

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
                  거래처를 자음별로 구분해 찾고, 불러와서 수정할 수 있습니다.
                </p>
              </div>

              <div className="w-[340px]">
                <input
                  className={inputClass}
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="거래처명 / 담당자 / 연락처 검색"
                />
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-[#33414d] bg-[#171f28] p-4">
              <div className="flex flex-wrap gap-2">
                {(["전체", ...INITIAL_GROUPS] as const).map((initial) => (
                  <button
                    key={initial}
                    type="button"
                    onClick={() => setSelectedInitial(initial)}
                    className={`h-9 rounded-2xl border px-3 text-[12px] font-semibold transition ${
                      selectedInitial === initial
                        ? "border-[#22b7ff] bg-[#102433] text-[#74ddff]"
                        : "border-[#34404b] bg-[#0c1117] text-[#d6e2ec] hover:border-[#22b7ff]/60"
                    }`}
                  >
                    {initial}
                  </button>
                ))}
              </div>

              <div className="mt-3 text-[12px] text-[#9db0c2]">
                표시 거래처:{" "}
                <span className="font-semibold text-white">
                  {filteredClients.length}
                </span>
                개 / 전체 {clients.length}개
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl border border-[#33414d] bg-[#141b23]">
              <div className="grid grid-cols-[1fr_1.4fr_0.8fr_0.6fr_0.9fr_150px] items-center gap-3 border-b border-[#33414d] bg-[#202a34] px-4 py-3 text-[12px] font-semibold text-[#9fdcff]">
                <div>거래처명</div>
                <div>주소</div>
                <div>전화번호</div>
                <div>담당자</div>
                <div>사업자번호</div>
                <div className="text-center">관리</div>
              </div>

              <div className="max-h-[760px] overflow-y-auto">
                {!mounted ? (
                  <div className="px-5 py-10 text-center text-[#9db0c2]">
                    거래처 목록을 불러오는 중입니다.
                  </div>
                ) : groupedClients.length === 0 ? (
                  <div className="px-5 py-10 text-center text-[#9db0c2]">
                    저장된 거래처가 없습니다.
                  </div>
                ) : (
                  groupedClients.map((group) => (
                    <div key={group.initial}>
                      <div className="sticky top-0 z-10 border-b border-[#26313d] bg-[#0c1117] px-4 py-2 text-[13px] font-bold text-[#38BDF8]">
                        {group.initial}
                      </div>

                      {group.clients.map((client) => {
                        const isSelected = selectedId === client.id;

                        return (
                          <ClientListRow
                            key={client.id}
                            client={client}
                            isSelected={isSelected}
                            onLoad={handleLoad}
                            onDelete={handleDelete}
                          />
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
