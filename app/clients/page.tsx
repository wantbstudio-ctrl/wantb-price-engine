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

  // 불러오기
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setClients(JSON.parse(saved));
    }
  }, []);

  // 저장
  const saveClients = (data: Client[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setClients(data);
  };

  // 입력 변경
  const handleChange = (key: keyof Client, value: string) => {
    setForm({ ...form, [key]: value });
  };

  // 등록 / 수정
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

  // 수정 시작
  const handleEdit = (client: Client) => {
    setForm(client);
    setEditingId(client.id);
  };

  // 삭제
  const handleDelete = (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    const updated = clients.filter((c) => c.id !== id);
    saveClients(updated);
  };

  // 선택 (다음 모듈 연결용)
  const handleSelect = (client: Client) => {
    localStorage.setItem(SELECT_KEY, JSON.stringify(client));
    alert("거래처 선택 완료 (다음 기능에서 사용)");
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">거래처 관리 (Clients)</h1>

      {/* 입력폼 */}
      <div className="grid grid-cols-2 gap-4 border p-4 rounded bg-white">
        <input
          placeholder="거래처명"
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          className="border p-2"
        />
        <input
          placeholder="대표자"
          value={form.owner}
          onChange={(e) => handleChange("owner", e.target.value)}
          className="border p-2"
        />
        <input
          placeholder="사업자번호"
          value={form.businessNumber}
          onChange={(e) => handleChange("businessNumber", e.target.value)}
          className="border p-2"
        />
        <input
          placeholder="전화번호"
          value={form.phone}
          onChange={(e) => handleChange("phone", e.target.value)}
          className="border p-2"
        />
        <input
          placeholder="이메일"
          value={form.email}
          onChange={(e) => handleChange("email", e.target.value)}
          className="border p-2"
        />
        <input
          placeholder="주소"
          value={form.address}
          onChange={(e) => handleChange("address", e.target.value)}
          className="border p-2 col-span-2"
        />
        <textarea
          placeholder="메모"
          value={form.memo}
          onChange={(e) => handleChange("memo", e.target.value)}
          className="border p-2 col-span-2"
        />

        <button
          onClick={handleSave}
          className="bg-black text-white p-2 col-span-2"
        >
          {editingId ? "거래처 수정" : "거래처 등록"}
        </button>
      </div>

      {/* 목록 */}
      <div className="space-y-3">
        {clients.map((c) => (
          <div
            key={c.id}
            className="border p-4 rounded bg-white flex justify-between items-start"
          >
            <div>
              <div className="font-bold text-lg">{c.name}</div>
              <div className="text-sm text-gray-600">
                {c.owner} / {c.businessNumber}
              </div>
              <div className="text-sm">{c.phone}</div>
              <div className="text-sm">{c.email}</div>
              <div className="text-sm">{c.address}</div>
              <div className="text-xs text-gray-400">{c.memo}</div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleSelect(c)}
                className="text-blue-500 text-sm"
              >
                선택
              </button>

              <button
                onClick={() => handleEdit(c)}
                className="text-gray-700 text-sm"
              >
                수정
              </button>

              <button
                onClick={() => handleDelete(c.id)}
                className="text-red-500 text-sm"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}