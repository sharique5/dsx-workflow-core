# WhatsApp Payment Notification Templates

These templates need to be submitted to Bird.com (WhatsApp Business API) for approval before payment notifications can be sent via WhatsApp.

---

## Template 1: Payment Success

### Template Details

**Template Name:** `payment_confirmation`

**Category:** `TRANSACTIONAL` (or `UTILITY` - check Bird.com categories)

**Language:** English (en)

**Template Type:** Text message with variables

### Template Content

```
✅ Payment Received Successfully!

Hi {{1}},

Your payment has been confirmed:

💰 Amount Paid: ₹{{2}}
💳 Transaction ID: {{3}}
📁 Case: {{4}}
📊 Remaining Balance: ₹{{5}}

{{6}}

Thank you for your payment!

---
This is an automated message from your legal team's case management system.
```

---

## Variable Mapping

| Variable | Description | Example Value |
|----------|-------------|---------------|
| {{1}} | Client Name | "Rajesh Kumar" |
| {{2}} | Amount Paid (formatted) | "5,000" |
| {{3}} | Razorpay Payment ID | "pay_Nh1j2k3l4m5n6o7p" |
| {{4}} | Case Title | "Property Dispute - Flat 301" |
| {{5}} | Remaining Balance (formatted) | "15,000" |
| {{6}} | Dynamic Message | "✓ Your balance is now fully cleared. Thank you!" OR "Partial payment received." |

---

## Template 2: Payment Failed

### Template Details

**Template Name:** `payment_failed`

**Category:** `TRANSACTIONAL` (or `UTILITY`)

**Language:** English (en)

**Template Type:** Text message with variables

### Template Content

```
❌ Payment Failed

Hi {{1}},

Unfortunately, your payment could not be processed.

📁 Case: {{2}}
💰 Amount Attempted: ₹{{3}}
📊 Outstanding Balance: ₹{{4}}

{{5}}

Please try again or contact us if you need assistance.

---
This is an automated message from your legal team's case management system.
```

### Variable Mapping

| Variable | Description | Example Value |
|----------|-------------|---------------|
| {{1}} | Client Name | "Rajesh Kumar" |
| {{2}} | Case Title | "Property Dispute - Flat 301" |
| {{3}} | Amount Attempted (formatted) | "5,000" |
| {{4}} | Outstanding Balance (formatted) | "20,000" |
| {{5}} | Failure Reason | "Payment was declined by your bank." OR "Transaction timed out. Please try again." OR "Technical issue occurred." |

---

## Submission Steps (Both Templates)

### 1. Log in to Bird.com Dashboard
- URL: https://app.bird.com
- Navigate to: **Messaging** → **Templates**

### 2. Create New Template
- Click "Create Template"
- Choose Platform: **WhatsApp Business**
- **Create TWO templates:**
  1. Template Name: `payment_confirmation` (for success)
  2. Template Name: `payment_failed` (for failures)
- Category: **TRANSACTIONAL** (if available) or **UTILITY**
- Language: **English**

### 3. Paste Template Content
Copy the respective template content above (without the code block markers) and paste into each template's body field.

### 4. Map Variables
- Success template: Ensure all 6 variables ({{1}} through {{6}}) are properly mapped
- Failure template: Ensure all 5 variables ({{1}} through {{5}}) are properly mapped

### 5. Submit for Approval
- Submit the template for WhatsApp review
- **Approval time:** Usually 24-72 hours
- **Note:** WhatsApp may reject templates that are too promotional or don't follow their guidelines

### 6. After Approval
Once approved, you'll receive template IDs for BOTH templates:
- **Success Template:** Project ID + Version
- **Failure Template:** Project ID + Version

Update your `.env` file with these values:
```env
# Success template
BIRD_PAYMENT_SUCCESS_TEMPLATE_PROJECT_ID=<your-success-project-id>
BIRD_PAYMENT_SUCCESS_TEMPLATE_VERSION=<your-success-version-id>

# Failure template
BIRD_PAYMENT_FAILED_TEMPLATE_PROJECT_ID=<your-failure-project-id>
BIRD_PAYMENT_FAILED_TEMPLATE_VERSION=<your-failure-version-id>
```

---

## Backend Integration (After Approval)

Once the templates are approved, update `fees.service.ts` to send WhatsApp notifications for both success and failure scenarios.

### Success Notification (in `verifyRazorpayPayment` method)

```typescript
// After successful payment verification and recording, replace the TODO with:

if (matter?.participant?.phone) {
  try {
    // Send WhatsApp success notification using approved template
    const whatsappMessage = {
      channelId: process.env.BIRD_WHATSAPP_CHANNEL_ID,
      to: matter.participant.phone,
      type: 'template',
      content: {
        templateId: process.env.BIRD_PAYMENT_SUCCESS_TEMPLATE_PROJECT_ID,
        templateVersion: process.env.BIRD_PAYMENT_SUCCESS_TEMPLATE_VERSION,
        language: 'en',
        parameters: [
          { type: 'text', text: matter.participant.name },
          { type: 'text', text: dto.amount.toLocaleString('en-IN') },
          { type: 'text', text: dto.razorpay_payment_id },
          { type: 'text', text: matter.title },
          { type: 'text', text: remaining.toLocaleString('en-IN') },
          { 
            type: 'text', 
            text: remaining === 0 
              ? '✓ Your balance is now fully cleared. Thank you!' 
              : 'Partial payment received.' 
          },
        ],
      },
    };

    // Send via Bird.com API
    await this.sendWhatsAppNotification(whatsappMessage);
  } catch (error) {
    // Log but don't fail the payment if WhatsApp fails
    console.error('Failed to send WhatsApp success notification:', error);
  }
}
```

### Failure Notification (in payment error handling)

Add a new method to handle payment failures:

```typescript
async notifyPaymentFailure(
  matterId: string,
  feeId: string,
  amount: number,
  reason: string,
  user: AuthenticatedUser,
) {
  const fee = await this.prisma.fee.findFirst({
    where: { id: feeId, matterId, tenantId: user.tenantId },
    select: { totalAmount: true, paidAmount: true },
  });

  const matter = await this.prisma.matter.findUnique({
    where: { id: matterId },
    select: { 
      title: true, 
      participant: { 
        select: { name: true, email: true, phone: true } 
      } 
    },
  });

  if (!matter?.participant) return;

  const currentTotal = Number(fee?.totalAmount || 0);
  const currentPaid = Number(fee?.paidAmount || 0);
  const dueAmount = currentTotal - currentPaid;

  // Send email notification
  if (matter.participant.email) {
    // You can add a sendPaymentFailureEmail method to email.service.ts
    void this.email.sendCaseNotification(
      matter.participant.email,
      matter.participant.name,
      `Your payment of ₹${amount.toLocaleString('en-IN')} could not be processed. ${reason}`,
      matter.title,
    ).catch(err => console.error('Failed to send failure email:', err));
  }

  // Send WhatsApp notification
  if (matter.participant.phone) {
    try {
      const whatsappMessage = {
        channelId: process.env.BIRD_WHATSAPP_CHANNEL_ID,
        to: matter.participant.phone,
        type: 'template',
        content: {
          templateId: process.env.BIRD_PAYMENT_FAILED_TEMPLATE_PROJECT_ID,
          templateVersion: process.env.BIRD_PAYMENT_FAILED_TEMPLATE_VERSION,
          language: 'en',
          parameters: [
            { type: 'text', text: matter.participant.name },
            { type: 'text', text: matter.title },
            { type: 'text', text: amount.toLocaleString('en-IN') },
            { type: 'text', text: dueAmount.toLocaleString('en-IN') },
            { type: 'text', text: reason },
          ],
        },
      };

      // Send via Bird.com API
      await this.sendWhatsAppNotification(whatsappMessage);
    } catch (error) {
      console.error('Failed to send WhatsApp failure notification:', error);
    }
  }
}

// Helper method to send WhatsApp messages via Bird.com
private async sendWhatsAppNotification(message: any): Promise<void> {
  // Implementation depends on Bird.com SDK/API structure
  // Example using HTTP client:
  
  const response = await fetch('https://api.bird.com/workspaces/{workspace_id}/channels/whatsapp/messages', {
    method: 'POST',
    headers: {
      'Authorization': `AccessKey ${process.env.BIRD_ACCESS_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    throw new Error(`WhatsApp API error: ${response.status}`);
  }
}
```

### Calling Failure Notification

In your payment frontend hook (`useRazorpayPayment`), update the error handler:

```typescript
onError: (error: Error) => {
  // Notify backend about the failure so it can send notifications
  if (error.message !== 'Payment cancelled by user') {
    portalFeesApi.notifyPaymentFailure(matterId, feeId, {
      amount,
      reason: error.message || 'Payment failed',
    }).catch(() => {
      // Silent fail - notification is best effort
    });
  }

  // Show user-facing error
  if (error.message === 'Payment cancelled by user') {
    toast.info('Payment cancelled');
  } else {
    toast.error('Payment failed', { description: error.message || 'Please try again' });
  }
},
```

---

## Important Notes

1. **Template Variables Cannot Be Dynamic Text**
   - WhatsApp doesn't allow free-form text in templates
   - All text must be pre-approved
   - Only variable values can change

2. **Alternative if Template is Rejected**
   - Use email notifications only (already implemented)
   - Or send a generic WhatsApp message linking to the portal where full details are shown

3. **Testing**
   - Use Bird.com's sandbox/test environment first
   - Send test messages before going live

4. **Rate Limits**
   - WhatsApp has rate limits based on your Business Account tier
   - Start with lower volumes and scale gradually

---

## Support

If you face issues with template approval:
- Check Bird.com documentation: https://docs.bird.com
- Contact Bird.com support: support@bird.com
- Review WhatsApp Business Policy: https://www.whatsapp.com/legal/business-policy

---

## Status Tracking

### Success Template (`payment_confirmation`)
- [ ] Template created in Bird.com dashboard
- [ ] Template submitted for WhatsApp approval
- [ ] Template approved by WhatsApp
- [ ] Environment variables updated in .env
- [ ] Backend integration code updated
- [ ] Test WhatsApp notification sent successfully
- [ ] Live WhatsApp notifications enabled

### Failure Template (`payment_failed`)
- [ ] Template created in Bird.com dashboard
- [ ] Template submitted for WhatsApp approval
- [ ] Template approved by WhatsApp
- [ ] Environment variables updated in .env
- [ ] Backend integration code updated
- [ ] Test WhatsApp notification sent successfully
- [ ] Live WhatsApp notifications enabled

### General
- [ ] Failure notification endpoint added to backend
- [ ] Frontend updated to call failure notification
- [ ] Error handling tested with various failure scenarios
