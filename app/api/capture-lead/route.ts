import { NextResponse } from 'next/server';

// Normalizes resultData.primaryType (a full display string like "The Freezer"
// or "Mixed Default: Rusher / Fixer") into the clean tag your MailerLite
// automation conditions actually check against.
function normalizeArchetype(primaryType: string): string {
  const lower = (primaryType || '').toLowerCase();
  if (lower.includes('mixed')) return 'mixed';
  if (lower.includes('freezer')) return 'freezer';
  if (lower.includes('rusher')) return 'rusher';
  if (lower.includes('fixer')) return 'fixer';
  if (lower.includes('regulated')) return 'regulated';
  return 'unknown';
}

// Fires a completion notification email via FormSubmit.co. This endpoint has
// never sent an email before now — Resend lives in the separate Sovereign
// repo, not here. Never throws: a failure here must never block or fail the
// user's response, and it's awaited alongside (not before) the MailerLite
// call below so it can't add sequential latency to the response.
async function notifyOnCompletion(
  email: string,
  archetype: string,
  tier: string
): Promise<void> {
  const NOTIFY_EMAIL = 'alexioda@gmail.com';
  try {
    const res = await fetch(`https://formsubmit.co/ajax/${NOTIFY_EMAIL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email,
        archetype,
        tier,
        _subject: `New Blueprint Lead: ${archetype} (${tier})`,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('FormSubmit notification failed:', res.status, body);
    }
  } catch (err) {
    console.error('FormSubmit notification request failed:', err);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, pattern, tier, b_name } = body;

    // 1. Honeypot trap for bots
    if (b_name) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const archetype = normalizeArchetype(pattern);

    // Kick off the completion notification immediately — independent of
    // MailerLite's config/availability below, so a missing env var or a
    // MailerLite-side failure can never also silently drop this email.
    const notifyPromise = notifyOnCompletion(email, archetype, tier);

    // 2. Push to MailerLite API
    const API_KEY = process.env.MAILERLITE_API_KEY;
    const GROUP_ID = process.env.MAILERLITE_GROUP_ID;

    if (!API_KEY || !GROUP_ID) {
      await notifyPromise;
      throw new Error('Missing MailerLite credentials in Vercel Environment Variables.');
    }

    // Run the notification and the MailerLite sync concurrently rather than
    // sequentially — they're independent side effects, and awaiting one
    // after the other only adds latency to the response the frontend is
    // waiting on before it shows the user their results.
    const [, crmResponse] = await Promise.all([
      notifyPromise,
      fetch(`https://connect.mailerlite.com/api/subscribers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          email: email,
          fields: {
            kinetic_archetype: archetype,
            kinetic_tier: tier
          },
          groups: [GROUP_ID]
        })
      })
    ]);

    if (!crmResponse.ok) {
      const errorData = await crmResponse.json().catch(() => ({}));
      console.error('MailerLite API Error:', errorData);
      // Log and continue rather than fail the whole request — the frontend
      // already treats a non-2xx capture-lead response as non-fatal (it still
      // shows the user their results either way). No reason to also throw
      // here and mask that this was specifically a MailerLite sync issue.
      return NextResponse.json({ success: true, mailerliteSynced: false });
    }

    return NextResponse.json({ success: true, mailerliteSynced: true });

  } catch (error) {
    console.error('Lead Capture Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
