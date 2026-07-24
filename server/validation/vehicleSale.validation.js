// Manual validation for the Vehicle Sale module (project uses no validation library).
const SALE_TYPES = ['Cash', 'Finance', 'Exchange'];

function validateVehicleSale(body = {}) {
  const errors = {};
  const customer = body.customer || {};

  // Invoice number is auto-generated server-side, so it is not required here.
  if (!body.saleDate) {
    errors.saleDate = 'Sale Date is required.';
  } else if (isNaN(new Date(body.saleDate).getTime())) {
    errors.saleDate = 'Sale Date is invalid.';
  }
  if (body.saleType && !SALE_TYPES.includes(body.saleType)) {
    errors.saleType = 'Invalid Sale Type.';
  }
  if (!customer.name || !String(customer.name).trim()) {
    errors['customer.name'] = 'Customer Name is required.';
  }
  if (!customer.mobile || !String(customer.mobile).trim()) {
    errors['customer.mobile'] = 'Mobile Number is required.';
  }
  if (!Array.isArray(body.vehicles) || body.vehicles.length === 0) {
    errors.vehicles = 'At least one vehicle is required.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateVehicleSale, SALE_TYPES };
