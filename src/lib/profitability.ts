export type MarketplaceId = "shopee" | "tiktok" | "tokopedia" | "lazada" | "blibli" | "website";
export interface FeeRule { label: string; rate?: number; fixed?: number; source?: string; verifiedAt?: string; }
export interface ProfitInput { hpp: number; sellingPrice: number; quantity: number; packaging?: number; shippingSubsidy?: number; sellerDiscount?: number; advertising?: number; affiliateRate?: number; otherCost?: number; }
export interface ProfitResult { grossRevenue: number; marketplaceFees: number; netSettlement: number; netProfit: number; netMargin: number; effectiveTakeRate: number; breakdown: { label: string; amount: number }[]; }
export function calculateProfit(input: ProfitInput, fees: FeeRule[]): ProfitResult {
  const quantity = Math.max(1, Math.floor(input.quantity || 1));
  const grossRevenue = Math.max(0, input.sellingPrice) * quantity;
  const breakdown = fees.map((fee) => ({ label: fee.label, amount: Math.round(grossRevenue * (fee.rate ?? 0) + (fee.fixed ?? 0) * quantity) }));
  const affiliate = Math.round(grossRevenue * Math.max(0, input.affiliateRate ?? 0)); if (affiliate > 0) breakdown.push({ label: "Affiliate", amount: affiliate });
  const marketplaceFees = breakdown.reduce((sum, item) => sum + item.amount, 0);
  const sellerDiscount = Math.max(0, input.sellerDiscount ?? 0) * quantity;
  const netSettlement = grossRevenue - marketplaceFees - sellerDiscount;
  const operatingCosts = (Math.max(0, input.hpp) + Math.max(0, input.packaging ?? 0) + Math.max(0, input.shippingSubsidy ?? 0) + Math.max(0, input.advertising ?? 0) + Math.max(0, input.otherCost ?? 0)) * quantity;
  const netProfit = netSettlement - operatingCosts;
  return { grossRevenue, marketplaceFees, netSettlement, netProfit, netMargin: grossRevenue ? (netProfit / grossRevenue) * 100 : 0, effectiveTakeRate: grossRevenue ? (marketplaceFees / grossRevenue) * 100 : 0, breakdown };
}
export function findTargetPrice(input: Omit<ProfitInput, "sellingPrice">, fees: FeeRule[], targetMargin = 0): number {
  let low = 0; let high = Math.max(1000, input.hpp * 10 + 1_000_000);
  for (let i = 0; i < 64; i += 1) { const mid = (low + high) / 2; const result = calculateProfit({ ...input, sellingPrice: mid }, fees); if (result.netMargin / 100 >= targetMargin) high = mid; else low = mid; }
  return Math.ceil(high);
}
