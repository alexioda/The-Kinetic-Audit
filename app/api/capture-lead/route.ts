import { NextResponse } from 'next/server';

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

    if (!API_KEY) {
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
          kinetic_archetype: pattern,
          kinetic_tier: tier
        }
      })
    });

    if (!crmResponse.ok) {
      const errorData = await crmResponse.json();
      console.error('MailerLite API Error:', errorData);
      throw new Error('Failed to sync with MailerLite');
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Lead Capture Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
