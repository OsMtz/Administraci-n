import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // Importamos el contexto

export default function Pacientes() {
  const navigate = useNavigate();
  const { user } = useAuth(); // Usamos el usuario del contexto

  const [busqueda, setBusqueda] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [error, setError] = useState("");

  const [nuevoPaciente, setNuevoPaciente] = useState({
    nombre: "",
    dni: "",
    telefono: ""
  });

  // Lista con tus pacientes M. y J. incluidos
  const [pacientes, setPacientes] = useState([
    { id: 1, nombre: "M.", dni: "45666777", telefono: "8888-1111" },
    { id: 2, nombre: "J.", dni: "12333444", telefono: "7777-2222" },
    { id: 3, nombre: "Juan Pérez", dni: "48333425", telefono: "88333425" },
    { id: 4, nombre: "María Gómez", dni: "55221144", telefono: "77221144" },
    { id: 5, nombre: "Sofía López", dni: "11223344", telefono: "11223344" },
  ]);

  // Variables de permisos
  const puedeAgregar = user?.rol === "Admin" || user?.rol === "Recepcionista";

  const pacientesFiltrados = pacientes.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.dni.includes(busqueda)
  );

  const handleAgregarPaciente = () => {
    if (!nuevoPaciente.nombre || !nuevoPaciente.dni || !nuevoPaciente.telefono) {
      setError("Todos los campos son obligatorios");
      return;
    }

    const nuevo = {
      id: pacientes.length + 1,
      ...nuevoPaciente
    };

    setPacientes([...pacientes, nuevo]);
    setNuevoPaciente({ nombre: "", dni: "", telefono: "" });
    setError("");
    setMostrarModal(false);
  };

  return (
    <div className="content">
      <h2>Gestión de Pacientes</h2>

      <div className="section-header" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Buscar por nombre o DNI..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ flexGrow: 1 }}
        />

        {/* SOLO LA SECRETARIA O ADMIN VEN ESTE BOTÓN */}
        {puedeAgregar && (
          <button onClick={() => setMostrarModal(true)} style={{ marginTop: 0 }}>
            + Agregar Paciente
          </button>
        )}
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>DNI</th>
                <th>Teléfono</th>
                <th>Expediente</th>
              </tr>
            </thead>
            <tbody>
              {pacientesFiltrados.map((paciente) => (
                <tr key={paciente.id}>
                  <td><strong>{paciente.nombre}</strong></td>
                  <td>{paciente.dni}</td>
                  <td>{paciente.telefono}</td>
                  <td>
                    <button
                      onClick={() => navigate(`/expediente/${paciente.id}`)}
                      style={{ marginTop: 0, background: '#2c3e50' }}
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PARA AGREGAR */}
      {mostrarModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Registrar Nuevo Paciente</h3>
            <p style={{ fontSize: '12px', color: '#666' }}>Asigne los datos básicos para abrir un expediente.</p>

            <label>Nombre Completo</label>
            <input
              type="text"
              placeholder="Ej: Carlos Ruiz"
              value={nuevoPaciente.nombre}
              onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, nombre: e.target.value })}
            />

            <label>DNI / Identificación</label>
            <input
              type="text"
              placeholder="Sin guiones"
              value={nuevoPaciente.dni}
              onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, dni: e.target.value })}
            />

            <label>Teléfono de Contacto</label>
            <input
              type="text"
              placeholder="0000-0000"
              value={nuevoPaciente.telefono}
              onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, telefono: e.target.value })}
            />

            {error && <div className="alert-error" style={{ marginTop: '10px' }}>{error}</div>}

            <div className="modal-buttons" style={{ marginTop: '20px' }}>
              <button onClick={handleAgregarPaciente}>Guardar Paciente</button>
              <button onClick={() => setMostrarModal(false)} style={{ background: '#7f8c8d' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}