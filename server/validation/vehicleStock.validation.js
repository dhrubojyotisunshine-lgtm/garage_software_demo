// Manual validation for the Vehicle Stock module.
function validateStock(body = {}) {
  const errors = {};
  if (!body.vehicleModel || !String(body.vehicleModel).trim()) {
    errors.vehicleModel = 'Vehicle Model is required.';
  }
  if (body.qty !== undefined && body.qty !== null && body.qty !== '' && isNaN(Number(body.qty))) {
    errors.qty = 'Qty must be a number.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateStock };
