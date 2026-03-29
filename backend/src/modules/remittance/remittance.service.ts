// Partial Remittance Process
//
// 1. Supplier go to booth
// 2. TRS scan QR code
// 3. System will get suppliers info and transactions
// 4. TRS will encode the actual cash remitted
// 5. TRS will generate receipt for the transaction

// Full remittance process
// 1. Supplier go to booth
// 2. TRS scan QR code
// 3. System will get suppliers info and transactions
// 4. TRS will encode the actual cash remitted and confirm other transactions
// 5. TRS will generate receipt for the transaction

export interface CreditPayments {
    total_gcash: number;
    total_pwallet: number;
    total_homecredit: number;
    total_credit_card: number;
    total_debit_card: number;
}

export interface Remittance {
    vendor_code: string;
    event_code: string;
    // transaction_ids: number[]; // ← which transactions are being remitted
    total_cash: number;
    total_credit: number;
    credit_payments: CreditPayments;
    grand_total: number;
    reference_code: string;
    is_partial: boolean;
    remitted_by: string;
    received_by: string;
    remitted_at: Date;
}

export interface RemittanceReceipt {
    receipt_no: string;
    remittance: Remittance;
    generated_at: Date;
}

const saveRemittance = async (payload: Remittance): Promise<RemittanceReceipt> => {
    // step 4: encode actual cash remitted

    return await generateReceipt(1);
};

const generateReceipt = async (remittance_id: number): Promise<RemittanceReceipt> => {
    return {
        receipt_no: 'RCP-20250313-001',
        remittance: {
            vendor_code: 'VND-0001',
            event_code: 'EVT-2025-001',
            // transaction_ids: [1, 2, 3, 4, 5],
            total_cash: 5000,
            total_credit: 3500,
            credit_payments: {
                total_gcash: 1500,
                total_pwallet: 500,
                total_homecredit: 1000,
                total_credit_card: 300,
                total_debit_card: 200,
            },
            grand_total: 8500,
            reference_code: 'REF-20250313-001',
            is_partial: false,
            remitted_by: 'Juan Dela Cruz',
            received_by: 'TRS-001',
            remitted_at: new Date(),
        },
        generated_at: new Date(),
    };
};
