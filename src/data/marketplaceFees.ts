import type { MarketplaceId } from "@/lib/profitability";

export type ProductCategory = "general" | "electronics" | "fashion" | "beauty" | "food" | "home" | "automotive";

export interface MarketplaceFeeConfig {
  id: MarketplaceId;
  label: string;
  logo: string;
  sourceUrl?: string;
  sourceLabel: string;
  verifiedAt: string;
  confidence: "official" | "mixed" | "estimate";
  rates: Record<ProductCategory, number>;
  fixedFee?: number;
  note: string;
}

export const MARKETPLACE_FEES: Record<MarketplaceId, MarketplaceFeeConfig> = {
  shopee: {
    id: "shopee", label: "Shopee", logo: "https://cdn.simpleicons.org/shopee/EE4D2D",
    sourceUrl: "https://help.shopee.co.id/portal/4/article/71187", sourceLabel: "Shopee Help Center", verifiedAt: "2026-09-14", confidence: "official",
    rates: { general: 10, electronics: 6.5, fashion: 10, beauty: 9.5, food: 8.25, home: 8.25, automotive: 6.5 }, fixedFee: 1250,
    note: "Admin fee resmi bergantung kategori; Rp1.250 biaya proses pesanan per transaksi selesai.",
  },
  tiktok: {
    id: "tiktok", label: "TikTok Shop", logo: "https://cdn.simpleicons.org/tiktok/FFFFFF",
    sourceLabel: "Shop | Tokopedia fee references", verifiedAt: "2026-09-14", confidence: "mixed",
    rates: { general: 10, electronics: 5, fashion: 12, beauty: 12, food: 8, home: 8, automotive: 5 }, fixedFee: 1250,
    note: "Default memakai estimasi konservatif struktur Shop | Tokopedia; cek Seller Center untuk subkategori final.",
  },
  tokopedia: {
    id: "tokopedia", label: "Tokopedia", logo: "https://cdn.simpleicons.org/tokopedia/42B549",
    sourceUrl: "https://assets.tokopedia.net/asts/onboarding/Ketentuan_biaya_Tokopedia_Official_Store.pdf", sourceLabel: "Tokopedia Official Store fee table", verifiedAt: "2026-09-14", confidence: "official",
    rates: { general: 10, electronics: 5, fashion: 15, beauty: 12, food: 8, home: 8, automotive: 5 }, fixedFee: 1250,
    note: "Menggunakan batas atas rentang kategori Official Store agar estimasi pricing tidak terlalu optimistis.",
  },
  lazada: {
    id: "lazada", label: "Lazada", logo: "https://cdn.simpleicons.org/lazada/0F146D",
    sourceUrl: "https://sellercenter.lazada.co.id/apps/register/index", sourceLabel: "Lazada Seller Center", verifiedAt: "2026-09-14", confidence: "estimate",
    rates: { general: 8, electronics: 5, fashion: 10, beauty: 10, food: 8, home: 8, automotive: 5 },
    note: "Lazada mengiklankan 0% komisi 90 hari untuk seller baru; default setelah promo dibuat konservatif untuk planning.",
  },
  blibli: {
    id: "blibli", label: "Blibli", logo: "https://cdn.simpleicons.org/blibli/0095DA",
    sourceUrl: "https://about.blibli.com/en/media/press-release/seller-lebih-tenang-dan-cuan-jualan-di-blibli-biaya-jelas-gak-ada-tambahan-tiba-tiba", sourceLabel: "Blibli seller fee statement", verifiedAt: "2026-09-14", confidence: "estimate",
    rates: { general: 8, electronics: 5, fashion: 10, beauty: 10, food: 8, home: 8, automotive: 5 },
    note: "Rate default ini estimasi planning dan bukan tarif kontraktual; seller fee final tetap mengikuti Seller Center.",
  },
  website: {
    id: "website", label: "Website Sendiri", logo: "https://cdn.simpleicons.org/googlechrome/4285F4",
    sourceLabel: "Direct store", verifiedAt: "2026-09-14", confidence: "official",
    rates: { general: 0, electronics: 0, fashion: 0, beauty: 0, food: 0, home: 0, automotive: 0 },
    note: "Tidak ada komisi marketplace. Payment gateway, iklan, hosting, dan fulfillment belum termasuk.",
  },
};

export const MARKETPLACE_ORDER: MarketplaceId[] = ["shopee", "tiktok", "tokopedia", "lazada", "blibli", "website"];

export const CATEGORY_OPTIONS: { id: ProductCategory; label: string }[] = [
  { id: "general", label: "Umum" }, { id: "electronics", label: "Elektronik" }, { id: "fashion", label: "Fashion" },
  { id: "beauty", label: "Beauty" }, { id: "food", label: "Food & Beverage" }, { id: "home", label: "Home & Living" }, { id: "automotive", label: "Automotive" },
];
