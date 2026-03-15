import { BrowserRouter, Route, Routes } from 'react-router-dom';

// Layout y Componentes de Ruta
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import UsuariosAdmin from './pages/usuarios,admin';

// Paginas
import Admin from './pages/Admin';
import Dashboard from './pages/Dashboard';
import Citas from './pages/Citas';
import Expediente from './pages/Expediente';
import ExpedientesAdmin from './pages/expedientes,admin';
import ExpedientesAlmacenados from './pages/expedientes,almacenados';
import ListaExpedientes from './pages/ListaExpedientes';
import Login from './pages/Login';
import Pacientes from './pages/Pacientes';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas Publicas */}
          <Route path="/" element={<Login />} />

          {/* Rutas Protegidas (Solo accesibles con Login) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/citas" element={<Citas />} />
              <Route path="/pacientes" element={<Pacientes />} />
              <Route path="/expedientes" element={<ListaExpedientes />} />
              <Route path="/expediente/:id" element={<Expediente />} />
              <Route path="/expedientes/almacenados/:id" element={<ExpedientesAlmacenados />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/expedientes-admin" element={<ExpedientesAdmin />} />
              <Route path="/usuarios-admin" element={<UsuariosAdmin />} />
            </Route>
          </Route>

          {/* Redireccion por defecto si la ruta no existe */}
          <Route path="*" element={<Login />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
