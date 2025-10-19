import mongoose from 'mongoose';

const vitalsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vitalDate: {
    type: Date,
    required: true
  },
  bloodPressureSystolic: {
    type: Number,
    min: 0,
    max: 300,
    default: null
  },
  bloodPressureDiastolic: {
    type: Number,
    min: 0,
    max: 300,
    default: null
  },
  bloodSugar: {
    type: Number,
    min: 0,
    max: 1000,
    default: null
  },
  weight: {
    type: Number,
    min: 0,
    max: 1000,
    default: null
  },
  temperature: {
    type: Number,
    min: 30,
    max: 45,
    default: null
  },
  heartRate: {
    type: Number,
    min: 30,
    max: 300,
    default: null
  },
  notes: {
    type: String,
    default: null,
    trim: true
  }
}, {
  timestamps: true
});

// Index for efficient querying
vitalsSchema.index({ userId: 1, vitalDate: -1 });

export default mongoose.model('Vitals', vitalsSchema);
