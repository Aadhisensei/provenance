import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateTamperAnomaly } from '@/lib/anomaly';

export const dynamic = 'force-dynamic';

// POST /api/admin/tamper — DEMO ONLY: simulate tampering by modifying a ledger entry directly
// This bypasses all signature validation, proving the integrity verification catches it
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { entryIndex, newPayload } = body;

    if (entryIndex === undefined) {
      return NextResponse.json({ error: 'entryIndex is required' }, { status: 400 });
    }

    const entry = await prisma.ledgerEntry.findFirst({ where: { index: entryIndex } });
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // DEMO ONLY: directly mutate the payload in the database, bypassing signatures
    // In a real system this would be impossible — this is only here to demonstrate
    // that the verify-integrity endpoint catches exactly this kind of tampering.
    const parsedPayload = typeof entry.payload === 'string'
      ? JSON.parse(entry.payload)
      : entry.payload;

    const tamperedPayload = newPayload
      ? (typeof newPayload === 'string' ? newPayload : JSON.stringify(newPayload))
      : JSON.stringify({ ...parsedPayload, TAMPERED: true, originalPayload: entry.payload });

    const tamperedEntry = await prisma.ledgerEntry.update({
      where: { id: entry.id },
      data: {
        payload: tamperedPayload,
      },
    });

    // Log a TAMPER_DETECTED anomaly for the demo
    const anomaly = generateTamperAnomaly(entryIndex, entry.hash, 'TAMPERED_BY_DEMO');
    await prisma.anomaly.create({
      data: {
        type: 'TAMPER_DETECTED',
        description: `DEMO: Ledger entry at index ${entryIndex} was directly modified in the database, bypassing all cryptographic protections. Run Verify Integrity to detect this.`,
        severity: 'CRITICAL',
        metadata: JSON.stringify({ tamperedIndex: entryIndex, originalHash: entry.hash }),
      },
    });

    return NextResponse.json({
      message: `Entry ${entryIndex} tampered (DEMO). Run /api/ledger/verify to detect it.`,
      tamperedEntry,
    });
  } catch (err: any) {
    console.error('Tamper error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
