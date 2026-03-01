import { BrowserRouter, Route, Routes } from 'react-router-dom';

// Layout y Componentes de Ruta
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';

// Páginas
import Admin from './pages/Admin';
import Dashboard from './pages/Dashboard';
import Expediente from './pages/Expediente';
import ListaExpedientes from './pages/ListaExpedientes'; // Asegúrate de crear este
import Login from './pages/Login';
import Pacientes from './pages/Pacientes';
import Register from './pages/Register';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Rutas Protegidas (Solo accesibles con Login) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/pacientes" element={<Pacientes />} />
              <Route path="/expedientes" element={<ListaExpedientes />} />
              <Route path="/expediente/:id" element={<Expediente />} />
              <Route path="/admin" element={<Admin />} />
            </Route>
          </Route>

          {/* Redirección por defecto si la ruta no existe */}
          <Route path="*" element={<Login />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}