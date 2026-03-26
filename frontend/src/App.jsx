import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Stones from './pages/Stones';
import Blueprints from './pages/Blueprints';
import Projects from './pages/Projects';
import Manufacturing from './pages/Manufacturing';
import JobWork from './pages/JobWork';
import Site from './pages/Site';
import Contractors from './pages/Contractors';
import Billing from './pages/Billing';
import GSTFinance from './pages/GSTFinance';
import Users from './pages/Users';
import AuditLogs from './pages/AuditLogs';
import Reports from './pages/Reports';
import ReportDetail from './pages/ReportDetail';
import PurchaseOrders from './pages/PurchaseOrders';
import PurchaseReceipts from './pages/PurchaseReceipts';

// New CRUD pages
import UsersNew from './pages/UsersNew';
import ItemCategories from './pages/ItemCategories';
import BillingMilestones from './pages/BillingMilestones';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="inventory/categories" element={<ItemCategories />} />
            <Route path="purchase-orders" element={<PurchaseOrders />} />
            <Route path="purchase/orders" element={<PurchaseOrders />} />
            <Route path="purchase/receipts" element={<PurchaseReceipts />} />
            <Route path="stones" element={<Stones />} />
            <Route path="blueprints" element={<Blueprints />} />
            <Route path="projects" element={<Projects />} />
            <Route path="manufacturing" element={<Manufacturing />} />
            <Route path="job-work" element={<JobWork />} />
            <Route path="site" element={<Site />} />
            <Route path="contractors" element={<Contractors />} />
            <Route path="billing" element={<Billing />} />
            <Route path="billing/milestones" element={<BillingMilestones />} />
            <Route path="gst" element={<GSTFinance />} />
            <Route path="users" element={<Users />} />
            <Route path="users-management" element={<UsersNew />} />
            <Route path="audit" element={<AuditLogs />} />
            <Route path="reports" element={<Reports />} />
            <Route path="reports/:slug" element={<ReportDetail />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
