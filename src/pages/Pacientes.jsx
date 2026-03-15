import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_BASE = "http://localhost:5000/api";

export default function Pacientes() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const token = user?.token || localStorage.getItem("token");
  const authHeaders = useMemo(() => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, [token]);

  const [busqueda, setBusqueda] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [nuevoPaciente, setNuevoPaciente] = useState({
    nombre: "",
    apellido: "",
    fecha_nacimiento: "",
    dni: "",
    telefono: "",
  });

  const [pacientes, setPacientes] = useState([]);

  // Regla: solo Medico puede crear pacientes. Secretaria: solo lectura.
  const puedeAgregar = user?.role === "Medico";
  const esSecretaria = user?.role === "Secretaria";

  const normalizePaciente = (row) => ({
    id: row.id_paciente ?? row.id,
    nombre: row.nombre ?? "",
    apellido: row.apellido ?? "",
    fecha_nacimiento: row.fecha_nacimiento ?? "",
    dni: row.dni ?? "",
    telefono: row.telefono ?? row.contacto ?? "",
    medico_usuario: row.medico_usuario ?? null,
    expediente_updated_at: row.expediente_updated_at ?? null,
  });

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError("");

    fetch(`${API_BASE}/pacientes`, { headers: authHeaders })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data?.message || "No se pudo cargar pacientes");
        setPacientes(Array.isArray(data) ? data.map(normalizePaciente) : []);
      })
      .catch((e) => setError(e.message || "Error cargando pacientes"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const pacientesFiltrados = pacientes.filter((p) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return (
      (p.nombre || "").toLowerCase().includes(q) ||
      (p.apellido || "").toLowerCase().includes(q) ||
      (p.dni || "").includes(q)
    );
  });

  const handleAgregarPaciente = () => {
    if (!nuevoPaciente.nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    if (!nuevoPaciente.dni.trim()) {
      setError("El DNI es obligatorio");
      return;
    }
    if (!nuevoPaciente.telefono.trim()) {
      setError("El telefono es obligatorio");
      return;
    }

    setLoading(true);
    setError("");

    const payload = {
      nombre: nuevoPaciente.nombre.trim(),
      apellido: nuevoPaciente.apellido.trim() || null,
      fecha_nacimiento: nuevoPaciente.fecha_nacimiento || null,
      dni: nuevoPaciente.dni.trim(),
      telefono: nuevoPaciente.telefono.trim(),
      // mantenemos "contacto" por compatibilidad con el esquema original
      contacto: nuevoPaciente.telefono.trim(),
    };

    fetch(`${API_BASE}/pacientes`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(payload),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data?.message || "No se pudo crear el paciente");
        const created = normalizePaciente(data);
        setPacientes((prev) => [created, ...prev]);
        setNuevoPaciente({ nombre: "", apellido: "", fecha_nacimiento: "", dni: "", telefono: "" });
        setMostrarModal(false);
      })
      .catch((e) => setError(e.message || "Error creando paciente"))
      .finally(() => setLoading(false));
  };

  return (
    <div className="content">
      <h2>Gestion de Pacientes</h2>

      <div className="section-header" style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Buscar por nombre, apellido o DNI..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ flexGrow: 1 }}
        />

        {puedeAgregar && (
          <button onClick={() => setMostrarModal(true)} style={{ marginTop: 0 }} disabled={loading}>
            + Agregar Paciente
          </button>
        )}
      </div>

      {error && <div className="alert-error" style={{ marginBottom: 12 }}>{error}</div>}
      {loading && <p style={{ margin: "10px 0" }}>Cargando...</p>}

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>DNI</th>
                <th>Telefono</th>
                <th>Medico</th>
                <th>Expediente</th>
              </tr>
            </thead>
            <tbody>
              {pacientesFiltrados.map((paciente) => (
                <tr key={paciente.id}>
                  <td>
                    <strong>
                      {paciente.nombre} {paciente.apellido || ""}
                    </strong>
                  </td>
                  <td>{paciente.dni}</td>
                  <td>{paciente.telefono}</td>
                  <td>{paciente.medico_usuario || "-"}</td>
                  <td>
                    <button
                      onClick={() => navigate(`/expediente/${paciente.id}`)}
                      style={{ marginTop: 0, background: "#2c3e50" }}
                      disabled={loading}
                    >
                      {esSecretaria ? "Ver" : "Actualizar"}
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && pacientesFiltrados.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 14, textAlign: "center" }}>
                    Sin resultados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {mostrarModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Registrar Nuevo Paciente</h3>
           

            <label>Nombre</label>
            <input
              type="text"
              placeholder="Ej: Carlos"
              value={nuevoPaciente.nombre}
              onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, nombre: e.target.value })}
            />

            <label>Apellido</label>
            <input
              type="text"
              placeholder="Ej: Ruiz (opcional)"
              value={nuevoPaciente.apellido}
              onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, apellido: e.target.value })}
            />

            <label>Fecha de Nacimiento</label>
            <input
              type="date"
              value={nuevoPaciente.fecha_nacimiento}
              onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, fecha_nacimiento: e.target.value })}
            />

            <label>DNI / Identificacion</label>
            <input
              type="text"
              placeholder="Sin guiones"
              value={nuevoPaciente.dni}
              onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, dni: e.target.value })}
            />

            <label>Telefono de Contacto</label>
            <input
              type="text"
              placeholder="0000-0000"
              value={nuevoPaciente.telefono}
              onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, telefono: e.target.value })}
            />

            {error && <div className="alert-error" style={{ marginTop: "10px" }}>{error}</div>}

            <div className="modal-buttons" style={{ marginTop: "20px" }}>
              <button onClick={handleAgregarPaciente} disabled={loading}>
                Guardar Paciente
              </button>
              <button onClick={() => setMostrarModal(false)} style={{ background: "#7f8c8d" }} disabled={loading}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
