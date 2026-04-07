"use client";

import { useEffect, useRef, useState } from "react";

type Company = {
  companyName: string;
  ceo: string;
  businessNumber: string;
  address: string;
  phone: string;
  email: string;
  logo: string | null;
  stamp: string | null;
};

const initialCompany: Company = {
  companyName: "",
  ceo: "",
  businessNumber: "",
  address: "",
  phone: "",
  email: "",
  logo: null,
  stamp: null,
};

export default function CompanySettingsPage() {
  const [company, setCompany] = useState<Company>(initialCompany);
  const [message, setMessage] = useState("");

  const logoInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("wantb-company-settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCompany({ ...initialCompany, ...parsed });
      } catch {
        setCompany(initialCompany);
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("wantb-company-settings", JSON.stringify(company));
    setMessage("저장되었습니다.");
  };

  const handleReset = () => {
    setCompany(initialCompany);
    setMessage("");

    setTimeout(() => {
      const input = document.querySelector(
        'input[name="companyName"]'
      ) as HTMLInputElement | null;
      input?.focus();
    }, 0);
  };

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "logo" | "stamp"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCompany((prev) => ({
        ...prev,
        [type]: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

const noDragStyle = {
  WebkitAppRegion: "no-drag",
} as any;

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">Company Settings</h1>

      <div className="max-w-3xl space-y-5">
        <input
          name="companyName"
          placeholder="업체명"
          value={company.companyName}
          onChange={(e) =>
            setCompany({ ...company, companyName: e.target.value })
          }
          className="w-full rounded-lg border px-4 py-3"
          style={noDragStyle}
        />

        <input
          placeholder="대표자명"
          value={company.ceo}
          onChange={(e) => setCompany({ ...company, ceo: e.target.value })}
          className="w-full rounded-lg border px-4 py-3"
          style={noDragStyle}
        />

        <input
          placeholder="사업자번호"
          value={company.businessNumber}
          onChange={(e) =>
            setCompany({
              ...company,
              businessNumber: e.target.value,
            })
          }
          className="w-full rounded-lg border px-4 py-3"
          style={noDragStyle}
        />

        <input
          placeholder="주소"
          value={company.address}
          onChange={(e) => setCompany({ ...company, address: e.target.value })}
          className="w-full rounded-lg border px-4 py-3"
          style={noDragStyle}
        />

        <input
          placeholder="전화번호"
          value={company.phone}
          onChange={(e) => setCompany({ ...company, phone: e.target.value })}
          className="w-full rounded-lg border px-4 py-3"
          style={noDragStyle}
        />

        <input
          placeholder="이메일"
          value={company.email}
          onChange={(e) => setCompany({ ...company, email: e.target.value })}
          className="w-full rounded-lg border px-4 py-3"
          style={noDragStyle}
        />

        <div>
          <p className="mb-2 text-sm">로고 이미지</p>

          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleImageChange(e, "logo")}
            style={noDragStyle}
          />

          <div className="mt-3 flex h-[120px] items-center justify-center rounded border">
            {company.logo ? (
              <img src={company.logo} className="max-h-full" alt="로고 미리보기" />
            ) : (
              <span className="text-gray-400">미리보기 없음</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setCompany({ ...company, logo: null })}
            className="mt-2 text-sm text-gray-500"
            style={noDragStyle}
          >
            선택 안함
          </button>
        </div>

        <div>
          <p className="mb-2 text-sm">도장 이미지</p>

          <input
            ref={stampInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleImageChange(e, "stamp")}
            style={noDragStyle}
          />

          <div className="mt-3 flex h-[120px] items-center justify-center rounded border">
            {company.stamp ? (
              <img src={company.stamp} className="max-h-full" alt="도장 미리보기" />
            ) : (
              <span className="text-gray-400">미리보기 없음</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setCompany({ ...company, stamp: null })}
            className="mt-2 text-sm text-gray-500"
            style={noDragStyle}
          >
            선택 안함
          </button>
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="rounded bg-black px-6 py-3 text-white"
          style={noDragStyle}
        >
          저장하기
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="rounded border px-6 py-3"
          style={noDragStyle}
        >
          초기화
        </button>
      </div>

      {message && <div className="mt-4 text-green-600">{message}</div>}
    </div>
  );
}