export const HTTP_STATUS = {
    // 2xx Success
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,

    // 3xx Redirection
    NOT_MODIFIED: 304,

    // 4xx Client Errors
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,

    // 5xx Server Errors
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
} as const;

export const SUPPLIER_STATUS = {
    ACTIVE: 1,
    INACTIVE: 0,
};

export const TENDER_TYPE: Record<string, number> = {
    CASH: 1,
    GCASH: 2,
    PWALLET: 3,
    TANGENT_DEBIT: 4,
    TANGENT_CREDIT: 5,
    HOMECREDIT: 6,
    HOME_CREDIT: 6, // alias — POS may send either form
    GCASH_EPOS: 7,
    SKYRO: 8,
    SHOPEE_PAY: 9,
    BANK_TO_BANK: 10,
    GCASH_VOUCHER: 11,
};

export const TRANSACTION_TYPE = {
    PARTIAL: 1,
    FULL: 2,
    MANUAL: 3,
} as const;

export const TRANSACTION_STATUS = {
    PENDING: 0,
    VERIFIED: 1,
    VOIDED: 2,
} as const;

export const OVERRIDE_ACTION = {
    REMITTANCE: 1,
    VOID: 2,
} as const;
