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
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  </head>
  <body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding:20px 10px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
            style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
            
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg, #F97316 0%, #FB923C 100%);padding:40px 24px;text-align:center;">
                <h1 style="color:#ffffff;margin:0 0 8px;font-size:32px;font-weight:700;letter-spacing:0.5px;">
                  SYNKA
                </h1>
                <p style="color:rgba(255,255,255,0.95);margin:0;font-size:15px;font-weight:500;">
                  One Card. Infinite Possibilities.
                </p>
              </td>
            </tr>

            <!-- Main Content -->
            <tr>
              <td style="padding:32px 24px;">
                
                <!-- Greeting -->
                <h2 style="margin:0 0 16px;font-size:24px;color:#111827;font-weight:600;">
                  Hi ${name} 👋
                </h2>

                <p style="font-size:16px;line-height:1.6;color:#374151;margin:0 0 16px;">
                  Welcome to <strong style="color:#F97316;">SYNKA</strong> — your intelligent digital business card platform.
                </p>

                <p style="font-size:16px;line-height:1.6;color:#374151;margin:0 0 32px;">
                  Your digital card is now live and ready to share instantly 🚀
                </p>

                <!-- Quick Start CTA -->
                <div style="background:linear-gradient(135deg, #F97316 0%, #FB923C 100%);border-radius:12px;padding:24px;margin:0 0 24px;text-align:center;">
                  <h3 style="margin:0 0 12px;font-size:18px;color:#ffffff;font-weight:600;">
                    Get Started Now
                  </h3>
                  <p style="font-size:14px;line-height:1.5;color:rgba(255,255,255,0.9);margin:0 0 20px;">
                    Customize your card, share it, and start connecting
                  </p>
                  <a href="${APP_URL}/my-card"
                    style="display:inline-block;background:#ffffff;color:#F97316;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">
                    View My Card →
                  </a>
                </div>

                <!-- Saira AI Assistant -->
                <div style="background:#FEF3C7;border-radius:12px;padding:24px;margin:0 0 24px;border-left:4px solid #F59E0B;">
                  <h3 style="margin:0 0 12px;font-size:17px;color:#111827;font-weight:600;">
                    🤖 Meet Saira — Your AI Assistant
                  </h3>
                  <p style="font-size:14px;line-height:1.6;color:#6B7280;margin:0 0 16px;">
                    Get instant help, smart tips, and personalized guidance. Saira is available 24/7 to assist you.
                  </p>
                  <a href="${APP_URL}/"
                    style="display:inline-block;background:#F59E0B;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">
                    Chat with Saira
                  </a>
                </div>

                <!-- Feature Highlights -->
                <div style="margin:0 0 24px;">
                  <h3 style="margin:0 0 16px;font-size:17px;color:#111827;font-weight:600;">
                    What You Can Do:
                  </h3>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:12px 0;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td width="40" style="vertical-align:top;">
                              <div style="width:32px;height:32px;background:#DBEAFE;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">
                                ✨
                              </div>
                            </td>
                            <td style="padding-left:12px;vertical-align:top;">
                              <p style="margin:0;font-size:14px;color:#111827;font-weight:500;">Customize your digital card</p>
                              <p style="margin:4px 0 0;font-size:13px;color:#6B7280;">Add photos, links, and business details</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:12px 0;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td width="40" style="vertical-align:top;">
                              <div style="width:32px;height:32px;background:#DBEAFE;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">
                                📱
                              </div>
                            </td>
                            <td style="padding-left:12px;vertical-align:top;">
                              <p style="margin:0;font-size:14px;color:#111827;font-weight:500;">Share via QR code or link</p>
                              <p style="margin:4px 0 0;font-size:13px;color:#6B7280;">Instant sharing with anyone, anywhere</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:12px 0;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td width="40" style="vertical-align:top;">
                              <div style="width:32px;height:32px;background:#DBEAFE;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">
                                📊
                              </div>
                            </td>
                            <td style="padding-left:12px;vertical-align:top;">
                              <p style="margin:0;font-size:14px;color:#111827;font-weight:500;">Track your card analytics</p>
                              <p style="margin:4px 0 0;font-size:13px;color:#6B7280;">See who views and engages with your card</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:12px 0 0;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td width="40" style="vertical-align:top;">
                              <div style="width:32px;height:32px;background:#DBEAFE;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">
                                👥
                              </div>
                            </td>
                            <td style="padding-left:12px;vertical-align:top;">
                              <p style="margin:0;font-size:14px;color:#111827;font-weight:500;">Manage contacts & CRM</p>
                              <p style="margin:4px 0 0;font-size:13px;color:#6B7280;">Save and organize your connections</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- Upgrade Section -->
                <div style="background:linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%);border-radius:12px;padding:24px;margin:0 0 24px;border:1px solid #FDBA74;">
                  <h3 style="margin:0 0 12px;font-size:17px;color:#111827;font-weight:600;">
                    🟧 Unlock Orange Plan Benefits
                  </h3>
                  <p style="font-size:14px;line-height:1.6;color:#6B7280;margin:0 0 16px;">
                    Take your networking to the next level with premium features:
                  </p>
                  <ul style="padding-left:20px;margin:0 0 20px;font-size:14px;line-height:1.8;color:#374151;">
                    <li>Multiple digital business cards</li>
                    <li>Upload documents & files (PDFs, catalogues)</li>
                    <li>NFC card writing capabilities</li>
                    <li>Advanced analytics & reports</li>
                    <li>AI-generated email signatures</li>
                    <li>Premium card designs & templates</li>
                    <li>Free PVC NFC card annually</li>
                  </ul>
                  <a href="${APP_URL}/settings/upgrade"
                    style="display:inline-block;background:linear-gradient(135deg, #F97316 0%, #FB923C 100%);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 4px 12px rgba(249,115,22,0.25);">
                    Explore Orange Plan →
                  </a>
                </div>

                <!-- Help Resources -->
                <div style="background:#F9FAFB;border-radius:12px;padding:20px;margin:0 0 24px;">
                  <h3 style="margin:0 0 12px;font-size:16px;color:#111827;font-weight:600;">
                    📚 Need Help?
                  </h3>
                  <p style="font-size:14px;line-height:1.6;color:#6B7280;margin:0 0 16px;">
                    Visit our support center for guides, FAQs, and tutorials.
                  </p>
                  <a href="${APP_URL}/support"
                    style="display:inline-block;background:#E5E7EB;color:#374151;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:500;font-size:14px;">
                    Visit Support Center
                  </a>
                </div>

                <!-- Custom Solutions -->
                <div style="background:#EFF6FF;border-radius:12px;padding:20px;margin:0 0 32px;text-align:center;border:1px solid #BFDBFE;">
                  <p style="font-size:14px;line-height:1.6;color:#374151;margin:0;">
                    <strong>Enterprise or Team Solutions?</strong><br/>
                    Contact us at <a href="mailto:saira@synka.in" style="color:#F97316;font-weight:600;text-decoration:none;">saira@synka.in</a>
                  </p>
                </div>

                <!-- Divider -->
                <hr style="border:none;border-top:1px solid #E5E7EB;margin:0 0 24px;" />

                <!-- Footer Message -->
                <p style="font-size:13px;color:#9CA3AF;margin:0 0 8px;text-align:center;line-height:1.5;">
                  Questions? Just reply to this email or visit our <a href="${APP_URL}/support" style="color:#F97316;text-decoration:none;">support page</a>.
                </p>

                <p style="font-size:14px;color:#6B7280;margin:0;text-align:center;font-weight:500;">
                  — Team <span style="color:#F97316;font-weight:600;">SYNKA</span>
                </p>

              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#F9FAFB;padding:20px 24px;text-align:center;border-top:1px solid #E5E7EB;">
                <p style="margin:0 0 8px;font-size:12px;color:#9CA3AF;">
                  © ${new Date().getFullYear()} Synka. All rights reserved.
                </p>
                <p style="margin:0;font-size:11px;color:#9CA3AF;">
                  <a href="${APP_URL}/privacy" style="color:#9CA3AF;text-decoration:none;margin:0 8px;">Privacy Policy</a>
                  <span style="color:#D1D5DB;">|</span>
                  <a href="${APP_URL}/terms" style="color:#9CA3AF;text-decoration:none;margin:0 8px;">Terms of Service</a>
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
