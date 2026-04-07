import { RowDataPacket } from 'mysql2/promise';

export interface RemittanceRecord extends RowDataPacket {
    remittance_id: number;
    supplier_code: string;
    supplier_name: string | null;
    event_code: string;
    total_cash: number;
    total_gcash: number;
    total_pwallet: number;
    total_credit_card: number;
    total_debit_card: number;
    total_credit: number;
    grand_total: number;
    reference_code: string;
    is_partial: boolean;
    remitted_by: string;
    received_by: string;
    remitted_at: Date;
    created_at: Date;
}

export interface RemittanceSummary extends RowDataPacket {
    total_transactions: number;
    total_cash: number;
    total_credit: number;
    grand_total: number;
}
