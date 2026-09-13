import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/admin/policies — list all policies
export async function GET() {
  const policies = await prisma.policy.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ policies });
}

// POST /api/admin/policies — create a new policy
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, resourceType, rules } = body;
    if (!name || !resourceType || !rules) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const policy = await prisma.policy.create({
      data: {
        name,
        description: description || '',
        resourceType,
        rules: typeof rules === 'string' ? rules : JSON.stringify(rules),
        version: 1,
        isActive: true,
      },
    });
    return NextResponse.json({ policy }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
