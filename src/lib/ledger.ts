/**
 * Ledger Business Logic
 * 
 * Handles interaction with the hash-chained, append-only ledger in the database.
 * Integrates the cryptographic hash-chain computation with Prisma ORM.
 * 
 * @module
 */
import prisma from './prisma';
import { computeEntryHash, GENESIS_HASH, verifyChainIntegrity } from './crypto/hash-chain';

export interface LedgerEntryPayload {
  actionType: string;
  payload: any;
  classicalSignature: string;
  pqSignature: string;
  slhSignature?: string;
  actorClassicalPK: string;
  actorPqPK: string;
}

/**
 * Append a new, fully verified action to the immutable ledger.
 * 
 * @param data The entry data to append
 * @returns The created LedgerEntry
 */
export async function appendToLedger(data: LedgerEntryPayload) {
  // We need to run this in a transaction or sequentially to ensure hash chain integrity,
  // but for this demo build a simple sequential fetch-then-insert is sufficient.
  
  // Find the most recent entry to link to
  const lastEntry = await prisma.ledgerEntry.findFirst({
    orderBy: { index: 'desc' },
  });

  const nextIndex = lastEntry ? lastEntry.index + 1 : 0;
  const previousHash = lastEntry ? lastEntry.hash : GENESIS_HASH;
  const timestamp = new Date();

  // Compute the hash of the new entry BEFORE inserting it
  const hashInput = {
    index: nextIndex,
    timestamp: timestamp.toISOString(),
    actionType: data.actionType,
    payload: typeof data.payload === 'string' ? data.payload : JSON.stringify(data.payload),
    classicalSignature: data.classicalSignature,
    pqSignature: data.pqSignature,
    slhSignature: data.slhSignature,
    actorClassicalPK: data.actorClassicalPK,
    actorPqPK: data.actorPqPK,
    previousHash: previousHash,
  };

  const hash = computeEntryHash(hashInput);

  // Insert the new entry
  const newEntry = await prisma.ledgerEntry.create({
    data: {
      index: nextIndex,
      timestamp: timestamp,
      actionType: data.actionType,
      payload: typeof data.payload === 'string' ? data.payload : JSON.stringify(data.payload), // Store as string
      classicalSignature: data.classicalSignature,
      pqSignature: data.pqSignature,
      slhSignature: data.slhSignature,
      actorClassicalPK: data.actorClassicalPK,
      actorPqPK: data.actorPqPK,
      previousHash: previousHash,
      hash: hash,
    },
  });

  return newEntry;
}

/**
 * Perform a full verification of the ledger's integrity.
 * 
 * Fetches the entire chain from the database, recomputes all hashes,
 * and verifies that the cryptographically linked chain is unbroken.
 * 
 * @returns The verification result detailing pass/fail status and any tampering found
 */
export async function verifyLedger() {
  // Fetch all entries ordered by index
  const entries = await prisma.ledgerEntry.findMany({
    orderBy: { index: 'asc' },
  });

  // Map database entries to the expected hash input format
  const hashInputs = entries.map((entry) => ({
    index: entry.index,
    timestamp: entry.timestamp.toISOString(),
    actionType: entry.actionType,
    payload: typeof entry.payload === 'string' ? entry.payload : JSON.stringify(entry.payload),
    classicalSignature: entry.classicalSignature,
    pqSignature: entry.pqSignature,
    slhSignature: entry.slhSignature || undefined,
    actorClassicalPK: entry.actorClassicalPK,
    actorPqPK: entry.actorPqPK,
    previousHash: entry.previousHash,
    hash: entry.hash,
  }));

  // Run the cryptographic verification
  return verifyChainIntegrity(hashInputs);
}

/**
 * Fetch the ledger history for a specific asset.
 * 
 * Since all actions are appended sequentially, this filters the global ledger
 * to find entries related to a specific asset ID in their payload.
 * 
 * @param assetId The ID of the asset to look up
 * @returns Array of related ledger entries
 */
export async function getLedgerHistoryForAsset(assetId: string) {
  // In a real application with a massive ledger, you would use a secondary index
  // or a relational mapping table. For this demo, we can use Prisma's JSON filtering.
  
  const entries = await prisma.ledgerEntry.findMany({
    where: {
      payload: {
        contains: assetId,
      },
    },
    orderBy: { index: 'desc' },
  });

  return entries;
}
