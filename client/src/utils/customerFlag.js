// Decide whether a customer should show an indicator and how.
// Flagged when: has notes/remarks, OR status is not the default "Active".
export function customerFlag(c) {
  if (!c) return null;
  const hasNotes = Array.isArray(c.notes) && c.notes.length > 0;
  const special  = !!c.status && c.status !== 'Active';
  if (!hasNotes && !special) return null;

  const dot = {
    VIP:      'bg-amber-500',
    Lead:     'bg-blue-500',
    Inactive: 'bg-gray-400',
  }[c.status] || 'bg-red-500';

  const badge = {
    VIP:      'bg-amber-100 text-amber-700',
    Lead:     'bg-blue-100 text-blue-700',
    Inactive: 'bg-gray-100 text-gray-500',
  }[c.status] || 'bg-red-100 text-red-700';

  const parts = [];
  if (special) parts.push(c.status);
  if (hasNotes) parts.push(`${c.notes.length} note${c.notes.length > 1 ? 's' : ''}`);
  const lastNote = hasNotes ? (c.notes[c.notes.length - 1].text || '') : '';

  return { dot, badge, label: parts.join(' · '), hasNotes, status: special ? c.status : null, lastNote };
}
