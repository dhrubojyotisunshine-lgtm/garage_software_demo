/** Convert hex color to "R G B" string for CSS variables */
export function hexToRgbStr(hex) {
  const clean = hex.replace('#', '');
  const full  = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const r = parseInt(full.slice(0,2), 16);
  const g = parseInt(full.slice(2,4), 16);
  const b = parseInt(full.slice(4,6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return `${r} ${g} ${b}`;
}

/** Darken a hex color by percent (0-100) */
function darken(hex, pct) {
  const clean = hex.replace('#','');
  const r = Math.round(parseInt(clean.slice(0,2),16) * (1-pct/100));
  const g = Math.round(parseInt(clean.slice(2,4),16) * (1-pct/100));
  const b = Math.round(parseInt(clean.slice(4,6),16) * (1-pct/100));
  return `${r} ${g} ${b}`;
}

/** Lighten a hex color — mix with white by pct */
function lighten(hex, pct) {
  const clean = hex.replace('#','');
  const r = Math.round(parseInt(clean.slice(0,2),16) + (255 - parseInt(clean.slice(0,2),16)) * pct/100);
  const g = Math.round(parseInt(clean.slice(2,4),16) + (255 - parseInt(clean.slice(2,4),16)) * pct/100);
  const b = Math.round(parseInt(clean.slice(4,6),16) + (255 - parseInt(clean.slice(4,6),16)) * pct/100);
  return `${r} ${g} ${b}`;
}

/**
 * Apply garage branding to document CSS variables.
 * Call this when garage data loads.
 */
export function applyBranding(branding = {}) {
  const root = document.documentElement;

  // Primary / button color + auto-generated shades
  if (branding.primaryColor) {
    const rgb = hexToRgbStr(branding.primaryColor);
    if (rgb) {
      root.style.setProperty('--primary',     rgb);
      root.style.setProperty('--primary-fg',  '255 255 255');
      root.style.setProperty('--primary-50',  lighten(branding.primaryColor, 90));
      root.style.setProperty('--primary-100', lighten(branding.primaryColor, 80));
      root.style.setProperty('--primary-600', darken(branding.primaryColor, 8));
      root.style.setProperty('--primary-700', darken(branding.primaryColor, 15));
    }
  }

  // Sidebar (menu) color + auto-derived hover/active shades
  if (branding.menuColor) {
    const rgb = hexToRgbStr(branding.menuColor);
    if (rgb) {
      root.style.setProperty('--sidebar-bg',     rgb);
      root.style.setProperty('--sidebar-hover',  lighten(branding.menuColor, 9));
      root.style.setProperty('--sidebar-active', lighten(branding.menuColor, 16));
    }
  }

  // Header (topbar) color
  if (branding.headerColor) {
    const rgb = hexToRgbStr(branding.headerColor);
    if (rgb) root.style.setProperty('--header-bg', rgb);
  }
}

/** Reset all branding to defaults */
export function resetBranding() {
  const root = document.documentElement;
  const defaults = {
    '--primary':        '229 57 53',
    '--primary-fg':     '255 255 255',
    '--primary-50':     '254 242 242',
    '--primary-100':    '254 226 226',
    '--primary-600':    '211 47 47',
    '--primary-700':    '198 40 40',
    '--sidebar-bg':     '28 31 38',
    '--sidebar-text':   '203 213 225',
    '--sidebar-hover':  '37 41 51',
    '--sidebar-active': '45 49 64',
    '--header-bg':      '255 255 255',
  };
  Object.entries(defaults).forEach(([k, v]) => root.style.setProperty(k, v));
}
