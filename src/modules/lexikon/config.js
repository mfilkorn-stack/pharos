export const config = {
  dataVersion: "2026.1",
  consentVersion: "1.0",
  flags: {
    ocrEnabled: true,
    cloudPackung: true,
    cloudPlan: true,
  },
  kiProxyUrl: import.meta.env.VITE_KI_PROXY_URL || "http://localhost:8787/ki",
  enrichProxyUrl: (import.meta.env.VITE_KI_PROXY_URL || "http://localhost:8787/ki").replace(/\/ki(?:$|\?)/, "/enrich"),
};
