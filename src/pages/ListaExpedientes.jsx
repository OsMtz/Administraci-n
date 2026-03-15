import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_BASE = "http://localhost:5000/api";

export default function ListaExpedientes() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const token = user?.token || localStorage.getItem("token");
  const authHeaders = useMemo(() => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, [token]);

  const esMedico = user?.role === "Medico";

  const [busqueda, setBusqueda] = useState("");
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const normalizePaciente = (row) => ({
    id: row.id_paciente ?? row.id,
    nombre: row.nombre ?? "",
    apellido: row.apellido ?? "",
    dni: row.dni ?? "",
    telefono: row.telefono ?? row.contacto ?? "",
    expediente_updated_at: row.expediente_updated_at ?? null,
  });

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError("");

    fetch(`${API_BASE}/pacientes`, { headers: authHeaders })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data?.message || "No se pudo cargar expedientes");
        setPacientes(Array.isArray(data) ? data.map(normalizePaciente) : []);
      })
      .catch((e) => setError(e.message || "Error cargando expedientes"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const pacientesFiltrados = pacientes.filter((p) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return (
      `${p.nombre} ${p.apellido}`.toLowerCase().includes(q) ||
      (p.dni || "").includes(q)
    );
  });

  const formatUltima = (ts) => {
    if (!ts) return "-";
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return String(ts);
    return d.toLocaleDateString();
  };

  const handleAbrir = (paciente) => {
    if (esMedico) {
      try {
        localStorage.setItem(`expediente_paciente_${paciente.id}`, JSON.stringify(paciente));
      } catch {
        // ignore
      }
      navigate(`/expedientes/almacenados/${paciente.id}`, { state: { paciente } });
      return;
    }
    navigate(`/expediente/${paciente.id}`);
  };

  return (
    <div className="content">
      <h2 className="dashboard-title">Buscador de Expedientes</h2>

      <div className="card">
        <label>Buscar Paciente</label>
        <input
          type="text"
          placeholder="Escribe nombre, apellido o DNI..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        {error && <div className="alert-error" style={{ marginTop: 10 }}>{error}</div>}
      </div>

      <div className="table-container">
        <h3>Resultados</h3>
        {loading && <p>Cargando...</p>}
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>DNI</th>
              <th>Ultima Actualizacion</th>
              <th>Accion</th>
            </tr>
          </thead>
          <tbody>
            {pacientesFiltrados.map((p) => (
              <tr key={p.id}>
                <td>{`${p.nombre} ${p.apellido || ""}`.trim()}</td>
                <td>{p.dni || "-"}</td>
                <td>{formatUltima(p.expediente_updated_at)}</td>
                <td>
                  <button style={{ marginTop: 0 }} onClick={() => handleAbrir(p)}>
                    Abrir
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
    </div>
  );
}

