import { useEffect } from 'react';

// Friendly tooltip labels for common lucide icons used on icon-only buttons.
const ICON_LABELS = {
  pencil: 'Edit', edit: 'Edit', 'edit-2': 'Edit', 'edit-3': 'Edit', 'pencil-line': 'Edit',
  trash: 'Delete', 'trash-2': 'Delete',
  printer: 'Print', download: 'Download', upload: 'Upload', 'file-down': 'Download',
  plus: 'Add', 'plus-circle': 'Add', x: 'Close', 'x-circle': 'Close',
  'refresh-cw': 'Refresh', 'refresh-ccw': 'Refresh', 'rotate-cw': 'Reset',
  'message-circle': 'Share on WhatsApp', 'message-square': 'Notes', send: 'Send',
  phone: 'Call', mail: 'Email', eye: 'Show', 'eye-off': 'Hide',
  copy: 'Copy', check: 'Confirm', 'check-circle': 'Complete', 'key-round': 'View credentials',
  'clipboard-list': 'Mechanic worksheet', save: 'Save', camera: 'Photos', lock: 'Close / lock',
  search: 'Search', filter: 'Filter', calendar: 'Pick date', 'bell-ring': 'Reminders', bell: 'Notifications',
  settings: 'Settings', 'log-out': 'Log out', menu: 'Menu', user: 'Account', 'user-circle': 'Account',
  'chevron-down': 'Expand', 'chevron-up': 'Collapse', 'chevron-right': 'Open', 'chevron-left': 'Back',
  'arrow-left': 'Back', 'arrow-right': 'Next', 'more-vertical': 'More', 'more-horizontal': 'More',
  package: 'Inventory', wrench: 'Service', 'shopping-cart': 'Counter sale', 'bar-chart-2': 'Reports',
  'book-open': 'Cashbook', 'credit-card': 'Expenses', database: 'Masters', users: 'Staff',
  'file-text': 'Document', 'file-spreadsheet': 'Estimate', 'layout-dashboard': 'Dashboard',
};

const prettify = (name) => name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function labelFor(el) {
  // 1) explicit aria-label wins
  const aria = el.getAttribute('aria-label');
  if (aria && aria.trim()) return aria.trim();
  // 2) visible text (icon-only buttons have none)
  const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
  if (text && text.length >= 1 && text.length <= 48) return text;
  // 3) derive from the lucide icon class
  const svg = el.querySelector('svg[class*="lucide-"]');
  if (svg) {
    const cls = Array.from(svg.classList).find((c) => c.startsWith('lucide-') && c !== 'lucide');
    if (cls) {
      const name = cls.slice('lucide-'.length);
      return ICON_LABELS[name] || prettify(name);
    }
  }
  return null;
}

/**
 * Populates `data-tip` on every button / link / icon control so the styled
 * <TooltipLayer/> can show a custom tooltip. Hand-written native `title`s are
 * migrated to `data-tip` (and the `title` removed, so no duplicate OS tooltip).
 * Runs once and re-applies on DOM changes (modals, dropdowns, route changes).
 * Add `data-no-tip` to opt an element out.
 */
export function useAutoTooltips() {
  useEffect(() => {
    const apply = () => {
      const els = document.querySelectorAll(
        'button, a[href], [role="button"], [title]'
      );
      els.forEach((el) => {
        if (el.getAttribute('data-no-tip') != null) return;
        if (el.dataset.tip) {
          if (el.hasAttribute('title')) el.removeAttribute('title');
          return;
        }
        let label = el.getAttribute('title');
        if (label) el.removeAttribute('title'); // avoid the basic OS tooltip
        if (!label) label = labelFor(el);
        if (label && label.trim()) el.setAttribute('data-tip', label.trim());
      });
    };

    apply();
    let raf = 0;
    const obs = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    });
    obs.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
    };
  }, []);
}
