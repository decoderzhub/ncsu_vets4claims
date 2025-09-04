import os
from dotenv import load_dotenv
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import logging

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class EncryptionService:
    def __init__(self):
        # Get encryption key from environment variable
        encryption_key = os.getenv("ENCRYPTION_KEY")
        if not encryption_key:
            raise ValueError("ENCRYPTION_KEY environment variable is required for PHI encryption")
        
        # Derive a Fernet key from the encryption key
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'vets4claims_salt',  # Use a consistent salt for this application
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(encryption_key.encode()))
        self.cipher_suite = Fernet(key)

    def encrypt_ssn(self, ssn: str) -> bytes:
        """Encrypt SSN using Fernet encryption"""
        try:
            # Remove any formatting from SSN
            clean_ssn = ssn.replace("-", "").replace(" ", "")
            
            # Validate SSN format (9 digits)
            if not clean_ssn.isdigit() or len(clean_ssn) != 9:
                raise ValueError("Invalid SSN format. Must be 9 digits.")
            
            # Encrypt the SSN
            encrypted_ssn = self.cipher_suite.encrypt(clean_ssn.encode())
            logger.info("SSN encrypted successfully")
            return encrypted_ssn
            
        except Exception as e:
            logger.error(f"Error encrypting SSN: {str(e)}")
            raise

    def decrypt_ssn(self, encrypted_ssn: bytes) -> str:
        """Decrypt SSN and return in XXX-XX-XXXX format"""
        try:
            # Decrypt the SSN
            decrypted_ssn = self.cipher_suite.decrypt(encrypted_ssn).decode()
            
            # Format as XXX-XX-XXXX
            formatted_ssn = f"{decrypted_ssn[:3]}-{decrypted_ssn[3:5]}-{decrypted_ssn[5:]}"
            logger.info("SSN decrypted successfully")
            return formatted_ssn
            
        except Exception as e:
            logger.error(f"Error decrypting SSN: {str(e)}")
            raise

    def encrypt_text(self, text: str) -> bytes:
        """Encrypt any text data"""
        try:
            return self.cipher_suite.encrypt(text.encode())
        except Exception as e:
            logger.error(f"Error encrypting text: {str(e)}")
            raise

    def decrypt_text(self, encrypted_text: bytes) -> str:
        """Decrypt any text data"""
        try:
            return self.cipher_suite.decrypt(encrypted_text).decode()
        except Exception as e:
            logger.error(f"Error decrypting text: {str(e)}")
            raise

# Create a global instance
encryption_service = EncryptionService()