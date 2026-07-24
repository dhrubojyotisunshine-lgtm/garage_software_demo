// Shared form shape + derived-value calculations for the Vehicle Sale wizard.

// The Dealer / Showroom step was removed from the wizard — those details are still
// auto-filled from the garage profile and saved with every sale, just not shown.
export const STEPS = [
  'Customer Details',
  'Vehicle Details',
  'Payment Details',
  'Narration / Remarks'
];

export const emptyVehicle = () => ({
  vehicleModel: '', variant: '', color: '', chassisNumber: '', engineNumber: '',
  price: 0, insurance: 0, rto: 0, total: 0
});

const todayStr = () => new Date().toISOString().slice(0, 10);

export const emptySale = () => ({
  dealer: { name: '', address: '', phone: '', email: '', gstin: '' },
  invoiceNo: '', saleDate: '', saleType: 'Cash', salesExecutive: '',
  customer: { name: '', mobile: '', address: '', email: '', pan: '', aadhar: '' },
  vehicles: [emptyVehicle()],
  bookingNo: '', bookingDate: todayStr(), deliveryDate: '',
  billing: { exShowroom: 0, gst: 0, tcs: 0, accessories: 0, subtotal: 0, netVehicleAmount: 0 },
  insurance: {
    company: '',
    policyTypes: { thirdParty: false, comprehensive: false, zeroDepreciation: false, ownDamage: false },
    basicPremium: 0, gstOnPremium: 0, totalInsurance: 0
  },
  rto: { registrationCharges: 0, registrationFee: 0, totalRto: 0 },
  payment: {
    grossAmount: 0, totalDiscount: 0, netPayable: 0, advancePaid: 0, balanceAmount: 0, totalPaid: 0,
    paymentMode: '', amount: 0, transactionId: '', paymentDate: todayStr(), paymentStatus: 'Pending'
  },
  payments: [],
  narration: '', remark: ''
});

export const num = (v) => (v === '' || v === null || v === undefined || isNaN(Number(v)) ? 0 : Number(v));

// Returns a NEW form object with numeric inputs normalized and all derived
// fields recomputed. Pure — never mutates. Safe to use for both display and save.
export function computeDerived(form) {
  const vehicles = (form.vehicles || []).map(v => {
    const price = num(v.price);
    return { ...v, price, total: price };
  });

  // Showroom Price = sum of vehicle prices (replaces the old A+B+C gross calc).
  const showroomPrice = vehicles.reduce((sum, v) => sum + num(v.price), 0);

  const p = form.payment || {};
  const totalDiscount = num(p.totalDiscount), advancePaid = num(p.advancePaid), amount = num(p.amount);
  const installments = (form.payments || []).reduce((s, x) => s + num(x.amount), 0);
  const totalPaid = advancePaid + installments;
  const netPayable = showroomPrice - totalDiscount;
  const balanceAmount = netPayable - totalPaid;
  const payment = {
    ...p, showroomPrice, grossAmount: showroomPrice,
    totalDiscount, advancePaid, amount, totalPaid, netPayable, balanceAmount
  };

  return { ...form, vehicles, payment };
}

// Per-step validation. Returns an errors object ({} = valid). Only validates the given step.
export function validateStep(step, form) {
  const e = {};
  if (step === 0) {
    if (!form.customer?.name?.trim()) e['customer.name'] = 'Customer Name is required.';
    if (!form.customer?.mobile?.trim()) e['customer.mobile'] = 'Mobile Number is required.';
  } else if (step === 1) {
    if (!form.vehicles?.length) e['vehicles'] = 'Add at least one vehicle.';
    else {
      const first = form.vehicles[0];
      if (!first.vehicleModel?.trim()) e['vehicles.0.vehicleModel'] = 'Vehicle Model is required.';
    }
  } else if (step === 2) {
    // Booking Details (incl. Sale Type) live on the Payment step now.
    if (!form.payment?.paymentStatus) e['payment.paymentStatus'] = 'Payment Status is required.';
    if (!form.saleType) e['saleType'] = 'Sale Type is required.';
  }
  return e;
}
