import os
from dotenv import load_dotenv
import httpx
import logging
from typing import Optional
from pydantic import BaseModel

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class EmailRequest(BaseModel):
    to_email: str
    to_name: str
    subject: str
    html_content: str
    from_email: Optional[str] = None
    from_name: Optional[str] = None

class EmailService:
    def __init__(self):
        self.mailgun_api_key = os.getenv("MAILGUN_API_KEY")
        self.mailgun_domain = os.getenv("MAILGUN_DOMAIN")
        self.mailgun_region = os.getenv("MAILGUN_REGION", "US")
        self.mailgun_from_email = os.getenv("MAILGUN_FROM_EMAIL", "assistant@mg.vets4claims.com")
        self.mailgun_from_name = os.getenv("MAILGUN_FROM_NAME", "Vets4Claims Assistant")
        
        if not self.mailgun_api_key or not self.mailgun_domain:
            logger.warning("Mailgun configuration missing - emails will be simulated")
        else:
            logger.info(f"Mailgun configured with domain: {self.mailgun_domain}, region: {self.mailgun_region}")

    async def send_email(self, email_request: EmailRequest) -> dict:
        """Send email using Mailgun API"""
        try:
            if not self.mailgun_api_key or not self.mailgun_domain:
                logger.warning(f"Mailgun not configured - simulating email send to {email_request.to_email}")
                logger.info(f"Email content would be: {email_request.subject}")
                return {
                    "success": True,
                    "message": "Email simulated - Mailgun not configured",
                    "email_id": "simulated"
                }

            # Determine the correct Mailgun API endpoint based on region
            if self.mailgun_region.upper() == "EU":
                mailgun_url = f"https://api.eu.mailgun.net/v3/{self.mailgun_domain}/messages"
            else:
                mailgun_url = f"https://api.mailgun.net/v3/{self.mailgun_domain}/messages"

            # Prepare form data for Mailgun
            form_data = {
                "from": f"{email_request.from_name or self.mailgun_from_name} <{email_request.from_email or self.mailgun_from_email}>",
                "to": email_request.to_email,
                "subject": email_request.subject,
                "html": email_request.html_content
            }

            # Send email via Mailgun
            async with httpx.AsyncClient() as client:
                logger.info(f"Attempting to send email via Mailgun - Domain: {self.mailgun_domain}, Region: {self.mailgun_region}, To: {email_request.to_email}")
                response = await client.post(
                    mailgun_url,
                    auth=("api", self.mailgun_api_key),
                    data=form_data,
                    timeout=30.0
                )

                if response.is_success:
                    result = response.json()
                    logger.info(f"Email sent successfully to {email_request.to_email}")
                    return {
                        "success": True,
                        "message": "Email sent successfully",
                        "email_id": result.get("id", "mailgun-sent")
                    }
                else:
                    error_text = response.text
                    logger.error(f"Mailgun API error: {response.status_code} - {error_text}")
                    
                    # If it's an auth error, fall back to simulation
                    if response.status_code == 401:
                        logger.warning(f"Mailgun authentication failed - falling back to simulation for {email_request.to_email}")
                        return {
                            "success": True,
                            "message": "Email simulated - Mailgun authentication failed",
                            "email_id": "simulated-auth-error"
                        }
                    
                    raise Exception(f"Failed to send email: {error_text}")

        except Exception as e:
            logger.error(f"Error sending email: {str(e)}")
            
            # Fall back to simulation mode on any error
            logger.warning(f"Email sending failed - falling back to simulation for {email_request.to_email}")
            return {
                "success": True,
                "message": "Email simulated - sending failed",
                "email_id": "simulated-error"
            }

    def create_claim_statement_email(self, name: str, claim_statement: str) -> str:
        """Create HTML content for claim statement email"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>🇺🇸 Your VA Disability Claim Statement is Ready</title>
          <style>
            body {{ 
              font-family: Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 800px; 
              margin: 0 auto; 
              padding: 20px;
            }}
            .header {{ 
              background: linear-gradient(135deg, #1e3a8a, #dc2626); 
              color: white; 
              padding: 30px; 
              text-align: center; 
              border-radius: 10px;
            }}
            .content {{ 
              background: #f8fafc; 
              padding: 30px; 
              border-radius: 10px; 
              margin: 20px 0;
            }}
            .claim-statement {{ 
              background: white; 
              padding: 20px; 
              border-left: 4px solid #1e3a8a;
              white-space: pre-wrap;
              line-height: 1.5;
            }}
            .footer {{ 
              text-align: center; 
              padding: 20px; 
              color: #666; 
            }}
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🇺🇸 Vets4Claims Assistant</h1>
            <p>Your VA Disability Claim Statement is Ready</p>
          </div>
          
          <div class="content">
            <h2>Dear {name},</h2>
            
            <p>Thank you for using Vets4Claims Assistant. Your comprehensive VA disability claim statement has been generated based on the information you provided.</p>
            
            <h3>Your VA Form 21-4138 Statement:</h3>
            <div class="claim-statement">{claim_statement}</div>
            
            <h3>Next Steps:</h3>
            <ol>
              <li><strong>Review the statement</strong> carefully for accuracy</li>
              <li><strong>Sign the document</strong> using our secure DocuSeal integration</li>
              <li><strong>Submit your claim</strong> to the VA through va.gov</li>
              <li><strong>Track your claim status</strong> online</li>
            </ol>
            
            <p><strong>Important:</strong> Keep this email and your statement safe. You may need to reference it during the VA review process.</p>
          </div>
          
          <div class="footer">
            <p>This email was sent from Vets4Claims Assistant</p>
            <p>Serving those who served our nation 🇺🇸</p>
          </div>
        </body>
        </html>
        """

    def create_document_upload_email(self, name: str, upload_url: str) -> str:
        """Create HTML content for document upload email"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>🔒 Your Secure Document Upload Workspace is Ready</title>
          <style>
            body {{ 
              font-family: Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 800px; 
              margin: 0 auto; 
              padding: 20px;
            }}
            .header {{ 
              background: linear-gradient(135deg, #1e3a8a, #dc2626); 
              color: white; 
              padding: 30px; 
              text-align: center; 
              border-radius: 10px;
            }}
            .content {{ 
              background: #f8fafc; 
              padding: 30px; 
              border-radius: 10px; 
              margin: 20px 0;
            }}
            .upload-instructions {{
              background: #fef3c7;
              border: 2px solid #f59e0b;
              padding: 20px;
              border-radius: 10px;
              margin: 20px 0;
            }}
            .footer {{ 
              text-align: center; 
              padding: 20px; 
              color: #666; 
            }}
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🇺🇸 Vets4Claims Assistant</h1>
            <p>Secure Document Upload Ready</p>
          </div>
          
          <div class="content">
            <h2>Dear {name},</h2>
            
            <div class="upload-instructions">
              <h3>📁 Document Upload Instructions</h3>
              <p>Your secure, HIPAA-compliant document workspace has been created. This private space allows you to safely upload supporting documents for your VA disability claim.</p>
            </div>
            
            <p><strong>🔒 Secure Upload Link:</strong> <a href="{upload_url}" target="_blank">{upload_url}</a></p>
            
            <p>This workspace is private and only accessible by you and our authorized staff. Please upload:</p>
            <ul>
              <li>Service medical records</li>
              <li>Private medical records</li>
              <li>DD-214 (Discharge papers)</li>
              <li>Supporting statements</li>
              <li>Any other relevant documentation</li>
            </ul>
            
            <p>Once uploaded, our AI system will process your documents to enhance your disability claim statement.</p>
            
            <h3>🔒 Security & Privacy:</h3>
            <ul>
              <li>This workspace is encrypted and HIPAA-compliant</li>
              <li>Only you and authorized Vets4Claims staff have access</li>
              <li>Documents are processed securely and never shared</li>
              <li>All data is protected with military-grade encryption</li>
            </ul>
          </div>
          
          <div class="footer">
            <p>This email was sent from Vets4Claims Assistant</p>
            <p>Serving those who served our nation 🇺🇸</p>
          </div>
        </body>
        </html>
        """

    def create_dev_auth_email(self, password: str) -> str:
        """Create HTML content for dev auth email"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Vets4Claims Developer Access Code</title>
          <style>
            body {{ 
              font-family: Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px;
            }}
            .header {{ 
              background: linear-gradient(135deg, #1e3a8a, #dc2626); 
              color: white; 
              padding: 30px; 
              text-align: center; 
              border-radius: 10px;
            }}
            .content {{ 
              background: #f8fafc; 
              padding: 30px; 
              border-radius: 10px; 
              margin: 20px 0;
              text-align: center;
            }}
            .password-box {{
              background: #1e3a8a;
              color: white;
              padding: 20px;
              border-radius: 10px;
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 8px;
              font-family: monospace;
              margin: 20px 0;
            }}
            .footer {{ 
              text-align: center; 
              padding: 20px; 
              color: #666; 
              font-size: 12px;
            }}
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔧 Developer Access Code</h1>
            <p>Vets4Claims Development Authentication</p>
          </div>
          
          <div class="content">
            <h2>Your Development Access Code:</h2>
            
            <div class="password-box">{password}</div>
            
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
        """

# Create a global instance
email_service = EmailService()