export type TrafficSite = {
  rank: number;
  id: string;
  label: string;
  trafficM: number;
  share: number;
  logo: string;
  accent: string;
};

export const TOP10_ECOMMERCE_TRAFFIC: TrafficSite[] = [
  { rank: 1, id: "shopee", label: "Shopee", trafficM: 53.0, share: 30.7, logo: "/marketplaces/shopee.svg", accent: "#ee4d2d" },
  { rank: 2, id: "tokopedia", label: "Tokopedia", trafficM: 46.0, share: 26.7, logo: "/marketplaces/tokopedia-icon.png", accent: "#42b549" },
  { rank: 3, id: "blibli", label: "Blibli", trafficM: 23.0, share: 13.3, logo: "https://www.blibli.com/favicon.ico", accent: "#159bd7" },
  { rank: 4, id: "lazada", label: "Lazada", trafficM: 22.0, share: 12.8, logo: "https://www.lazada.co.id/favicon.ico", accent: "#4854d8" },
  { rank: 5, id: "olx", label: "OLX", trafficM: 8.1, share: 4.7, logo: "https://www.olx.co.id/favicon.ico", accent: "#23e5db" },
  { rank: 6, id: "zalora", label: "Zalora", trafficM: 4.5, share: 2.6, logo: "https://www.zalora.co.id/favicon.ico", accent: "#ffffff" },
  { rank: 7, id: "orami", label: "Orami", trafficM: 4.2, share: 2.4, logo: "https://www.orami.co.id/favicon.ico", accent: "#ff6b8a" },
  { rank: 8, id: "k24klik", label: "K24Klik", trafficM: 4.0, share: 2.3, logo: "https://www.k24klik.com/favicon.ico", accent: "#32a852" },
  { rank: 9, id: "mi", label: "Mi.co.id", trafficM: 4.0, share: 2.3, logo: "https://www.mi.co.id/favicon.ico", accent: "#ff6900" },
  { rank: 10, id: "ibox", label: "iBox", trafficM: 3.6, share: 2.1, logo: "https://ibox.co.id/favicon.ico", accent: "#9ca3af" },
];

export const TOP10_TRAFFIC_TOTAL_M = TOP10_ECOMMERCE_TRAFFIC.reduce((sum, site) => sum + site.trafficM, 0);
export const TOP4_TRAFFIC_SHARE = TOP10_ECOMMERCE_TRAFFIC.slice(0, 4).reduce((sum, site) => sum + site.share, 0);
