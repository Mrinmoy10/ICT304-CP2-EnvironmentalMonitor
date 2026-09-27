import { httpApi } from "./httpApi.js";
import { mockApi } from "./mockApi.js";

/**
 * Every screen imports `api` from here. The live Express API is the default;
 * setting VITE_USE_MOCK=true at build time selects the in-browser mock
 * instead (used for the public static prototype on Netlify).
 */
export const api = import.meta.env.VITE_USE_MOCK === "true" ? mockApi : httpApi;
