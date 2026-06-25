export interface HemodynamicVitals {
  map: number;
  heartRate: number;
  cvp?: number;
  svr?: number;
  lactate?: number;
  timestamp: string;
}

export interface SHAPFeature {
  feature: string;
  value: number | string;
  impact: number;
}

export interface RiskPrediction {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  shapValues: SHAPFeature[];
  generatedAt: string;
}

export interface VitalReading {
  timestamp: string;
  heartRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  lactate?: number;
  gcs?: number;
  creatinine?: number;
}

export interface Patient {
  _id: string;
  patientId: string;
  name: string;
  age: number;
  gender?: 'Male' | 'Female' | 'Other';
  icuBed: string;
  ward: string;
  admissionDate?: string;
  diagnosis?: string;
  vitals: VitalReading[];
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
}

export interface Alert {
  _id: string;
  patient: {
    _id: string;
    patientId: string;
    name: string;
    icuBed: string;
  };
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: string;
}

export interface SocketEvents {
  'patient-update': { patientId: string; vitals: HemodynamicVitals };
  'new-alert': Alert;
  'risk-update': { patientId: string; prediction: RiskPrediction };
}
