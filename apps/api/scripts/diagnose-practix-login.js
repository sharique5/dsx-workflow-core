#!/usr/bin/env node
/**
 * Diagnostic script for Practix login issues
 * Usage: node scripts/diagnose-practix-login.js
 */

const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL);

async function diagnose() {
  console.log('\n🔍 Diagnosing Practix Login Issues\n');
  console.log('='.repeat(60));

  try {
    // 1. Check Practix Tenant
    console.log('\n1️⃣  Checking Practix Tenant...');
    const practixTenant = await prisma.tenant.findFirst({
      where: { webDomain: 'practix-ops.disionix.com' }
    });

    if (!practixTenant) {
      console.error('   ❌ Practix tenant NOT FOUND');
      console.log('   💡 Fix: Run `npm run seed` to create Practix tenant');
      return;
    }

    console.log('   ✅ Practix tenant found');
    console.log(`      - ID: ${practixTenant.id}`);
    console.log(`      - Name: ${practixTenant.name}`);
    console.log(`      - Web Domain: ${practixTenant.webDomain}`);
    console.log(`      - Portal Domain: ${practixTenant.portalDomain}`);

    // 2. Check Practix Admin User
    console.log('\n2️⃣  Checking Practix Admin User...');
    const practixAdmin = await prisma.user.findFirst({
      where: {
        tenantId: practixTenant.id,
        email: 'contact@disionix.com'
      }
    });

    if (!practixAdmin) {
      console.error('   ❌ Practix admin user NOT FOUND');
      console.log('   💡 Fix: Run `npm run seed` to create admin user');
      return;
    }

    console.log('   ✅ Practix admin found');
    console.log(`      - ID: ${practixAdmin.id}`);
    console.log(`      - Email: ${practixAdmin.email}`);
    console.log(`      - Role: ${practixAdmin.role}`);
    console.log(`      - Active: ${practixAdmin.isActive}`);
    console.log(`      - Deleted: ${practixAdmin.deletedAt !== null}`);

    if (!practixAdmin.isActive) {
      console.error('   ⚠️  User is INACTIVE');
      console.log('   💡 Fix: Activate user in Prisma Studio');
    }

    if (practixAdmin.deletedAt) {
      console.error('   ⚠️  User is DELETED');
      console.log('   💡 Fix: Restore user in database');
    }

    // 3. Check Redis Connection
    console.log('\n3️⃣  Checking Redis Connection...');
    try {
      await redis.ping();
      console.log('   ✅ Redis is connected');

      const otpKeys = await redis.keys('otp:*');
      console.log(`      - Active OTP keys: ${otpKeys.length}`);
      
      if (otpKeys.length > 0) {
        console.log('      - Sample keys:');
        otpKeys.slice(0, 3).forEach(key => console.log(`        • ${key}`));
      }
    } catch (err) {
      console.error('   ❌ Redis connection failed:', err.message);
      console.log('   💡 Fix: Check REDIS_URL environment variable');
    }

    // 4. Check Email Configuration
    console.log('\n4️⃣  Checking Email Configuration...');
    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM;

    if (!resendApiKey) {
      console.error('   ❌ RESEND_API_KEY not set');
      console.log('   💡 Fix: Set RESEND_API_KEY in .env');
    } else {
      console.log(`   ✅ RESEND_API_KEY configured (${resendApiKey.substring(0, 10)}...)`);
    }

    if (!emailFrom) {
      console.warn('   ⚠️  EMAIL_FROM not set (using default: onboarding@resend.dev)');
    } else {
      console.log(`   ✅ EMAIL_FROM: ${emailFrom}`);
    }

    // 5. Check CORS Configuration
    console.log('\n5️⃣  Checking CORS Configuration...');
    const corsOrigin = process.env.CORS_ORIGIN;
    
    if (!corsOrigin) {
      console.error('   ❌ CORS_ORIGIN not set');
    } else {
      const origins = corsOrigin.split(',');
      const hasPractix = origins.some(o => o.includes('practix-ops.disionix.com'));
      
      if (hasPractix) {
        console.log('   ✅ practix-ops.disionix.com in CORS_ORIGIN');
      } else {
        console.error('   ❌ practix-ops.disionix.com NOT in CORS_ORIGIN');
        console.log('   💡 Fix: Add https://practix-ops.disionix.com to CORS_ORIGIN');
      }
    }

    // 6. Test OTP Key Generation
    console.log('\n6️⃣  Testing OTP Key Generation...');
    const testIdentifier = 'contact@disionix.com';
    const testKey = `otp:${practixTenant.id}:${testIdentifier}`;
    console.log(`   Expected OTP key format: ${testKey}`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ DIAGNOSIS COMPLETE\n');
    console.log('To test login manually:');
    console.log('1. Go to: https://practix-ops.disionix.com/login');
    console.log('2. Enter: contact@disionix.com');
    console.log('3. Check email for OTP code');
    console.log('4. If no email, check API logs: docker logs -f dsx-workflow-api');
    console.log('');

  } catch (error) {
    console.error('\n❌ Error during diagnosis:', error);
  } finally {
    await prisma.$disconnect();
    redis.disconnect();
  }
}

diagnose();
