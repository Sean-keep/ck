import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import Layout from './components/Layout/Layout';
import LoginPage from './components/Login/LoginPage';
import DashboardPage from './components/Dashboard/DashboardPage';
import ConnectionConfigPage from './components/ConnectionConfig/ConnectionConfigPage';
import QueryAnalysisPage from './components/QueryAnalysis/QueryAnalysisPage';
import AlertManagementPage from './components/AlertManagement/AlertManagementPage';
import AlertRulesPage from './components/AlertRules/AlertRulesPage';
import ResolutionMethodsPage from './components/ResolutionMethods/ResolutionMethodsPage';
import SystemSettingsPage from './components/SystemSettings/SystemSettingsPage';
import UserManagementPage from './components/UserManagement/UserManagementPage';

function AppContent() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (!user?.isAuthenticated) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'connection':
        return <ConnectionConfigPage />;
      case 'query':
        return <QueryAnalysisPage />;
      case 'alerts':
        return <AlertManagementPage />;
      case 'rules':
        return <AlertRulesPage />;
      case 'methods':
        return <ResolutionMethodsPage />;
      case 'settings':
        return <SystemSettingsPage />;
      case 'users':
        return <UserManagementPage />;
      case 'dashboard':
      default:
        return <DashboardPage />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
