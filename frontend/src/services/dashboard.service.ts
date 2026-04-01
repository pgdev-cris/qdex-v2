import { apiFetch } from '@/lib/api'
import type { DashboardStats } from '@/types/dashboard.types'

export const getDashboardStats = async (): Promise<DashboardStats> => {
    const response = await apiFetch<{ data: DashboardStats }>('/api/v1/dashboard/stats')
    return response.data
}
