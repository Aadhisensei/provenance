import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST /api/admin/reset — DEMO ONLY: wipe all data and re-seed via prisma
export async function POST() {
  try {
    // Delete in dependency order
    await prisma.anomaly.deleteMany();
    await prisma.accessLog.deleteMany();
    await prisma.pendingApproval.deleteMany();
    await prisma.kemSession.deleteMany();
    await prisma.ledgerEntry.deleteMany();
    await prisma.asset.deleteMany();
    await prisma.credential.deleteMany();
    await prisma.policy.deleteMany();
    await prisma.identity.deleteMany();
    return NextResponse.json({ message: 'Database wiped successfully. Run the seed command to restore demo data.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
