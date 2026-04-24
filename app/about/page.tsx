"use client";

const pageCardClass = "wb-card px-6 py-6";

const titleClass = "text-[18px] font-light tracking-tight text-[#38BDF8]";
const descClass = "mt-1 text-xs leading-5 text-[#9aa4b2]";

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-[#46515d] bg-[linear-gradient(135deg,#36414d_0%,#2e3843_100%)] px-5 py-4">
      <div className="text-[11px] font-semibold tracking-[0.08em] text-[#b7c6d4]">
        {label}
      </div>
      <div className="mt-2 text-[15px] font-medium leading-7 text-[#f4f8fb]">
        {value}
      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#11161c] px-6 py-6 text-white">
      <div className="mx-auto w-full max-w-[1900px] space-y-6">
        <div className={pageCardClass}>
          <div className="mb-5">
            <h1 className="text-[29px] font-light tracking-tight text-[#38BDF8]">
  프로그램 정보
</h1>

            <p className={descClass}>
              원트비 프라이스 엔진(WantB Price Engine)의 프로그램 개요와
              현재 버전 정보를 확인하는 페이지입니다.
            </p>
          </div>

          <div className="rounded-[26px] border border-[#46515d] bg-[linear-gradient(135deg,#36414d_0%,#2e3843_100%)] p-6">
            <div className="text-[12px] font-semibold tracking-[0.1em] text-[#bcd0df]">
              WANTB PRICE ENGINE
            </div>

            <h2 className="mt-3 text-[34px] font-bold tracking-[-0.03em] text-[#ffffff]">
              원트비 프라이스 엔진
            </h2>

            <p className="mt-4 max-w-[1100px] text-[15px] leading-8 text-[#edf4fa]">
              WantB Price Engine은 셀러, 제조업, 유통업, 소상공인을 위한
              판매가 계산 + 견적 생성 + 거래명세서 작성 프로그램입니다.
              실무에서 자주 반복되는 계산, 저장, 출력 작업을 하나의 흐름으로
              정리해 보다 빠르고 안정적인 업무 처리를 돕는 것을 목표로 합니다.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className={pageCardClass}>
            <div className="mb-5">
              <h2 className={titleClass}>주요 기능</h2>
              <p className={descClass}>
                현재 원트비 프라이스 엔진에 포함된 핵심 기능을 정리한
                영역입니다.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <InfoRow
                label="판매가 계산"
                value="제조원가, 패키지비, 배송비, 광고비, 수수료, 마진율 등을 기준으로 판매가와 수익 구조를 계산합니다."
              />

              <InfoRow
                label="견적서 / 거래명세서"
                value="실무형 문서 작성과 저장, 불러오기, 인쇄, PDF/PNG/JPG 출력까지 한 흐름으로 처리할 수 있습니다."
              />

              <InfoRow
                label="유통 단가표 / 거래처 관리"
                value="거래처 저장, 유통용 단가표 작성, 문서용 회사정보와 도장/로고 관리까지 연동 가능한 구조를 갖추고 있습니다."
              />
            </div>
          </section>

          <section className="space-y-6">
            <div className={pageCardClass}>
              <div className="mb-5">
                <h2 className={titleClass}>버전 정보</h2>
                <p className={descClass}>
                  현재 프로그램의 기본 버전 및 개발 기반입니다.
                </p>
              </div>

              <div className="space-y-4">
                <InfoRow label="버전" value="v1.0" />

                <InfoRow
                  label="개발 기반"
                  value="Next.js + TypeScript + Electron"
                />

                <InfoRow
                  label="출력 지원"
                  value="PDF / PNG / JPG / 인쇄"
                />
              </div>
            </div>

            <div className={pageCardClass}>
              <div className="mb-5">
                <h2 className={titleClass}>프로그램 방향</h2>
                <p className={descClass}>
                  원트비 프라이스 엔진이 지향하는 사용 목적과 운영 방향입니다.
                </p>
              </div>

              <div className="rounded-[26px] border border-[#46515d] bg-[linear-gradient(135deg,#36414d_0%,#2e3843_100%)] px-5 py-5">
                <p className="text-[15px] leading-8 text-[#edf4fa]">
                  원트비 프라이스 엔진은 단순 계산기가 아니라,
                  판매가 산출부터 문서 작성과 출력까지 이어지는 실무형
                  프로그램을 목표로 합니다.
                  사용자는 반복적인 계산과 문서 업무를 줄이고,
                  보다 빠르게 견적과 거래 흐름을 정리할 수 있습니다.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}