/**
 * Normalizes the API base URL to ensure it always includes the `/api` prefix,
 * regardless of whether VITE_API_URL is configured with or without `/api`,
 * or with a trailing slash.
 *
 * Examples:
 * - "https://snowflex-backend.onrender.com" -> "https://snowflex-backend.onrender.com/api"
 * - "https://snowflex-backend.onrender.com/" -> "https://snowflex-backend.onrender.com/api"
 * - "https://snowflex-backend.onrender.com/api" -> "https://snowflex-backend.onrender.com/api"
 * - "http://localhost:5000/api" -> "http://localhost:5000/api"
 */
export function getApiBase(): string {
  const envUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').trim().replace(/\/+$/, '')
  return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`
}

export const apiBase = getApiBase()
