import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("FROM_EMAIL")!;
const APP_URL = Deno.env.get("APP_URL")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending welcome email to ${email}`);

    // Extract display name for FROM - show "Synka" as sender
    const fromAddress = FROM_EMAIL.includes('<') ? FROM_EMAIL : `Synka <${FROM_EMAIL}>`;

    // Send email using Resend API directly via fetch
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [email],
        subject: "Welcome to SYNKA 👋 Your digital card is ready",
        html: getWelcomeEmail(name || "there"),
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const result = await response.json();
    console.log("Email sent successfully:", result);

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Welcome email error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

function getWelcomeEmail(name: string) {
  return `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f6f7f9;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:12px;">
  <table width="100%" cellpadding="0" cellspacing="0"
    style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;
    font-family:'Segoe UI',Arial,sans-serif;
    box-shadow:0 4px 20px rgba(0,0,0,0.08);">
            
            <!-- Header with Orange Gradient -->
            <tr>
              <td style="background:linear-gradient(135deg, #ff7a00 0%, #ff9a40 100%);padding:20px 16px;text-align:center;">
                <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;letter-spacing:1px;">
                  SYNKA
                </h1>
                <p style="color:rgba(255,255,255,0.95);margin:8px 0 0;font-size:14px;font-weight:500;">
                  One Card. Infinite Possibilities.
                </p>
                <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:12px;">
                  India's Most Powerful Digital Business Card
                </p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:24px 18px;color:#1a1a1a;">
                <h2 style="margin:0 0 16px;font-size:22px;color:#111;">Hi ${name} 👋</h2>

                <p style="font-size:15px;line-height:1.6;color:#333;margin:0 0 16px;">
                  Welcome to <b style="color:#ff7a00;">SYNKA</b> — your smart digital business card with
                  <b>CRM, NFC & Analytics</b>.
                </p>

                <p style="font-size:15px;line-height:1.6;color:#333;margin:0 0 24px;">
                  Your digital card is live and ready to share instantly 🚀
                </p>

                <!-- Saira Section -->
                <div style="background:#fff8f0;border-radius:12px;padding:20px;margin:0 0 24px;border-left:4px solid #ff7a00;">
                  <h3 style="margin:0 0 10px;font-size:16px;color:#111;">🤖 Meet Saira — Your AI Assistant</h3>
                  <p style="font-size:14px;line-height:1.5;color:#555;margin:0 0 14px;">
                    Need instant help, tips, or guidance? Chat with <b style="color:#ff7a00;">Saira</b> anytime.
                  </p>
                  <a href="${APP_URL}/index"
                    style="display:inline-block;background:#ff7a00;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:14px;">
                    Chat with Saira
                  </a>
                </div>

                <!-- Support Section -->
                <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin:0 0 24px;">
                  <h3 style="margin:0 0 10px;font-size:16px;color:#111;">📚 Help, Guides & FAQs</h3>
                  <p style="font-size:14px;line-height:1.5;color:#555;margin:0 0 14px;">
                    Learn how to use cards, NFC, CRM, analytics, and more.
                  </p>
                  <a href="${APP_URL}/support"
                    style="display:inline-block;background:#e8e8e8;color:#333;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:500;font-size:13px;">
                    Visit Support Center
                  </a>
                </div>

                <!-- Upgrade Section -->
                <div style="background:linear-gradient(135deg, #fff8f0 0%, #fff0e0 100%);border-radius:12px;padding:20px;margin:0 0 24px;border:1px solid #ffe0c0;">
                  <h3 style="margin:0 0 12px;font-size:16px;color:#111;">🧡 Upgrade to Orange (Pro)</h3>
                  <ul style="padding-left:20px;margin:0 0 16px;font-size:14px;line-height:1.8;color:#444;">
                    <li>Multiple digital cards</li>
                    <li>File uploads (Pitch, Catalogue, PDFs)</li>
                    <li>NFC writer</li>
                    <li>Advanced analytics</li>
                    <li>Email signature & premium designs</li>
                  </ul>
                  <a href="${APP_URL}/settings/upgrade"
                    style="display:inline-block;background:linear-gradient(135deg, #ff7a00 0%, #ff9a40 100%);color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;font-size:14px;box-shadow:0 2px 8px rgba(255,122,0,0.3);">
                    Upgrade to Orange
                  </a>
                </div>

                <!-- Custom Solutions -->
                <div style="background:#f0f7ff;border-radius:12px;padding:18px;margin:0 0 24px;text-align:center;">
                  <p style="font-size:14px;line-height:1.5;color:#444;margin:0;">
                    For custom solutions for your business or team, write to<br/>
                    <a href="mailto:saira@synka.in" style="color:#ff7a00;font-weight:600;text-decoration:none;">saira@synka.in</a>
                  </p>
                </div>

                <!-- Footer -->
                <hr style="border:none;border-top:1px solid #eeeeee;margin:24px 0;" />

                <p style="font-size:13px;color:#888;margin:0 0 8px;text-align:center;">
                  If you need help, just reply to this email or visit our support page.
                </p>

                <p style="font-size:13px;color:#666;margin:0;text-align:center;">
                  — Team <span style="color:#ff7a00;font-weight:600;">SYNKA</span>
                </p>
              </td>
            </tr>

            <!-- Footer Brand -->
            <tr>
              <td style="background:#fafafa;padding:16px;text-align:center;border-top:1px solid #eee;">
                <p style="margin:0;font-size:11px;color:#999;">
                  © 2025 Synka. All rights reserved.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;
}
