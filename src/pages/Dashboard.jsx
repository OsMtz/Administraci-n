import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth(); // Obtenemos el usuario y su rol
  
  // Datos para el "Check" de la Secretaria
  const [pacientesRegistrados] = useState([
    { id: 1, nombre: "Juan Pérez", dni: "48333425" },
    { id: 2, nombre: "M.", dni: "45666777" },
    { id: 3, nombre: "J.", dni: "12333444" }
  ]);

  const [citas, setCitas] = useState([
    { id: 101, hora: "10:00 AM", fecha: "2026-03-01", paciente: "Juan Pérez", doctor: "Dr. López", estado: "Confirmada" },
  ]);

  const [busquedaDNI, setBusquedaDNI] = useState("");
  const [pacienteEncontrado, setPacienteEncontrado] = useState(null);

  // Lógica de "Check" para Recepcionista
  const handleCheckDNI = () => {
    const encontrado = pacientesRegistrados.find(p => p.dni === busquedaDNI);
    if (encontrado) {
      setPacienteEncontrado(encontrado);
    } else {
      alert("Paciente no registrado. Redirigiendo a registro...");
    }
  };

  return (
    <div className="content">
      <h2 className="dashboard-title">Panel de Control: {user?.rol || "Invitado"}</h2>
      <p style={{marginBottom: '25px'}}>Bienvenido de nuevo, <strong>{user?.nombre}</strong></p>

      {/* --- VISTA RECEPCIONISTA / SECRETARIA --- */}
      {user?.rol === "Recepcionista" && (
        <div className="grid-expediente">
          <div className="card">
            <h3>Agendar Cita (Paso 1: Validar)</h3>
            <div style={{ display: 'flex', gap: '10px', margin: '15px 0' }}>
              <input 
                type="text" 
                placeholder="Ingresar DNI para Check..." 
                value={busquedaDNI}
                onChange={(e) => setBusquedaDNI(e.target.value)}
              />
              <button onClick={handleCheckDNI} style={{ marginTop: 0 }}>✔️ Check</button>
            </div>
            
            {pacienteEncontrado && (
              <div className="alert-success">
                ✅ Paciente: <strong>{pacienteEncontrado.nombre}</strong> identificado.
                <div style={{marginTop: '10px'}}>
                  <label>Fecha y Hora de Cita</label>
                  <input type="datetime-local" style={{marginTop: '5px'}} />
                  <button className="btn-save" style={{width: '100%', marginTop: '10px'}}>Confirmar Cita</button>
                </div>
              </div>
            )}
          </div>
          <div className="table-container">
            <h3>Citas del Día (Vista Global)</h3>
            <table>
              <thead>
                <tr><th>Hora</th><th>Paciente</th><th>Doctor</th></tr>
              </thead>
              <tbody>
                {citas.map(c => (
                  <tr key={c.id}>
                    <td>{c.hora}</td>
                    <td>{c.paciente}</td>
                    <td>{c.doctor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- VISTA DOCTOR --- */}
      {user?.rol === "Médico" && (
        <div className="card">
          <h3>Mis Pacientes de Hoy</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Hora</th><th>Paciente</th><th>Estado</th><th>Acción</th></tr>
              </thead>
              <tbody>
                {citas.filter(c => c.doctor === "Dr. López").map(c => (
                  <tr key={c.id}>
                    <td>{c.hora}</td>
                    <td>{c.paciente}</td>
                    <td><span className="status-confirmada">{c.estado}</span></td>
                    <td><button style={{marginTop: 0}}>Atender</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- VISTA ADMIN --- */}
      {user?.rol === "Admin" && (
        <div className="dashboard-grid">
          <div className="stat-card blue">
            <h3>{pacientesRegistrados.length}</h3>
            <p>Pacientes Totales</p>
          </div>
          <div className="stat-card orange">
            <h3>{citas.length}</h3>
            <p>Citas Hoy</p>
          </div>
          <div className="stat-card green">
            <h3>$3,450</h3>
            <p>Facturación Mensual</p>
          </div>
        </div>
      )}
    </div>
  );
}