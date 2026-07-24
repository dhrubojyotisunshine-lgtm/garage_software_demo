// Manual validation for the Party master (Ledger module).
function validateParty(body = {}) {
  const errors = {};
  if (!body.partyName || !String(body.partyName).trim()) {
    errors.partyName = 'Party Name is required.';
  }
  if (!body.phone || !String(body.phone).trim()) {
    errors.phone = 'Phone Number is required.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateParty };
