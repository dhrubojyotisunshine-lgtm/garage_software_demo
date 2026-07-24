import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';

export default function PlaceholderPage() {
  const location = useLocation();
  const pageName = location.pathname.replace('/', '').split('/').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <Construction size={28} className="text-gray-400" />
      </div>
      <h2 className="font-heading font-bold text-gray-700 text-xl mb-2">{pageName || 'Page'}</h2>
      <p className="text-gray-400 text-sm">This section is coming soon.</p>
    </div>
  );
}
