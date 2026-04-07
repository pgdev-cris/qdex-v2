const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const REF_CODE_LENGTH = 7;

/**
 * Generates a cryptographically random alphanumeric reference code.
 * Uses rejection sampling to avoid modulo bias.
 *
 * Example output: "A3K9XB2"
 */
export const generateRefCode = (): string => {
    const bytes = new Uint8Array(REF_CODE_LENGTH * 2); // extra bytes for rejection sampling
    crypto.getRandomValues(bytes);

    let result = '';
    for (let i = 0; i < bytes.length && result.length < REF_CODE_LENGTH; i++) {
        const index = bytes[i] % CHARSET.length;
        // Reject values that would introduce bias (256 % 36 = 4, so reject >= 252)
        if (bytes[i] < Math.floor(256 / CHARSET.length) * CHARSET.length) {
            result += CHARSET[index];
        }
    }

    // Fallback: fill remaining chars without bias concern (extremely unlikely to be needed)
    while (result.length < REF_CODE_LENGTH) {
        result += CHARSET[Math.floor(Math.random() * CHARSET.length)];
    }

    return result;
};
