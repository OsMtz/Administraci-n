import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

const API_BASE = "http://localhost:5000/api";

export default function ExpedientesAdmin() {
  const { user } = useAuth();

  // Solo el admin puede ver esta pantalla
  if (user?.role !== "Admin") {
    return <div className="content">No tienes permisos para acceder a esta seccion.</div>;
  }

  const token = user?.token || localStorage.getItem("token");
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [medicos, setMedicos] = useState([]);
  const [medicosLoading, setMedicosLoading] = useState(false);
  const [medicosError, setMedicosError] = useState("");

  const [selectedMedico, setSelectedMedico] = useState(null);
  const [pacientes, setPacientes] = useState([]);
  const [pacientesLoading, setPacientesLoading] = useState(false);
  const [pacientesError, setPacientesError] = useState("");

  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    if (!token) return;
    setMedicosLoading(true);
    setMedicosError("");
    fetch(`${API_BASE}/admin/medicos`, { headers: authHeaders })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data?.message || "No se pudieron cargar los medicos");
        setMedicos(Array.isArray(data) ? data : []);
      })
      .catch((e) => setMedicosError(e.message || "Error cargando medicos"))
      .finally(() => setMedicosLoading(false));
  }, [token, authHeaders]);

  const cargarPacientes = (medico) => {
    if (!medico?.id_usuario) return;
    setSelectedMedico(medico);
    setPacientes([]);
    setPacientesLoading(true);
    setPacientesError("");

    fetch(`${API_BASE}/admin/medicos/${medico.id_usuario}/pacientes`, { headers: authHeaders })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data?.message || "No se pudieron cargar los pacientes del medico");
        setPacientes(Array.isArray(data) ? data : []);
      })
      .catch((e) => setPacientesError(e.message || "Error cargando pacientes"))
      .finally(() => setPacientesLoading(false));
  };

  const pacientesFiltrados = pacientes.filter((p) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    const nombre = `${p.nombre || ""} ${p.apellido || ""}`.toLowerCase();
    return (
      nombre.includes(q) ||
      String(p.dni || "").includes(q) ||
      String(p.telefono || p.contacto || "").includes(q)
    );
  });

  const fmtDate = (v) => {
    if (!v) return "-";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  };

  return (
    <div className="content">
      <h2 className="dashboard-title">Expedientes (Admin)</h2>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <button
          onClick={() => window.history.back()}
          style={{ background: "#7f8c8d", marginTop: 0 }}
          disabled={medicosLoading || pacientesLoading}
        >
          Volver
        </button>
      </div>

      <div className="card">
        <h3>Medicos</h3>
        {medicosError && <div className="alert-error" style={{ marginBottom: 12 }}>{medicosError}</div>}
        {medicosLoading && <p style={{ margin: "10px 0" }}>Cargando...</p>}

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Pacientes (asociados)</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {medicos.map((m) => (
                <tr key={m.id_usuario}>
                  <td><strong>{m.username}</strong></td>
                  <td>{m.email}</td>
                  <td>{m.pacientes_count ?? 0}</td>
                  <td>
                    <button style={{ marginTop: 0 }} onClick={() => cargarPacientes(m)} disabled={pacientesLoading}>
                      Revisar pacientes
                    </button>
                  </td>
                </tr>
              ))}
              {!medicosLoading && medicos.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 14, textAlign: "center" }}>
                    No hay medicos registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Pacientes del medico</h3>
        <p style={{ marginTop: 6, color: "#666" }}>
          Mostrando pacientes creados por este medico (campo <code>pacientes.id_medico_creador</code>).
        </p>

        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Buscar por nombre, DNI o telefono..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ flexGrow: 1 }}
            disabled={!selectedMedico}
          />
          <button
            onClick={() => setSelectedMedico(null)}
            style={{ marginTop: 0, background: "#7f8c8d" }}
            disabled={!selectedMedico || pacientesLoading}
          >
            Limpiar
          </button>
        </div>

        {!selectedMedico && <p style={{ marginTop: 12 }}>Selecciona un medico y presiona "Revisar pacientes".</p>}

        {selectedMedico && (
          <>
            <p style={{ marginTop: 12 }}>
              Medico seleccionado: <strong>{selectedMedico.username}</strong> ({selectedMedico.email})
            </p>

            {pacientesError && <div className="alert-error" style={{ marginBottom: 12 }}>{pacientesError}</div>}
            {pacientesLoading && <p style={{ margin: "10px 0" }}>Cargando...</p>}

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Apellido</th>
                    <th>Fecha Nac.</th>
                    <th>DNI</th>
                    <th>Telefono</th>
                    <th>Contacto</th>
                    <th>Expediente</th>
                    <th>Ult. Actualizacion</th>
                  </tr>
                </thead>
                <tbody>
                  {pacientesFiltrados.map((p) => (
                    <tr key={p.id_paciente}>
                      <td>{p.id_paciente}</td>
                      <td>{p.nombre || "-"}</td>
                      <td>{p.apellido || "-"}</td>
                      <td>{p.fecha_nacimiento || "-"}</td>
                      <td>{p.dni || "-"}</td>
                      <td>{p.telefono || "-"}</td>
                      <td>{p.contacto || "-"}</td>
                      <td>{p.id_expediente || "-"}</td>
                      <td>{fmtDate(p.expediente_updated_at)}</td>
                    </tr>
                  ))}
                  {!pacientesLoading && pacientesFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ padding: 14, textAlign: "center" }}>
                        Sin resultados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
