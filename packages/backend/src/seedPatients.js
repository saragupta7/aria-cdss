require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Patient = require('./models/Patient');

const mockPatients = [
  {
    patientId: 'PT-0042',
    name: 'John D.',
    age: 67,
    gender: 'Male',
    icuBed: 'A7',
    ward: 'A',
    riskScore: 0.78,
    riskLevel: 'critical',
    vitals: [{
      timestamp: new Date(),
      heartRate: 102,
      respiratoryRate: 22,
      oxygenSaturation: 94,
      bloodPressureSystolic: 108,
      bloodPressureDiastolic: 64,
      lactate: 2.8
    }]
  },
  {
    patientId: 'PT-0038',
    name: 'Maria S.',
    age: 54,
    gender: 'Female',
    icuBed: 'A3',
    ward: 'A',
    riskScore: 0.42,
    riskLevel: 'low',
    vitals: [{
      timestamp: new Date(),
      heartRate: 78,
      respiratoryRate: 16,
      oxygenSaturation: 97,
      bloodPressureSystolic: 124,
      bloodPressureDiastolic: 72,
      lactate: 1.2
    }]
  },
  {
    patientId: 'PT-0051',
    name: 'Robert K.',
    age: 71,
    gender: 'Male',
    icuBed: 'A12',
    ward: 'A',
    riskScore: 0.64,
    riskLevel: 'medium',
    vitals: [{
      timestamp: new Date(),
      heartRate: 88,
      respiratoryRate: 19,
      oxygenSaturation: 95,
      bloodPressureSystolic: 116,
      bloodPressureDiastolic: 68,
      lactate: 2.1
    }]
  },
  {
    patientId: 'PT-0029',
    name: 'Lisa M.',
    age: 58,
    gender: 'Female',
    icuBed: 'A21',
    ward: 'A',
    riskScore: 0.38,
    riskLevel: 'low',
    vitals: [{
      timestamp: new Date(),
      heartRate: 72,
      respiratoryRate: 14,
      oxygenSaturation: 98,
      bloodPressureSystolic: 128,
      bloodPressureDiastolic: 76,
      lactate: 1.0
    }]
  },
  {
    patientId: 'PT-0047',
    name: 'David L.',
    age: 62,
    gender: 'Male',
    icuBed: 'B5',
    ward: 'B',
    riskScore: 0.82,
    riskLevel: 'critical',
    vitals: [{
      timestamp: new Date(),
      heartRate: 110,
      respiratoryRate: 24,
      oxygenSaturation: 92,
      bloodPressureSystolic: 102,
      bloodPressureDiastolic: 58,
      lactate: 3.2
    }]
  },
  {
    patientId: 'PT-0033',
    name: 'Patricia W.',
    age: 69,
    gender: 'Female',
    icuBed: 'B9',
    ward: 'B',
    riskScore: 0.45,
    riskLevel: 'low',
    vitals: [{
      timestamp: new Date(),
      heartRate: 76,
      respiratoryRate: 17,
      oxygenSaturation: 96,
      bloodPressureSystolic: 122,
      bloodPressureDiastolic: 70,
      lactate: 1.4
    }]
  },
  {
    patientId: 'PT-0056',
    name: 'James H.',
    age: 75,
    gender: 'Male',
    icuBed: 'B14',
    ward: 'B',
    riskScore: 0.58,
    riskLevel: 'medium',
    vitals: [{
      timestamp: new Date(),
      heartRate: 84,
      respiratoryRate: 18,
      oxygenSaturation: 95,
      bloodPressureSystolic: 118,
      bloodPressureDiastolic: 66,
      lactate: 1.8
    }]
  },
  {
    patientId: 'PT-0044',
    name: 'Nancy G.',
    age: 63,
    gender: 'Female',
    icuBed: 'B18',
    ward: 'B',
    riskScore: 0.41,
    riskLevel: 'low',
    vitals: [{
      timestamp: new Date(),
      heartRate: 74,
      respiratoryRate: 15,
      oxygenSaturation: 97,
      bloodPressureSystolic: 126,
      bloodPressureDiastolic: 74,
      lactate: 1.1
    }]
  },
  {
    patientId: 'PT-0062',
    name: 'Michael T.',
    age: 56,
    gender: 'Male',
    icuBed: 'C2',
    ward: 'C',
    riskScore: 0.76,
    riskLevel: 'critical',
    vitals: [{
      timestamp: new Date(),
      heartRate: 98,
      respiratoryRate: 21,
      oxygenSaturation: 93,
      bloodPressureSystolic: 110,
      bloodPressureDiastolic: 62,
      lactate: 2.6
    }]
  },
  {
    patientId: 'PT-0039',
    name: 'Susan R.',
    age: 60,
    gender: 'Female',
    icuBed: 'C8',
    ward: 'C',
    riskScore: 0.44,
    riskLevel: 'low',
    vitals: [{
      timestamp: new Date(),
      heartRate: 77,
      respiratoryRate: 16,
      oxygenSaturation: 96,
      bloodPressureSystolic: 123,
      bloodPressureDiastolic: 71,
      lactate: 1.3
    }]
  },
  {
    patientId: 'PT-0053',
    name: 'William P.',
    age: 72,
    gender: 'Male',
    icuBed: 'C11',
    ward: 'C',
    riskScore: 0.61,
    riskLevel: 'medium',
    vitals: [{
      timestamp: new Date(),
      heartRate: 86,
      respiratoryRate: 18,
      oxygenSaturation: 95,
      bloodPressureSystolic: 117,
      bloodPressureDiastolic: 67,
      lactate: 1.9
    }]
  },
  {
    patientId: 'PT-0041',
    name: 'Karen B.',
    age: 65,
    gender: 'Female',
    icuBed: 'C16',
    ward: 'C',
    riskScore: 0.39,
    riskLevel: 'low',
    vitals: [{
      timestamp: new Date(),
      heartRate: 73,
      respiratoryRate: 14,
      oxygenSaturation: 98,
      bloodPressureSystolic: 127,
      bloodPressureDiastolic: 75,
      lactate: 1.0
    }]
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    await Patient.deleteMany({});
    await Patient.insertMany(mockPatients);
    console.log('Seeded 12 mock patients successfully!');
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

seed();
