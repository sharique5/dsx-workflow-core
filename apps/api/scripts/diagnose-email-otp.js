#!/usr/bin/env node
/**
 * Diagnostic script for "OTP email not arriving" issues.
 *
 * Sends a real test email through Resend using the same RESEND_API_KEY /
 * EMAIL_FROM the API container uses, then polls Resend for the delivery
 * status of that specific email (queued / sent / delivered / bounced /
 * complained). This tells you whether the problem is:
 *   - Resend rejecting the send (would show as an `error` here)
 *   - Resend accepting it but the recipient being on the suppression list
 *     (accepted with no error, but last_event stays "bounced"/"complained"
 *     from a previous failure — email is silently NOT delivered)
 *   - Resend delivering fine (last_event: "delivered") — meaning the email
 *     landed in spam/junk or a provider-side filter, not a bug in this app.
 *
 * Usage:
 *   docker exec -it dsx-workflow-api node scripts/diagnose-email-otp.js you@example.com
 */

const { Resend } = require('resend');

const to = process.argv[2];

if (!to) {
  console.error('Usage: node scripts/diagnose-email-otp.js <recipient-email>');
  process.exit(1);
}

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? 'onboarding@resend.dev';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function diagnose() {
  console.log('\n🔍 Diagnosing Email OTP Delivery\n');
  console.log('='.repeat(60));

  console.log('\n1️⃣  Checking configuration...');
  if (!apiKey) {
    console.error('   ❌ RESEND_API_KEY is not set in this container\'s env');
    console.log('   💡 Fix: set RESEND_API_KEY and pass it through docker-compose');
    process.exit(1);
  }
  console.log(`   ✅ RESEND_API_KEY set (${apiKey.substring(0, 8)}...)`);
  console.log(`   ✅ EMAIL_FROM: ${from}`);
  if (from.endsWith('resend.dev')) {
    console.log(
      '   ⚠️  Using the shared resend.dev sending domain. Resend only delivers\n' +
        '      test emails to the address that owns the Resend account, or to\n' +
        '      resend.dev test addresses (e.g. delivered@resend.dev). Sending\n' +
        '      to any other real recipient will either be rejected (403) or, if\n' +
        '      that recipient was previously bounced/complained, silently\n' +
        '      suppressed. Verify a real domain at https://resend.com/domains\n' +
        '      and set EMAIL_FROM to an address on it to fix this for good.',
    );
  }

  const resend = new Resend(apiKey);

  console.log(`\n2️⃣  Sending test OTP email to ${to}...`);
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: 'DSX Workflow — diagnostic test email',
    html: '<p>This is a diagnostic test email to verify OTP delivery.</p>',
  });

  if (error) {
    console.error('   ❌ Resend rejected the send:');
    console.error('     ', JSON.stringify(error, null, 2));
    console.log(
      '\n   💡 This is the same error the app would hit — it explains why\n' +
        '      the OTP is never delivered. See the message above for the fix\n' +
        '      Resend suggests (usually: verify a domain).',
    );
    process.exit(1);
  }

  console.log(`   ✅ Resend accepted the send. Email ID: ${data.id}`);

  console.log('\n3️⃣  Polling Resend for delivery status (last_event)...');
  let lastEvent = 'unknown';
  for (let i = 0; i < 5; i++) {
    await wait(2000);
    const { data: email, error: getError } = await resend.emails.get(data.id);
    if (getError) {
      console.error('   ❌ Could not fetch email status:', JSON.stringify(getError));
      break;
    }
    lastEvent = email.last_event;
    console.log(`   [${i + 1}/5] last_event = ${lastEvent}`);
    if (['delivered', 'bounced', 'complained', 'delivery_delayed'].includes(lastEvent)) {
      break;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ DIAGNOSIS COMPLETE\n');
  if (lastEvent === 'delivered') {
    console.log('Resend delivered the email successfully. If the user still');
    console.log('cannot find it, tell them to check spam/junk/promotions —');
    console.log('this is expected for the shared onboarding@resend.dev domain.');
  } else if (lastEvent === 'bounced' || lastEvent === 'complained') {
    console.log(`Resend marked this email as "${lastEvent}". The recipient's`);
    console.log('mail server rejected it, or the address is on your Resend');
    console.log('suppression list (check https://resend.com/emails and');
    console.log('https://resend.com/domains > Suppressions).');
  } else {
    console.log(`Last known status: "${lastEvent}". Check https://resend.com/emails/${data.id}`);
    console.log('for the full event timeline.');
  }
  console.log('');
}

diagnose().catch((err) => {
  console.error('\n❌ Unexpected error during diagnosis:', err);
  process.exit(1);
});
