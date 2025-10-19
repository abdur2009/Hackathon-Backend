import express from 'express';
import { addVitals, getVitals, getVital, updateVitals, deleteVitals, getVitalsStats } from '../controllers/vitalsController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Vitals routes
router.post('/', addVitals);
router.get('/', getVitals);
router.get('/stats', getVitalsStats);
router.get('/:vitalId', getVital);
router.put('/:vitalId', updateVitals);
router.delete('/:vitalId', deleteVitals);

export default router;
