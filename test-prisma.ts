import prisma from './src/lib/prisma';

console.log('Prisma models available:');
console.log('Identity:', typeof prisma.identity);
console.log('Credential:', typeof prisma.credential);
console.log('Asset:', typeof prisma.asset);
console.log('LedgerEntry:', typeof prisma.ledgerEntry);
console.log('PendingApproval:', typeof prisma.pendingApproval);
console.log('AccessLog:', typeof prisma.accessLog);
console.log('Policy:', typeof prisma.policy);
console.log('Anomaly:', typeof prisma.anomaly);
console.log('KemSession:', typeof prisma.kemSession);
