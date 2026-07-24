import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import useAuthStore from '../../../store/authStore';
import { settingsApi } from '../../../api/settings';
import { useToast } from '../../../components/ui/Toast';

export default function QRCodeTab() {
  const { garage, updateGarage } = useAuthStore();
  const { toast } = useToast();
  const [upiId, setUpiId] = useState(garage?.upiId || '');
  const [saving, setSaving] = useState(false);
  const savedUpiId = garage?.upiId || '';

  const upiString = savedUpiId ? `upi://pay?pa=${savedUpiId}&pn=${encodeURIComponent(garage?.workshopName || '')}` : '';

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsApi.updateUpi({ upiId });
      updateGarage({ upiId });
      toast({ title: 'UPI ID saved', variant: 'success' });
    } catch (err) {
      toast({ title: err.response?.data?.message || 'Save failed', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">My QR Code</h3>
      <div className="border-t border-border pt-4">
        <div className="flex flex-col sm:flex-row gap-8 items-start">
          {/* QR preview */}
          <div className="flex flex-col items-center gap-2 min-w-[140px]">
            <div className="w-36 h-36 border border-border rounded-xl flex items-center justify-center bg-white p-2">
              {upiString ? (
                <QRCodeSVG value={upiString} size={112} />
              ) : (
                <div className="text-center">
                  <p className="text-xs text-gray-400">No UPI ID</p>
                  <p className="text-[10px] text-gray-300">saved</p>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {savedUpiId ? `UPI ID: ${savedUpiId}` : 'UPI ID: No UPI ID saved'}
            </p>
          </div>

          {/* UPI input */}
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-700 mb-3">UPI Details</h4>
            <div className="border border-border rounded-xl p-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Enter the UPI ID here</label>
              <input
                className="input-field mb-4"
                placeholder="e.g. yourname@upi"
                value={upiId}
                onChange={e => setUpiId(e.target.value)}
              />
              <button onClick={handleSave} disabled={saving} className="btn-primary px-8">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
