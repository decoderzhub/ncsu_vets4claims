import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Use a simple approach - generate a predictable password based on time
function generateTimeBasedPassword(): string {
  // Generate password based on current 10-minute window
  const now = new Date();
  const tenMinuteWindow = Math.floor(now.getTime() / (10 * 60 * 1000));
  
  // Create a simple hash-like number from the time window
  const hash = (tenMinuteWindow * 123456) % 900000 + 100000;
  return hash.toString();
}

function isPasswordValid(password: string): boolean {
  const currentPassword = generateTimeBasedPassword();
  console.log(`Generated password: ${currentPassword}, Provided password: ${password}`);
  return currentPassword === password;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, password, verify } = await req.json();

    if (!email || email !== 'darin.manley@vets4claims.com') {
      return new Response(
        JSON.stringify({ error: "Unauthorized email address" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (verify) {
      // Verify password
      const isValid = isPasswordValid(password);
      
      return new Response(
        JSON.stringify({ valid: isValid }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Generate and send new password
      const newPassword = generateTimeBasedPassword();
      console.log(`Generated dev password: ${newPassword}`);

      // Send email directly using Mailgun
      const mailgunApiKey = Deno.env.get("MAILGUN_API_KEY");
      const mailgunDomain = Deno.env.get("MAILGUN_DOMAIN");

      if (!mailgunApiKey || !mailgunDomain) {
        // Fallback: return the password for development
        console.log(`DEV PASSWORD FOR ${email}: ${newPassword}`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Development password generated (check console)",
            password: newPassword // Only for development
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create email content
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Vets4Claims Developer Access Code</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px;
            }
            .header { 
              background: linear-gradient(135deg, #1e3a8a, #dc2626); 
              color: white; 
              padding: 30px; 
              text-align: center; 
              border-radius: 10px;
            }
            .content { 
              background: #f8fafc; 
              padding: 30px; 
              border-radius: 10px; 
              margin: 20px 0;
              text-align: center;
            }
            .password-box {
              background: #1e3a8a;
              color: white;
              padding: 20px;
              border-radius: 10px;
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 8px;
              font-family: monospace;
              margin: 20px 0;
            }
            .footer { 
              text-align: center; 
              padding: 20px; 
              color: #666; 
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔧 Developer Access Code</h1>
            <p>Vets4Claims Development Authentication</p>
          </div>
          
          <div class="content">
            <h2>Your Development Access Code:</h2>
            
            <div class="password-box">${newPassword}</div>
            
            <p><strong>This code is valid for 10 minutes.</strong></p>
            <p>Enter this code in the development authentication modal to enable dev mode features.</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <h3>Dev Mode Features:</h3>
            <ul style="text-align: left; display: inline-block;">
              <li>Auto-completion of form fields</li>
              <li>Accelerated testing workflows</li>
              <li>Debug information display</li>
              <li>Development shortcuts</li>
            </ul>
          </div>
          
          <div class="footer">
            <p>This email was automatically generated by Vets4Claims Developer Tools</p>
            <p>If you did not request this code, please ignore this email.</p>
          </div>
        </body>
        </html>
      `;

      // Prepare form data for Mailgun
      const formData = new FormData();
      formData.append("from", "Vets4Claims Dev <dev@vets4claims.com>");
      formData.append("to", email);
      formData.append("subject", "🔧 Vets4Claims Developer Access Code");
      formData.append("html", emailHtml);
      
      const emailResponse = await fetch(`https://api.mailgun.net/v3/${mailgunDomain}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`api:${mailgunApiKey}`)}`,
        },
        body: formData,
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        throw new Error(`Failed to send email: ${errorText}`);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Development password sent successfully",
          expiresIn: "10 minutes"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Dev auth error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to process dev authentication",
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});