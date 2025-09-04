from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import httpx
import os
import logging
import time
import math
import hmac
import hashlib
from typing import Optional, Dict, Any
from dotenv import load_dotenv

# Import our modules
from database import get_db, create_tables
from models import VeteranProfile
from utils.encryption import encryption_service
from email_service import email_service, EmailRequest
from drive_helpers import create_client_shared_drive

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variables
SUPABASE_EDGE_URL = os.getenv("SUPABASE_URL", "").replace("/rest/v1", "") + "/functions/v1"
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
BASTION_API_KEY = os.getenv("BASTION_API_KEY")
BASTION_URL = "https://api.bastiongpt.com/v1/ChatCompletion"
DOCUSEAL_API_KEY = os.getenv("DOCUSEAL_API_KEY")
DOCUSEAL_TEMPLATE_ID = os.getenv("DOCUSEAL_TEMPLATE_ID")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

# Initialize Stripe
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

app = FastAPI(title="Vets4Claims Backend API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables on startup
@app.on_event("startup")
async def startup_event():
    create_tables()
    logger.info("Database tables created/verified")

# Pydantic models
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[Message]
    max_tokens: int = 500
    temperature: float = 0.7
    function: str = "veterans_claims_assistant"

class ClientRequest(BaseModel):
    email: str
    name: str

class VectorProcessRequest(BaseModel):
    drive_id: str
    client_email: str
    client_name: str

class VeteranProfileRequest(BaseModel):
    email: EmailStr
    first_name: str
    middle_initial: Optional[str] = None
    last_name: str
    ssn: Optional[str] = None  # Raw SSN, will be encrypted
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    file_number: Optional[str] = None
    veterans_service_number: Optional[str] = None
    military_service: Optional[Dict[str, Any]] = {}
    claim_info: Optional[Dict[str, Any]] = {}
    address: Optional[Dict[str, Any]] = {}
    claim_statement: Optional[str] = None
    has_signed_up: Optional[bool] = False
    has_paid: Optional[bool] = False

class DevAuthRequest(BaseModel):
    email: EmailStr
    password: Optional[str] = None
    verify: Optional[bool] = False

class ClaimEmailRequest(BaseModel):
    email: EmailStr
    name: str
    claim_statement: str

class DocuSealSubmissionRequest(BaseModel):
    FirstName: str
    MiddleInitial: str = ""
    LastName: str
    SSN1: str
    SSN2: str
    SSN3: str
    SSN4: str
    SSN5: str
    SSN6: str
    FileNumber: str = ""
    BirthMonth: str
    BirthDay: str
    BirthYear: str
    VeteransServiceNumber: str = ""
    Phone1: str
    Phone2: str
    Phone3: str
    Email: str
    Email2: str = ""
    FullEmail: str
    StreetAddress: str
    AptNum: str = ""
    City: str
    State: str
    Country: str
    ZipCode1: str
    ZipCode2: str = ""
    Remarks1: str
    Remarks2: str = ""

class UpdateStatusRequest(BaseModel):
    email: EmailStr
    has_signed_up: Optional[bool] = None
    has_paid: Optional[bool] = None

# Utility functions for dev auth
def generate_time_based_password() -> str:
    """Generate password based on current 10-minute window"""
    now = time.time()
    ten_minute_window = math.floor(now / (10 * 60))
    hash_value = (ten_minute_window * 123456) % 900000 + 100000
    return str(hash_value)

def is_password_valid(password: str) -> bool:
    """Check if password is valid for current time window"""
    current_password = generate_time_based_password()
    return current_password == password

# API Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "vets4claims-backend"}

@app.post("/chat")
async def chat_with_bastion(request: ChatRequest):
    """Proxy requests to BastionGPT API"""
    try:
        if not BASTION_API_KEY:
            raise HTTPException(status_code=500, detail="BastionGPT API key not configured")
        
        payload = {
            "messages": [msg.dict() for msg in request.messages],
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
            "function": request.function
        }
        
        headers = {
            "Content-Type": "application/json",
            "key": BASTION_API_KEY
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(BASTION_URL, json=payload, headers=headers, timeout=30.0)
            
            if not response.is_success:
                logger.error(f"BastionGPT API error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=response.status_code, detail=f"BastionGPT API error: {response.text}")
            
            return response.json()
            
    except httpx.TimeoutException:
        logger.error("BastionGPT API timeout")
        raise HTTPException(status_code=504, detail="BastionGPT API timeout")
    except Exception as e:
        logger.error(f"Error calling BastionGPT API: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process chat request: {str(e)}")

@app.post("/veteran-profiles")
async def create_or_update_veteran_profile(
    profile_request: VeteranProfileRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Create or update a veteran profile with encrypted PHI"""
    try:
        logger.info(f"Creating/updating veteran profile for: {profile_request.email}")
        
        # Get user ID from Supabase auth token
        auth_header = request.headers.get("authorization")
        user_id = None
        
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "")
            try:
                # Verify token with Supabase
                async with httpx.AsyncClient() as client:
                    supabase_response = await client.get(
                        f"{SUPABASE_EDGE_URL.replace('/functions/v1', '')}/auth/v1/user",
                        headers={"Authorization": f"Bearer {token}"}
                    )
                    if supabase_response.is_success:
                        user_data = supabase_response.json()
                        user_id = user_data.get("id")
                        logger.info(f"Authenticated user ID: {user_id}")
            except Exception as e:
                logger.warning(f"Could not verify auth token: {str(e)}")
        
        # Check if profile already exists
        if user_id:
            # If we have a user ID, look up by user ID first, then by email
            existing_profile = db.query(VeteranProfile).filter(VeteranProfile.id == user_id).first()
            if not existing_profile:
                existing_profile = db.query(VeteranProfile).filter(VeteranProfile.email == profile_request.email).first()
        else:
            # Fallback to email lookup for unauthenticated requests
            existing_profile = db.query(VeteranProfile).filter(VeteranProfile.email == profile_request.email).first()
        
        # Prepare data for database
        profile_data = {
            "email": profile_request.email,
            "first_name": profile_request.first_name,
            "middle_initial": profile_request.middle_initial,
            "last_name": profile_request.last_name,
            "phone": profile_request.phone,
            "date_of_birth": profile_request.date_of_birth,
            "file_number": profile_request.file_number,
            "veterans_service_number": profile_request.veterans_service_number,
            "military_service": profile_request.military_service or {},
            "claim_info": profile_request.claim_info or {},
            "address": profile_request.address or {},
            "claim_statement": profile_request.claim_statement,
            "has_signed_up": profile_request.has_signed_up,
            "has_paid": profile_request.has_paid
        }
        
        # Encrypt SSN if provided
        if profile_request.ssn:
            try:
                encrypted_ssn = encryption_service.encrypt_ssn(profile_request.ssn)
                profile_data["ssn_encrypted"] = encrypted_ssn
            except Exception as e:
                logger.error(f"Error encrypting SSN: {str(e)}")
                raise HTTPException(status_code=400, detail="Invalid SSN format")
        
        if existing_profile:
            # Update existing profile
            # If we have a user_id and the existing profile doesn't have the right ID, update it
            if user_id and str(existing_profile.id) != user_id:
                logger.info(f"Updating existing profile ID from {existing_profile.id} to {user_id}")
                existing_profile.id = user_id
                # Also update has_signed_up to true since they now have an account
                existing_profile.has_signed_up = True
                logger.info(f"Updated profile ID to match auth user and marked as signed up: {user_id}")
            
            for key, value in profile_data.items():
                # Skip updating the ID if we already set it above
                if key == 'id' and user_id and str(existing_profile.id) == user_id:
                    continue
                setattr(existing_profile, key, value)
            db.commit()
            db.refresh(existing_profile)
            result = existing_profile
            logger.info(f"Updated veteran profile for: {profile_request.email}")
        else:
            # Create new profile
            if user_id:
                profile_data["id"] = user_id
                logger.info(f"Creating new profile with auth user ID: {user_id}")
            
            new_profile = VeteranProfile(**profile_data)
            db.add(new_profile)
            db.commit()
            db.refresh(new_profile)
            result = new_profile
            logger.info(f"Created new veteran profile for: {profile_request.email}")
        
        # Return profile data (without encrypted SSN)
        response_data = result.to_dict()
        
        # Include decrypted SSN if it exists (for frontend use)
        if result.ssn_encrypted:
            try:
                decrypted_ssn = encryption_service.decrypt_ssn(result.ssn_encrypted)
                response_data["ssn"] = decrypted_ssn
            except Exception as e:
                logger.error(f"Error decrypting SSN for response: {str(e)}")
                response_data["ssn"] = None
        
        return {
            "success": True,
            "profile": response_data
        }
        
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Database integrity error: {str(e)}")
        raise HTTPException(status_code=400, detail="Profile with this email already exists")
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating/updating veteran profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save veteran profile: {str(e)}")

@app.get("/veteran-profiles/{email}")
async def get_veteran_profile(email: str, db: Session = Depends(get_db)):
    """Get veteran profile by email with decrypted PHI"""
    try:
        logger.info(f"Fetching veteran profile for: {email}")
        
        profile = db.query(VeteranProfile).filter(VeteranProfile.email == email).first()
        
        if not profile:
            raise HTTPException(status_code=404, detail="Veteran profile not found")
        
        # Convert to dict
        response_data = profile.to_dict()
        
        # Include decrypted SSN if it exists
        if profile.ssn_encrypted:
            try:
                decrypted_ssn = encryption_service.decrypt_ssn(profile.ssn_encrypted)
                response_data["ssn"] = decrypted_ssn
            except Exception as e:
                logger.error(f"Error decrypting SSN: {str(e)}")
                response_data["ssn"] = None
        
        return {
            "success": True,
            "profile": response_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching veteran profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch veteran profile: {str(e)}")

@app.post("/send-email")
async def send_email(email_request: EmailRequest):
    """Send email using Mailgun API"""
    try:
        logger.info(f"Sending email to: {email_request.to_email}")
        
        result = await email_service.send_email(email_request)
        
        return result
        
    except Exception as e:
        logger.error(f"Error sending email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

@app.post("/send-claim-email")
async def send_claim_email(request: ClaimEmailRequest):
    """Send claim statement email to veteran"""
    try:
        logger.info(f"Sending claim statement email to: {request.email}")
        
        # Validate input data
        if not request.email or not request.name or not request.claim_statement:
            raise HTTPException(status_code=400, detail="Missing required fields: email, name, or claim_statement")
        
        html_content = email_service.create_claim_statement_email(request.name, request.claim_statement)
        
        email_request = EmailRequest(
            to_email=request.email,
            to_name=request.name,
            subject="🇺🇸 Your VA Disability Claim Statement is Ready",
            html_content=html_content
        )
        
        result = await email_service.send_email(email_request)
        
        logger.info(f"Email service result: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Error sending claim email: {str(e)}")
        # Return a more user-friendly error but still indicate success for the simulation case
        if "simulated" in str(e).lower() or "authentication failed" in str(e).lower():
            return {
                "success": True,
                "message": "Email functionality is currently in development mode",
                "email_id": "simulated"
            }
        raise HTTPException(status_code=500, detail=f"Failed to send claim email: {str(e)}")

@app.post("/dev-auth-email")
async def send_dev_auth_email(request: DevAuthRequest):
    """Send development authentication email or verify password"""
    try:
        if request.email != "darin.manley@vets4claims.com":
            raise HTTPException(status_code=403, detail="Unauthorized email address")
        
        if request.verify:
            # Verify password
            if not request.password:
                raise HTTPException(status_code=400, detail="Password required for verification")
            
            is_valid = is_password_valid(request.password)
            logger.info(f"Dev password verification for {request.email}: {'valid' if is_valid else 'invalid'}")
            
            return {"valid": is_valid}
        else:
            # Generate and send new password
            new_password = generate_time_based_password()
            logger.info(f"Generated dev password: {new_password}")
            
            html_content = email_service.create_dev_auth_email(new_password)
            
            email_request = EmailRequest(
                to_email=request.email,
                to_name="Developer",
                subject="🔧 Vets4Claims Developer Access Code",
                html_content=html_content,
                from_email="dev@vets4claims.com",
                from_name="Vets4Claims Dev"
            )
            
            result = await email_service.send_email(email_request)
            
            return {
                "success": True,
                "message": "Development password sent successfully",
                "expires_in": "10 minutes"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in dev auth: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process dev authentication: {str(e)}")

@app.post("/create-intake")
async def create_intake(client: ClientRequest):
    """Create secure Google Drive workspace and send email to client"""
    try:
        logger.info(f"Creating intake for client: {client.email}")
        
        # Create Google Drive workspace with folders
        drive_data = create_client_shared_drive(client.email, client.name)
        
        # Send email using our internal email service
        html_content = email_service.create_document_upload_email(client.name, drive_data["upload_url"])
        
        email_request = EmailRequest(
            to_email=client.email,
            to_name=client.name,
            subject="🔒 Your Secure Document Upload Workspace is Ready",
            html_content=html_content
        )
        
        await email_service.send_email(email_request)
        
        logger.info(f"Successfully created intake for {client.email}")
        return {
            "status": "success",
            "drive_id": drive_data["drive_id"],
            "upload_url": drive_data["upload_url"],
            "folder_ids": drive_data["folder_ids"]
        }
        
    except Exception as e:
        logger.error(f"Error creating intake: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create intake: {str(e)}")

@app.post("/process-documents")
async def process_documents(request: VectorProcessRequest):
    """Process uploaded documents and create vector embeddings"""
    try:
        logger.info(f"Processing documents for client: {request.client_email}")
        
        # This would integrate with your vector database processing
        # For now, return success status
        return {
            "status": "processing",
            "message": "Documents are being processed for vector database integration"
        }
        
    except Exception as e:
        logger.error(f"Error processing documents: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process documents: {str(e)}")

@app.post("/docuseal-submission")
async def create_docuseal_submission(request: DocuSealSubmissionRequest):
    """Create DocuSeal submission with veteran PHI data"""
    try:
        logger.info(f"Creating DocuSeal submission for: {request.FullEmail}")
        
        if not DOCUSEAL_API_KEY or not DOCUSEAL_TEMPLATE_ID:
            raise HTTPException(status_code=500, detail="DocuSeal configuration missing")
        
        template_id = int(DOCUSEAL_TEMPLATE_ID)
        
        # Map the form data to the correct field names
        mapped_fields = [
            {"name": "FirstName", "value": request.FirstName},
            {"name": "MiddleInitial", "value": request.MiddleInitial},
            {"name": "LastName", "value": request.LastName},
            {"name": "SSN1", "value": request.SSN1},
            {"name": "SSN2", "value": request.SSN2},
            {"name": "SSN3", "value": request.SSN3},
            {"name": "SSN4", "value": request.SSN4},
            {"name": "SSN5", "value": request.SSN5},
            {"name": "SSN6", "value": request.SSN6},
            {"name": "FileNumber", "value": request.FileNumber},
            {"name": "BirthMonth", "value": request.BirthMonth},
            {"name": "BirthDay", "value": request.BirthDay},
            {"name": "BirthYear", "value": request.BirthYear},
            {"name": "VeteransServiceNumber", "value": request.VeteransServiceNumber},
            {"name": "Phone1", "value": request.Phone1},
            {"name": "Phone2", "value": request.Phone2},
            {"name": "Phone3", "value": request.Phone3},
            {"name": "Email", "value": request.Email},
            {"name": "Email2", "value": request.Email2},
            {"name": "StreetAddress", "value": request.StreetAddress},
            {"name": "AptNum", "value": request.AptNum},
            {"name": "City", "value": request.City},
            {"name": "State", "value": request.State},
            {"name": "Country", "value": request.Country},
            {"name": "ZipCode1", "value": request.ZipCode1},
            {"name": "ZipCode2", "value": request.ZipCode2},
            {"name": "Remarks1", "value": request.Remarks1},
            {"name": "Remarks2", "value": request.Remarks2},
        ]
        
        payload = {
            "template_id": template_id,
            "send_email": True,
            "submitters": [{
                "role": "First Party",
                "email": request.FullEmail,
                "fields": mapped_fields,
            }],
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.docuseal.com/submissions",
                headers={
                    "X-Auth-Token": DOCUSEAL_API_KEY,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                json=payload,
                timeout=30.0
            )

            if not response.is_success:
                error_text = response.text
                logger.error(f"DocuSeal API error: {response.status_code} - {error_text}")
                raise HTTPException(status_code=response.status_code, detail=f"DocuSeal API error: {error_text}")

            # DocuSeal returns an ARRAY of submitters
            submitters = response.json()
            
            if not isinstance(submitters, list) or len(submitters) == 0:
                raise HTTPException(status_code=500, detail="No submitters returned from DocuSeal")
            
            # Get the first submitter (should be our veteran)
            submitter = submitters[0]

            logger.info(f"DocuSeal submission created successfully for: {request.FullEmail}")
            
            return {
                "success": True,
                "submissionSlug": submitter["slug"],
                "claimId": submitter["submission_id"],
                "submissionId": submitter["id"],
                "embedSrc": submitter.get("embed_src", f"https://docuseal.com/s/{submitter['slug']}")
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating DocuSeal submission: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create DocuSeal submission: {str(e)}")


@app.post("/update-signup-status")
async def update_signup_status(
    request: UpdateStatusRequest,
    db: Session = Depends(get_db)
):
    """Update has_signed_up status for veteran profile"""
    try:
        logger.info(f"Updating signup status for: {request.email}")
        
        # Find the veteran profile by email
        profile = db.query(VeteranProfile).filter(VeteranProfile.email == request.email).first()
        
        if not profile:
            raise HTTPException(status_code=404, detail="Veteran profile not found")
        
        # Update the status fields
        if request.has_signed_up is not None:
            profile.has_signed_up = request.has_signed_up
            logger.info(f"Updated has_signed_up to {request.has_signed_up} for {request.email}")
        
        if request.has_paid is not None:
            profile.has_paid = request.has_paid
            logger.info(f"Updated has_paid to {request.has_paid} for {request.email}")
        
        db.commit()
        db.refresh(profile)
        
        return {
            "success": True,
            "message": "Status updated successfully",
            "profile": profile.to_dict()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating signup status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update status: {str(e)}")

@app.post("/update-payment-status")
async def update_payment_status(
    request: UpdateStatusRequest,
    db: Session = Depends(get_db)
):
    """Update has_paid status for veteran profile"""
    try:
        logger.info(f"Updating payment status for: {request.email}")
        
        # Find the veteran profile by email
        profile = db.query(VeteranProfile).filter(VeteranProfile.email == request.email).first()
        
        if not profile:
            raise HTTPException(status_code=404, detail="Veteran profile not found")
        
        # Update the payment status
        if request.has_paid is not None:
            profile.has_paid = request.has_paid
            logger.info(f"Updated has_paid to {request.has_paid} for {request.email}")
        
        db.commit()
        db.refresh(profile)
        
        return {
            "success": True,
            "message": "Payment status updated successfully",
            "profile": profile.to_dict()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating payment status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update payment status: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)