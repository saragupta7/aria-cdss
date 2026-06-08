const mongoose = require('mongoose');

const vitalSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  heartRate: Number,               
  bloodPressureSystolic: Number,   
  bloodPressureDiastolic: Number,  
  temperature: Number,             
  respiratoryRate: Number,         
  oxygenSaturation: Number,        // SpO2 percentage (normal: 95-100)
  lactate: Number,                 // mmol/L (elevated in sepsis)
  gcs: Number                      // Glasgow Coma Scale 3-15 (15 = fully alert)
});

const patientSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true,
      unique: true  
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    age: {
      type: Number,
      required: true
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other']
    },
    icuBed: {
      type: String,
      required: true 
    },
    admissionDate: {
      type: Date,
      default: Date.now
    },
    diagnosis: String,

    vitals: [vitalSchema],

    // To be Updated by the ML model
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 1  
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true  // auto-adds createdAt and updatedAt fields
  }
);

patientSchema.methods.updateRiskLevel = function () {
  if (this.riskScore >= 0.8)      this.riskLevel = 'critical';
  else if (this.riskScore >= 0.6) this.riskLevel = 'high';
  else if (this.riskScore >= 0.4) this.riskLevel = 'medium';
  else                             this.riskLevel = 'low';
};

module.exports = mongoose.model('Patient', patientSchema);