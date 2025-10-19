import Vitals from '../models/Vitals.js';

const addVitals = async (req, res) => {
  try {
    const {
      vitalDate,
      bloodPressureSystolic,
      bloodPressureDiastolic,
      bloodSugar,
      weight,
      temperature,
      heartRate,
      notes
    } = req.body;

    const userId = req.userId;

    const vitals = new Vitals({
      userId,
      vitalDate: new Date(vitalDate),
      bloodPressureSystolic: bloodPressureSystolic || null,
      bloodPressureDiastolic: bloodPressureDiastolic || null,
      bloodSugar: bloodSugar || null,
      weight: weight || null,
      temperature: temperature || null,
      heartRate: heartRate || null,
      notes: notes || null
    });

    await vitals.save();

    res.status(201).json({
      message: 'Vitals added successfully',
      vitals: {
        id: vitals._id,
        vitalDate: vitals.vitalDate,
        bloodPressureSystolic: vitals.bloodPressureSystolic,
        bloodPressureDiastolic: vitals.bloodPressureDiastolic,
        bloodSugar: vitals.bloodSugar,
        weight: vitals.weight,
        temperature: vitals.temperature,
        heartRate: vitals.heartRate,
        notes: vitals.notes,
        createdAt: vitals.createdAt
      }
    });
  } catch (error) {
    console.error('Add vitals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getVitals = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10, startDate, endDate } = req.query;

    const filter = { userId };
    
    if (startDate || endDate) {
      filter.vitalDate = {};
      if (startDate) filter.vitalDate.$gte = new Date(startDate);
      if (endDate) filter.vitalDate.$lte = new Date(endDate);
    }

    const vitals = await Vitals.find(filter)
      .sort({ vitalDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Vitals.countDocuments(filter);

    res.json({
      vitals,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get vitals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getVital = async (req, res) => {
  try {
    const { vitalId } = req.params;
    const userId = req.userId;

    const vital = await Vitals.findOne({ _id: vitalId, userId });
    if (!vital) {
      return res.status(404).json({ error: 'Vital record not found' });
    }

    res.json({ vital });
  } catch (error) {
    console.error('Get vital error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateVitals = async (req, res) => {
  try {
    const { vitalId } = req.params;
    const userId = req.userId;
    const {
      vitalDate,
      bloodPressureSystolic,
      bloodPressureDiastolic,
      bloodSugar,
      weight,
      temperature,
      heartRate,
      notes
    } = req.body;

    const updateData = {};
    if (vitalDate) updateData.vitalDate = new Date(vitalDate);
    if (bloodPressureSystolic !== undefined) updateData.bloodPressureSystolic = bloodPressureSystolic;
    if (bloodPressureDiastolic !== undefined) updateData.bloodPressureDiastolic = bloodPressureDiastolic;
    if (bloodSugar !== undefined) updateData.bloodSugar = bloodSugar;
    if (weight !== undefined) updateData.weight = weight;
    if (temperature !== undefined) updateData.temperature = temperature;
    if (heartRate !== undefined) updateData.heartRate = heartRate;
    if (notes !== undefined) updateData.notes = notes;

    const vital = await Vitals.findOneAndUpdate(
      { _id: vitalId, userId },
      updateData,
      { new: true }
    );

    if (!vital) {
      return res.status(404).json({ error: 'Vital record not found' });
    }

    res.json({
      message: 'Vitals updated successfully',
      vital
    });
  } catch (error) {
    console.error('Update vitals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteVitals = async (req, res) => {
  try {
    const { vitalId } = req.params;
    const userId = req.userId;

    const vital = await Vitals.findOneAndDelete({ _id: vitalId, userId });
    if (!vital) {
      return res.status(404).json({ error: 'Vital record not found' });
    }

    res.json({ message: 'Vitals deleted successfully' });
  } catch (error) {
    console.error('Delete vitals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getVitalsStats = async (req, res) => {
  try {
    const userId = req.userId;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const vitals = await Vitals.find({
      userId,
      vitalDate: { $gte: startDate }
    }).sort({ vitalDate: 1 });

    // Calculate basic statistics
    const stats = {
      totalRecords: vitals.length,
      averageBloodPressure: {
        systolic: 0,
        diastolic: 0
      },
      averageBloodSugar: 0,
      averageWeight: 0,
      averageTemperature: 0,
      averageHeartRate: 0,
      trends: {
        bloodPressure: [],
        bloodSugar: [],
        weight: [],
        temperature: [],
        heartRate: []
      }
    };

    if (vitals.length > 0) {
      let systolicSum = 0, diastolicSum = 0, sugarSum = 0, weightSum = 0, tempSum = 0, heartSum = 0;
      let systolicCount = 0, diastolicCount = 0, sugarCount = 0, weightCount = 0, tempCount = 0, heartCount = 0;

      vitals.forEach(vital => {
        if (vital.bloodPressureSystolic) {
          systolicSum += vital.bloodPressureSystolic;
          systolicCount++;
          stats.trends.bloodPressure.push({
            date: vital.vitalDate,
            systolic: vital.bloodPressureSystolic,
            diastolic: vital.bloodPressureDiastolic
          });
        }
        if (vital.bloodPressureDiastolic) {
          diastolicSum += vital.bloodPressureDiastolic;
          diastolicCount++;
        }
        if (vital.bloodSugar) {
          sugarSum += vital.bloodSugar;
          sugarCount++;
          stats.trends.bloodSugar.push({
            date: vital.vitalDate,
            value: vital.bloodSugar
          });
        }
        if (vital.weight) {
          weightSum += vital.weight;
          weightCount++;
          stats.trends.weight.push({
            date: vital.vitalDate,
            value: vital.weight
          });
        }
        if (vital.temperature) {
          tempSum += vital.temperature;
          tempCount++;
          stats.trends.temperature.push({
            date: vital.vitalDate,
            value: vital.temperature
          });
        }
        if (vital.heartRate) {
          heartSum += vital.heartRate;
          heartCount++;
          stats.trends.heartRate.push({
            date: vital.vitalDate,
            value: vital.heartRate
          });
        }
      });

      stats.averageBloodPressure.systolic = systolicCount > 0 ? Math.round(systolicSum / systolicCount) : 0;
      stats.averageBloodPressure.diastolic = diastolicCount > 0 ? Math.round(diastolicSum / diastolicCount) : 0;
      stats.averageBloodSugar = sugarCount > 0 ? Math.round(sugarSum / sugarCount) : 0;
      stats.averageWeight = weightCount > 0 ? Math.round(weightSum / weightCount) : 0;
      stats.averageTemperature = tempCount > 0 ? Math.round((tempSum / tempCount) * 10) / 10 : 0;
      stats.averageHeartRate = heartCount > 0 ? Math.round(heartSum / heartCount) : 0;
    }

    res.json({ stats });
  } catch (error) {
    console.error('Get vitals stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export {
  addVitals,
  getVitals,
  getVital,
  updateVitals,
  deleteVitals,
  getVitalsStats
};
