import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/Layout/AppLayout';
import { ProtectedRoute } from './pages/auth/ProtectedRoute';
import { ToastContainer } from './components/ui/Toast';
import LandingPage from './pages/landing/LandingPage';
import LoginPage from './pages/auth/LoginPage';
// import SignupPage from './pages/auth/SignupPage';   // self-registration disabled
import DashboardPage from './pages/dashboard/DashboardPage';
import MastersPage from './pages/masters/MastersPage';
import JobcardListPage from './pages/jobcards/JobcardListPage';
import JobcardFormPage from './pages/jobcards/JobcardFormPage';
import PlaceholderPage from './pages/PlaceholderPage';
import StaffPage from './pages/staff/StaffPage';
import CustomersPage from './pages/customers/CustomersPage';
import CustomerDetailPage from './pages/customers/CustomerDetailPage';
import InvoicePage from './pages/jobcards/InvoicePage';
import WorksheetPage from './pages/jobcards/WorksheetPage';
import RemindersPage from './pages/reminders/RemindersPage';
import EstimatesPage from './pages/estimates/EstimatesPage';
import EstimateFormPage from './pages/estimates/EstimateFormPage';
import EstimateInvoicePage from './pages/estimates/EstimateInvoicePage';
import SettingsPage from './pages/settings/SettingsPage';
import StockPage from './pages/inventory/StockPage';
import SupplierPage from './pages/inventory/SupplierPage';
import SupplierDetailPage from './pages/inventory/SupplierDetailPage';
import SupplierLedgerPrint from './pages/inventory/SupplierLedgerPrint';
import PurchaseOrderPage from './pages/inventory/PurchaseOrderPage';
import PurchaseOrderForm from './pages/inventory/PurchaseOrderForm';
import InventoryHistoryPage from './pages/inventory/InventoryHistoryPage';
import LedgerList from './pages/Ledger/LedgerList';
import LedgerDetail from './pages/Ledger/LedgerDetail';
import VehicleSalesListPage from './pages/VehicleSale/VehicleSalesListPage';
import VehicleSaleWizard from './pages/VehicleSale/VehicleSaleWizard';
import SaleReportsPage from './pages/VehicleSale/SaleReportsPage';
import VehicleSaleInvoice from './pages/VehicleSale/VehicleSaleInvoice';
import VehicleStockList from './pages/VehicleStock/VehicleStockList';
import VehicleStockForm from './pages/VehicleStock/VehicleStockForm';
import CounterSalePage from './pages/counter-sale/CounterSalePage';
import CounterSaleForm from './pages/counter-sale/CounterSaleForm';
import CounterSaleInvoicePage from './pages/counter-sale/CounterSaleInvoicePage';
import CashbookPage from './pages/cashbook/CashbookPage';
import ExpensePage from './pages/expenses/ExpensePage';
import AppointmentPage from './pages/appointment/AppointmentPage';
import ReportsPage from './pages/reports/ReportsPage';
import SuperAdminLoginPage from './pages/superadmin/SuperAdminLoginPage';
import SuperAdminLayout from './pages/superadmin/SuperAdminLayout';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import GaragesPage from './pages/superadmin/GaragesPage';
import SuperAdminProfile from './pages/superadmin/SuperAdminProfile';
import useAuthStore from './store/authStore';

function App() {
  const { fetchMe } = useAuthStore();

  useEffect(() => {
    fetchMe();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public — landing page retired; root goes straight to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        {/* Self-registration disabled — /signup now falls through to the catch-all
            and redirects to login. The SignupPage component is left intact.
        <Route path="/signup" element={<SignupPage />} />
        */}

        {/* Print pages (no sidebar) */}
        <Route path="/invoice/:id" element={<InvoicePage />} />
        <Route path="/jobcard-worksheet/:id" element={<WorksheetPage />} />
        <Route path="/estimate-print/:id" element={<EstimateInvoicePage />} />
        <Route path="/counter-sale-print/:id" element={<CounterSaleInvoicePage />} />
        <Route path="/supplier-ledger-print/:id" element={<SupplierLedgerPrint />} />
        <Route path="/vehicle-sale-invoice/:id" element={<VehicleSaleInvoice />} />

        {/* Protected */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/jobcards" element={<JobcardListPage />} />
          <Route path="/jobcards/new" element={<JobcardFormPage />} />
          <Route path="/jobcards/:id" element={<JobcardFormPage />} />
          <Route path="/reminders" element={<RemindersPage />} />
          <Route path="/masters" element={<MastersPage />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/estimate" element={<EstimatesPage />} />
          <Route path="/estimate/new" element={<EstimateFormPage />} />
          <Route path="/estimate/:id" element={<EstimateFormPage />} />
          <Route path="/counter-sale" element={<CounterSalePage />} />
          <Route path="/counter-sale/new" element={<CounterSaleForm />} />
          <Route path="/counter-sale/:id" element={<CounterSaleForm />} />
          <Route path="/inventory" element={<StockPage />} />
          <Route path="/inventory/supplier" element={<SupplierPage />} />
          <Route path="/inventory/supplier/:id" element={<SupplierDetailPage />} />
          <Route path="/inventory/purchase-order" element={<PurchaseOrderPage />} />
          <Route path="/inventory/purchase-order/new" element={<PurchaseOrderForm isAddStock={false} />} />
          <Route path="/inventory/purchase-order/add-stock" element={<PurchaseOrderForm isAddStock={true} />} />
          <Route path="/inventory/purchase-order/:id" element={<PurchaseOrderForm isAddStock={false} />} />
          <Route path="/inventory/history" element={<InventoryHistoryPage />} />
          <Route path="/ledger" element={<LedgerList />} />
          <Route path="/ledger/party/:name" element={<LedgerDetail />} />
          <Route path="/ledger/party-id/:partyId" element={<LedgerDetail />} />
          <Route path="/sale/vehicle-sales" element={<VehicleSalesListPage />} />
          <Route path="/sale/vehicle-sales/new" element={<VehicleSaleWizard />} />
          <Route path="/sale/vehicle-sales/:id" element={<VehicleSaleWizard />} />
          <Route path="/sale/list" element={<VehicleSalesListPage />} />
          <Route path="/sale/reports" element={<SaleReportsPage />} />
          <Route path="/vehicle-stock" element={<VehicleStockList />} />
          <Route path="/vehicle-stock/new" element={<VehicleStockForm />} />
          <Route path="/vehicle-stock/:id" element={<VehicleStockForm />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/cashbook" element={<CashbookPage />} />
          <Route path="/appointment" element={<AppointmentPage />} />
          <Route path="/online-garage" element={<PlaceholderPage />} />
          <Route path="/expenses" element={<ExpensePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Super Admin — login now lives at /superadmin (old /superadmin/login redirects here) */}
        <Route path="/superadmin/login" element={<Navigate to="/superadmin" replace />} />
        <Route path="/superadmin" element={<SuperAdminLoginPage />} />
        <Route path="/superadmin" element={<SuperAdminLayout />}>
          <Route path="dashboard" element={<SuperAdminDashboard />} />
          <Route path="garages"   element={<GaragesPage />} />
          <Route path="profile"   element={<SuperAdminProfile />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
