// Receipt config — adjust per deployment
export const COMPANY_NAME = 'PUREGOLD PRICE CLUB, INC.'
export const RECEIPT_TITLE = 'Takeout Official Receipt'

// API
// Sales data is now proxied through the qdex-v2 backend.
// Full call: GET {VITE_API_URL}/api/v1/sales/supplier/:supplier_code
export const SALES_FETCH_PATH = '/api/v1/sales/supplier'

//  Thermal receipt lines
export const LINE_DASHES = '-'.repeat(48)
export const LINE_EQUALS = '-'.repeat(48)
