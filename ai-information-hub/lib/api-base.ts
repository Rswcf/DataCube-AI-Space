export const DEFAULT_API_BASE =
  "https://api-production-3ee5.up.railway.app/api";

export const USE_STATIC_DATA =
  process.env.NEXT_PUBLIC_USE_STATIC_DATA === "true";

export const API_BASE = USE_STATIC_DATA
  ? ""
  : process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE;

export const USE_API = !!API_BASE;
