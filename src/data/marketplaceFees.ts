import type { FeeRule, MarketplaceId } from "@/lib/profitability";

export interface MarketplaceFeeConfig {
  id: MarketplaceId;
  label: string;
  fees: FeeRule[];
  note: string;
}

// Conservative configuration: values are intentionally not invented.
// Add percentage/category rules only after verifying current official seller documentation.
export const MARKETPLACE_FEES: Record<MarketplaceId, MarketplaceFeeConfig> = {
  shopee: { id: "shopee", label: "Shopee", fees: [], note: "Pilih fee sesuai kategori/status seller dari Seller Centre." },
  tiktok: { id: "tiktok", label: "TikTok Shop", fees: [], note: "Fee bergantung kategori dan program seller." },
  tokopedia: { id: "tokopedia", label: "Tokopedia", fees: [], note: "Fee bergantung kategori dan program seller." },
  lazada: { id: "lazada", label: "Lazada", fees: [], note: "Fee bergantung kategori dan status seller." },
  blibli: { id: "blibli", label: "Blibli", fees: [], note: "Fee seller harus diverifikasi berdasarkan kategori." },
  website: { id: "website", label: "Website Sendiri", fees: [], note: "Komisi marketplace 0%; masukkan payment gateway/CAC sebagai biaya tambahan." },
};

export const MARKETPLACE_ORDER: MarketplaceId[] = ["shopee", "tiktok", "tokopedia", "lazada", "blibli", "website"];
