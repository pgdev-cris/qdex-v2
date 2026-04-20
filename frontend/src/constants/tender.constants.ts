/**
 * Tender-type constants.
 *
 * These mirror `tbl_tender_types` and the backend `TENDER_TYPE` constant in
 * `backend/src/shared/constants/app.constants.ts`. They exist as a fallback
 * for places where we only have a numeric tender id or a string code and no
 * API-loaded tender list to resolve against (e.g. receipts, the monitoring
 * detail modal).
 *
 * When a component has access to the live tender list (fetched from
 * `/api/v1/tender-types`) it should prefer the `label` from that response,
 * which reflects whatever the admin has configured in the DB.
 */

/** Numeric IDs — must match `tbl_tender_types.id`. */
export const TENDER_ID = {
    CASH: 1,
    GCASH: 2,
    PWALLET: 3,
    TANGENT_DEBIT: 4,
    TANGENT_CREDIT: 5,
    HOME_CREDIT: 6,
    GCASH_EPOS: 7,
    SKYRO: 8,
    SHOPEE_PAY: 9,
} as const

export type TenderCode = keyof typeof TENDER_ID
export type TenderId = (typeof TENDER_ID)[TenderCode]

/** Human-readable label keyed by string code. */
export const TENDER_LABEL_BY_CODE: Record<string, string> = {
    CASH: 'Cash',
    GCASH: 'GCash',
    PWALLET: 'Puregold Wallet',
    TANGENT_DEBIT: '(Tangent) Credit Card',
    TANGENT_CREDIT: '(Tangent) Debit Card',
    HOME_CREDIT: 'Home Credit',
    GCASH_EPOS: 'GCash E-POS',
    SKYRO: 'SKYRO',
    SHOPEE_PAY: 'Shopee Pay',
}

/** Human-readable label keyed by numeric id. */
export const TENDER_LABEL_BY_ID: Record<number, string> = {
    [TENDER_ID.CASH]: TENDER_LABEL_BY_CODE.CASH,
    [TENDER_ID.GCASH]: TENDER_LABEL_BY_CODE.GCASH,
    [TENDER_ID.PWALLET]: TENDER_LABEL_BY_CODE.PWALLET,
    [TENDER_ID.TANGENT_DEBIT]: TENDER_LABEL_BY_CODE.TANGENT_DEBIT,
    [TENDER_ID.TANGENT_CREDIT]: TENDER_LABEL_BY_CODE.TANGENT_CREDIT,
    [TENDER_ID.HOME_CREDIT]: TENDER_LABEL_BY_CODE.HOME_CREDIT,
    [TENDER_ID.GCASH_EPOS]: TENDER_LABEL_BY_CODE.GCASH_EPOS,
    [TENDER_ID.SKYRO]: TENDER_LABEL_BY_CODE.SKYRO,
    [TENDER_ID.SHOPEE_PAY]: TENDER_LABEL_BY_CODE.SHOPEE_PAY,
}

/** Resolve a tender string code to a display label. Falls back to the code. */
export const tenderLabelByCode = (code: string): string => TENDER_LABEL_BY_CODE[code] ?? code

/** Resolve a tender numeric id to a display label. Falls back to `Type {id}`. */
export const tenderLabelById = (id: number): string => TENDER_LABEL_BY_ID[id] ?? `Type ${id}`
