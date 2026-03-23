export type PriceInput = {
  productName: string;
  manufacturingCost: number;
  packageCost: number;
  shippingCost: number;
  feePercent: number;
  marginPercent: number;
  offlineDiscountPercent: number;
  distributorDiscountPercent: number;
};

export type PriceResult = {
  totalBaseCost: number;
  feeAmount: number;
  marginAmount: number;
  onlinePrice: number;
  offlinePrice: number;
  distributorPrice: number;
  onlineProfit: number;
  offlineProfit: number;
  distributorProfit: number;
};

const roundWon = (value: number) => Math.round(value / 10) * 10;

export function calculatePrices(input: PriceInput): PriceResult {
  const totalBaseCost =
    input.manufacturingCost + input.packageCost + input.shippingCost;

  const feeAmount = totalBaseCost * (input.feePercent / 100);
  const marginAmount = totalBaseCost * (input.marginPercent / 100);
  const onlinePrice = roundWon(totalBaseCost + feeAmount + marginAmount);

  const offlinePrice = roundWon(
    onlinePrice * (1 - input.offlineDiscountPercent / 100),
  );
  const distributorPrice = roundWon(
    onlinePrice * (1 - input.distributorDiscountPercent / 100),
  );

  return {
    totalBaseCost,
    feeAmount,
    marginAmount,
    onlinePrice,
    offlinePrice,
    distributorPrice,
    onlineProfit: onlinePrice - totalBaseCost,
    offlineProfit: offlinePrice - totalBaseCost,
    distributorProfit: distributorPrice - totalBaseCost,
  };
}

export function formatWon(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value) + '원';
}
