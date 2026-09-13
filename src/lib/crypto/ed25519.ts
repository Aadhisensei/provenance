/**
 * Ed25519 — Classical Digital Signature Implementation
 * 
 * Implements the SignatureScheme interface using Ed25519 from @noble/curves.
 * Ed25519 provides the classical half of every hybrid signature in Provenance.
 * 
 * While Ed25519 is secure against classical computers, it is vulnerable to
 * Shor's algorithm on quantum computers. This is why every signature in
 * Provenance also includes a post-quantum component (ML-DSA-65).
 * 
 * Key sizes: 32-byte private key, 32-byte public key, 64-byte signature.
 * Standard: RFC 8032
 * 
 * @module
 */
import { ed25519 } from '@noble/curves/ed25519.js';
import type { SignatureScheme } from './interface';

/**
 * Ed25519SignatureScheme — classical digital signature.
 * 
 * This serves as the "proven fallback" in the hybrid model:
 * even if ML-DSA turns out to have an unforeseen weakness,
 * Ed25519 provides a well-understood security baseline.
 * Both must pass for any action to be accepted.
 */
export const Ed25519Scheme: SignatureScheme = {
  name: 'Ed25519',
  algorithmId: 'ed25519',
  standardRef: 'RFC 8032',
  signatureSizeBytes: 64,

  keygen(seed?: Uint8Array): { publicKey: Uint8Array; secretKey: Uint8Array } {
    // Ed25519 in @noble/curves uses a 32-byte seed as the private key
    const secretKey = seed?.slice(0, 32) ?? ed25519.keygen().secretKey;
    const publicKey = ed25519.getPublicKey(secretKey);
    return { publicKey, secretKey };
  },

  sign(message: Uint8Array, secretKey: Uint8Array): Uint8Array {
    return ed25519.sign(message, secretKey);
  },

  verify(signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): boolean {
    try {
      return ed25519.verify(signature, message, publicKey);
    } catch {
      // Any error in verification (malformed key, etc.) = invalid
      return false;
    }
  },
};
