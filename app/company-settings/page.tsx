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

const STORAGE_KEY = "wantb-company-settings";

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

const pageCardClass = "wb-card px-5 py-5";

const inputClass =
  "h-[44px] w-full rounded-2xl border border-[#34404b] bg-[#0c1117] px-4 text-[14px] text-[#f4f8fb] outline-none placeholder:text-[#6f7b88] transition focus:border-[#22b7ff] focus:bg-[#10161d]";

const titleClass = "text-[18px] font-light tracking-tight text-[#38BDF8]";
const descClass = "mt-1 text-xs leading-5 text-[#9aa4b2]";

const primaryButtonClass =
  "wb-btn wb-btn-primary inline-flex h-[44px] items-center justify-center px-4 text-[13px] font-semibold";

const subtleButtonClass =
  "wb-btn wb-btn-secondary inline-flex h-[44px] items-center justify-center px-4 text-[13px] font-semibold";

const uploadButtonClass =
  "wb-btn wb-btn-secondary inline-flex h-[40px] items-center justify-center px-4 text-[13px] font-semibold";

const removeButtonClass =
  "wb-btn wb-btn-danger inline-flex h-[36px] items-center justify-center px-4 text-[12px] font-semibold";

const noDragStyle = {
  WebkitAppRegion: "no-drag",
} as any;

function PreviewPaper({
  title,
  image,
  emptyText,
  imageAlt,
}: {
  title: string;
  image: string | null;
  emptyText: string;
  imageAlt: string;
}) {
  return (
    <div className="mt-5 rounded-[28px] border border-[#46515d] bg-[linear-gradient(135deg,#3a4652_0%,#313b46_100%)] p-5">
      <div className="mb-3 text-[12px] font-semibold tracking-[0.08em] text-[#c3d0db]">
        {title}
      </div>

      <div className="rounded-[22px] border border-[#cfd5dc] bg-[linear-gradient(180deg,#f0f2f4_0%,#e7ebef_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
        <div className="flex h-[240px] items-center justify-center rounded-[18px] border border-[#c9d3dc] bg-[linear-gradient(180deg,#eef2f5_0%,#e6ebef_100%)] px-6">
          {image ? (
            <img
              src={image}
              alt={imageAlt}
              className="max-h-[180px] max-w-full object-contain"
            />
          ) : (
            <span className="text-[14px] font-medium text-[#6e7a87]">
              {emptyText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CompanySettingsPage() {
  const [company, setCompany] = useState<Company>(initialCompany);
  const [message, setMessage] = useState("");

  const logoInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      setCompany({ ...initialCompany, ...parsed });
    } catch {
      setCompany(initialCompany);
    }
  }, []);

  const updateField = (key: keyof Company, value: string | null) => {
    setCompany((prev) => ({
      ...prev,
      [key]: value,
    }));
    setMessage("");
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(company));
    setMessage("회사 설정이 저장되었습니다.");
  };

  const handleReset = () => {
    setCompany(initialCompany);
    setMessage("");

    if (logoInputRef.current) logoInputRef.current.value = "";
    if (stampInputRef.current) stampInputRef.current.value = "";

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
      setMessage("");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-[#11161c] px-6 py-6 text-white">
      <div className="mx-auto flex w-full max-w-[1900px] gap-6">
        {/* 좌측 입력 */}
        <section className="w-[720px] shrink-0">
          <div className={pageCardClass}>
            <div className="mb-5">
 <h1 className="text-[29px] font-light tracking-tight text-[#38BDF8]">
  회사설정
</h1>
              <p className={descClass}>
                견적서, 거래명세서, 유통 단가표에 공통 반영될 회사 정보를 관리합니다.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="mb-2 block text-[13px] font-semibold text-[#dbe7f1]">
                  업체명
                </label>
                <input
                  name="companyName"
                  placeholder="업체명"
                  value={company.companyName}
                  onChange={(e) => updateField("companyName", e.target.value)}
                  className={inputClass}
                  style={noDragStyle}
                />
              </div>

              <div>
                <label className="mb-2 block text-[13px] font-semibold text-[#dbe7f1]">
                  대표자명
                </label>
                <input
                  placeholder="대표자명"
                  value={company.ceo}
                  onChange={(e) => updateField("ceo", e.target.value)}
                  className={inputClass}
                  style={noDragStyle}
                />
              </div>

              <div>
                <label className="mb-2 block text-[13px] font-semibold text-[#dbe7f1]">
                  사업자번호
                </label>
                <input
                  placeholder="사업자번호"
                  value={company.businessNumber}
                  onChange={(e) =>
                    updateField("businessNumber", e.target.value)
                  }
                  className={inputClass}
                  style={noDragStyle}
                />
              </div>

              <div>
                <label className="mb-2 block text-[13px] font-semibold text-[#dbe7f1]">
                  주소
                </label>
                <input
                  placeholder="주소"
                  value={company.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  className={inputClass}
                  style={noDragStyle}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-[13px] font-semibold text-[#dbe7f1]">
                    전화번호
                  </label>
                  <input
                    placeholder="전화번호"
                    value={company.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className={inputClass}
                    style={noDragStyle}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[13px] font-semibold text-[#dbe7f1]">
                    이메일
                  </label>
                  <input
                    placeholder="이메일"
                    value={company.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className={inputClass}
                    style={noDragStyle}
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleSave}
                className={primaryButtonClass}
                style={noDragStyle}
              >
                저장하기
              </button>

              <button
                type="button"
                onClick={handleReset}
                className={subtleButtonClass}
                style={noDragStyle}
              >
                초기화
              </button>
            </div>

            {message ? (
              <div className="mt-4 rounded-2xl border border-[#244f69] bg-[#102433] px-4 py-3 text-[13px] font-medium text-[#7fe0ff]">
                {message}
              </div>
            ) : null}
          </div>
        </section>

        {/* 우측 미리보기 */}
        <section className="min-w-0 flex-1 space-y-6">
          <div className={pageCardClass}>
            <div className="mb-5">
              <h2 className={titleClass}>로고 이미지</h2>
              <p className={descClass}>
                문서 상단 또는 회사 정보 영역에 사용할 로고를 등록합니다.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className={uploadButtonClass}
                style={noDragStyle}
              >
                로고 파일 선택
              </button>

              <button
                type="button"
                onClick={() => {
                  updateField("logo", null);
                  if (logoInputRef.current) logoInputRef.current.value = "";
                }}
                className={removeButtonClass}
                style={noDragStyle}
              >
                선택 안함
              </button>

              <span className="text-[12px] text-[#8ea0b2]">
                PNG, JPG 등 이미지 파일 업로드 가능
              </span>
            </div>

            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageChange(e, "logo")}
              className="hidden"
            />

            <PreviewPaper
              title="로고 미리보기"
              image={company.logo}
              emptyText="미리보기 없음"
              imageAlt="로고 미리보기"
            />
          </div>

          <div className={pageCardClass}>
            <div className="mb-5">
              <h2 className={titleClass}>도장 이미지</h2>
              <p className={descClass}>
                견적서, 거래명세서 등에 반영할 도장 이미지를 등록합니다.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => stampInputRef.current?.click()}
                className={uploadButtonClass}
                style={noDragStyle}
              >
                도장 파일 선택
              </button>

              <button
                type="button"
                onClick={() => {
                  updateField("stamp", null);
                  if (stampInputRef.current) stampInputRef.current.value = "";
                }}
                className={removeButtonClass}
                style={noDragStyle}
              >
                선택 안함
              </button>

              <span className="text-[12px] text-[#8ea0b2]">
                투명 배경 PNG 사용 시 가장 깔끔합니다.
              </span>
            </div>

            <input
              ref={stampInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageChange(e, "stamp")}
              className="hidden"
            />

            <PreviewPaper
              title="도장 미리보기"
              image={company.stamp}
              emptyText="미리보기 없음"
              imageAlt="도장 미리보기"
            />
          </div>
        </section>
      </div>
    </div>
  );
}