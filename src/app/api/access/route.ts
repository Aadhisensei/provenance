import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hybridVerify, deserializeSignatures, deserializePublicKeys } from '@/lib/crypto/hybrid';
import { appendToLedger } from '@/lib/ledger';
import { evaluatePolicy } from '@/lib/policy-engine';
import { checkFailedAccessAnomaly, generateInvalidSignatureAnomaly, AnomalyType, AnomalySeverity } from '@/lib/anomaly';

// POST /api/access — full Verifier → Policy → Decision pipeline
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      credentialId,   // ID of the VC being presented
      resourceId,     // The resource being accessed
      resourceType,   // e.g. "ASSET"
      policyId,       // Policy to evaluate against
      // These are re-submitted to verify they haven't been tampered
      canonicalPayload,
      classicalSignature,
      pqSignature,
      presenterClassicalPK,
      presenterPqPK,
    } = body;

    if (!credentialId || !resourceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Stage 1: Fetch the credential
    const credential = await prisma.credential.findUnique({ where: { id: credentialId } });
    if (!credential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }
    if (credential.isRevoked) {
      return NextResponse.json({ error: 'Credential has been revoked' }, { status: 401 });
    }

    // Stage 2: Resolve the issuer's DID to get their public keys
    const issuer = await prisma.identity.findUnique({ where: { id: credential.issuerId } });
    if (!issuer) {
      return NextResponse.json({ error: 'Issuer DID not found' }, { status: 404 });
    }

    // Stage 3: Verify the credential's hybrid signature against the issuer's resolved keys
    const credSigs = deserializeSignatures({
      classicalSignature: credential.classicalSignature,
      pqSignature: credential.pqSignature,
    });
    const issuerKeys = deserializePublicKeys({
      classicalPublicKey: issuer.classicalPublicKey,
      pqPublicKey: issuer.pqPublicKey,
    });

    // Rebuild the canonical payload that was signed at issuance
    const credPayload = JSON.stringify({ type: credential.type, issuerId: credential.issuerId, holderId: credential.holderId });
    const credVerification = hybridVerify(
      credPayload,
      credSigs.classicalSignature,
      credSigs.pqSignature,
      issuerKeys.classicalPublicKey,
      issuerKeys.pqPublicKey
    );

    if (!credVerification.allValid) {
      // Invalid signature — log anomaly, deny, write to ledger
      const anomalyPayload = generateInvalidSignatureAnomaly('VC presentation', {
        credentialId,
        holderId: credential.holderId,
        verificationResult: credVerification.summary,
      });
      await prisma.anomaly.create({
        data: {
          type: anomalyPayload.type as any,
          identityId: credential.holderId,
          description: anomalyPayload.description,
          severity: anomalyPayload.severity as any,
          metadata: JSON.stringify(anomalyPayload.metadata),
        },
      });

      await appendToLedger({
        actionType: 'ACCESS_DENIED',
        payload: { reason: 'INVALID_SIGNATURE', credentialId, resourceId, resourceType },
        classicalSignature: credential.classicalSignature,
        pqSignature: credential.pqSignature,
        actorClassicalPK: issuer.classicalPublicKey,
        actorPqPK: issuer.pqPublicKey,
      });

      return NextResponse.json({
        decision: 'deny',
        reason: 'Invalid credential signature',
        stage: 'SIGNATURE_VERIFICATION',
        verification: credVerification,
      }, { status: 401 });
    }

    // Stage 4: Policy evaluation
    let decision: 'allow' | 'deny' = 'allow';
    let policyResult = null;
    let policy = null;

    if (policyId) {
      policy = await prisma.policy.findUnique({ where: { id: policyId } });
      if (policy) {
        const parsedClaims = typeof credential.claims === 'string'
          ? JSON.parse(credential.claims)
          : credential.claims;
        const parsedRules = typeof policy.rules === 'string'
          ? JSON.parse(policy.rules)
          : policy.rules;

        policyResult = evaluatePolicy(parsedClaims, {
          id: policy.id,
          name: policy.name,
          description: policy.description,
          rules: parsedRules,
          effect: 'allow',
          version: policy.version,
        });
        decision = policyResult.decision;
      }
    }

    // Stage 5: Log the access log record
    await prisma.accessLog.create({
      data: {
        identityId: credential.holderId,
        resourceId,
        resourceType: resourceType || 'ASSET',
        action: decision === 'allow' ? 'ACCESS_GRANTED' : 'ACCESS_DENIED',
        policyId: policyId || null,
        reason: policyResult?.reasoning || 'No policy applied',
        credentialId,
      },
    });

    // Stage 6: Append to ledger (EVERY outcome, no exceptions)
    await appendToLedger({
      actionType: decision === 'allow' ? 'ACCESS_GRANTED' : 'ACCESS_DENIED',
      payload: { credentialId, resourceId, resourceType, holderId: credential.holderId, reason: policyResult?.reasoning },
      classicalSignature: credential.classicalSignature,
      pqSignature: credential.pqSignature,
      actorClassicalPK: issuer.classicalPublicKey,
      actorPqPK: issuer.pqPublicKey,
    });

    // Stage 7: Check for anomalies on repeated denials
    if (decision === 'deny') {
      const recentFailures = await prisma.accessLog.findMany({
        where: {
          identityId: credential.holderId,
          action: 'ACCESS_DENIED',
          timestamp: { gte: new Date(Date.now() - 5 * 60 * 1000) },
        },
        orderBy: { timestamp: 'desc' },
      });

      const anomaly = checkFailedAccessAnomaly(recentFailures.map((r) => r.timestamp));
      if (anomaly) {
        // Check if anomaly already exists to avoid duplicates
        const existing = await prisma.anomaly.findFirst({
          where: {
            identityId: credential.holderId,
            type: 'REPEATED_ACCESS_FAILURE',
            isResolved: false,
          },
        });
        if (!existing) {
          await prisma.anomaly.create({
            data: {
              type: anomaly.type as any,
              identityId: credential.holderId,
              description: anomaly.description,
              severity: anomaly.severity as any,
              metadata: JSON.stringify({ failureCount: recentFailures.length }),
            },
          });
        }
      }
    }

    return NextResponse.json({
      decision,
      stage: 'COMPLETE',
      credentialVerification: credVerification,
      policyResult,
      holderId: credential.holderId,
    });
  } catch (err: any) {
    console.error('Access request error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
