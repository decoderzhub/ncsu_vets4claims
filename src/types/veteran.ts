// Types for veteran data and form structures
export interface VeteranProfile {
  id?: string;
  email: string;
  firstName: string;
  middleInitial?: string;
  lastName: string;
  ssn: string;
  phone: string;
  dateOfBirth: string;
  fileNumber?: string;
  veteransServiceNumber?: string;
  address: {
    street: string;
    apt?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  militaryService: {
    branch: string;
    serviceYears: string;
    rank: string;
    dischargeType?: string;
  };
  claimInfo: {
    primaryCondition: string;
    conditionType: string;
    serviceConnection: string;
    symptoms: string;
    medicalTreatment: string;
    workImpact: string;
    witnesses?: string;
    additionalInfo?: string;
  };
  claimStatement?: string;
  hasSignedUp?: boolean;
  hasPaid?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface VA214138FormData {
  FirstName: string;
  MiddleInitial: string;
  LastName: string;
  SSN1: string; // First 3 digits
  SSN2: string; // Middle 2 digits
  SSN3: string; // Last 4 digits
  SSN4: string; // First 3 digits (duplicate)
  SSN5: string; // Middle 2 digits (duplicate)
  SSN6: string; // Last 4 digits (duplicate)
  FileNumber: string;
  BirthMonth: string;
  BirthDay: string;
  BirthYear: string;
  VeteransServiceNumber: string;
  Phone1: string; // Area code
  Phone2: string; // First 3 digits
  Phone3: string; // Last 4 digits
  Email: string;
  Email2: string; // Overflow for long emails
  FullEmail: string; // Complete email for DocuSeal submitter
  StreetAddress: string;
  AptNum: string;
  City: string;
  State: string;
  Country: string;
  ZipCode1: string; // First 5 digits
  ZipCode2: string; // Last 4 digits (optional)
  Remarks1: string;
  Remarks2: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  options?: string[];
}

export interface PaymentIntent {
  clientSecret: string;
  amount: number;
}