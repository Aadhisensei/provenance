import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const identities = await prisma.identity.findMany({
      select: {
        id: true,
        did: true,
        displayName: true,
        role: true,
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    return NextResponse.json({ identities });
  } catch (error) {
    console.error('Error fetching identities:', error);
    return NextResponse.json({ error: 'Failed to fetch identities' }, { status: 500 });
  }
}
