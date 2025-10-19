import HealthReport from '../models/HealthReport.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/reports';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and image files are allowed.'));
    }
  }
});

const extractTextFromPDF = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdf = await import('pdf-parse');
    const data = await pdf.default(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    return null;
  }
};

const uploadReport = async (req, res) => {
  try {
    const { title, reportType, reportDate } = req.body;
    const userId = req.userId;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let extractedText = null;
    
    // Extract text from PDF
    if (req.file.mimetype === 'application/pdf') {
      extractedText = await extractTextFromPDF(req.file.path);
    }

    // Create report record
    const report = new HealthReport({
      userId,
      title,
      reportType,
      reportDate: new Date(reportDate),
      fileUrl: `/uploads/reports/${req.file.filename}`,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      extractedText
    });

    await report.save();

    res.status(201).json({
      message: 'Report uploaded successfully',
      report: {
        id: report._id,
        title: report.title,
        reportType: report.reportType,
        reportDate: report.reportDate,
        fileUrl: report.fileUrl,
        fileType: report.fileType,
        fileSize: report.fileSize,
        extractedText: report.extractedText,
        createdAt: report.createdAt
      }
    });
  } catch (error) {
    console.error('Upload report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getReports = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10, reportType } = req.query;

    const filter = { userId };
    if (reportType) {
      filter.reportType = reportType;
    }

    const reports = await HealthReport.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-extractedText') // Exclude large text field for list view
      .lean();

    const total = await HealthReport.countDocuments(filter);

    res.json({
      reports,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.userId;

    const report = await HealthReport.findOne({ _id: reportId, userId });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ report });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.userId;
    const { title, reportType, reportDate } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (reportType) updateData.reportType = reportType;
    if (reportDate) updateData.reportDate = new Date(reportDate);

    const report = await HealthReport.findOneAndUpdate(
      { _id: reportId, userId },
      updateData,
      { new: true }
    );

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({
      message: 'Report updated successfully',
      report
    });
  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.userId;

    const report = await HealthReport.findOneAndDelete({ _id: reportId, userId });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Delete the file from filesystem
    if (report.fileUrl) {
      const filePath = path.join(process.cwd(), report.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export {
  upload,
  uploadReport,
  getReports,
  getReport,
  updateReport,
  deleteReport
};
