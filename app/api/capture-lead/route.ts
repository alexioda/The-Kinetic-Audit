import { NextResponse } from 'next/server';
import { computeResult, isCompleteAnswerSet, type BlueprintResult } from '@/lib/blueprint';

// ── Access guard ─────────────────────────────────────────────────────────────
// Same pattern as Adaptiv's api/_lib/shared.ts guard(): origin allowlist,
// per-IP rate limit, body size cap. This endpoint sends email from
// send.liveadaptiv.com, so it must not be callable from anywhere else, and
// it must not let the caller choose what the email says (see POST below).
const ALLOWED_ORIGINS = [
  'https://blueprint.liveadaptiv.com',
  'https://audit.liveadaptiv.com',
  'https://the-kinetic-audit.vercel.app',
  'http://localhost:3000',
];

// Preview deploys get a generated *.vercel.app hostname; allow those only
// outside production.
const ALLOW_VERCEL_PREVIEWS = process.env.VERCEL_ENV !== 'production';
const VERCEL_PREVIEW_RE = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  return ALLOW_VERCEL_PREVIEWS && VERCEL_PREVIEW_RE.test(origin);
}

const MAX_BODY_BYTES = 2_000;

// Weak per-instance limiter: serverless instances are short-lived, so this
// blunts casual abuse rather than stopping a determined attacker. One person
// submits once, so the limit is low.
const hits = new Map<string, { n: number; reset: number }>();
const LIMIT = 5;
const WINDOW_MS = 10 * 60_000;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.reset) {
    hits.set(ip, { n: 1, reset: now + WINDOW_MS });
    if (hits.size > 5000) hits.clear();
    return false;
  }
  rec.n += 1;
  return rec.n > LIMIT;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeArchetype(r: BlueprintResult): string {
  if (r.isMixed) return 'mixed';
  if (r.dominant === 'freezer' || r.dominant === 'rusher' || r.dominant === 'fixer') return r.dominant;
  return 'regulated';
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

// Every line of this email comes from computeResult(), never from the
// request, so the endpoint can't be used to send someone else's text.
async function sendResultsToClient(email: string, r: BlueprintResult): Promise<void> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = 'results@send.liveadaptiv.com';

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY missing — skipping client results email.');
    return;
  }

  const text = [
    `Your Kinetic Blueprint Results`,
    ``,
    `Your current default under pressure: ${r.primaryType}`,
    ``,
    r.desc,
    ``,
    `Your protocol:`,
    r.patternProtocol,
    ``,
    `Your next step: ${r.tierInfo.cta}`,
    r.tierInfo.ctaDesc,
    r.tierInfo.checkoutUrl,
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
        subject: `Your Kinetic Blueprint: ${r.primaryType}`,
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
  const origin = request.headers.get('origin') ?? '';
  const sameSite = request.headers.get('sec-fetch-site');
  // CORS alone doesn't stop curl, so a disallowed origin is refused outright.
  if (!isAllowedOrigin(origin) && !(!origin && sameSite === 'same-origin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }
    const body = JSON.parse(raw || '{}');
    const { email, b_name, answers } = body;

    if (b_name) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (typeof email !== 'string' || email.length > 254 || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    // The result is scored here from the raw answers. The old version took
    // the pattern, description, protocol and link from the request body and
    // emailed them to any address, which made it an open relay.
    if (!isCompleteAnswerSet(answers)) {
      return NextResponse.json({ error: 'Complete answers required' }, { status: 400 });
    }
    const result = computeResult(answers);
    const archetype = normalizeArchetype(result);
    const tier = result.tierInfo.name;

    await Promise.all([
      notifyOwner(email, archetype, tier),
      sendResultsToClient(email, result),
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
