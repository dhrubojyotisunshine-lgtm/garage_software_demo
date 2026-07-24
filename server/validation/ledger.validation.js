// Manual validation for the Ledger module (project uses no validation library).
const TYPES = ['Credit', 'Debit'];

function validateLedger(body = {}) {
  const errors = {};

  if (!body.partyName || !String(body.partyName).trim()) {
    errors.partyName = 'Party Name is required.';
  }

  if (body.amount === undefined || body.amount === null || body.amount === '') {
    errors.amount = 'Amount is required.';
  } else if (isNaN(Number(body.amount))) {
    errors.amount = 'Amount must be a number.';
  }

  if (!body.date) {
    errors.date = 'Date is required.';
  } else if (isNaN(new Date(body.date).getTime())) {
    errors.date = 'Date is invalid.';
  }

  if (!body.type) {
    errors.type = 'Type is required.';
  } else if (!TYPES.includes(body.type)) {
    errors.type = 'Type must be Credit or Debit.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateLedger, TYPES };
