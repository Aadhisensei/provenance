import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hybridVerify, deserializeSignatures, deserializePublicKeys } from '@/lib/crypto/hybrid';
import { appendToLedger } from '@/lib/ledger';
import { generateInvalidSignatureAnomaly } from '@/lib/anomaly';

export const dynamic = 'force-dynamic';

// GET /api/credentials/issue — list issued credentials
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const holderId = searchParams.get('holderId');
  const issuerId = searchParams.get('issuerId');

  const credentials = await prisma.credential.findMany({
    where: {
      ...(holderId ? { holderId } : {}),
      ...(issuerId ? { issuerId } : {}),
    },
    orderBy: { issuedAt: 'desc' },
  });

  const parsedCredentials = credentials.map((c: any) => ({
    ...c,
    claims: typeof c.claims === 'string' ? JSON.parse(c.claims) : c.claims,
  }));

  return NextResponse.json({ credentials: parsedCredentials });
}

// POST /api/credentials/issue — issue a new Verifiable Credential
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type,
      issuerId,        // Identity.id of the issuer
      holderId,        // Identity.id of the holder
      claims,          // The credential claims
      classicalSignature,
      pqSignature,
      canonicalPayload,
      issuerClassicalPK,
      issuerPqPK,
    } = body;

    if (!type || !issuerId || !holderId || !claims || !classicalSignature || !pqSignature) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Look up issuer to verify they exist and have the ISSUER role
    const issuer = await prisma.identity.findUnique({ where: { id: issuerId } });
    if (!issuer || issuer.role !== 'ISSUER') {
      return NextResponse.json({ error: 'Issuer not found or insufficient role' }, { status: 403 });
    }

    // Deserialize and verify the hybrid signature
    const sigs = deserializeSignatures({ classicalSignature, pqSignature });
    const keys = deserializePublicKeys({ classicalPublicKey: issuerClassicalPK, pqPublicKey: issuerPqPK });

    const verificationResult = hybridVerify(
      canonicalPayload,
      sigs.classicalSignature,
      sigs.pqSignature,
      keys.classicalPublicKey,
      keys.pqPublicKey
    );

    if (!verificationResult.allValid) {
      // Log anomaly — invalid signature on credential issuance
      const anomalyData = generateInvalidSignatureAnomaly('credential issuance', {
        issuerId,
        verificationResult,
      });
      await prisma.anomaly.create({
        data: {
          type: anomalyData.type as any,
          identityId: issuerId,
          description: anomalyData.description,
          severity: anomalyData.severity as any,
          metadata: JSON.stringify(anomalyData.metadata),
        },
      });

      return NextResponse.json(
        { error: 'Issuer signature verification failed', details: verificationResult.summary },
        { status: 401 }
      );
    }

    // Create the credential
    const credential = await prisma.credential.create({
      data: {
        type,
        issuerId,
        holderId,
        claims: typeof claims === 'string' ? claims : JSON.stringify(claims),
        classicalSignature,
        pqSignature,
        issuerClassicalPK: issuerClassicalPK,
        issuerPqPK: issuerPqPK,
      },
    });

    // Append to ledger
    await appendToLedger({
      actionType: 'VC_ISSUED',
      payload: { credentialId: credential.id, type, issuerId, holderId },
      classicalSignature,
      pqSignature,
      actorClassicalPK: issuerClassicalPK,
      actorPqPK: issuerPqPK,
    });

    return NextResponse.json({ credential }, { status: 201 });
  } catch (err: any) {
    console.error('Credential issuance error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
