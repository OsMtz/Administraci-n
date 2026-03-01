import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Función para salir del sistema
  const handleLogout = () => {
    if (window.confirm("¿Desea cerrar su sesión actual?")) {
      logout();
      navigate("/login");
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header" style={{ padding: '20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.2rem', color: '#2c3e50' }}>ClinicaMed</h2>
        <small style={{ color: '#7f8c8d' }}>{user?.rol}</small>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 80px)' }}>
        <ul style={{ flexGrow: 1, listStyle: 'none', padding: 0 }}>
          {/* 1. INICIO: Visible para todos */}
          <li>
            <NavLink 
              to="/dashboard" 
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Inicio
            </NavLink>
          </li>

          {/* 2. PACIENTES: Visible para Médico, Secretaria y Admin (Corregido) */}
          <li>
            <NavLink 
              to="/pacientes" 
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Pacientes
            </NavLink>
          </li>

          {/* 3. EXPEDIENTES: Donde el Doctor atiende a M. o J. */}
          <li>
            <NavLink 
              to="/expedientes" 
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Expedientes
            </NavLink>
          </li>

          {/* 4. ADMIN: Estrictamente solo para el Administrador */}
          {user?.rol === "Admin" && (
            <li>
              <NavLink 
                to="/admin" 
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                Admin
              </NavLink>
            </li>
          )}
        </ul>

        {/* --- SECCIÓN INFERIOR: USUARIO Y SALIR --- */}
        <div className="sidebar-footer" style={{ padding: '20px', borderTop: '1px solid #eee' }}>
          <div style={{ marginBottom: '15px', fontSize: '0.9rem' }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>{user?.nombre}</p>
          </div>
          
          <button 
            onClick={handleLogout}
            style={{ 
              width: '100%', 
              background: '#d93025', 
              color: 'white', 
              padding: '10px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'background 0.3s'
            }}
            onMouseOver={(e) => e.target.style.background = '#b71c1c'}
            onMouseOut={(e) => e.target.style.background = '#d93025'}
          >
            Cerrar Sesión
          </button>
        </div>
      </nav>
    </aside>
  );
}