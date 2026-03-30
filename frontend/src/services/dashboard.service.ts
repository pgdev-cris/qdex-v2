import { apiFetch } from '@/lib/api'
import type { DashboardStats } from '@/types/dashboard.types'

export async function getDashboardStats(): Promise<DashboardStats> {
    const response = await apiFetch<{ data: DashboardStats }>('/api/v1/dashboard/stats')
    return response.data
}
