import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface EmailRequest {
  to: string;
  subject: string;
  emailType: string;
  templateData?: Record<string, any>;
  userId?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    if (!brevoApiKey) {
      console.error('BREVO_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const emailRequest: EmailRequest = await req.json();
    const { to, subject, emailType, templateData, userId } = emailRequest;

    const brevoPayload: any = {
      sender: {
        name: 'Buy Deals Club',
        email: 'noreply@buydealsclub.com'
      },
      to: [{ email: to }],
      subject: subject,
      htmlContent: generateEmailHTML(emailType, templateData || {}),
    };

    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(brevoPayload),
    });

    const brevoResult = await brevoResponse.json();

    const emailLog = {
      user_id: userId || null,
      email: to,
      email_type: emailType,
      subject: subject,
      template_id: null,
      status: brevoResponse.ok ? 'sent' : 'failed',
      brevo_message_id: brevoResult.messageId || null,
      metadata: templateData || {},
      error_message: brevoResponse.ok ? null : JSON.stringify(brevoResult),
      sent_at: new Date().toISOString(),
    };

    await supabase.from('email_logs').insert(emailLog);

    if (!brevoResponse.ok) {
      console.error('Brevo API error:', brevoResult);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageId: brevoResult.messageId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateEmailHTML(emailType: string, data: Record<string, any>): string {
  const baseStyle = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #333;
  `;

  const containerStyle = `
    max-width: 600px;
    margin: 0 auto;
    padding: 40px 20px;
  `;

  const headerStyle = `
    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
    color: white;
    padding: 30px;
    text-align: center;
    border-radius: 10px 10px 0 0;
  `;

  const contentStyle = `
    background: white;
    padding: 30px;
    border: 1px solid #e5e7eb;
    border-top: none;
  `;

  const buttonStyle = `
    display: inline-block;
    background: #3b82f6;
    color: white;
    padding: 12px 30px;
    text-decoration: none;
    border-radius: 6px;
    margin: 20px 0;
  `;

  const footerStyle = `
    text-align: center;
    color: #6b7280;
    font-size: 12px;
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid #e5e7eb;
  `;

  let content = '';

  switch (emailType) {
    case 'newsletter_confirmation':
      content = `
        <h2>Welcome to Buy Deals Club Newsletter! 📧</h2>
        <p>Thank you for subscribing to our newsletter!</p>
        <p>You'll now receive:</p>
        <ul>
          <li>🎯 Exclusive daily deals delivered to your inbox</li>
          <li>💡 Early access to flash sales</li>
          <li>🎁 Special subscriber-only promotions</li>
          <li>📰 Weekly roundup of the best deals</li>
        </ul>
        <p>We promise to only send you the best deals and never spam your inbox.</p>
        <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
          Don't want to receive these emails anymore? You can <a href="${data.unsubscribeUrl}" style="color: #3b82f6;">unsubscribe anytime</a>.
        </p>
      `;
      break;

    default:
      content = `
        <h2>Message from Buy Deals Club</h2>
        <p>Thank you for being a valued customer!</p>
      `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="${baseStyle} background: #f3f4f6; margin: 0; padding: 0;">
      <div style="${containerStyle}">
        <div style="${headerStyle}">
          <h1 style="margin: 0; font-size: 32px; font-weight: bold;">Buy Deals Club</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your Daily Deal Destination</p>
        </div>
        <div style="${contentStyle}">
          ${content}
        </div>
        <div style="${footerStyle}">
          <p>© 2025 Buy Deals Club Ltd. All rights reserved.</p>
          <p>Contact us: contact@buydealsclub.com | 94 60 15 15</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
