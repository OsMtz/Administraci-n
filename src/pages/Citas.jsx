import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_BASE = "http://localhost:5000/api";

const todayLocal = () => {
  // en-CA => YYYY-MM-DD
  try {
    return new Date().toLocaleDateString("en-CA");
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

export default function Citas() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const token = user?.token || localStorage.getItem("token");
  const authHeaders = useMemo(() => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, [token]);

  const esMedico = user?.role === "Medico";

  const [pacientes, setPacientes] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState(null);

  const [form, setForm] = useState({
    fecha: todayLocal(),
    hora: "09:00",
    id_usuario: "",
    estado: "Programada",
  });

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError("");

    Promise.all([
      fetch(`${API_BASE}/pacientes`, { headers: authHeaders }).then((res) =>
        res.json().then((data) => ({ ok: res.ok, data }))
      ),
      fetch(`${API_BASE}/medicos`, { headers: authHeaders }).then((res) =>
        res.json().then((data) => ({ ok: res.ok, data }))
      ),
    ])
      .then(([pRes, mRes]) => {
        if (!pRes.ok) throw new Error(pRes.data?.message || "No se pudo cargar pacientes");
        if (!mRes.ok) throw new Error(mRes.data?.message || "No se pudo cargar medicos");

        setPacientes(Array.isArray(pRes.data) ? pRes.data : []);
        const medRows = Array.isArray(mRes.data) ? mRes.data : [];
        setMedicos(medRows);

        // Si no es medico, preselecciona el primer medico para facilitar.
        if (!esMedico && medRows.length && !form.id_usuario) {
          setForm((prev) => ({ ...prev, id_usuario: String(medRows[0].id_usuario) }));
        }
      })
      .catch((e) => setError(e.message || "Error cargando datos"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const pacientesFiltrados = pacientes.filter((p) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    const nombre = `${p.nombre || ""} ${p.apellido || ""}`.toLowerCase();
    return nombre.includes(q) || String(p.dni || "").includes(q);
  });

  const openModal = (paciente) => {
    setSelectedPaciente(paciente);
    setMensaje("");
    setError("");
    setModalOpen(true);
  };

  const agendar = () => {
    if (!selectedPaciente?.id_paciente) return;
    if (!form.fecha) {
      setError("La fecha es obligatoria");
      return;
    }
    if (!form.hora) {
      setError("La hora es obligatoria");
      return;
    }
    if (!esMedico && !form.id_usuario) {
      setError("Selecciona un medico");
      return;
    }

    setLoading(true);
    setError("");
    setMensaje("");

    const payload = {
      id_paciente: selectedPaciente.id_paciente,
      fecha: form.fecha,
      hora: form.hora,
      estado: form.estado || "Programada",
      ...(esMedico ? {} : { id_usuario: Number(form.id_usuario) }),
    };

    fetch(`${API_BASE}/citas`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(payload),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data?.message || "No se pudo agendar la cita");
        setMensaje("Cita agendada correctamente");
        setTimeout(() => {
          setModalOpen(false);
          navigate("/dashboard");
        }, 700);
      })
      .catch((e) => setError(e.message || "Error agendando cita"))
      .finally(() => setLoading(false));
  };

  return (
    <div className="content">
      <h2 className="dashboard-title">Organizar Citas</h2>

      <div className="card" style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Buscar paciente por nombre o DNI..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ flexGrow: 1 }}
        />
        <button onClick={() => navigate("/dashboard")} style={{ marginTop: 0 }} disabled={loading}>
          Volver
        </button>
      </div>

      {error && (
        <div className="alert-error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading && <p style={{ margin: "10px 0" }}>Cargando...</p>}

      <div className="table-container">
        <h3>Pacientes</h3>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>DNI</th>
              <th>Telefono</th>
              <th>Accion</th>
            </tr>
          </thead>
          <tbody>
            {pacientesFiltrados.map((p) => (
              <tr key={p.id_paciente}>
                <td>{`${p.nombre || ""} ${p.apellido || ""}`.trim()}</td>
                <td>{p.dni || "-"}</td>
                <td>{p.telefono || p.contacto || "-"}</td>
                <td>
                  <button style={{ marginTop: 0 }} onClick={() => openModal(p)} disabled={loading}>
                    Agendar
                  </button>
                </td>
              </tr>
            ))}
            {!loading && pacientesFiltrados.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 14, textAlign: "center" }}>
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Agendar Cita</h3>
            <p style={{ fontSize: 12, color: "#666" }}>
              Paciente: <strong>{`${selectedPaciente?.nombre || ""} ${selectedPaciente?.apellido || ""}`.trim()}</strong>
            </p>

            <label>Fecha</label>
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm((prev) => ({ ...prev, fecha: e.target.value }))}
              disabled={loading}
            />

            <label>Hora</label>
            <input
              type="time"
              value={form.hora}
              onChange={(e) => setForm((prev) => ({ ...prev, hora: e.target.value }))}
              disabled={loading}
            />

            {!esMedico && (
              <>
                <label>Medico</label>
                <select
                  value={form.id_usuario}
                  onChange={(e) => setForm((prev) => ({ ...prev, id_usuario: e.target.value }))}
                  disabled={loading}
                >
                  {medicos.map((m) => (
                    <option key={m.id_usuario} value={String(m.id_usuario)}>
                      {m.username}
                    </option>
                  ))}
                </select>
              </>
            )}

            {error && <div className="alert-error" style={{ marginTop: 10 }}>{error}</div>}
            {mensaje && <div style={{ marginTop: 10, color: "#1b7f3a" }}>{mensaje}</div>}

            <div className="modal-buttons" style={{ marginTop: 20 }}>
              <button onClick={agendar} disabled={loading}>
                Guardar Cita
              </button>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: "#7f8c8d" }}
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

