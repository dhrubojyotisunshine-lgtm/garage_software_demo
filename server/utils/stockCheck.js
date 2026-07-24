const SparePart = require('../models/masters/SparePart');
const Lube = require('../models/masters/Lube');

// Enforce the "Negative Inventory" garage setting.
//
// `consume` is a list of { itemType, itemId, qty } where qty is the NET amount to
// deduct from stock (positive = deduct, negative = restore). Callers building an
// update pass the new items as +qty and the old items as -qty so the net is checked.
//
// Returns { ok: true } when the setting allows negative stock, or when nothing would
// go below zero. Otherwise { ok: false, message: "Insufficient stock: …" }.
async function checkStock(garage, consume) {
  if (garage?.inventorySettings?.negativeInventory) return { ok: true };

  // Net deduction per stock item (Spare/Lube only — others have no stock).
  const need = new Map(); // "Type:id" -> net qty
  for (const c of consume || []) {
    if (!c || !c.itemId) continue;
    if (c.itemType !== 'Spare' && c.itemType !== 'Lube') continue;
    const key = `${c.itemType}:${c.itemId}`;
    need.set(key, (need.get(key) || 0) + (Number(c.qty) || 0));
  }

  const shortages = [];
  for (const [key, qty] of need) {
    if (qty <= 0) continue; // net restore or no change → can't cause a shortage
    const [type, id] = key.split(':');
    const Model = type === 'Lube' ? Lube : SparePart;
    const doc = await Model.findById(id).select('name currentStock').lean();
    if (!doc) continue; // unknown item → nothing to guard
    const have = doc.currentStock || 0;
    if (have < qty) shortages.push(`${doc.name} (have ${have}, need ${qty})`);
  }

  if (shortages.length) return { ok: false, message: `Insufficient stock: ${shortages.join('; ')}` };
  return { ok: true };
}

module.exports = { checkStock };
