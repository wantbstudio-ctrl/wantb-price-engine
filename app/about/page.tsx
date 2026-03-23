"use client";

export default function AboutPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">About</h1>
        <p className="mt-1 text-sm text-gray-500">
          WantB Price Engine 프로그램 정보를 확인하는 페이지입니다.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">WantB Price Engine</h2>
        <p className="mt-3 text-sm leading-7 text-gray-600">
          WantB Price Engine은 셀러, 제조업, 유통업, 소상공인을 위한
          판매가 계산 + 견적 생성 프로그램입니다.
        </p>

        <div className="mt-6 space-y-2 text-sm text-gray-600">
          <p>
            <span className="font-medium text-gray-800">버전:</span> v1.0
          </p>
          <p>
            <span className="font-medium text-gray-800">기능:</span> 판매가 계산,
            제품 저장, 견적 작성, PDF/PNG 출력
          </p>
          <p>
            <span className="font-medium text-gray-800">개발 기반:</span> Next.js +
            TypeScript + Electron
          </p>
        </div>
      </div>
    </div>
  );
}