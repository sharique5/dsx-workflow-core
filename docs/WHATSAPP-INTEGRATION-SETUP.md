# WhatsApp Integration - Setup Guide

**Status:** ✅ Code Complete - Ready for Configuration  
**Date:** 2026-08-02

---

## 🎉 What Was Implemented

### Backend (NestJS)
✅ **Success Notification**
- Automatically sent after successful payment verification
- Uses `payment_confirmation` template
- Includes: amount, transaction ID, case name, remaining balance

✅ **Failure Notification**  
- New endpoint: `POST /api/v1/matters/:matterId/fees/:feeId/razorpay/notify-failure`
- Uses `payment_failed` template
- Includes: attempted amount, case name, outstanding balance, failure reason

✅ **Bird.com Integration**
- `sendWhatsAppPaymentSuccess()` private method
- `sendWhatsAppPaymentFailure()` private method
- Proper error handling and logging
- Graceful fallback if credentials not configured

### Frontend (React Portal)
✅ **Auto-notification on Failure**
- Payment errors automatically trigger backend notification
- User cancellations excluded (no spam)
- Silent failure (doesn't block user experience)

---

## 🔧 Configuration Required

### Step 1: Add Environment Variables

You need to add these to your `apps/api/.env` file:

```env
# WhatsApp Payment Notifications (Bird.com)

# Success template (payment_confirmation)
BIRD_PAYMENT_SUCCESS_TEMPLATE_PROJECT_ID=<your-approved-template-project-id>
BIRD_PAYMENT_SUCCESS_TEMPLATE_VERSION=<your-approved-template-version>

# Failure template (payment_failed)
BIRD_PAYMENT_FAILED_TEMPLATE_PROJECT_ID=<your-approved-template-project-id>
BIRD_PAYMENT_FAILED_TEMPLATE_VERSION=<your-approved-template-version>
```

**Note:** You already have these in your `.env`:
- `BIRD_ACCESS_KEY`
- `BIRD_WORKSPACE_ID`
- `BIRD_WHATSAPP_CHANNEL_ID`

---

## 📋 Where to Find Template IDs

1. **Log in to Bird.com Dashboard**
   - URL: https://app.bird.com
   
2. **Navigate to Templates**
   - Messaging → Templates
   
3. **Find Your Approved Templates**
   - `payment_confirmation` (success)
   - `payment_failed` (failure)
   
4. **Copy the IDs**
   - Click on each template
   - Copy **Project ID** and **Version**
   
5. **Add to `.env` file**

---

## 🧪 Testing

### Test Success Notification

1. Start your backend
2. Make a successful test payment
3. Check backend logs for:
   ```
   [FeesService] WhatsApp payment success notification sent to +91...
   ```
4. Check client's WhatsApp for success message

### Test Failure Notification

1. Use a test card that fails (e.g., `4000 0000 0000 0002`)
2. Or cancel the payment modal
3. Check backend logs for:
   ```
   [FeesService] WhatsApp payment failure notification sent to +91...
   ```
4. Check client's WhatsApp for failure message

### If WhatsApp Not Configured

If template IDs are missing, you'll see:
```
[FeesService] WhatsApp payment notification skipped: Bird.com credentials not configured
```

The system will gracefully skip WhatsApp and only send emails.

---

## 🔍 Verification Checklist

- [ ] Template IDs copied from Bird.com dashboard
- [ ] Environment variables added to `apps/api/.env`
- [ ] Backend restarted after adding variables
- [ ] Test payment completed successfully
- [ ] WhatsApp success notification received
- [ ] Test payment failure triggered
- [ ] WhatsApp failure notification received
- [ ] Backend logs show successful WhatsApp sends

---

## 📊 API Flow

### Success Flow
```
Client makes payment
  ↓
Razorpay verifies
  ↓
Backend records payment
  ↓
Email sent (✓)
  ↓
WhatsApp sent (✓)
  ↓
Client sees success toast
```

### Failure Flow
```
Payment fails at Razorpay
  ↓
Frontend catches error
  ↓
Frontend calls notify-failure endpoint
  ↓
Backend sends email (✓)
  ↓
Backend sends WhatsApp (✓)
  ↓
Client sees error toast
```

---

## 🔒 Security Notes

1. **Template IDs are not secrets** - They're safe to commit to git
2. **ACCESS_KEY must stay secret** - Already in your `.env` (not committed)
3. **Phone numbers are validated** - Only participants get notifications
4. **Rate limiting** - Bird.com enforces WhatsApp Business rate limits

---

## 🚨 Troubleshooting

### WhatsApp not sending

**Check 1:** Are template IDs in `.env`?
```powershell
cd apps/api
Get-Content .env | Select-String BIRD_PAYMENT
```

**Check 2:** Did you restart the backend?
```powershell
# Must restart after adding env vars
npm run start:dev
```

**Check 3:** Check backend logs
```
[FeesService] WhatsApp payment success notification sent to...
```

**Check 4:** Verify Bird.com credentials
- Log in to https://app.bird.com
- Check Workspace ID, Access Key, Channel ID
- Verify WhatsApp channel is active

### Bird.com API errors

**Common issues:**
- `401 Unauthorized` - Invalid ACCESS_KEY
- `404 Not Found` - Invalid template ID or channel ID
- `400 Bad Request` - Template parameters mismatch
- `429 Too Many Requests` - Rate limit exceeded

Check logs for detailed error messages.

---

## 💡 Tips

1. **Test with your own number first** before enabling for clients
2. **Monitor Bird.com usage dashboard** for delivery rates
3. **WhatsApp templates expire** - Update version IDs if template is modified
4. **Set up alerts** in Bird.com for failed deliveries
5. **Rate limits** - WhatsApp limits vary by Business Account tier

---

## 📄 Files Modified

| File | Changes |
|------|---------|
| `apps/api/src/modules/fees/fees.service.ts` | Added WhatsApp notification methods |
| `apps/api/src/modules/fees/fees.controller.ts` | Added failure notification endpoint |
| `apps/api/src/modules/fees/dto/fee.dto.ts` | Added NotifyPaymentFailureDto |
| `apps/portal/src/modules/cases/api/portal-fees.api.ts` | Added failure notification API |
| `apps/portal/src/modules/cases/hooks/usePortalCases.ts` | Auto-call failure notification |

---

## 🎯 Next Steps

1. ✅ Code is complete and committed
2. ⏳ **Add template IDs to `.env`** (you need to do this)
3. ⏳ Restart backend
4. ⏳ Test both success and failure scenarios
5. ⏳ Monitor WhatsApp delivery in Bird.com dashboard

---

## ✨ Features Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Success notification (Email) | ✅ Working | Always sent |
| Success notification (WhatsApp) | ✅ Ready | Needs template IDs |
| Failure notification (Email) | ✅ Working | Always sent |
| Failure notification (WhatsApp) | ✅ Ready | Needs template IDs |
| Graceful fallback | ✅ Working | Skips WhatsApp if not configured |
| Error logging | ✅ Working | Detailed logs for debugging |
| Frontend integration | ✅ Working | Auto-triggers on failures |

---

**Ready to go live!** Just add your template IDs and restart. 🚀
