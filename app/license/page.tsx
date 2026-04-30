"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type LicenseStatus = {
  activated?: boolean;
  status?: string;
  licenseKey?: string;
  hardwareId?: string;
  role?: string;
  isAdmin?: boolean;
};

type LicenseResult = {
  success?: boolean;
  message?: string;
};

type ElectronAPI = {
  getHardwareId?: () => Promise<string>;
  getLicenseStatus?: () => Promise<LicenseStatus>;
  validateAndSaveLicense?: (key: string) => Promise<LicenseResult>;
  clearLicense?: () => Promise<{ success?: boolean }>;
};

export default function LicensePage() {
  const router = useRouter();

  const [licenseKey, setLicenseKey] = useState("");
  const [hardwareId, setHardwareId] = useState("");
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadHardwareId() {
      try {
        const api = (window as any).electronAPI as ElectronAPI;

        if (api?.getHardwareId) {
          const id = await api.getHardwareId();
          if (mounted) setHardwareId(id || "");
        } else if (api?.getLicenseStatus) {
          const status = await api.getLicenseStatus();
          if (mounted) setHardwareId(status?.hardwareId || "");
        } else {
          if (mounted) setHardwareId("Electron API 없음");
        }
      } catch {
        if (mounted) setHardwareId("조회 실패");
      } finally {
        if (mounted) setChecking(false);
      }
    }

    loadHardwareId();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async () => {
    const key = licenseKey.trim();

    if (!key) {
      setMessage("라이센스 코드를 입력하세요.");
      return;
    }

    try {
      setSubmitting(true);
      setMessage("인증 중...");

      const api = (window as any).electronAPI as ElectronAPI;

      if (!api?.validateAndSaveLicense) {
        setMessage("API 연결 실패");
        return;
      }

      const result = await api.validateAndSaveLicense(key);

      if (!result?.success) {
        setMessage(result?.message || "인증 실패");
        return;
      }

      setMessage("인증 완료");

      setTimeout(() => {
        router.replace("/");
      }, 300);
    } catch {
      setMessage("에러 발생");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#151b22] text-white">
      <div className="w-[420px] rounded-xl border border-[#323c48] bg-[#1b222b] p-6">
        <h2 className="mb-4 text-xl text-[#38BDF8]">라이센스 인증</h2>

        <div className="mb-4 text-sm text-gray-400">
          Hardware ID
        </div>

        <div className="mb-4 rounded bg-black p-3 text-xs">
          {checking ? "조회중..." : hardwareId}
        </div>

        <input
          value={licenseKey}
          onChange={(e) => setLicenseKey(e.target.value)}
          placeholder="WW00000A"
          className="mb-3 w-full rounded bg-black p-3 outline-none"
        />

        <button
          onClick={handleSubmit}
          className="w-full rounded bg-[#38BDF8] p-3 font-bold text-black"
        >
          {submitting ? "인증 중..." : "인증"}
        </button>

        {message && (
          <div className="mt-4 text-sm text-gray-300">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}