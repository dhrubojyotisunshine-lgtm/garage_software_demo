const express     = require('express');
const router      = express.Router();
const Appointment = require('../models/Appointment');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, date } = req.query;
    const q = { garageId: req.garage._id, active: { $ne: false } };

    if (date) {
      const d = new Date(date);
      const start = new Date(d); start.setHours(0, 0, 0, 0);
      const end   = new Date(d); end.setHours(23, 59, 59, 999);
      q.appointmentDate = { $gte: start, $lte: end };
    } else if (startDate && endDate) {
      const start = new Date(startDate); start.setHours(0, 0, 0, 0);
      const end   = new Date(endDate);   end.setHours(23, 59, 59, 999);
      q.appointmentDate = { $gte: start, $lte: end };
    }

    const appointments = await Appointment.find(q).sort({ appointmentDate: 1, appointmentTime: 1 });
    res.json(appointments);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const appt = await Appointment.create({ ...req.body, garageId: req.garage._id });
    res.status(201).json(appt);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const appt = await Appointment.findOneAndUpdate(
      { _id: req.params.id, garageId: req.garage._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!appt) return res.status(404).json({ message: 'Not found' });
    res.json(appt);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/status', async (req, res) => {
  try {
    const appt = await Appointment.findOneAndUpdate(
      { _id: req.params.id, garageId: req.garage._id },
      { status: req.body.status },
      { new: true }
    );
    if (!appt) return res.status(404).json({ message: 'Not found' });
    res.json(appt);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await Appointment.findOneAndUpdate(
      { _id: req.params.id, garageId: req.garage._id },
      { active: false }
    );
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
