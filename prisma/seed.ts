import { PrismaClient } from '@prisma/client';
import { ed25519 } from '@noble/curves/ed25519.js';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';
import { slh_dsa_sha2_128s } from '@noble/post-quantum/slh-dsa.js';
import { bytesToHex, bytesToBase64 } from '../src/lib/crypto/interface';
import { hybridSign, serializeSignatures, canonicalize } from '../src/lib/crypto/hybrid';
import { appendToLedger } from '../src/lib/ledger';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Database...');
  
  // Clean existing data
  await prisma.anomaly.deleteMany();
  await prisma.accessLog.deleteMany();
  await prisma.pendingApproval.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.credential.deleteMany();
  await prisma.policy.deleteMany();
  await prisma.identity.deleteMany();

  console.log('Data cleared.');

  // Helper to create identity
  async function createIdentity(name: string, role: any) {
    const classicalSK = ed25519.keygen().secretKey;
    const classicalPK = ed25519.getPublicKey(classicalSK);
    const pqKeys = ml_dsa65.keygen();
    const slhKeys = slh_dsa_sha2_128s.keygen();

    const identityData = {
      displayName: name,
      role,
      classicalPublicKey: bytesToHex(classicalPK),
      pqPublicKey: bytesToHex(pqKeys.publicKey),
      slhPublicKey: bytesToHex(slhKeys.publicKey),
    };
    
    const result = hybridSign(identityData, classicalSK, pqKeys.secretKey, slhKeys.secretKey);
    const sigs = serializeSignatures(result);

    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const did = `did:provenance:${id}`;

    const didDocument = {
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: did,
      verificationMethod: [
        { id: `${did}#classical`, type: 'Ed25519VerificationKey2020', controller: did, publicKeyHex: identityData.classicalPublicKey },
        { id: `${did}#pq`, type: 'MlDsa65VerificationKey2024', controller: did, publicKeyHex: identityData.pqPublicKey },
        { id: `${did}#slh`, type: 'SlhDsaSha2128sVerificationKey2024', controller: did, publicKeyHex: identityData.slhPublicKey },
      ],
      authentication: [`${did}#classical`, `${did}#pq`],
      created: new Date().toISOString(),
    };

    const identity = await prisma.identity.create({
      data: {
        did,
        ...identityData,
        didDocument: JSON.stringify(didDocument),
      }
    });

    await appendToLedger({
      actionType: 'DID_REGISTERED',
      payload: { did, displayName: name, role },
      classicalSignature: sigs.classicalSignature,
      pqSignature: sigs.pqSignature,
      actorClassicalPK: identityData.classicalPublicKey,
      actorPqPK: identityData.pqPublicKey,
    });

    return { identity, sk: { classicalSK, pqSK: pqKeys.secretKey, slhSK: slhKeys.secretKey } };
  }

  // 1. Create Identities
  console.log('Creating identities...');
  const issuer = await createIdentity('Central Defense Authority', 'ISSUER');
  const holder = await createIdentity('Agent Smith', 'HOLDER');
  const verifier = await createIdentity('Checkpoint Alpha', 'VERIFIER');
  const admin = await createIdentity('System Admin', 'ADMIN');
  const contractor = await createIdentity('External Contractor Beta', 'HOLDER');

  // 2. Create Policy
  console.log('Creating policy...');
  const policy = await prisma.policy.create({
    data: {
      name: 'Top Secret Clearance Requirement',
      description: 'Requires a TOP_SECRET clearance level issued by CDA.',
      resourceType: 'ASSET',
      rules: JSON.stringify([
        { field: 'clearanceLevel', operator: 'equals', value: 'TOP_SECRET', required: true },
        { field: 'department', operator: 'in', value: ['DEFENSE', 'INTELLIGENCE'], required: true },
      ]),
      version: 1,
    }
  });

  // 3. Issue Credential
  console.log('Issuing credential...');
  const claims = { clearanceLevel: 'TOP_SECRET', department: 'DEFENSE', active: true };
  const credPayload = { type: 'SecurityClearance', issuerId: issuer.identity.id, holderId: holder.identity.id };
  const credSigs = serializeSignatures(hybridSign(credPayload, issuer.sk.classicalSK, issuer.sk.pqSK, issuer.sk.slhSK));

  const credential = await prisma.credential.create({
    data: {
      type: 'SecurityClearance',
      issuerId: issuer.identity.id,
      holderId: holder.identity.id,
      claims: JSON.stringify(claims),
      classicalSignature: credSigs.classicalSignature,
      pqSignature: credSigs.pqSignature,
      issuerClassicalPK: issuer.identity.classicalPublicKey,
      issuerPqPK: issuer.identity.pqPublicKey,
    }
  });

  // Issue Credential to Contractor
  const contractorClaims = { clearanceLevel: 'CONFIDENTIAL', department: 'EXTERNAL', active: true };
  const contractorCredPayload = { type: 'ContractorBadge', issuerId: issuer.identity.id, holderId: contractor.identity.id };
  const contractorCredSigs = serializeSignatures(hybridSign(contractorCredPayload, issuer.sk.classicalSK, issuer.sk.pqSK, issuer.sk.slhSK));

  const contractorCredential = await prisma.credential.create({
    data: {
      type: 'ContractorBadge',
      issuerId: issuer.identity.id,
      holderId: contractor.identity.id,
      claims: JSON.stringify(contractorClaims),
      classicalSignature: contractorCredSigs.classicalSignature,
      pqSignature: contractorCredSigs.pqSignature,
      issuerClassicalPK: issuer.identity.classicalPublicKey,
      issuerPqPK: issuer.identity.pqPublicKey,
    }
  });

  await appendToLedger({
    actionType: 'VC_ISSUED',
    payload: { credentialId: credential.id, type: 'SecurityClearance', issuerId: issuer.identity.id, holderId: holder.identity.id },
    classicalSignature: credSigs.classicalSignature,
    pqSignature: credSigs.pqSignature,
    actorClassicalPK: issuer.identity.classicalPublicKey,
    actorPqPK: issuer.identity.pqPublicKey,
  });

  await appendToLedger({
    actionType: 'VC_ISSUED',
    payload: { credentialId: contractorCredential.id, type: 'ContractorBadge', issuerId: issuer.identity.id, holderId: contractor.identity.id },
    classicalSignature: contractorCredSigs.classicalSignature,
    pqSignature: contractorCredSigs.pqSignature,
    actorClassicalPK: issuer.identity.classicalPublicKey,
    actorPqPK: issuer.identity.pqPublicKey,
  });

  // 4. Create Asset (Standard)
  console.log('Creating assets...');
  const assetPayload = { name: 'Field Operations Manual v4', ownerId: holder.identity.id, classification: 'STANDARD', contentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' };
  const assetSigs = serializeSignatures(hybridSign(assetPayload, holder.sk.classicalSK, holder.sk.pqSK));

  const asset = await prisma.asset.create({
    data: {
      name: 'Field Operations Manual v4',
      description: 'Standard operational procedures.',
      contentHash: assetPayload.contentHash,
      ownerId: holder.identity.id,
      classification: 'STANDARD',
    }
  });

  await appendToLedger({
    actionType: 'ASSET_MINTED',
    payload: { assetId: asset.id, name: asset.name, ownerId: asset.ownerId, classification: asset.classification, contentHash: asset.contentHash },
    classicalSignature: assetSigs.classicalSignature,
    pqSignature: assetSigs.pqSignature,
    actorClassicalPK: holder.identity.classicalPublicKey,
    actorPqPK: holder.identity.pqPublicKey,
  });

  // 5. Create Asset (Long Life)
  const llAssetPayload = { name: 'National Treaty 2026', ownerId: issuer.identity.id, classification: 'LONG_LIFE', contentHash: '8a2b5e...longlifehash' };
  const llAssetSigs = serializeSignatures(hybridSign(llAssetPayload, issuer.sk.classicalSK, issuer.sk.pqSK, issuer.sk.slhSK));

  const llAsset = await prisma.asset.create({
    data: {
      name: 'National Treaty 2026',
      description: 'Strategic treaty requires long-term verifiability.',
      contentHash: llAssetPayload.contentHash,
      ownerId: issuer.identity.id,
      classification: 'LONG_LIFE',
    }
  });

  await appendToLedger({
    actionType: 'ASSET_MINTED',
    payload: { assetId: llAsset.id, name: llAsset.name, ownerId: llAsset.ownerId, classification: llAsset.classification, contentHash: llAsset.contentHash },
    classicalSignature: llAssetSigs.classicalSignature,
    pqSignature: llAssetSigs.pqSignature,
    slhSignature: llAssetSigs.slhSignature,
    actorClassicalPK: issuer.identity.classicalPublicKey,
    actorPqPK: issuer.identity.pqPublicKey,
  });

  // 6. Simulate Access Log
  console.log('Simulating access...');
  await prisma.accessLog.create({
    data: {
      identityId: holder.identity.id,
      resourceId: asset.id,
      resourceType: 'ASSET',
      action: 'ACCESS_GRANTED',
      policyId: policy.id,
      reason: 'All required policy checks passed (2 rules matched)',
      credentialId: credential.id,
    }
  });

  const accessPayload = { credentialId: credential.id, resourceId: asset.id, resourceType: 'ASSET', holderId: holder.identity.id, reason: 'All required policy checks passed (2 rules matched)' };
  const accessSigs = serializeSignatures(hybridSign(accessPayload, holder.sk.classicalSK, holder.sk.pqSK));

  await appendToLedger({
    actionType: 'ACCESS_GRANTED',
    payload: accessPayload,
    classicalSignature: accessSigs.classicalSignature,
    pqSignature: accessSigs.pqSignature,
    actorClassicalPK: holder.identity.classicalPublicKey,
    actorPqPK: holder.identity.pqPublicKey,
  });
  
  // Simulate Anomaly
  await prisma.anomaly.create({
    data: {
      type: 'INVALID_SIGNATURE',
      identityId: holder.identity.id,
      description: 'Invalid cryptographic signature detected during VC presentation. Possible forgery attempt.',
      severity: 'CRITICAL',
      metadata: JSON.stringify({ credentialId: credential.id, holderId: holder.identity.id })
    }
  });

  console.log('\\n======================================================');
  console.log('                 WORKING EXAMPLES');
  console.log('======================================================');
  const printCreds = (name: string, entity: any) => {
    console.log(`\\n--- ${name} ---`);
    console.log(`DID: ${entity.identity.did}`);
    console.log(`Role: ${entity.identity.role}`);
    console.log(`Classical SK (Ed25519): ${bytesToHex(entity.sk.classicalSK)}`);
    // Print first 64 chars of PQ SK to save console space
    console.log(`PQ SK (ML-DSA-65): ${bytesToHex(entity.sk.pqSK).substring(0, 64)}...`);
  };

  printCreds('Central Defense Authority (Issuer)', issuer);
  printCreds('Agent Smith (Holder)', holder);
  printCreds('External Contractor Beta (Holder)', contractor);
  printCreds('System Admin (Admin)', admin);
  console.log('\\n======================================================\\n');

  console.log('Database seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
