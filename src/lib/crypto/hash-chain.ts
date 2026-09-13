/**
 * Hash-Chain Computation — The "Fabric" Stand-in
 * 
 * Every accepted, fully-verified action becomes an immutable entry in the
 * append-only ledger. This module handles the SHA-256 hash chain that
 * provides tamper-evidence — the same guarantee Hyperledger Fabric would
 * provide, implemented entirely in application code.
 * 
 * HOW IT WORKS:
 * Each ledger entry's hash = SHA-256(index + timestamp + actionType + payload +
 *   classicalSignature + pqSignature + slhSignature? + actorClassicalPK +
 *   actorPqPK + previousHash)
 * 
 * Each entry's previousHash points to the hash of the preceding entry,
 * forming an unbroken chain. Modifying ANY field of ANY historical entry
 * changes its hash, which breaks the chain from that point forward —
 * making tampering immediately detectable.
 * 
 * @module
 */
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from './interface';

/**
 * The data structure for computing a ledger entry hash.
 * This mirrors the LedgerEntry schema exactly.
 */
export interface LedgerEntryHashInput {
  index: number;
  timestamp: string;
  actionType: string;
  payload: string; // Canonical JSON string
  classicalSignature: string;
  pqSignature: string;
  slhSignature?: string;
  actorClassicalPK: string;
  actorPqPK: string;
  previousHash: string;
}

/**
 * Compute the SHA-256 hash of a ledger entry.
 * 
 * The hash covers ALL fields except the hash itself (obviously).
 * The order of fields is deterministic and defined here — changing
 * this order would break hash verification for all existing entries.
 */
export function computeEntryHash(entry: LedgerEntryHashInput): string {
  // Build a deterministic string representation of all fields
  // Order matters and must never change once entries exist
  const preimage = [
    `index:${entry.index}`,
    `timestamp:${entry.timestamp}`,
    `actionType:${entry.actionType}`,
    `payload:${entry.payload}`,
    `classicalSignature:${entry.classicalSignature}`,
    `pqSignature:${entry.pqSignature}`,
    `slhSignature:${entry.slhSignature ?? ''}`,
    `actorClassicalPK:${entry.actorClassicalPK}`,
    `actorPqPK:${entry.actorPqPK}`,
    `previousHash:${entry.previousHash}`,
  ].join('|');

  const hashBytes = sha256(new TextEncoder().encode(preimage));
  return bytesToHex(hashBytes);
}

/**
 * The genesis hash — the previousHash of the very first ledger entry.
 * This is a well-known constant that anchors the entire chain.
 */
export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Verify the integrity of a complete ledger chain.
 * 
 * Walks every entry from index 0 to the end, recomputing each hash
 * and verifying that:
 * 1. The previousHash of entry N matches the hash of entry N-1
 * 2. The stored hash of entry N matches the recomputed hash
 * 
 * Returns a detailed result for each entry, plus the first failure index.
 * 
 * @param entries - Array of ledger entries in index order
 * @returns Verification result with per-entry details
 */
export function verifyChainIntegrity(
  entries: Array<LedgerEntryHashInput & { hash: string }>
): ChainVerificationResult {
  const results: EntryVerificationResult[] = [];
  let chainValid = true;
  let firstFailureIndex: number | null = null;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const expectedPreviousHash = i === 0 ? GENESIS_HASH : entries[i - 1].hash;

    // Check 1: Does previousHash match the previous entry's hash?
    const previousHashValid = entry.previousHash === expectedPreviousHash;

    // Check 2: Does the stored hash match the recomputed hash?
    const recomputedHash = computeEntryHash(entry);
    const hashValid = entry.hash === recomputedHash;

    const entryValid = previousHashValid && hashValid;

    if (!entryValid && chainValid) {
      chainValid = false;
      firstFailureIndex = entry.index;
    }

    results.push({
      index: entry.index,
      valid: entryValid,
      previousHashValid,
      hashValid,
      storedHash: entry.hash,
      recomputedHash,
      expectedPreviousHash,
      storedPreviousHash: entry.previousHash,
    });
  }

  return {
    chainValid,
    totalEntries: entries.length,
    firstFailureIndex,
    entries: results,
  };
}

/**
 * Result of verifying the entire chain.
 */
export interface ChainVerificationResult {
  /** Is the complete chain valid (no tampering detected)? */
  chainValid: boolean;
  /** Total number of entries checked */
  totalEntries: number;
  /** Index of the first entry that failed verification (null if all pass) */
  firstFailureIndex: number | null;
  /** Per-entry verification details */
  entries: EntryVerificationResult[];
}

/**
 * Result of verifying a single entry.
 */
export interface EntryVerificationResult {
  /** Entry index in the ledger */
  index: number;
  /** Is this entry valid? */
  valid: boolean;
  /** Does the previousHash field match the previous entry's actual hash? */
  previousHashValid: boolean;
  /** Does the stored hash match the recomputed hash? */
  hashValid: boolean;
  /** The hash stored in the database */
  storedHash: string;
  /** The hash recomputed from the entry's fields */
  recomputedHash: string;
  /** The expected previousHash (from entry N-1 or genesis) */
  expectedPreviousHash: string;
  /** The previousHash stored in the entry */
  storedPreviousHash: string;
}
