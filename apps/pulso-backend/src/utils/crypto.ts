/**
 * Helper to canonically sort object keys recursively.
 */
export function deepSortObject(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(deepSortObject);
  }
  const sortedKeys = Object.keys(obj).sort();
  const result: Record<string, any> = {};
  for (const key of sortedKeys) {
    result[key] = deepSortObject(obj[key]);
  }
  return result;
}

/**
 * Calculates SHA-256 hash of a row in the imutability chain.
 * Formula: SHA-256(canonicalPayload + '|' + previousHash + '|' + createdAt)
 */
export async function calculateRowHash(
  payload: Record<string, any>,
  previousHash: string,
  createdAt: number
): Promise<string> {
  const canonicalPayload = JSON.stringify(deepSortObject(payload));
  const inputString = `${canonicalPayload}|${previousHash}|${createdAt}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(inputString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Calculates SHA-256 hash of a canonical payload only.
 */
export async function calculatePayloadHash(payload: Record<string, any>): Promise<string> {
  const canonicalPayload = JSON.stringify(deepSortObject(payload));
  const encoder = new TextEncoder();
  const data = encoder.encode(canonicalPayload);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Mock JWKS representing the public keys of the Aura Pulso service.
 */
export const MOCK_JWKS = {
  keys: [
    {
      kty: "RSA",
      use: "sig",
      alg: "RS256",
      kid: "pulso-key-active-01",
      n: "u1W_zN3rX-g_Z1VpM_T8-MockModulus-q9uK-xyz123-abc-random-string-for-compatibility-testing-only-1234567890",
      e: "AQAB"
    }
  ]
};
