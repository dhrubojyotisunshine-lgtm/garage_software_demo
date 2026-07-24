const Jobcard = require('../models/Jobcard');

const generateJobcardNumber = async (garageId, rtoNo) => {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const prefix = `${rtoNo}${mm}${yy}-`;

  const last = await Jobcard.findOne(
    { garageId, jobcardNumber: { $regex: `^${prefix}` } },
    { jobcardNumber: 1 },
    { sort: { createdAt: -1 } }
  );

  let seq = 1;
  if (last) {
    const parts = last.jobcardNumber.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${seq}`;
};

module.exports = { generateJobcardNumber };
