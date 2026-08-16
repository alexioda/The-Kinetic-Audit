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

    // 2. Push to MailerLite API
    const API_KEY = process.env.MAILERLITE_API_KEY;
    const GROUP_ID = process.env.MAILERLITE_GROUP_ID;

    if (!API_KEY || !GROUP_ID) {
      throw new Error('Missing MailerLite credentials in Vercel Environment Variables.');
    }

    const archetype = normalizeArchetype(pattern);

    const crmResponse = await fetch(`https://connect.mailerlite.com/api/subscribers`, {
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
    });

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
