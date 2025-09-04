import os
from dotenv import load_dotenv
import logging
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

# Google Drive API configuration
SCOPES = ["https://www.googleapis.com/auth/drive"]
SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "service-account.json")
DELEGATED_USER = os.getenv("GOOGLE_DELEGATED_USER", "robot@yourdomain.com")

def get_drive_service():
    """Initialize Google Drive service with service account credentials"""
    try:
        credentials = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE, scopes=SCOPES
        )
        
        # Use domain-wide delegation if configured
        if DELEGATED_USER:
            credentials = credentials.with_subject(DELEGATED_USER)
        
        service = build("drive", "v3", credentials=credentials, cache_discovery=False)
        return service
    except Exception as e:
        logger.error(f"Failed to initialize Google Drive service: {str(e)}")
        raise

def create_client_shared_drive(client_email: str, client_name: str):
    """Create a secure shared drive for client document uploads"""
    try:
        drive_service = get_drive_service()
        
        # Create unique request ID to prevent duplicates
        request_id = f"drive-{client_email.replace('@', '-').replace('.', '-')}-{hash(client_name) % 10000}"
        
        # Create Shared Drive
        drive_metadata = {
            "name": f"{client_name} - PHI Documents",
            "capabilities": {
                "canAddChildren": False,
                "canChangeCopyRequiresWriterPermission": False,
                "canChangeRestrictedDownloadPolicyEnabled": False,
                "canShare": False,
            }
        }
        
        logger.info(f"Creating shared drive for {client_email}")
        new_drive = drive_service.drives().create(
            body=drive_metadata,
            requestId=request_id
        ).execute()
        
        drive_id = new_drive["id"]
        logger.info(f"Created shared drive {drive_id} for {client_email}")
        
        # Create folder structure
        folders_to_create = ["Uploads", "Processed"]
        folder_ids = {}
        
        for folder_name in folders_to_create:
            folder_metadata = {
                "name": folder_name,
                "mimeType": "application/vnd.google-apps.folder",
                "parents": [drive_id]
            }
            
            folder = drive_service.files().create(
                body=folder_metadata,
                supportsAllDrives=True
            ).execute()
            
            folder_ids[folder_name] = folder["id"]
            logger.info(f"Created folder '{folder_name}' in shared drive")
        
        # Grant client permission to the shared drive
        permission = {
            "type": "user",
            "role": "fileOrganizer",  # Can upload and organize files
            "emailAddress": client_email
        }
        
        drive_service.permissions().create(
            fileId=drive_id,
            body=permission,
            supportsAllDrives=True,
            sendNotificationEmail=False  # We'll send our own email
        ).execute()
        
        logger.info(f"Granted permissions to {client_email} for shared drive {drive_id}")
        
        # Generate upload URL (points to Uploads folder)
        upload_url = f"https://drive.google.com/drive/folders/{folder_ids['Uploads']}"
        
        return {
            "drive_id": drive_id,
            "upload_url": upload_url,
            "folder_ids": folder_ids
        }
        
    except HttpError as e:
        logger.error(f"Google Drive API error: {str(e)}")
        raise Exception(f"Google Drive API error: {str(e)}")
    except Exception as e:
        logger.error(f"Error creating shared drive: {str(e)}")
        raise

def list_drive_files(drive_id: str, folder_name: str = "Uploads"):
    """List files in a specific folder of the shared drive"""
    try:
        drive_service = get_drive_service()
        
        # Find the folder ID
        folder_query = f"name='{folder_name}' and parents in '{drive_id}' and mimeType='application/vnd.google-apps.folder'"
        folder_results = drive_service.files().list(
            q=folder_query,
            supportsAllDrives=True,
            includeItemsFromAllDrives=True
        ).execute()
        
        if not folder_results.get("files"):
            return []
        
        folder_id = folder_results["files"][0]["id"]
        
        # List files in the folder
        files_query = f"parents in '{folder_id}'"
        files_results = drive_service.files().list(
            q=files_query,
            supportsAllDrives=True,
            includeItemsFromAllDrives=True,
            fields="files(id,name,mimeType,createdTime,size)"
        ).execute()
        
        return files_results.get("files", [])
        
    except Exception as e:
        logger.error(f"Error listing drive files: {str(e)}")
        raise

def move_file_to_processed(drive_id: str, file_id: str):
    """Move a file from Uploads to Processed folder"""
    try:
        drive_service = get_drive_service()
        
        # Find Processed folder ID
        folder_query = f"name='Processed' and parents in '{drive_id}' and mimeType='application/vnd.google-apps.folder'"
        folder_results = drive_service.files().list(
            q=folder_query,
            supportsAllDrives=True,
            includeItemsFromAllDrives=True
        ).execute()
        
        if not folder_results.get("files"):
            raise Exception("Processed folder not found")
        
        processed_folder_id = folder_results["files"][0]["id"]
        
        # Get current file info
        file_info = drive_service.files().get(
            fileId=file_id,
            supportsAllDrives=True,
            fields="parents"
        ).execute()
        
        previous_parents = ",".join(file_info.get("parents", []))
        
        # Move file to Processed folder
        drive_service.files().update(
            fileId=file_id,
            addParents=processed_folder_id,
            removeParents=previous_parents,
            supportsAllDrives=True
        ).execute()
        
        logger.info(f"Moved file {file_id} to Processed folder")
        
    except Exception as e:
        logger.error(f"Error moving file to processed: {str(e)}")
        raise