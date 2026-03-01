import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Expediente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth(); // Obtenemos el usuario y su rol

  // Estados para la consulta actual
  const [diagnostico, setDiagnostico] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [tratamiento, setTratamiento] = useState("");
  const [mensaje, setMensaje] = useState("");

  // Variable de control: ¿Es una secretaria/recepcionista?
  const esRecepcionista = user?.rol === "Recepcionista";

  // Datos simulados (M. o J.)
  const paciente = {
    id,
    nombre: id === "1" ? "M." : "J.",
    edad: id === "1" ? 24 : 28,
    genero: id === "1" ? "Femenino" : "Masculino",
    dni: id === "1" ? "45666777" : "12333444",
    alergias: id === "1" ? "Ninguna" : "Penicilina",
  };

  const handleGuardar = () => {
    if (esRecepcionista) return; // Protección extra en la función

    if (!diagnostico || !observaciones || !tratamiento) {
      setMensaje("❌ Error: Todos los campos son obligatorios");
      return;
    }

    setMensaje("✅ Expediente actualizado correctamente");
    setTimeout(() => setMensaje(""), 3000);
  };

  return (
    <div className="expediente-container">
      <div className="header-flex">
        <h2>Expediente Clínico de {paciente.nombre}</h2>
        <button className="btn-back" onClick={() => navigate("/expedientes")}>
          Volver a Lista
        </button>
      </div>

      <div className="grid-expediente">
        <section className="card info-paciente">
          <h3>Datos Generales</h3>
          <p><strong>DNI:</strong> {paciente.dni}</p>
          <p><strong>Edad:</strong> {paciente.edad} años</p>
          <p><strong>Género:</strong> {paciente.genero}</p>
          <div className="alert-box">
            <strong>⚠️ Alergias:</strong> {paciente.alergias}
          </div>
        </section>

        <section className="card consulta-actual">
          <h3>Nueva Entrada Médica</h3>
          
          {/* Mensaje de aviso para Recepcionistas */}
          {esRecepcionista && (
            <p style={{ color: '#e67e22', fontSize: '13px', marginBottom: '10px' }}>
              ℹ️ Modo lectura: Solo médicos pueden editar esta sección.
            </p>
          )}

          <label>Diagnóstico</label>
          <input 
            type="text" 
            value={diagnostico} 
            onChange={(e) => setDiagnostico(e.target.value)} 
            placeholder={esRecepcionista ? "Sin permisos de edición" : "Ej: Gripe estacional"}
            disabled={esRecepcionista} // BLOQUEO
          />

          <label>Observaciones Clínicas</label>
          <textarea 
            rows="3" 
            value={observaciones} 
            onChange={(e) => setObservaciones(e.target.value)}
            disabled={esRecepcionista} // BLOQUEO
          />

          <label>Plan de Tratamiento (Receta)</label>
          <textarea 
            rows="3" 
            value={tratamiento} 
            onChange={(e) => setTratamiento(e.target.value)}
            placeholder={esRecepcionista ? "Sin permisos de edición" : "Medicamentos y dosis..."}
            disabled={esRecepcionista} // BLOQUEO
          />

          {/* Solo se muestra el botón si NO es recepcionista */}
          {!esRecepcionista && (
            <button className="btn-save" onClick={handleGuardar}>
              Guardar Evolución
            </button>
          )}
          
          {mensaje && <p className="status-msg">{mensaje}</p>}
        </section>
      </div>

      <section className="card table-container">
        <h3>Historial de Consultas</h3>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Diagnóstico</th>
              <th>Médico</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>14/02/2026</td>
              <td>Control preventivo</td>
              <td>Dr. {user?.nombre || "Usuario"}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}