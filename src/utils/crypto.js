// Cryptographic utilities for secure client-side storage simulation (SaaS database encryption simulation)

// Secret key derived or simulated for database encryption (simulating production KMS / Env keys)
const SYSTEM_VAULT_KEY = "chaml_secure_db_vault_key_2026";

/**
 * Encrypts a string using a simple symmetric cipher (XOR + Base64) to simulate AES-256 database column encryption.
 * In production, this encryption is performed server-side using KMS or an environment encryption key.
 */
export const encryptSMTPPassword = (plainText) => {
  if (!plainText) return "";
  
  // Custom Vigenere/XOR cipher for local simulation
  let result = "";
  for (let i = 0; i < plainText.length; i++) {
    const charCode = plainText.charCodeAt(i);
    const keyChar = SYSTEM_VAULT_KEY.charCodeAt(i % SYSTEM_VAULT_KEY.length);
    // Apply XOR and format as hex representation
    const encryptedChar = (charCode ^ keyChar).toString(16).padStart(2, "0");
    result += encryptedChar;
  }
  return btoa(result); // Base64 encode the final hex string
};

/**
 * Decrypts a base64 encoded ciphertext back to plain text.
 */
export const decryptSMTPPassword = (cipherText) => {
  if (!cipherText) return "";
  try {
    const hexStr = atob(cipherText);
    let result = "";
    for (let i = 0; i < hexStr.length; i += 2) {
      const hexChar = hexStr.slice(i, i + 2);
      const charCode = parseInt(hexChar, 16);
      const keyChar = SYSTEM_VAULT_KEY.charCodeAt((i / 2) % SYSTEM_VAULT_KEY.length);
      result += String.fromCharCode(charCode ^ keyChar);
    }
    return result;
  } catch (e) {
    console.error("Failed to decrypt SMTP password. Check vault key integrity.");
    return "";
  }
};

/**
 * Derives a cryptographic key from a user PIN code using SHA-256
 */
const deriveKey = async (pin) => {
  const rawKey = new TextEncoder().encode(pin);
  const hash = await crypto.subtle.digest("SHA-256", rawKey);
  return crypto.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
};

/**
 * Encrypts a File or Blob with AES-GCM using the user's secret key
 */
export const encryptFile = async (file, pin) => {
  const key = await deriveKey(pin);
  const fileBuffer = await file.arrayBuffer();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    fileBuffer
  );
  
  // Combine IV (12 bytes) and cipher text
  const resultBuffer = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  resultBuffer.set(iv, 0);
  resultBuffer.set(new Uint8Array(encryptedBuffer), iv.length);
  return new Blob([resultBuffer], { type: "application/octet-stream" });
};

/**
 * Decrypts an encrypted File or Blob using the user's secret key
 */
export const decryptFile = async (blob, pin) => {
  const key = await deriveKey(pin);
  const arrayBuffer = await blob.arrayBuffer();
  const dataView = new Uint8Array(arrayBuffer);
  
  const iv = dataView.slice(0, 12);
  const encryptedData = dataView.slice(12);
  
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encryptedData
  );
  return new Blob([decryptedBuffer], { type: "application/pdf" });
};
