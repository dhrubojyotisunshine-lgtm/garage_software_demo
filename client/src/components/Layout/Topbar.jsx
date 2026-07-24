import { Menu, ChevronDown, LogOut } from 'lucide-react';
import { useState } from 'react';
import useAuthStore from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { getInitials } from '../../utils/format';
import { assetUrlOrDefault } from '../../utils/asset';
import { cn } from '../../utils/cn';

export function Topbar({ onToggleSidebar }) {
  const { garage, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [picBroken, setPicBroken] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header
      className="h-14 bg-header border-b border-border flex items-center justify-between px-4 sticky top-0 z-20"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-7 h-7 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold overflow-hidden">
              {/* Uploaded profile picture → shipped default image → initials
                  (initials only if the default file is missing on the server). */}
              {picBroken
                ? getInitials(garage?.workshopName || garage?.firstName || 'G')
                : <img src={assetUrlOrDefault(garage?.profilePicUrl)} alt=""
                       onError={() => setPicBroken(true)}
                       className="w-full h-full object-cover" />}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-gray-800 leading-tight">
                {garage?.workshopName || `Hello, ${garage?.firstName || 'Garage'}`}
              </div>
              <div className="text-[10px] text-gray-400">{garage?.city || 'Garage Owner'}</div>
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
              <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-border z-50 w-44 py-1 overflow-hidden">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
