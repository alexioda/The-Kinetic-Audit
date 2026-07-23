// --- MAILERLITE INTEGRATION ---
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
          // MailerLite allows you to create these custom fields in their dashboard
          kinetic_archetype: archetype, 
          kinetic_tier: tier 
        }
      })
    });

    if (!crmResponse.ok) {
      const errorData = await crmResponse.json();
      console.error('MailerLite API Error:', errorData);
      throw new Error('Failed to sync with MailerLite');
    }
    // -----------------------------
