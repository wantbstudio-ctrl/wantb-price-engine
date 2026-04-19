"use client";

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

type ClientSelectBoxProps = {
  clients: ClientItem[];
  selectedClientId: string;
  clientName: string;
  clientContactName: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  clientBusinessNumber: string;
  onSelectClient: (clientId: string) => void;
  onChangeClientName: (value: string) => void;
  onChangeClientContactName: (value: string) => void;
  onChangeClientPhone: (value: string) => void;
  onChangeClientEmail: (value: string) => void;
  onChangeClientAddress: (value: string) => void;
  onChangeClientBusinessNumber: (value: string) => void;
  title?: string;
};

export default function ClientSelectBox({
  clients,
  selectedClientId,
  clientName,
  clientContactName,
  clientPhone,
  clientEmail,
  clientAddress,
  clientBusinessNumber,
  onSelectClient,
  onChangeClientName,
  onChangeClientContactName,
  onChangeClientPhone,
  onChangeClientEmail,
  onChangeClientAddress,
  onChangeClientBusinessNumber,
  title = "거래처 정보",
}: ClientSelectBoxProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">
          저장된 거래처를 불러오거나 직접 수정할 수 있습니다.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            거래처 선택
          </label>
          <select
            value={selectedClientId}
            onChange={(e) => onSelectClient(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-500"
          >
            <option value="">거래처 선택 안함</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.clientName}
                {client.contactName ? ` / ${client.contactName}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            거래처명
          </label>
          <input
            value={clientName}
            onChange={(e) => onChangeClientName(e.target.value)}
            placeholder="거래처명"
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            담당자명
          </label>
          <input
            value={clientContactName}
            onChange={(e) => onChangeClientContactName(e.target.value)}
            placeholder="담당자명"
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            연락처
          </label>
          <input
            value={clientPhone}
            onChange={(e) => onChangeClientPhone(e.target.value)}
            placeholder="연락처"
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            이메일
          </label>
          <input
            value={clientEmail}
            onChange={(e) => onChangeClientEmail(e.target.value)}
            placeholder="이메일"
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-500"
          />
        </div>

        <div className="col-span-2">
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            주소
          </label>
          <input
            value={clientAddress}
            onChange={(e) => onChangeClientAddress(e.target.value)}
            placeholder="거래처 주소"
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-500"
          />
        </div>

        <div className="col-span-2">
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            사업자번호
          </label>
          <input
            value={clientBusinessNumber}
            onChange={(e) => onChangeClientBusinessNumber(e.target.value)}
            placeholder="사업자번호"
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-500"
          />
        </div>
      </div>
    </div>
  );
}