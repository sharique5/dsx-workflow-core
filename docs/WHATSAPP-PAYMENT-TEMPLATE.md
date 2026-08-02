# WhatsApp Payment Confirmation Template

This template needs to be submitted to Bird.com (WhatsApp Business API) for approval before payment confirmations can be sent via WhatsApp.

## Template Details

**Template Name:** `payment_confirmation`

**Category:** `TRANSACTIONAL` (or `UTILITY` - check Bird.com categories)

**Language:** English (en)

**Template Type:** Text message with variables

---

## Template Content

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

## Submission Steps

### 1. Log in to Bird.com Dashboard
- URL: https://app.bird.com
- Navigate to: **Messaging** → **Templates**

### 2. Create New Template
- Click "Create Template"
- Choose Platform: **WhatsApp Business**
- Template Name: `payment_confirmation`
- Category: **TRANSACTIONAL** (if available) or **UTILITY**
- Language: **English**

### 3. Paste Template Content
Copy the template content above (without the code block markers) and paste it into the template body field.

### 4. Map Variables
Ensure all 6 variables ({{1}} through {{6}}) are properly mapped.

### 5. Submit for Approval
- Submit the template for WhatsApp review
- **Approval time:** Usually 24-72 hours
- **Note:** WhatsApp may reject templates that are too promotional or don't follow their guidelines

### 6. After Approval
Once approved, you'll receive:
- **Template Project ID**: Save this in your .env file
- **Template Version**: Save this in your .env file

Update your `.env` file with these values:
```env
BIRD_PAYMENT_TEMPLATE_PROJECT_ID=<your-project-id>
BIRD_PAYMENT_TEMPLATE_VERSION=<your-version-id>
```

---

## Backend Integration (After Approval)

Once the template is approved, update `fees.service.ts` to send WhatsApp notifications:

```typescript
// In verifyRazorpayPayment method, replace the TODO with:

if (matter?.participant?.phone) {
  // Send WhatsApp notification using approved template
  const whatsappMessage = {
    channelId: process.env.BIRD_WHATSAPP_CHANNEL_ID,
    to: matter.participant.phone,
    type: 'template',
    content: {
      templateId: process.env.BIRD_PAYMENT_TEMPLATE_PROJECT_ID,
      templateVersion: process.env.BIRD_PAYMENT_TEMPLATE_VERSION,
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
  // Implementation depends on their SDK/API structure
}
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

- [ ] Template created in Bird.com dashboard
- [ ] Template submitted for WhatsApp approval
- [ ] Template approved by WhatsApp
- [ ] Environment variables updated in .env
- [ ] Backend integration code updated
- [ ] Test WhatsApp notification sent successfully
- [ ] Live WhatsApp notifications enabled
