const ALGORITHM = "AES-GCM";

const encodeText = (text: string) => new TextEncoder().encode(text);
const decodeText = (buffer: ArrayBuffer) => new TextDecoder().decode(buffer);

async function getCryptoKey(passphrase: string): Promise<CryptoKey> {
  const rawKey = encodeText(passphrase.padEnd(32, "0").slice(0, 32)); // Ensure 32 bytes for AES-256
  return crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: ALGORITHM },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptKey(plainText: string, salt: string): Promise<string> {
  try {
    const key = await getCryptoKey(salt);
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 12-byte IV for AES-GCM
    const encrypted = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      encodeText(plainText)
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (e) {
    console.error("Encryption failed:", e);
    throw new Error("Encryption failed");
  }
}

export async function decryptKey(encryptedBase64: string, salt: string): Promise<string> {
  try {
    const key = await getCryptoKey(salt);
    const combined = new Uint8Array(
      atob(encryptedBase64)
        .split("")
        .map((c) => c.charCodeAt(0))
    );

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext
    );
    return decodeText(decrypted);
  } catch (e) {
    console.error("Decryption failed:", e);
    throw new Error("Decryption failed");
  }
}
