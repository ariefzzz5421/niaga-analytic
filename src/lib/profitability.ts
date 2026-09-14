export type MarketplaceId = "shopee" | "tiktok" | "tokopedia" | "lazada" | "blibli" | "website";
export interface FeeRule { label: string; rate?: number; fixed?: number; source?: string; verifiedAt?: string; }
export interface ProfitInput { hpp: number; sellingPrice: number; quantity: number; packaging?: number; shippingSubsidy?: number; sellerDiscount?: number; advertising?: number; affiliateRate?: number; otherCost?: number; }
export interface ProfitResult { grossRevenue: number; marketplaceFees: number; netSettlement: number; netProfit: number; netMargin: number; effectiveTakeRate: number; breakdown: { label: string; amount: number }[]; }
export function calculateProfit(input: ProfitInput, fees: FeeRule[]): ProfitResult {
  const { hpp: costOfGoods, sellingPrice, quantity: requestedQuantity, packaging = 0, shippingSubsidy = 0, sellerDiscount = 0, advertising = 0, affiliateRate = 0, otherCost = 0 } = input;
  const quantity = Math.max(1, Math.floor(requestedQuantity || 1));
  const grossRevenue = Math.max(0, sellingPrice) * quantity;
  const breakdown = fees.map((fee) => ({ label: fee.label, amount: Math.round(grossRevenue * (fee.rate ?? 0) + (fee.fixed ?? 0) * quantity) }));
  const affiliate = Math.round(grossRevenue * Math.max(0, affiliateRate));
  if (affiliate > 0) breakdown.push({ label: "Affiliate", amount: affiliate });
  const marketplaceFees = breakdown.reduce((sum, item) => sum + item.amount, 0);
  const discountCost = Math.max(0, sellerDiscount) * quantity;
  const netSettlement = grossRevenue - marketplaceFees - discountCost;
  const operatingCosts = (Math.max(0, costOfGoods) + Math.max(0, packaging) + Math.max(0, shippingSubsidy) + Math.max(0, advertising) + Math.max(0, otherCost)) * quantity;
  const netProfit = netSettlement - operatingCosts;
  return { grossRevenue, marketplaceFees, netSettlement, netProfit, netMargin: grossRevenue ? (netProfit / grossRevenue) * 100 : 0, effectiveTakeRate: grossRevenue ? (marketplaceFees / grossRevenue) * 100 : 0, breakdown };
}
export function findTargetPrice(input: Omit<ProfitInput, "sellingPrice">, fees: FeeRule[], targetMargin = 0): number {
  const { hpp: costOfGoods } = input;
  let low = 0;
  let high = Math.max(1000, costOfGoods * 10 + 1_000_000);
  for (let i = 0; i < 64; i += 1) {
    const mid = (low + high) / 2;
    const result = calculateProfit({ ...input, sellingPrice: mid }, fees);
    if (result.netMargin / 100 >= targetMargin) high = mid; else low = mid;
  }
  return Math.ceil(high);
}
