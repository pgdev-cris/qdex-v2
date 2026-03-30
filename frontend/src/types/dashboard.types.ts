export interface DashboardStats {
    total_sales_today: number
    total_remittances_today: number
    sales_by_tender: { tender_type: string; amount: number }[]
    remittances_per_hour: { hour: number; count: number }[]
}
