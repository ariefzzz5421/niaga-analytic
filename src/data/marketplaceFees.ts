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
  rateLabel: string;
  fixedFee?: number;
  fixedFeeLabel?: string;
  pph22Eligible?: boolean;
  note: string;
}

export const MARKETPLACE_FEES: Record<MarketplaceId, MarketplaceFeeConfig> = {
  shopee: { id: "shopee", label: "Shopee", logo: "/marketplaces/shopee.svg", sourceUrl: "https://help.shopee.co.id/portal/4/article/71187", sourceLabel: "Shopee Help Center", verifiedAt: "2026-09-14", confidence: "official", rates: { general: 10, electronics: 6.5, fashion: 10, beauty: 9.5, food: 8.25, home: 8.25, automotive: 6.5 }, rateLabel: "Biaya administrasi", fixedFee: 1250, fixedFeeLabel: "Biaya proses pesanan", pph22Eligible: true, note: "Shopee mempublikasikan admin fee 2,5%–10% tergantung kategori dan biaya proses Rp1.250 per transaksi selesai. Default kategori di NIAGA memakai planning rate konservatif dari rentang resmi." },
  tiktok: { id: "tiktok", label: "TikTok Shop", logo: "/marketplaces/tiktok.png", sourceUrl: "https://newsroom.tiktok.com/memahami-tokopedia-tiktok-shop-seller-center-mitos-vs-fakta?lang=id-ID", sourceLabel: "TikTok / Shop Tokopedia", verifiedAt: "2026-09-14", confidence: "mixed", rates: { general: 10, electronics: 5, fashion: 12, beauty: 12, food: 8, home: 8, automotive: 5 }, rateLabel: "Platform fee (estimasi)", note: "TikTok menyatakan fee Indonesia ditampilkan di Seller Center/Shop Academy dan dapat berbeda per program. Sumber publik resmi juga mengonfirmasi biaya pre-order 3% hanya untuk TikTok Shop. Default ini adalah planning estimate, bukan tarif kontraktual." },
  tokopedia: { id: "tokopedia", label: "Tokopedia", logo: "/marketplaces/tokopedia-icon.png", sourceUrl: "https://assets.tokopedia.net/asts/onboarding/Ketentuan_biaya_Tokopedia_Official_Store.pdf", sourceLabel: "Tokopedia Official Store fee table", verifiedAt: "2026-09-14", confidence: "official", rates: { general: 10, electronics: 5, fashion: 15, beauty: 12, food: 8, home: 8, automotive: 5 }, rateLabel: "Biaya layanan", pph22Eligible: true, note: "Tokopedia mempublikasikan rentang fee Official Store per kategori; NIAGA memakai batas atas rentang sebagai default agar pricing tidak terlalu optimistis." },
  lazada: { id: "lazada", label: "Lazada", logo: "https://www.lazada.co.id/favicon.ico", sourceUrl: "https://sellercenter.lazada.co.id/apps/register/index", sourceLabel: "Lazada Seller Center", verifiedAt: "2026-09-14", confidence: "estimate", rates: { general: 8, electronics: 5, fashion: 10, beauty: 10, food: 8, home: 8, automotive: 5 }, rateLabel: "Komisi platform (estimasi)", pph22Eligible: true, note: "Lazada mengiklankan 0% platform commission selama 90 hari untuk seller baru. Tarif setelah masa promo tidak dipublikasikan lengkap secara terbuka, sehingga default ini hanya planning estimate." },
  blibli: { id: "blibli", label: "Blibli", logo: "https://www.blibli.com/favicon.ico", sourceUrl: "https://about.blibli.com/id/media/press-release/dari-seller-care-hingga-ekosistem-tepercaya-ini-rahasia-blibli-jadi-platform-seller-friendly", sourceLabel: "Blibli official seller statement", verifiedAt: "2026-09-14", confidence: "estimate", rates: { general: 5, electronics: 4, fashion: 6, beauty: 6, food: 5, home: 5, automotive: 4 }, rateLabel: "Komisi seller (estimasi)", pph22Eligible: true, note: "Blibli menyatakan biaya seller reguler berada di bawah 10%, dan sebelumnya mempublikasikan komisi mulai 2%. Karena tarif kategori penuh tidak tersedia publik, NIAGA memakai planning estimate di dalam rentang tersebut." },
  website: { id: "website", label: "Website Sendiri", logo: "https://www.google.com/favicon.ico", sourceLabel: "Direct store", verifiedAt: "2026-09-14", confidence: "official", rates: { general: 0, electronics: 0, fashion: 0, beauty: 0, food: 0, home: 0, automotive: 0 }, rateLabel: "Marketplace fee", note: "Tidak ada komisi marketplace. Payment gateway, iklan, hosting, fulfillment, dan pajak bisnis tetap perlu dihitung terpisah." },
};

export const MARKETPLACE_ORDER: MarketplaceId[] = ["shopee", "tiktok", "tokopedia", "lazada", "blibli", "website"];
export const CATEGORY_OPTIONS: { id: ProductCategory; label: string }[] = [
  { id: "general", label: "Umum" }, { id: "electronics", label: "Elektronik" }, { id: "fashion", label: "Fashion" }, { id: "beauty", label: "Beauty" }, { id: "food", label: "Food & Beverage" }, { id: "home", label: "Home & Living" }, { id: "automotive", label: "Automotive" },
];
