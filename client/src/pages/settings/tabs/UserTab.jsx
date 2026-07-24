import { useEffect, useState } from 'react';
import { Users, Phone } from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { settingsApi } from '../../../api/settings';
import { getInitials } from '../../../utils/format';

export default function UserTab() {
  const { garage } = useAuthStore();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    settingsApi.getStaffUsers()
      .then(({ data }) => setStaff(data.staff || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      {/* Owner card */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Workshop Owner</h3>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-sm">
            {getInitials(`${garage?.firstName || ''} ${garage?.lastName || ''}`)}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">
              {garage?.firstName} {garage?.lastName}
            </p>
            <p className="text-xs text-gray-400">{garage?.mobile} · Admin</p>
          </div>
          <span className="ml-auto text-[10px] font-medium px-2 py-0.5 bg-primary/10 text-primary rounded-full">Owner</span>
        </div>
      </div>

      {/* Staff list */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Staff Members</h3>
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : staff.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <Users size={32} className="text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No staff added yet</p>
            <p className="text-xs text-gray-300 mt-1">Add staff from the Staff section in the sidebar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {staff.map(s => (
              <div key={s._id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div className="w-8 h-8 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center text-xs font-bold">
                  {getInitials(s.name)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.role}</p>
                </div>
                {s.mobile && (
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Phone size={11} />
                    {s.mobile}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
