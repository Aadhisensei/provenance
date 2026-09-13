import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/ledger — paginated ledger entries
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const actionType = searchParams.get('actionType');

  const [entries, total] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where: actionType ? { actionType } : undefined,
      orderBy: { index: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.ledgerEntry.count({
      where: actionType ? { actionType } : undefined,
    }),
  ]);

  const parsedEntries = entries.map((e: any) => ({
    ...e,
    payload: typeof e.payload === 'string' ? JSON.parse(e.payload) : e.payload,
  }));

  return NextResponse.json({
    entries: parsedEntries,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
