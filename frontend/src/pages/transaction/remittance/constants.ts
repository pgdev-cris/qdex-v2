// ─── Receipt config — adjust per deployment ───────────────────────────────────
export const COMPANY_NAME = 'PUREGOLD PRICE CLUB, INC.'
export const EVENT_NAME = 'TNAP CONVENTION 2024 TEST'
export const RECEIPT_TITLE = 'Takeout Official Receipt'
export const EVENT_CODE = 'tnap-2024-test'

// ─── API ──────────────────────────────────────────────────────────────────────
// Sales data is now proxied through the qdex-v2 backend.
// Full call: GET {VITE_API_URL}/api/v1/sales/fetch/:vendor_code
export const SALES_FETCH_PATH = '/api/v1/sales/vendor'

// ─── Thermal receipt lines ────────────────────────────────────────────────────
export const LINE_DASHES = '-'.repeat(45)
export const LINE_EQUALS = '-'.repeat(41)
