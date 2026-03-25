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
      <div className="sidebar-header" style={{ padding: '45px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.8rem', color: '#2c3e50' }}>ClinicaMed</h2>
        <small style={{ color: '#7f8c8d' }}>{user?.role}</small>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 80px)' }}>
    <ul style={{ flexGrow: 1, listStyle: 'none', padding: 0 }}>
      {user?.role === 'Admin' ? (
        <li>
          <NavLink
            to="/admin"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Admin
          </NavLink>
        </li>
      ) : (
        <>
          <li>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Inicio
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/pacientes"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Pacientes
            </NavLink>
          </li>
          {user?.role === 'Secretaria' && (
            <li>
              <NavLink
                to="/pagos"
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                Pagos
              </NavLink>
            </li>
          )}
          <li>
            <NavLink
              to="/expedientes"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Expedientes
            </NavLink>
          </li>
        </>
      )}
    </ul>

    <div className="sidebar-footer" style={{ padding: '20px', borderTop: '1px solid #eee' }}>
      <div style={{ marginBottom: '15px', fontSize: '0.9rem' }}>
        <p style={{ margin: 0, fontWeight: 'bold' }}>{user?.usuario || user?.nombre || user?.email}</p>
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
