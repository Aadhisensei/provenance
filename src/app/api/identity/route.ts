import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hybridVerify, deserializeSignatures, deserializePublicKeys, canonicalize } from '@/lib/crypto/hybrid';
import { appendToLedger } from '@/lib/ledger';
import { bytesToHex } from '@/lib/crypto/interface';

// GET /api/identity - list identities
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role');
  
  const identities = await prisma.identity.findMany({
    where: role ? { role: role as any } : undefined,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      did: true,
      displayName: true,
      role: true,
      classicalPublicKey: true,
      pqPublicKey: true,
      slhPublicKey: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ identities });
}

// POST /api/identity - register a new identity
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      displayName,
      role = 'HOLDER',
      classicalPublicKey, // hex-encoded Ed25519 public key
      pqPublicKey,        // hex-encoded ML-DSA-65 public key
      slhPublicKey,       // optional hex-encoded SLH-DSA public key
      classicalSignature, // base64-encoded signature over the registration payload
      pqSignature,
      canonicalPayload,   // the exact payload that was signed
    } = body;

    if (!displayName || !classicalPublicKey || !pqPublicKey || !classicalSignature || !pqSignature) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Deserialize signatures and public keys
    const sigs = deserializeSignatures({ classicalSignature, pqSignature });
    const keys = deserializePublicKeys({ classicalPublicKey, pqPublicKey });

    // Verify hybrid signature
    const verificationResult = hybridVerify(
      canonicalPayload,
      sigs.classicalSignature,
      sigs.pqSignature,
      keys.classicalPublicKey,
      keys.pqPublicKey
    );

    if (!verificationResult.allValid) {
      return NextResponse.json(
        { error: 'Signature verification failed', details: verificationResult.summary },
        { status: 401 }
      );
    }

    // Generate DID
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const did = `did:provenance:${id}`;

    // Build W3C-compliant DID document
    const didDocument = {
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: did,
      verificationMethod: [
        {
          id: `${did}#classical`,
          type: 'Ed25519VerificationKey2020',
          controller: did,
          publicKeyHex: classicalPublicKey,
        },
        {
          id: `${did}#pq`,
          type: 'MlDsa65VerificationKey2024',
          controller: did,
          publicKeyHex: pqPublicKey,
        },
        ...(slhPublicKey ? [{
          id: `${did}#slh`,
          type: 'SlhDsaSha2128sVerificationKey2024',
          controller: did,
          publicKeyHex: slhPublicKey,
        }] : []),
      ],
      authentication: [`${did}#classical`, `${did}#pq`],
      created: new Date().toISOString(),
    };

    // Create identity in database
    const identity = await prisma.identity.create({
      data: {
        did,
        displayName,
        role: role as any,
        classicalPublicKey,
        pqPublicKey,
        slhPublicKey: slhPublicKey || null,
        didDocument: JSON.stringify(didDocument),
      },
    });

    // Append to ledger
    await appendToLedger({
      actionType: 'DID_REGISTERED',
      payload: { did, displayName, role },
      classicalSignature,
      pqSignature,
      actorClassicalPK: classicalPublicKey,
      actorPqPK: pqPublicKey,
    });

    return NextResponse.json({ identity, didDocument }, { status: 201 });
  } catch (err: any) {
    console.error('Identity registration error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
