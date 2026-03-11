const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;

if (!apiBaseUrl) {
  throw new Error('Missing required frontend env: VITE_API_BASE_URL or VITE_API_URL');
}

export const API_BASE_URL = apiBaseUrl as string;
