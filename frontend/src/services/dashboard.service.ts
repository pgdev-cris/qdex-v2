import { apiFetch } from '@/lib/api'
import type { DashboardStats } from '@/types/dashboard.types'

export const getDashboardStats = async (eventId: number): Promise<DashboardStats> => {
    const response = await apiFetch<{ data: DashboardStats }>(
        `/api/v1/dashboard/stats?event_id=${eventId}`,
    )
    return response.data
}
