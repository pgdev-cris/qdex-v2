import axios from 'axios'

// Config

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

// Main API instance
// Used for all qdex-v2 backend calls (/api/v1/...).
// Auth token is injected per-request via the token helper below.
export const apiClient = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15_000,
})

// Attach Bearer token when present in localStorage
apiClient.interceptors.request.use((config) => {
    try {
        const raw = localStorage.getItem('qdex_auth')
        if (raw) {
            const { token } = JSON.parse(raw) as { token: string }
            if (token) config.headers['Authorization'] = `Bearer ${token}`
        }
    } catch {
        // no-op — missing or malformed storage
    }
    return config
})

// Normalise error shape: throw the response body so callers get { message, status, ... }
apiClient.interceptors.response.use(
    (res) => res,
    (err) => {
        const data = err.response?.data
        return Promise.reject(data ?? err)
    }
)
