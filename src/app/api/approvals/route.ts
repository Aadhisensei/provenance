import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { deserializeSignatures, deserializePublicKeys, hybridVerify } from '@/lib/crypto/hybrid';
import { appendToLedger } from '@/lib/ledger';

// GET /api/approvals — list pending approvals
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'PENDING';
  
  const approvals = await prisma.pendingApproval.findMany({
    where: { status: status as any },
    orderBy: { createdAt: 'desc' },
  });

  const parsedApprovals = approvals.map((a: any) => ({
    ...a,
    payload: typeof a.payload === 'string' ? JSON.parse(a.payload) : a.payload,
  }));

  return NextResponse.json({ approvals: parsedApprovals });
}

// POST /api/approvals — submit an action requiring multi-party approval OR provide second signature
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { approvalId } = body;

    if (approvalId) {
      // Second signer is approving an existing pending action
      return handleApproverSign(body);
    } else {
      // First signer is initiating a new multi-party action
      return handleRequesterInit(body);
    }
  } catch (err: any) {
    console.error('Approval error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function handleRequesterInit(body: any) {
  const {
    actionType,
    payload,
    requesterId,
    classicalSignature,
    pqSignature,
    slhSignature,
    canonicalPayload,
    actorClassicalPK,
    actorPqPK,
    actorSlhPK,
  } = body;

  if (!actionType || !requesterId || !classicalSignature || !pqSignature) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Verify requester's signature
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
      { error: 'Requester signature verification failed', details: verificationResult.summary },
      { status: 401 }
    );
  }

  const pendingApproval = await prisma.pendingApproval.create({
    data: {
      actionType,
      payload: typeof payload === 'string' ? payload : JSON.stringify(payload || {}),
      requesterId,
      requesterClassicalSig: classicalSignature,
      requesterPqSig: pqSignature,
      requesterSlhSig: slhSignature || null,
      status: 'PENDING',
    },
  });

  return NextResponse.json({ pendingApproval }, { status: 201 });
}

async function handleApproverSign(body: any) {
  const {
    approvalId,
    approverId,
    classicalSignature,
    pqSignature,
    slhSignature,
    canonicalPayload,
    actorClassicalPK,
    actorPqPK,
    actorSlhPK,
  } = body;

  const approval = await prisma.pendingApproval.findUnique({ where: { id: approvalId } });
  if (!approval || approval.status !== 'PENDING') {
    return NextResponse.json({ error: 'Pending approval not found or already resolved' }, { status: 404 });
  }

  // Prevent self-approval
  if (approval.requesterId === approverId) {
    return NextResponse.json({ error: 'Requester cannot approve their own action' }, { status: 403 });
  }

  // Verify approver's signature
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
      { error: 'Approver signature verification failed', details: verificationResult.summary },
      { status: 401 }
    );
  }

  // Both signatures verified — promote to ledger
  const updatedApproval = await prisma.pendingApproval.update({
    where: { id: approvalId },
    data: {
      approverId,
      approverClassicalSig: classicalSignature,
      approverPqSig: pqSignature,
      approverSlhSig: slhSignature || null,
      status: 'APPROVED',
      resolvedAt: new Date(),
    },
  });

  // Append to ledger with the combined approval payload
  const parsedApprovalPayload = typeof approval.payload === 'string'
    ? JSON.parse(approval.payload)
    : approval.payload;

  const ledgerEntry = await appendToLedger({
    actionType: approval.actionType,
    payload: {
      ...parsedApprovalPayload,
      requesterId: approval.requesterId,
      approverId,
      multiPartyApprovalId: approvalId,
    },
    classicalSignature: classicalSignature, // Approver's signature is the final one
    pqSignature,
    slhSignature: slhSignature || undefined,
    actorClassicalPK,
    actorPqPK,
  });

  return NextResponse.json({ updatedApproval, ledgerEntry });
}
