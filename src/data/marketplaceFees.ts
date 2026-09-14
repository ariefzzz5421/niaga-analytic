import type { FeeRule, MarketplaceId } from "@/lib/profitability";
export interface MarketplaceFeeConfig { id: MarketplaceId; label: string; fees: FeeRule[]; note: string; }
// Fee percentages are intentionally user-configurable until each category/tier rule is verified from current official seller documentation.
export const MARKETPLACE_FEES: Record<MarketplaceId, MarketplaceFeeConfig> = {
  shopee: { id: "shopee", label: "Shopee", fees: [], note: "Masukkan effective seller fee sesuai kategori/status di Seller Centre." },
  tiktok: { id: "tiktok", label: "TikTok Shop", fees: [], note: "Masukkan effective seller fee sesuai kategori dan program." },
  tokopedia: { id: "tokopedia", label: "Tokopedia", fees: [], note: "Masukkan effective seller fee sesuai kategori dan program." },
  lazada: { id: "lazada", label: "Lazada", fees: [], note: "Masukkan effective seller fee sesuai kategori/status seller." },
  blibli: { id: "blibli", label: "Blibli", fees: [], note: "Masukkan effective seller fee sesuai kategori seller." },
  website: { id: "website", label: "Website Sendiri", fees: [], note: "Komisi marketplace 0%; payment gateway/CAC dapat dimasukkan terpisah." },
};
export const MARKETPLACE_ORDER: MarketplaceId[] = ["shopee", "tiktok", "tokopedia", "lazada", "blibli", "website"];
