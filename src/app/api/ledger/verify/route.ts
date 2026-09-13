import { NextRequest, NextResponse } from 'next/server';
import { verifyLedger } from '@/lib/ledger';

export const dynamic = 'force-dynamic';

// GET /api/ledger/verify — full chain integrity check
export async function GET() {
  try {
    const result = await verifyLedger();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Ledger verification error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
