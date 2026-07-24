import { useState } from 'react';
import { User, FileText, CreditCard, Package, QrCode } from 'lucide-react';
import { cn } from '../../utils/cn';
import ProfileTab from './tabs/ProfileTab';
import JobcardTab from './tabs/JobcardTab';
import BillingTab from './tabs/BillingTab';
import InventoryTab from './tabs/InventoryTab';
import QRCodeTab from './tabs/QRCodeTab';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User, component: ProfileTab },
  { id: 'jobcard', label: 'Jobcard', icon: FileText, component: JobcardTab },
  { id: 'billing', label: 'Billing', icon: CreditCard, component: BillingTab },
  { id: 'inventory', label: 'Inventory', icon: Package, component: InventoryTab },
  { id: 'qrcode', label: 'My QR Code', icon: QrCode, component: QRCodeTab },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-heading font-bold text-gray-800">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your workshop profile and preferences</p>
      </div>

      {/* Tab Nav */}
      <div className="border-b border-border mb-6">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
}
