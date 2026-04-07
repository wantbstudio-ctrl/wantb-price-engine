"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LicensePage() {
  const router = useRouter();

  const [hardwareId, setHardwareId] = useState("");
  const [licenseCode, setLicenseCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const noDragStyle = {
    WebkitAppRegion: "no-drag",
  } as any;

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        if (typeof window === "undefined") return;

        const savedStatus = localStorage.getItem("wantb-license");

        if (savedStatus === "ACTIVE") {
          router.replace("/");
          return;
        }

        if (window.electronAPI?.getLicenseStatus) {
const licenseStatus = await window.electronAPI.getLicenseStatus();

if (!mounted) return;

if (licenseStatus?.status === "ACTIVE") {
  localStorage.setItem("wantb-license", "ACTIVE");
  router.replace("/");
  return;
}
        }

        if (window.electronAPI?.getHardwareId) {
          const id = await window.electronAPI.getHardwareId();

          if (!mounted) return;
          setHardwareId(id || "");
        }
      } catch (error) {
        console.error("License init error:", error);
        if (mounted) {
          setMessage("라이센스 정보를 불러오는 중 문제가 발생했습니다.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [router]);

  const handleActivate = async () => {
    if (!licenseCode.trim()) {
      setMessage("라이센스 코드를 입력해주세요.");
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");

      if (!window.electronAPI?.validateAndSaveLicense) {
        setMessage("Electron API를 찾을 수 없습니다.");
        return;
      }

      const result = await window.electronAPI.validateAndSaveLicense(
        licenseCode.trim()
      );

      if (result?.success) {
  localStorage.setItem("wantb-license", "ACTIVE");
  setMessage("인증 완료. 잠시 후 이동합니다.");
  router.replace("/");
} else {
  setMessage("라이센스 인증에 실패했습니다.");
}
    } catch (error) {
      console.error("License activate error:", error);
      setMessage("라이센스 인증 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      await handleActivate();
    }
  };

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-gray-100"
        style={noDragStyle}
      >
        <div
          className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg"
          style={noDragStyle}
        >
          <h1 className="mb-3 text-2xl font-bold text-gray-900">
            WantB Price Engine
          </h1>
          <p className="text-sm text-gray-600">라이센스 확인 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gray-100 px-4"
      style={noDragStyle}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg"
        style={noDragStyle}
      >
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          WantB Price Engine
        </h1>
        <p className="mb-6 text-sm text-gray-600">
          라이센스 키를 입력해 프로그램을 활성화하세요.
        </p>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Hardware ID
          </label>
          <input
            type="text"
            value={hardwareId}
            readOnly
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none"
            style={noDragStyle}
          />
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            License Code
          </label>
          <input
            type="text"
            value={licenseCode}
            onChange={(e) => setLicenseCode(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder="예: WW12345A"
            autoFocus
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-900"
            style={noDragStyle}
          />
        </div>

        {message ? (
          <div className="mb-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
            {message}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleActivate}
          disabled={submitting}
          className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          style={noDragStyle}
        >
          {submitting ? "인증 중..." : "활성화"}
        </button>
      </div>
    </div>
  );
}