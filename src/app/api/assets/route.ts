import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hybridVerify, deserializeSignatures, deserializePublicKeys } from '@/lib/crypto/hybrid';
import { appendToLedger } from '@/lib/ledger';

export const dynamic = 'force-dynamic';

// GET /api/assets
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ownerId = searchParams.get('ownerId');
  const classification = searchParams.get('classification');
  const status = searchParams.get('status');

  const assets = await prisma.asset.findMany({
    where: {
      ...(ownerId ? { ownerId } : {}),
      ...(classification ? { classification: classification as any } : {}),
      ...(status ? { status: status as any } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

  const parsedAssets = assets.map((a: any) => ({
    ...a,
    metadata: typeof a.metadata === 'string' ? JSON.parse(a.metadata) : a.metadata,
  }));

  return NextResponse.json({ assets: parsedAssets });
}

// POST /api/assets — register a new asset (mint)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      description,
      contentHash,
      ownerId,
      classification = 'STANDARD',
      metadata,
      classicalSignature,
      pqSignature,
      slhSignature,         // Required for LONG_LIFE assets
      canonicalPayload,
      actorClassicalPK,
      actorPqPK,
      actorSlhPK,           // Required for LONG_LIFE assets
    } = body;

    if (!name || !contentHash || !ownerId || !classicalSignature || !pqSignature) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // For LONG_LIFE assets, SLH-DSA signature is mandatory
    if (classification === 'LONG_LIFE' && !slhSignature) {
      return NextResponse.json(
        { error: 'LONG_LIFE assets require an SLH-DSA-SHA2-128s signature' },
        { status: 400 }
      );
    }

    // Deserialize and verify hybrid signature
    const sigs = deserializeSignatures({ classicalSignature, pqSignature, slhSignature });
    const keys = deserializePublicKeys({ classicalPublicKey: actorClassicalPK, pqPublicKey: actorPqPK, slhPublicKey: actorSlhPK });

    const verificationResult = hybridVerify(
      canonicalPayload,
      sigs.classicalSignature,
      sigs.pqSignature,
      keys.classicalPublicKey,
      keys.pqPublicKey,
      sigs.slhSignature,
      keys.slhPublicKey
    );

    if (!verificationResult.allValid) {
      return NextResponse.json(
        { error: 'Signature verification failed', details: verificationResult.summary },
        { status: 401 }
      );
    }

    // Create asset
    const asset = await prisma.asset.create({
      data: {
        name,
        description: description || '',
        contentHash,
        ownerId,
        classification: classification as any,
        metadata: typeof metadata === 'string' ? metadata : JSON.stringify(metadata || {}),
      },
    });

    // Append to ledger (triple-signed for LONG_LIFE)
    await appendToLedger({
      actionType: 'ASSET_MINTED',
      payload: { assetId: asset.id, name, ownerId, classification, contentHash },
      classicalSignature,
      pqSignature,
      slhSignature: slhSignature || undefined,
      actorClassicalPK,
      actorPqPK,
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (err: any) {
    console.error('Asset registration error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
