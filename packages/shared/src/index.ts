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
  value: number;
  impact: number;
}

export interface RiskPrediction {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  shapValues: SHAPFeature[];
  generatedAt: string;
}

export interface Patient {
  _id: string;
  name: string;
  ward: string;
  bedNumber: string;
  age: number;
  vitals: HemodynamicVitals;
  riskScore?: RiskPrediction;
}

export interface Alert {
  _id: string;
  patientId: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  resolved: boolean;
  createdAt: string;
}

export interface SocketEvents {
  'patient-update': { patientId: string; vitals: HemodynamicVitals };
  'new-alert': Alert;
  'risk-update': { patientId: string; prediction: RiskPrediction };
}
