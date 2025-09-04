from sqlalchemy import Column, String, Text, Boolean, DateTime, JSON, LargeBinary
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from database import Base

class VeteranProfile(Base):
    __tablename__ = "veteran_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True)  # Will be set to Supabase auth user ID
    email = Column(String, unique=True, nullable=False, index=True)
    first_name = Column(String, nullable=False)
    middle_initial = Column(String, nullable=True)
    last_name = Column(String, nullable=False)
    ssn_encrypted = Column(LargeBinary, nullable=True)  # Store encrypted SSN as binary
    phone = Column(String, nullable=True)
    date_of_birth = Column(String, nullable=True)  # Store as string in MM/DD/YYYY format
    file_number = Column(String, nullable=True)
    veterans_service_number = Column(String, nullable=True)
    military_service = Column(JSON, nullable=True, default={})
    claim_info = Column(JSON, nullable=True, default={})
    address = Column(JSON, nullable=True, default={})
    claim_statement = Column(Text, nullable=True)
    has_signed_up = Column(Boolean, nullable=True, default=False)
    has_paid = Column(Boolean, nullable=True, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        """Convert model to dictionary for JSON serialization"""
        return {
            "id": str(self.id),
            "email": self.email,
            "first_name": self.first_name,
            "middle_initial": self.middle_initial,
            "last_name": self.last_name,
            "phone": self.phone,
            "date_of_birth": self.date_of_birth,
            "file_number": self.file_number,
            "veterans_service_number": self.veterans_service_number,
            "military_service": self.military_service or {},
            "claim_info": self.claim_info or {},
            "address": self.address or {},
            "claim_statement": self.claim_statement,
            "has_signed_up": self.has_signed_up,
            "has_paid": self.has_paid,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }