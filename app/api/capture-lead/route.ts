import { NextResponse } from 'next/server';

function normalizeArchetype(primaryType: string): string {
  const lower = (primaryType || '').toLowerCase();
  if (lower.includes('mixed')) return 'mixed';
  if (lower.includes('freezer')) return 'freezer';
  if (lower.includes('rusher')) return 'rusher';
  if (lower.includes('fixer')) return 'fixer';
  if (lower.includes('regulated')) return 'regulated';
  return 'unknown';
}

async function notifyOwner(
  email: string,
  archetype: string,
  tier: string
): Promise<void> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const NOTIFY_EMAIL = 'alexioda@gmail.com';
  const FROM_EMAIL = 'alerts@send.liveadaptiv.com';

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY missing — skipping owner notification.');
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [NOTIFY_EMAIL],
        subject: `New Blueprint Lead: ${archetype} (${tier})`,
        text: `A new Kinetic Blueprint lead just completed the diagnostic.\n\nEmail: ${email}\nArchetype: ${archetype}\nTier: ${tier}`,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('Owner notification failed:', res.status, body);
    }
  } catch (err) {
    console.error('Owner notification request failed:', err);
  }
}

async function sendResultsToClient(
  email: string,
  primaryType: string,
  desc: string,
  patternProtocol: string,
  ctaTitle: string,
  ctaDesc: string,
  ctaUrl: string
): Promise<void> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = 'results@send.liveadaptiv.com';

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY missing — skipping client results email.');
    return;
  }

  const text = [
    `Your Kinetic Blueprint Results`,
    ``,
    `Your current default under pressure: ${primaryType}`,
    ``,
    desc,
    ``,
    `Your protocol:`,
    patternProtocol,
    ``,
    `Your next step: ${ctaTitle}`,
    ctaDesc,
    ctaUrl,
  ].join('\n');

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `LiveAdaptiv <${FROM_EMAIL}>`,
        to: [email],
        subject: `Your Kinetic Blueprint: ${primaryType}`,
        text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('Client results email failed:', res.status, body);
    }
  } catch (err) {
    console.error('Client results email request failed:', err);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      email,
      pattern,
      tier,
      b_name,
      desc,
      patternProtocol,
      ctaTitle,
      ctaDesc,
      ctaUrl,
    } = body;

    if (b_name) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const archetype = normalizeArchetype(pattern);

    await Promise.all([
      notifyOwner(email, archetype, tier),
      sendResultsToClient(email, pattern, desc, patternProtocol, ctaTitle, ctaDesc, ctaUrl),
    ]);

    const API_KEY = process.env.MAILERLITE_API_KEY;
    const GROUP_ID = process.env.MAILERLITE_GROUP_ID;

    if (!API_KEY || !GROUP_ID) {
      throw new Error('Missing MailerLite credentials in Vercel Environment Variables.');
    }

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
      return NextResponse.json({ success: true, mailerliteSynced: false });
    }

    return NextResponse.json({ success: true, mailerliteSynced: true });

  } catch (error) {
    console.error('Lead Capture Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
