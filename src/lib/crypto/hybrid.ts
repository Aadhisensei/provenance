/**
 * Hybrid Signing — Dual/Triple Signature Orchestrator (PQFabric-style)
 * 
 * This module orchestrates the hybrid signature model used in Provenance:
 * 
 * DUAL SIGNATURE (every state-changing action):
 *   1. Build a canonical JSON payload
 *   2. Sign with Ed25519 (classical) → classicalSignature
 *   3. Sign with ML-DSA-65 (post-quantum) → pqSignature
 *   4. Both must verify independently — reject if either fails
 * 
 * TRIPLE SIGNATURE (long-life asset records only):
 *   Steps 1-3 as above, plus:
 *   4. Sign with SLH-DSA-SHA2-128s (hash-based PQC) → slhSignature
 *   5. All three must verify — reject if any fails
 * 
 * WHY HYBRID? (PQFabric model):
 * - Classical signature (Ed25519) stays as a proven fallback while PQC matures
 * - PQC signature (ML-DSA-65) protects against future quantum computers
 * - BOTH must pass, so a break in one algorithm alone can't forge a record
 * - SLH-DSA adds a third, independent security assumption for decades-long records
 * 
 * @module
 */
import { Ed25519Scheme } from './ed25519';
import { MlDsa65Scheme } from './ml-dsa';
import { SlhDsaScheme } from './slh-dsa';
import {
  bytesToHex,
  bytesToBase64,
  base64ToBytes,
  hexToBytes,
  type HybridSignatureResult,
  type HybridVerificationResult,
} from './interface';

/**
 * Build a canonical JSON string from a payload object.
 * 
 * Canonical form ensures that the same logical payload always produces
 * the same byte sequence regardless of key insertion order.
 * Uses JSON.stringify with sorted keys.
 */
export function canonicalize(payload: Record<string, unknown>): string {
  return JSON.stringify(payload, Object.keys(payload).sort());
}

/**
 * Perform a hybrid dual-signature (Ed25519 + ML-DSA-65).
 * Used for all standard state-changing actions.
 */
export function hybridSign(
  payload: Record<string, unknown>,
  classicalSecretKey: Uint8Array,
  pqSecretKey: Uint8Array,
  slhSecretKey?: Uint8Array
): HybridSignatureResult {
  // Step 1: Build canonical JSON payload
  const canonicalPayload = canonicalize(payload);
  const messageBytes = new TextEncoder().encode(canonicalPayload);

  // Step 2: Sign with classical Ed25519
  const classicalSignature = Ed25519Scheme.sign(messageBytes, classicalSecretKey);

  // Step 3: Sign with post-quantum ML-DSA-65
  const pqSignature = MlDsa65Scheme.sign(messageBytes, pqSecretKey);

  // Step 4 (optional): Sign with SLH-DSA for long-life records
  let slhSignature: Uint8Array | undefined;
  if (slhSecretKey) {
    slhSignature = SlhDsaScheme.sign(messageBytes, slhSecretKey);
  }

  return {
    canonicalPayload,
    classicalSignature,
    pqSignature,
    slhSignature,
  };
}

/**
 * Verify a hybrid dual/triple signature.
 * 
 * CRITICAL: Both (or all three) signatures must pass independently.
 * A single passing signature is NEVER sufficient — this is the core
 * of the PQFabric hybrid model.
 */
export function hybridVerify(
  canonicalPayload: string,
  classicalSignature: Uint8Array,
  pqSignature: Uint8Array,
  classicalPublicKey: Uint8Array,
  pqPublicKey: Uint8Array,
  slhSignature?: Uint8Array,
  slhPublicKey?: Uint8Array
): HybridVerificationResult {
  const messageBytes = new TextEncoder().encode(canonicalPayload);

  // Verify classical Ed25519 signature
  const classicalValid = Ed25519Scheme.verify(classicalSignature, messageBytes, classicalPublicKey);

  // Verify post-quantum ML-DSA-65 signature
  const pqValid = MlDsa65Scheme.verify(pqSignature, messageBytes, pqPublicKey);

  // Verify SLH-DSA signature if present
  let slhValid: boolean | undefined;
  if (slhSignature && slhPublicKey) {
    slhValid = SlhDsaScheme.verify(slhSignature, messageBytes, slhPublicKey);
  }

  // ALL present signatures must be valid
  const allValid = classicalValid && pqValid && (slhValid === undefined || slhValid);

  // Build human-readable summary
  const parts: string[] = [];
  parts.push(`Ed25519: ${classicalValid ? '✓ PASS' : '✗ FAIL'}`);
  parts.push(`ML-DSA-65: ${pqValid ? '✓ PASS' : '✗ FAIL'}`);
  if (slhValid !== undefined) {
    parts.push(`SLH-DSA-SHA2-128s: ${slhValid ? '✓ PASS' : '✗ FAIL'}`);
  }
  const summary = `Hybrid verification: ${allValid ? 'ALL PASS' : 'FAILED'} — ${parts.join(', ')}`;

  return {
    classicalValid,
    pqValid,
    slhValid,
    allValid,
    summary,
  };
}

/**
 * Serialize signature bytes to base64 for storage/transmission.
 * Used when submitting signatures to the API.
 */
export function serializeSignatures(result: HybridSignatureResult): {
  canonicalPayload: string;
  classicalSignature: string;
  pqSignature: string;
  slhSignature?: string;
} {
  return {
    canonicalPayload: result.canonicalPayload,
    classicalSignature: bytesToBase64(result.classicalSignature),
    pqSignature: bytesToBase64(result.pqSignature),
    slhSignature: result.slhSignature ? bytesToBase64(result.slhSignature) : undefined,
  };
}

/**
 * Deserialize base64-encoded signatures back to Uint8Array for verification.
 */
export function deserializeSignatures(data: {
  classicalSignature: string;
  pqSignature: string;
  slhSignature?: string;
}): {
  classicalSignature: Uint8Array;
  pqSignature: Uint8Array;
  slhSignature?: Uint8Array;
} {
  return {
    classicalSignature: base64ToBytes(data.classicalSignature),
    pqSignature: base64ToBytes(data.pqSignature),
    slhSignature: data.slhSignature ? base64ToBytes(data.slhSignature) : undefined,
  };
}

/**
 * Serialize public keys to hex for storage in the database.
 */
export function serializePublicKeys(keys: {
  classicalPublicKey: Uint8Array;
  pqPublicKey: Uint8Array;
  slhPublicKey?: Uint8Array;
}): {
  classicalPublicKey: string;
  pqPublicKey: string;
  slhPublicKey?: string;
} {
  return {
    classicalPublicKey: bytesToHex(keys.classicalPublicKey),
    pqPublicKey: bytesToHex(keys.pqPublicKey),
    slhPublicKey: keys.slhPublicKey ? bytesToHex(keys.slhPublicKey) : undefined,
  };
}

/**
 * Deserialize hex-encoded public keys back to Uint8Array.
 */
export function deserializePublicKeys(data: {
  classicalPublicKey: string;
  pqPublicKey: string;
  slhPublicKey?: string;
}): {
  classicalPublicKey: Uint8Array;
  pqPublicKey: Uint8Array;
  slhPublicKey?: Uint8Array;
} {
  return {
    classicalPublicKey: hexToBytes(data.classicalPublicKey),
    pqPublicKey: hexToBytes(data.pqPublicKey),
    slhPublicKey: data.slhPublicKey ? hexToBytes(data.slhPublicKey) : undefined,
  };
}
