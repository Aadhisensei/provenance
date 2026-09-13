/**
 * ML-DSA-65 — Post-Quantum Digital Signature Implementation (FIPS 204)
 * 
 * Implements the SignatureScheme interface using ML-DSA-65 (formerly CRYSTALS-Dilithium3)
 * from @noble/post-quantum. This provides the post-quantum half of everyday
 * transaction/credential signatures in Provenance.
 * 
 * ML-DSA-65 is a lattice-based signature scheme providing NIST Security Category 3
 * (roughly equivalent to AES-192 security). It is the primary NIST recommendation
 * for general-purpose post-quantum digital signatures.
 * 
 * Key sizes: 1,952-byte public key, 4,032-byte secret key, 3,309-byte signature.
 * Standard: FIPS 204
 * 
 * @module
 */
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';
import type { SignatureScheme } from './interface';

/**
 * MlDsa65Scheme — post-quantum lattice-based digital signature.
 * 
 * This is the PQC half of the hybrid model. Even if a large-scale
 * quantum computer breaks Ed25519 via Shor's algorithm, ML-DSA-65
 * signatures remain secure — records signed today stay trustworthy
 * for years (defending against "harvest now, decrypt later" attacks).
 */
export const MlDsa65Scheme: SignatureScheme = {
  name: 'ML-DSA-65',
  algorithmId: 'ml-dsa-65',
  standardRef: 'FIPS 204',
  signatureSizeBytes: 3309,

  keygen(seed?: Uint8Array): { publicKey: Uint8Array; secretKey: Uint8Array } {
    // ml_dsa65.keygen() accepts an optional 32-byte seed for deterministic generation
    const keys = seed ? ml_dsa65.keygen(seed.slice(0, 32)) : ml_dsa65.keygen();
    return { publicKey: keys.publicKey, secretKey: keys.secretKey };
  },

  sign(message: Uint8Array, secretKey: Uint8Array): Uint8Array {
    return ml_dsa65.sign(message, secretKey);
  },

  verify(signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): boolean {
    try {
      return ml_dsa65.verify(signature, message, publicKey);
    } catch {
      // Any error in verification (malformed key, etc.) = invalid
      return false;
    }
  },
};
