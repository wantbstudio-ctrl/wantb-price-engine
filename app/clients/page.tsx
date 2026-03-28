"use client";

import { useEffect, useState } from "react";

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

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<Client>({
    id: "",
    name: "",
    owner: "",
    businessNumber: "",
    address: "",
    phone: "",
    email: "",
    memo: "",
    createdAt: "",
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setClients(JSON.parse(saved));
  }, []);

  const saveClients = (data: Client[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setClients(data);
  };

  const handleChange = (key: keyof Client, value: string) => {
    setForm({ ...form, [key]: value });
  };

  const handleSave = () => {
    if (!form.name) return alert("거래처명을 입력하세요");

    if (editingId) {
      const updated = clients.map((c) =>
        c.id === editingId ? { ...form } : c
      );
      saveClients(updated);
      setEditingId(null);
    } else {
      const newClient: Client = {
        ...form,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      saveClients([newClient, ...clients]);
    }

    setForm({
      id: "",
      name: "",
      owner: "",
      businessNumber: "",
      address: "",
      phone: "",
      email: "",
      memo: "",
      createdAt: "",
    });
  };

  const handleEdit = (client: Client) => {
    setForm(client);
    setEditingId(client.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    saveClients(clients.filter((c) => c.id !== id));
  };

  const handleSelect = (client: Client) => {
    localStorage.setItem(SELECT_KEY, JSON.stringify(client));
    alert("거래처 선택 완료");
  };

  return (
    <div className="min-h-screen bg-[#f3f5f8] px-6 py-6">
      <div className="mx-auto max-w-[1400px] space-y-6">

        {/* 헤더 */}
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold">거래처 관리</h1>
          <p className="text-sm text-gray-500 mt-1">
            거래처 저장 / 선택 / 견적서·거래명세서 연동
          </p>
        </div>

        {/* 입력폼 */}
        <div className="rounded-3xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">거래처 등록</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <input
              placeholder="거래처명"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="input"
            />

            <input
              placeholder="대표자"
              value={form.owner}
              onChange={(e) => handleChange("owner", e.target.value)}
              className="input"
            />

            <input
              placeholder="사업자번호"
              value={form.businessNumber}
              onChange={(e) => handleChange("businessNumber", e.target.value)}
              className="input"
            />

            <input
              placeholder="전화번호"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              className="input"
            />

            <input
              placeholder="이메일"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="input"
            />

            <input
              placeholder="주소"
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              className="input col-span-2"
            />

            <textarea
              placeholder="메모"
              value={form.memo}
              onChange={(e) => handleChange("memo", e.target.value)}
              className="input col-span-2"
            />

          </div>

          <button
            onClick={handleSave}
            className="w-full rounded-2xl bg-black text-white py-3 text-sm font-semibold"
          >
            {editingId ? "거래처 수정" : "거래처 등록"}
          </button>
        </div>

        {/* 목록 */}
        <div className="rounded-3xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">거래처 목록</h2>

          {clients.length === 0 && (
            <div className="text-sm text-gray-400">
              등록된 거래처가 없습니다.
            </div>
          )}

          {clients.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border p-4 flex justify-between items-start"
            >
              <div className="space-y-1">
                <div className="font-semibold text-lg">{c.name}</div>
                <div className="text-sm text-gray-500">
                  {c.owner} / {c.businessNumber}
                </div>
                <div className="text-sm">{c.phone}</div>
                <div className="text-sm">{c.email}</div>
                <div className="text-sm">{c.address}</div>
                <div className="text-xs text-gray-400">{c.memo}</div>
              </div>

              <div className="flex flex-col gap-2">
                <button onClick={() => handleSelect(c)} className="btn-blue">
                  선택
                </button>
                <button onClick={() => handleEdit(c)} className="btn-gray">
                  수정
                </button>
                <button onClick={() => handleDelete(c.id)} className="btn-red">
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 공통 스타일 */}
      <style jsx>{`
        .input {
          border: 1px solid #d1d5db;
          border-radius: 14px;
          padding: 10px 12px;
          font-size: 14px;
          outline: none;
        }
        .input:focus {
          border-color: black;
        }
        .btn-blue {
          color: #2563eb;
          font-size: 13px;
        }
        .btn-gray {
          color: #374151;
          font-size: 13px;
        }
        .btn-red {
          color: #ef4444;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}