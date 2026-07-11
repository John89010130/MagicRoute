import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Inicio from './pages/Inicio';
import Entregas from './pages/Entregas';
import Dashboard from './pages/Dashboard';
import Rotas from './pages/Rotas';
import Mapa from './pages/Mapa';
import Usuarios from './pages/Usuarios';
import Locais from './pages/Locais';
import Configuracoes from './pages/Configuracoes';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  const getRedirectPath = () => {
    if (!isAuthenticated) return "/";
    return user?.tipoPessoaAtivo === 'Motorista' ? '/inicio' : '/dashboard';
  };

  return (
    <Routes>
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to={getRedirectPath()} replace /> : <Login />}
      />
      <Route
        path="/inicio"
        element={<ProtectedRoute><Inicio /></ProtectedRoute>}
      />
      <Route
        path="/entregas"
        element={<ProtectedRoute><Entregas /></ProtectedRoute>}
      />
      <Route
        path="/dashboard"
        element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
      />
      <Route
        path="/rotas"
        element={<ProtectedRoute><Rotas /></ProtectedRoute>}
      />
      <Route
        path="/usuarios"
        element={<ProtectedRoute><Usuarios /></ProtectedRoute>}
      />
      <Route
        path="/locais"
        element={<ProtectedRoute><Locais /></ProtectedRoute>}
      />
      <Route
        path="/configuracoes"
        element={<ProtectedRoute><Configuracoes /></ProtectedRoute>}
      />
      <Route
        path="/mapa"
        element={<ProtectedRoute><Mapa /></ProtectedRoute>}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  );
}
