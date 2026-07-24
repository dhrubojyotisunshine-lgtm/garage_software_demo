// Build a wa.me share URL for a jobcard invoice.
// App runs locally with no public file URL, so we send a prefilled text summary
// (no PDF attachment) to the customer's WhatsApp.

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// Normalise an Indian mobile to wa.me format: digits only, 91 country code.
export function normalizePhone(mobile) {
  if (!mobile) return '';
  let d = String(mobile).replace(/\D/g, '');
  if (d.length === 10) d = '91' + d;        // bare 10-digit → add India code
  else if (d.length === 12 && d.startsWith('91')) { /* already ok */ }
  else if (d.length === 11 && d.startsWith('0')) d = '91' + d.slice(1);
  return d;
}

export function buildInvoiceMessage(jc, garage) {
  const shop = garage?.workshopName || 'our garage';
  const lines = [
    `Hello ${jc.customerName || ''}`.trim() + ',',
    `Here is your invoice from *${shop}*:`,
    '',
    `Invoice No: ${jc.jobcardNumber || '-'}`,
    jc.vehicleNo ? `Vehicle: ${[jc.vehicleMake, jc.vehicleModel].filter(Boolean).join(' ')} (${jc.vehicleNo})` : null,
    `Bill Amount: ${inr(jc.billAmount)}`,
    `Paid: ${inr(jc.paidAmount)}`,
    `Balance Due: ${inr(jc.balanceDue)}`,
    '',
    'Thank you for your visit. Drive safe!',
  ].filter(Boolean);
  return lines.join('\n');
}

export function buildInvoiceWhatsappUrl(jc, garage) {
  const phone = normalizePhone(jc.customerMobile);
  const text = encodeURIComponent(buildInvoiceMessage(jc, garage));
  return phone
    ? `https://wa.me/${phone}?text=${text}`
    : `https://wa.me/?text=${text}`;   // no number → opens WhatsApp, user picks contact
}

// Service-due reminder message for the Reminders page.
export function buildReminderWhatsappUrl(row, garage) {
  const shop = garage?.workshopName || 'our garage';
  const veh = row.vehicleNo
    ? `${[row.vehicleDesc].filter(Boolean).join(' ')} (${row.vehicleNo})`.trim()
    : (row.vehicleDesc || 'your vehicle');
  const due = row.nextDue ? new Date(row.nextDue).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
  const lines = [
    `Hello ${row.customerName || ''}`.trim() + ',',
    `This is a service reminder from *${shop}*.`,
    '',
    `Your ${veh} is due for service${due ? ` around ${due}` : ''}${row.reminderKm && row.reminderKm !== 'No KM Reminder' ? ` or after ${row.reminderKm}` : ''}.`,
    '',
    'Please visit us or call to book a slot. Thank you!',
  ];
  const phone = normalizePhone(row.customerMobile);
  const text = encodeURIComponent(lines.join('\n'));
  return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
}
