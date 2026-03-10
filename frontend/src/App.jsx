import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import useFeatureStore from './store/featureStore';
import useThemeStore from './store/themeStore';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Layout from './components/Common/Layout';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import DeviceDetails from './pages/DeviceDetails';
import Inventory from './pages/Inventory';
import EventLogs from './pages/EventLogs';
import AIInsights from './pages/AIInsights';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';
import Users from './pages/Users';
import Agents from './pages/Agents';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import RemoteCommands from './pages/RemoteCommands';
import RemoteDesktop from './pages/RemoteDesktop';
import Tickets from './pages/Tickets';
import SLAManagement from './pages/SLAManagement';
import AdminDashboard from './pages/Admin/AdminDashboard';
import FeatureManagement from './components/Admin/FeatureManagement';

const PrivateRoute = ({ children }) => {
    const { isAuthenticated } = useAuthStore();
    return isAuthenticated ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
    const { user, isAuthenticated } = useAuthStore();
    if (!isAuthenticated) return <Navigate to="/login" />;
    if (user?.role !== 'super_admin' && user?.role !== 'admin') {
        return <Navigate to="/dashboard" />;
    }
    return children;
};

function App() {
    const { isAuthenticated, user, loadProfile, company } = useAuthStore();
    const { loadFeatures } = useFeatureStore();
    const { theme } = useThemeStore();

    useEffect(() => {
        if (isAuthenticated && user && company) {
            loadProfile();
            loadFeatures(company.id);
        }
    }, [isAuthenticated]);

    // Apply theme on mount
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    return (
        <BrowserRouter
            future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true
            }}
        >
            <Toaster position="top-right" />
            <Routes>
                <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
                <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />
                
                <Route path="/" element={
                    <PrivateRoute>
                        <Layout />
                    </PrivateRoute>
                }>
                    <Route index element={<Navigate to="/dashboard" />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="devices" element={<Devices />} />
                    <Route path="devices/:id" element={<DeviceDetails />} />
                    <Route path="inventory" element={<Inventory />} />
                    <Route path="logs" element={<EventLogs />} />
                    <Route path="ai-insights" element={<AIInsights />} />
                    <Route path="alerts" element={<Alerts />} />
                    <Route path="tickets" element={<Tickets />} />
                    <Route path="sla-management" element={<SLAManagement />} />
                    <Route path="users" element={<Users />} />
                    <Route path="agents" element={<Agents />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="notifications" element={<Notifications />} />
                    <Route path="remote-commands" element={<RemoteCommands />} />
                    <Route path="remote-desktop" element={<RemoteDesktop />} />
                </Route>

                <Route path="/admin" element={
                    <AdminRoute>
                        <Layout />
                    </AdminRoute>
                }>
                    <Route index element={<AdminDashboard />} />
                    <Route path="companies/:companyId/features" element={<FeatureManagement />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;

