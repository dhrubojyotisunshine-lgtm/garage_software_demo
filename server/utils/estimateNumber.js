const Estimate = require('../models/Estimate');

const generateEstimateNumber = async (garageId) => {
  const last = await Estimate.findOne(
    { garageId },
    { estimateNumber: 1 },
    { sort: { createdAt: -1 } }
  );

  let seq = 0;
  if (last) {
    const num = parseInt(last.estimateNumber.replace('EST-', ''), 10);
    if (!isNaN(num)) seq = num + 1;
  }

  return `EST-${String(seq).padStart(4, '0')}`;
};

module.exports = { generateEstimateNumber };
