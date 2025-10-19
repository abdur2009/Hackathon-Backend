import mongoose from 'mongoose';

const healthReportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  reportType: {
    type: String,
    enum: ['lab_test', 'prescription', 'xray', 'scan', 'ultrasound', 'other'],
    required: true
  },
  reportDate: {
    type: Date,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    default: 0
  },
  aiSummary: {
    type: String,
    default: null
  },
  aiSummaryUrdu: {
    type: String,
    default: null
  },
  keyFindings: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  extractedText: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient querying
healthReportSchema.index({ userId: 1, createdAt: -1 });
healthReportSchema.index({ reportType: 1 });

export default mongoose.model('HealthReport', healthReportSchema);
