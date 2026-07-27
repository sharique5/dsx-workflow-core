# Troubleshooting: Login & Email Domain Issues

## 🔴 Priority 1: practix-ops.disionix.com Login Not Working

### Problem
Users can't log in to `practix-ops.disionix.com` after entering OTP, but `teams.nairandassociates.in` works fine.

### Root Cause Analysis

The authentication flow uses `X-Tenant-Domain` header to scope tenants:
1. Frontend sends `X-Tenant-Domain: practix-ops.disionix.com` 
2. Backend looks up tenant by `webDomain: 'practix-ops.disionix.com'`
3. OTP is stored as: `otp:{tenantId}:{identifier}`
4. On verify, it looks up the same key

**Confirmed Root Cause: Cross-Domain Cookie Issue**

The actual issue was `sameSite: 'strict'` in cookie settings:
- ✅ `teams.nairandassociates.in` → `api.nairandassociates.in` (same domain, works)
- ❌ `practix-ops.disionix.com` → `api.nairandassociates.in` (different domain, blocked)

Symptoms:
- OTP email arrives successfully
- OTP verification succeeds on backend
- User gets silently redirected back to login (cookie not set)

**Other potential causes:**
- Practix demo tenant not seeded in production database
- User trying wrong email (must be `contact@disionix.com` per seed script)
- Redis connection issue

### Diagnosis Steps

#### Step 1: Verify Database Seed
```bash
# SSH into production server
ssh your-server

# Check if Practix tenant exists
docker exec -it dsx-workflow-api npx prisma studio
# Or use SQL:
# SELECT * FROM "Tenant" WHERE "webDomain" = 'practix-ops.disionix.com';
# SELECT * FROM "User" WHERE email = 'contact@disionix.com';
```

#### Step 2: Run Production Seed
If Practix tenant doesn't exist:
```bash
# On production server
cd /path/to/dsx-workflow-core/apps/api
docker exec -it dsx-workflow-api npm run seed

# Verify the output shows:
# [Seed] Practix demo tenant created
# [Seed] Demo login: { "identifier": "contact@disionix.com" }
```

#### Step 3: Check Redis Keys
```bash
# Check if OTP is being stored
docker exec -it dsx-workflow-api node -e "
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);
redis.keys('otp:*').then(keys => {
  console.log('OTP Keys:', keys);
  redis.disconnect();
});
"
```

#### Step 4: Check API Logs
```bash
# Watch API logs during login attempt
docker logs -f dsx-workflow-api

# Look for:
# - "Failed to send OTP email" errors
# - "OTP expired or not found" 
# - "Invalid OTP"
# - "User not found"
```

#### Step 5: Test Direct API Call
```bash
# Test request OTP
curl -X POST https://api.nairandassociates.in/api/v1/auth/request-otp \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Domain: practix-ops.disionix.com" \
  -d '{"identifier": "contact@disionix.com"}'

# Should return: {"message": "If your account exists, a code has been sent."}

# Check your email for OTP, then verify:
curl -X POST https://api.nairandassociates.in/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Domain: practix-ops.disionix.com" \
  -d '{"identifier": "contact@disionix.com", "otp": "YOUR_OTP_HERE"}'
```

### Quick Fixes

#### Fix 1: Update Cookie SameSite Setting (PRIMARY FIX - ALREADY APPLIED)

The cookie `sameSite` has been changed from `'strict'` to `'none'` (in production) to support cross-domain authentication.

**What was changed:**
- File: `apps/api/src/modules/auth/auth.controller.ts`
- Change: `sameSite: 'strict'` → `sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'`

**To deploy:**
```bash
# Rebuild and redeploy API
cd apps/api
npm run build

# Push updated image (if using Docker)
docker build -t ghcr.io/sharique5/dsx-workflow-api:latest .
docker push ghcr.io/sharique5/dsx-workflow-api:latest

# On production server
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

#### Fix 2: Ensure Practix Tenant is Seeded
```bash
cd apps/api
docker exec -it dsx-workflow-api npm run seed
```

#### Fix 3: Manual Tenant Creation (if seed fails)
```typescript
// Run this in Prisma Studio or via script
await prisma.tenant.create({
  data: {
    id: crypto.randomUUID(),
    name: 'Practix',
    industry: 'legal',
    webDomain: 'practix-ops.disionix.com',
    portalDomain: 'practix.disionix.com',
    brandingConfig: {
      firmName: 'Practix',
      primaryColor: '#4f46e5',
      secondaryColor: '#e0e7ff',
      tagline: 'Practix by Disionix'
    }
  }
});

await prisma.user.create({
  data: {
    id: crypto.randomUUID(),
    tenantId: '<TENANT_ID_FROM_ABOVE>',
    name: 'Practix Admin',
    email: 'contact@disionix.com',
    role: 'admin',
    isActive: true
  }
});
```

#### Fix 4: Add Better Error Logging
To diagnose further, add logging to auth.service.ts:

```typescript
// In verifyOtp method, after const storedOtp = await this.redis.get(...)
this.logger.debug(`Verifying OTP for identifier=${identifier}, tenantId=${tenantId}, storedOtp=${storedOtp ? 'found' : 'not found'}`);
```

---

## 🟡 Priority 2: Email Domain Configuration

### Problem
Currently using `onboarding@resend.dev` (Resend's test domain). Want to use `disionix.com` for professional branding.

### Solution Steps

#### Step 1: Verify Domain in Resend Dashboard
1. Go to https://resend.com/domains
2. Click "Add Domain"
3. Add `disionix.com`
4. Follow DNS verification steps:
   - Add SPF record: `v=spf1 include:resend.com ~all`
   - Add DKIM records (provided by Resend)
5. Wait for verification (usually 5-15 minutes)

#### Step 2: Update Environment Variable
Once domain is verified in Resend:

```bash
# In apps/api/.env (local)
EMAIL_FROM=noreply@disionix.com
# or
EMAIL_FROM=hello@disionix.com
# or
EMAIL_FROM=Practix <noreply@disionix.com>  # With display name
```

#### Step 3: Update Production Environment
```bash
# On production server, update .env file
cd /path/to/dsx-workflow-core
nano apps/api/.env

# Update:
EMAIL_FROM=noreply@disionix.com

# Restart API
docker compose -f docker-compose.prod.yml restart api
```

#### Step 4: Test Email Sending
```bash
# Request OTP to test email
curl -X POST https://api.nairandassociates.in/api/v1/auth/request-otp \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Domain: practix-ops.disionix.com" \
  -d '{"identifier": "your-test-email@example.com"}'

# Check if email arrives from noreply@disionix.com
```

### Alternative: Keep Both Domains
You can have both `nairandassociates.in` and `disionix.com` verified:
- Use `disionix.com` for Practix demo tenant
- Use `nairandassociates.in` for Nair & Associates tenant

To implement tenant-specific email domains, update `email.service.ts`:

```typescript
async sendOtp(to: string, otp: string, tenantId?: string): Promise<void> {
  // Lookup tenant to get custom email domain
  const tenant = tenantId ? await this.prisma.tenant.findUnique({ 
    where: { id: tenantId },
    select: { brandingConfig: true }
  }) : null;
  
  const fromEmail = tenant?.brandingConfig?.emailFrom 
    ?? process.env.EMAIL_FROM 
    ?? 'onboarding@resend.dev';

  const { error } = await this.resend.emails.send({
    from: fromEmail,
    to,
    subject: 'Your login code',
    html: `...`,
  });
}
```

Then add `emailFrom` field to `brandingConfig` in the Tenant model.

---

## Summary

### Immediate Actions (Priority 1)
1. ✅ SSH into production server
2. ✅ Run `docker exec -it dsx-workflow-api npm run seed`
3. ✅ Verify Practix tenant and user created
4. ✅ Test login with `contact@disionix.com`

### Low-Effort Enhancement (Priority 2)  
1. Verify `disionix.com` in Resend dashboard
2. Update `EMAIL_FROM=noreply@disionix.com` in `.env`
3. Restart API: `docker compose -f docker-compose.prod.yml restart api`
4. Test OTP email delivery

### Monitoring
Add these to your deployment checklist:
- [ ] Verify all tenants seeded after database migrations
- [ ] Test OTP login for each tenant domain
- [ ] Verify Redis connectivity
- [ ] Check email delivery logs in Resend dashboard
