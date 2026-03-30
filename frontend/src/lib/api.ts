import { apiClient } from './axios'
import type { AxiosRequestConfig } from 'axios'

//  apiFetch
// Thin wrapper around apiClient so existing callers need no changes.
// - `path`  — relative URL, e.g. '/api/v1/auth/login'
// - `token` — optional override; if omitted the request interceptor uses the
//             token stored in localStorage automatically.

interface FetchOptions extends Omit<AxiosRequestConfig, 'url' | 'baseURL'> {
    token?: string
    body?: string // convenience alias for axios `data`
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
    const { token, body, headers: extraHeaders, ...rest } = options

    const headers: Record<string, string> = {
        ...(extraHeaders as Record<string, string>),
    }

    // Explicit token overrides the interceptor's localStorage lookup
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const res = await apiClient.request<T>({
        url: path,
        headers,
        data: body, // map fetch-style `body` → axios `data`
        ...rest,
    })

    return res.data
}
