/**
 * Anomaly Detection Logic
 * 
 * Handles threshold logic for flagging suspicious identities or events.
 * 
 * Rules:
 * - 3 failed access attempts in 5 minutes → flag identity for review (MEDIUM)
 * - Any invalid signature presented → immediate flag (CRITICAL)
 * 
 * @module
 */

/**
 * Types of anomalies the system can detect.
 */
export enum AnomalyType {
  REPEATED_ACCESS_FAILURE = 'REPEATED_ACCESS_FAILURE',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  TAMPER_DETECTED = 'TAMPER_DETECTED',
  UNAUTHORIZED_ACTION = 'UNAUTHORIZED_ACTION',
}

export enum AnomalySeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface AnomalyDetectionConfig {
  /** Number of failed access attempts required to trigger an anomaly */
  failedAccessThreshold: number;
  /** Window in milliseconds within which failures must occur (default 5 minutes) */
  failedAccessWindowMs: number;
}

const DEFAULT_CONFIG: AnomalyDetectionConfig = {
  failedAccessThreshold: 3,
  failedAccessWindowMs: 5 * 60 * 1000, // 5 minutes
};

/**
 * Evaluates whether a recent sequence of access failures constitutes an anomaly.
 * 
 * @param recentFailures Array of timestamps of recent ACCESS_DENIED events for an identity
 * @param config Optional configuration overrides
 * @returns An anomaly description if triggered, null otherwise
 */
export function checkFailedAccessAnomaly(
  recentFailures: Date[],
  config: AnomalyDetectionConfig = DEFAULT_CONFIG
): { triggered: boolean; type: AnomalyType; severity: AnomalySeverity; description: string } | null {
  
  if (recentFailures.length < config.failedAccessThreshold) {
    return null; // Not enough failures
  }

  // Sort failures chronologically (newest first)
  const sorted = [...recentFailures].sort((a, b) => b.getTime() - a.getTime());
  
  // Look at the Nth most recent failure, where N is the threshold
  const newest = sorted[0].getTime();
  const oldestRelevant = sorted[config.failedAccessThreshold - 1].getTime();
  
  const windowSizeMs = newest - oldestRelevant;

  if (windowSizeMs <= config.failedAccessWindowMs) {
    return {
      triggered: true,
      type: AnomalyType.REPEATED_ACCESS_FAILURE,
      severity: AnomalySeverity.MEDIUM,
      description: `Identity triggered ${config.failedAccessThreshold} failed access attempts within ${Math.round(windowSizeMs / 1000)} seconds.`,
    };
  }

  return null;
}

/**
 * Generates an anomaly payload for an invalid cryptographic signature.
 */
export function generateInvalidSignatureAnomaly(
  context: string,
  details: Record<string, any>
) {
  return {
    type: AnomalyType.INVALID_SIGNATURE,
    severity: AnomalySeverity.CRITICAL,
    description: `Invalid cryptographic signature detected during ${context}. Possible forgery attempt.`,
    metadata: details,
  };
}

/**
 * Generates an anomaly payload for ledger tampering.
 */
export function generateTamperAnomaly(
  failingIndex: number,
  expectedHash: string,
  actualHash: string
) {
  return {
    type: AnomalyType.TAMPER_DETECTED,
    severity: AnomalySeverity.CRITICAL,
    description: `Ledger integrity compromised at index ${failingIndex}. Recomputed hash does not match stored hash.`,
    metadata: {
      failingIndex,
      expectedHash,
      actualHash,
    },
  };
}
