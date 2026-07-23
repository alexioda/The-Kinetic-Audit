import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, archetype, tier, b_name } = body;

    // Honeypot trap
    if (b_name) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    // --- CRM INTEGRATION HERE ---
    // Example: process.env.LOOPS_API_KEY
    // Replace this block with your specific CRM fetch request as discussed previously.
    console.log(`Lead Captured: ${email} | ${archetype} | ${tier}`);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Lead Capture Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
