import express from 'express';
import { upload, uploadReport, getReports, getReport, updateReport, deleteReport } from '../controllers/reportController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Report routes
router.post('/upload', upload.single('file'), uploadReport);
router.get('/', getReports);
router.get('/:reportId', getReport);
router.put('/:reportId', updateReport);
router.delete('/:reportId', deleteReport);

export default router;
