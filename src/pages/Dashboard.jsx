import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
      navigate('/');
    } else {
      setUser(currentUser);
    }
  }, [navigate]);

  if (!user) return <p>Cargando...</p>;

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/');
  };

  return (
    <>
      <button className="logout-btn" onClick={handleLogout} style={{ float: 'right', margin: '1rem' }}>
        Cerrar sesión
      </button>
      <h2 className="dashboard-title">
        Bienvenido, {user.username}
      </h2>

      <div className="card">
        <h3>Información Personal</h3>
        <p><strong>Usuario:</strong> {user.username}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Rol:</strong> {user.role}</p>
      </div>

      <div className="card">
        <h3>Citas del Día</h3>
        <table>
          <thead>
            <tr>
              <th>Horario</th>
              <th>Paciente</th>
              <th>Doctor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>10:00 AM</td>
              <td>Juan Pérez</td>
              <td>Dr. Pérez</td>
            </tr>
            <tr>
              <td>11:00 AM</td>
              <td>María Gómez</td>
              <td>Dr. González</td>
            </tr>
            <tr>
              <td>1:00 PM</td>
              <td>Carlos Sánchez</td>
              <td>Dr. Martínez</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-box box-pacientes">
          Pacientes
        </div>
        <div className="dashboard-box box-citas">
          Citas
        </div>
        <div className="dashboard-box box-facturacion">
          Facturación
        </div>
      </div>
    </>
  );
}
