export interface Alert {
  id: string;
  patientId: string;
  patientName: string;
  bed: string;
  riskScore: number;
  alertType: string;
  timeSince: string;
  status: 'Active' | 'Acknowledged' | 'Resolved';
  timestamp: Date;
}

export const alerts: Alert[] = [
  {
    id: 'ALT-001',
    patientId: 'PT-0047',
    patientName: 'David L.',
    bed: '5B',
    riskScore: 82,
    alertType: 'MAP Critical',
    timeSince: '8m',
    status: 'Active',
    timestamp: new Date(Date.now() - 8 * 60 * 1000),
  },
  {
    id: 'ALT-002',
    patientId: 'PT-0042',
    patientName: 'John D.',
    bed: '7A',
    riskScore: 78,
    alertType: 'High Risk Score',
    timeSince: '15m',
    status: 'Active',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
  },
  {
    id: 'ALT-003',
    patientId: 'PT-0062',
    patientName: 'Michael T.',
    bed: '2C',
    riskScore: 76,
    alertType: 'Lactate Elevated',
    timeSince: '22m',
    status: 'Active',
    timestamp: new Date(Date.now() - 22 * 60 * 1000),
  },
  {
    id: 'ALT-004',
    patientId: 'PT-0051',
    patientName: 'Robert K.',
    bed: '12A',
    riskScore: 64,
    alertType: 'MAP Trending Down',
    timeSince: '1h 12m',
    status: 'Acknowledged',
    timestamp: new Date(Date.now() - 72 * 60 * 1000),
  },
  {
    id: 'ALT-005',
    patientId: 'PT-0056',
    patientName: 'James H.',
    bed: '14B',
    riskScore: 58,
    alertType: 'SpO2 Low',
    timeSince: '2h 4m',
    status: 'Acknowledged',
    timestamp: new Date(Date.now() - 124 * 60 * 1000),
  },
  {
    id: 'ALT-006',
    patientId: 'PT-0053',
    patientName: 'William P.',
    bed: '11C',
    riskScore: 61,
    alertType: 'HR Elevated',
    timeSince: '3h 45m',
    status: 'Resolved',
    timestamp: new Date(Date.now() - 225 * 60 * 1000),
  },
  {
    id: 'ALT-007',
    patientId: 'PT-0033',
    patientName: 'Patricia W.',
    bed: '9B',
    riskScore: 45,
    alertType: 'MAP Low',
    timeSince: '4h 20m',
    status: 'Resolved',
    timestamp: new Date(Date.now() - 260 * 60 * 1000),
  },
  {
    id: 'ALT-008',
    patientId: 'PT-0029',
    patientName: 'Lisa M.',
    bed: '21A',
    riskScore: 38,
    alertType: 'Resp Rate',
    timeSince: '5h 15m',
    status: 'Resolved',
    timestamp: new Date(Date.now() - 315 * 60 * 1000),
  },
];
