/**
 * SLH-DSA-SHA2-128s — Hash-Based Long-Life Digital Signature (FIPS 205)
 * 
 * Implements the SignatureScheme interface using SLH-DSA-SHA2-128s
 * (formerly SPHINCS+-SHA2-128s) from @noble/post-quantum.
 * 
 * This is the THIRD signature applied specifically to long-life asset records
 * (records meant to stay verifiable for decades). SLH-DSA is the most
 * conservative post-quantum algorithm — its security relies ONLY on the
 * collision-resistance of hash functions (SHA-256), with no lattice
 * assumptions that could theoretically be broken.
 * 
 * SCOPE NOTE (demo build): SLH-DSA signatures are ~7,856 bytes each.
 * For this demo, only 3-5 "long-life" assets carry SLH-DSA signatures.
 * Production would apply it selectively by asset classification, not universally.
 * 
 * Key sizes: 32-byte public key, 64-byte secret key, ~7,856-byte signature.
 * Standard: FIPS 205
 * 
 * @module
 */
import { slh_dsa_sha2_128s } from '@noble/post-quantum/slh-dsa';
import type { SignatureScheme } from './interface';

/**
 * SlhDsaScheme — hash-based post-quantum signature for long-term records.
 * 
 * Why a third signature? ML-DSA-65's security relies on the hardness of
 * Module-LWE (a lattice problem). While no known attack breaks it, lattice
 * cryptanalysis is an active research area. SLH-DSA provides an independent
 * security guarantee based purely on hash functions — even if lattice
 * problems turn out to be easier than expected, SLH-DSA remains secure
 * as long as SHA-256 is collision-resistant.
 * 
 * This makes it ideal for records that must stay trustworthy for 20+ years,
 * such as property titles, defense blueprints, and national infrastructure schemas.
 */
export const SlhDsaScheme: SignatureScheme = {
  name: 'SLH-DSA-SHA2-128s',
  algorithmId: 'slh-dsa-sha2-128s',
  standardRef: 'FIPS 205',
  signatureSizeBytes: 7856,

  keygen(seed?: Uint8Array): { publicKey: Uint8Array; secretKey: Uint8Array } {
    // slh_dsa_sha2_128s.keygen() accepts an optional seed for deterministic generation
    const keys = seed ? slh_dsa_sha2_128s.keygen(seed) : slh_dsa_sha2_128s.keygen();
    return { publicKey: keys.publicKey, secretKey: keys.secretKey };
  },

  sign(message: Uint8Array, secretKey: Uint8Array): Uint8Array {
    return slh_dsa_sha2_128s.sign(message, secretKey);
  },

  verify(signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): boolean {
    try {
      return slh_dsa_sha2_128s.verify(signature, message, publicKey);
    } catch {
      // Any error in verification (malformed key, etc.) = invalid
      return false;
    }
  },
};
