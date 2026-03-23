"use client";

export default function TemplatesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Templates</h1>
        <p className="mt-1 text-sm text-gray-500">
          견적서 및 문서 템플릿을 관리하는 페이지입니다.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">기본 견적서 템플릿</h2>
          <p className="mt-2 text-sm text-gray-500">
            가장 기본적인 공급가 / VAT / 합계 구조
          </p>

          <div className="mt-4 flex gap-2">
            <button className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50">
              선택
            </button>
            <button className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50">
              수정
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-400">
            미리보기 영역
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">도매 납품 템플릿</h2>
          <p className="mt-2 text-sm text-gray-500">
            유통 / 도매 업체 납품에 적합한 형태
          </p>

          <div className="mt-4 flex gap-2">
            <button className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50">
              선택
            </button>
            <button className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50">
              수정
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-400">
            미리보기 영역
          </div>
        </div>
      </div>
    </div>
  );
}