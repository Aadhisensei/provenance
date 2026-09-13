import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/anomalies
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const isResolved = searchParams.get('resolved');
  const severity = searchParams.get('severity');

  const anomalies = await prisma.anomaly.findMany({
    where: {
      ...(isResolved !== null ? { isResolved: isResolved === 'true' } : {}),
      ...(severity ? { severity: severity as any } : {}),
    },
    orderBy: { detectedAt: 'desc' },
  });

  const parsedAnomalies = anomalies.map((a: any) => ({
    ...a,
    metadata: typeof a.metadata === 'string' ? JSON.parse(a.metadata) : a.metadata,
  }));

  return NextResponse.json({ anomalies: parsedAnomalies });
}

// PATCH /api/anomalies — mark an anomaly as resolved
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id } = body;
  const anomaly = await prisma.anomaly.update({
    where: { id },
    data: { isResolved: true, resolvedAt: new Date() },
  });
  return NextResponse.json({ anomaly });
}
