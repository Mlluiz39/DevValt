/**
 * DevVault - Database Seed
 * 
 * Creates initial data for development:
 * - Admin user
 * - Sample organization with SOLO plan
 * - Sample project
 * - Sample (encrypted) secret
 * 
 * ⚠️  NEVER use in production without changing credentials
 */

import { PrismaClient, PlanType, UserStatus, SecretType } from '@prisma/client';
import argon2 from 'argon2';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting DevVault seed...\n');

  // ─── Create Admin User ───────────────────────────────────────────────────────
  const adminPassword = 'Admin123'; // CHANGE IN PRODUCTION
  const hashedPassword = await argon2.hash(adminPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@devvault.dev' },
    update: {
      hashedPassword,
    },
    create: {
      email: 'admin@devvault.dev',
      hashedPassword,
      name: 'DevVault Admin',
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`✅ Admin user: ${adminUser.email}`);

  // ─── Create Demo User ────────────────────────────────────────────────────────
  const demoPassword = 'Demo@Vault2024!';
  const demoHash = await argon2.hash(demoPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@devvault.dev' },
    update: {
      hashedPassword: demoHash,
    },
    create: {
      email: 'demo@devvault.dev',
      hashedPassword: demoHash,
      name: 'Demo User',
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`✅ Demo user: ${demoUser.email}`);

  // ─── Create Organization ─────────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: 'devvalt-corp-dev' },
    update: {
      ownerId: adminUser.id,
    },
    create: {
      name: 'DevValt Corp',
      slug: 'devvalt-corp-dev',
      description: 'Demo organization for DevVault',
      ownerId: adminUser.id,
      planType: PlanType.TEAM,
      members: {
        create: [
          { userId: adminUser.id, role: 'OWNER', joinedAt: new Date() },
          { userId: demoUser.id, role: 'MEMBER', joinedAt: new Date() },
        ],
      },
      subscription: {
        create: {
          planType: PlanType.TEAM,
          status: 'ACTIVE',
          maxSecrets: 500,
          maxProjects: 20,
          maxMembers: 10,
          maxApiKeys: 10,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  console.log(`✅ Organization: ${org.name} (${org.slug})`);

  // ─── Create Projects ─────────────────────────────────────────────────────────
  const backendProject = await prisma.project.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: 'backend-api' } },
    update: {
      organizationId: org.id,
    },
    create: {
      organizationId: org.id,
      name: 'Backend API',
      slug: 'backend-api',
      description: 'Production API secrets',
      color: '#6366F1',
    },
  });

  const frontendProject = await prisma.project.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: 'frontend-web' } },
    update: {
      organizationId: org.id,
    },
    create: {
      organizationId: org.id,
      name: 'Frontend Web',
      slug: 'frontend-web',
      description: 'Web application secrets',
      color: '#10B981',
    },
  });

  console.log(`✅ Projects: ${backendProject.name}, ${frontendProject.name}`);

  // ─── Create Sample Secret (ZK Encrypted) ─────────────────────────────────────
  // This simulates what the client would send after encrypting with master password
  // In production, the client NEVER sends plaintext — only these encrypted fields
  const sampleIv = randomBytes(12).toString('base64');
  const sampleSalt = randomBytes(32).toString('base64');
  const sampleAuthTag = randomBytes(16).toString('base64');
  const sampleEncrypted = randomBytes(64).toString('base64'); // Simulated ciphertext

  await prisma.secret.upsert({
    where: { id: 'seed-secret-001' },
    update: {
      projectId: backendProject.id,
    },
    create: {
      id: 'seed-secret-001',
      projectId: backendProject.id,
      name: 'STRIPE_SECRET_KEY',
      description: 'Stripe payment gateway secret key',
      type: SecretType.API_KEY,
      tags: ['payment', 'stripe', 'production'],
      keyHint: 'sk_...xxxx', // Only last 4 chars of real key
      // ZK Encrypted — server NEVER knows the real value
      encryptedValue: sampleEncrypted,
      iv: sampleIv,
      authTag: sampleAuthTag,
      salt: sampleSalt,
    },
  });

  console.log(`✅ Sample secret created (ZK encrypted)`);

  // ─── Print Summary ───────────────────────────────────────────────────────────
  console.log('\n📊 Seed Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Admin:      admin@devvault.dev / ${adminPassword}`);
  console.log(`Demo User:  demo@devvault.dev / ${demoPassword}`);
  console.log(`Org:        ${org.name} (ID: ${org.id})`);
  console.log(`Projects:   ${backendProject.name}, ${frontendProject.name}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n⚠️  CHANGE ALL CREDENTIALS BEFORE PRODUCTION!\n');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
