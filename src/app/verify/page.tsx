import prisma from '@/lib/prisma';
import { verifyLedger } from '@/lib/ledger';
import VerifyClient from './VerifyClient';

export const dynamic = 'force-dynamic';

export default async function VerifyPage() {
  const totalEntries = await prisma.ledgerEntry.count();
  return <VerifyClient totalEntries={totalEntries} />;
}
