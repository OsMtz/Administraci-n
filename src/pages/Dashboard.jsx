import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_BASE = "http://localhost:5000/api";

const todayLocal = () => {
  try {
    return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const token = user?.token || localStorage.getItem("token");
  const authHeaders = useMemo(() => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, [token]);

  const [citas, setCitas] = useState([]);
  const [citasProximas, setCitasProximas] = useState([]);
  const [citasLoading, setCitasLoading] = useState(false);
  const [citasError, setCitasError] = useState("");

  // Redirigir si no hay sesion activa
  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!token) return;
    const fecha = todayLocal();
    setCitasLoading(true);
    setCitasError("");
    fetch(`${API_BASE}/citas?fecha=${encodeURIComponent(fecha)}`, { headers: authHeaders })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data?.message || "No se pudieron cargar las citas");
        setCitas(Array.isArray(data) ? data : []);
      })
      .catch((e) => setCitasError(e.message || "Error cargando citas"))
      .finally(() => setCitasLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) return;
    if (user?.role !== "Medico" && user?.role !== "Secretaria") {
      setCitasProximas([]);
      return;
    }

    const fromDate = todayLocal();
    fetch(`${API_BASE}/citas?from=${encodeURIComponent(fromDate)}`, { headers: authHeaders })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data?.message || "No se pudieron cargar las citas proximas");
        const rows = Array.isArray(data) ? data : [];

        // Solo futuras (no el mismo dia). Para Medico: solo sus citas. Para Secretaria: todas.
        const futuras = rows
          .filter((c) => c?.fecha && c.fecha > fromDate)
          .filter((c) => (user?.role === "Medico" ? Number(c.medico_id) === Number(user?.id) : true))
          .sort((a, b) => {
            if (a.fecha !== b.fecha) return String(a.fecha).localeCompare(String(b.fecha));
            return String(a.hora || "").localeCompare(String(b.hora || ""));
          })
          .slice(0, 20);

        setCitasProximas(futuras);
      })
      .catch(() => {
        // No bloqueamos el dashboard si falla esta seccion
        setCitasProximas([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.role, user?.id]);

  if (loading) return <p>Cargando...</p>;
  if (!user) return null;

  const nombre = user.usuario || user.username || "Usuario";
  const email = user.email || "";
  const rol = user.role || user.nombre_role || "";
  const esSecretaria = user?.role === "Secretaria";
  const esMedico = user?.role === "Medico";

  return (
    <>
      <h2 className="dashboard-title">Bienvenido, {nombre}</h2>

      <div className="card">
        <h3>Informacion Personal</h3>
        <p>
          <strong>Usuario:</strong> {nombre}
        </p>
        <p>
          <strong>Email:</strong> {email}
        </p>
        <p>
          <strong>Rol:</strong> {rol}
        </p>
        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {!esSecretaria && (
            <button onClick={() => navigate("/citas")} style={{ marginTop: 0 }}>
              Organizar Citas
            </button>
          )}
          {esSecretaria && (
            <button onClick={() => navigate("/pagos")} style={{ marginTop: 0 }}>
              Pagos
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Citas del Dia</h3>
        {citasError && <div className="alert-error" style={{ marginBottom: 12 }}>{citasError}</div>}
        {citasLoading && <p style={{ margin: "10px 0" }}>Cargando...</p>}
        <table>
          <thead>
            <tr>
              <th>Horario</th>
              <th>Paciente</th>
              <th>Doctor</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {citas.map((c) => (
              <tr key={c.id_cita}>
                <td>{c.hora ? String(c.hora).slice(0, 5) : "-"}</td>
                <td>{`${c.paciente_nombre || ""} ${c.paciente_apellido || ""}`.trim() || "-"}</td>
                <td>{c.medico_usuario || "-"}</td>
                <td>{c.estado || "-"}</td>
              </tr>
            ))}
            {!citasLoading && citas.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 14, textAlign: "center" }}>
                  No hay citas para hoy
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(esMedico || esSecretaria) && (
        <div className="card">
          <h3>Citas proximas</h3>
          <p style={{ marginTop: 6, color: "#666" }}>
            {esMedico
              ? "Proximas citas del medico (desde manana en adelante)."
              : "Proximas citas de todos los medicos (desde manana en adelante)."}
          </p>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Paciente</th>
                {esSecretaria && <th>Doctor</th>}
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {citasProximas.map((c) => (
                <tr key={c.id_cita}>
                  <td>{c.fecha || "-"}</td>
                  <td>{c.hora ? String(c.hora).slice(0, 5) : "-"}</td>
                  <td>{`${c.paciente_nombre || ""} ${c.paciente_apellido || ""}`.trim() || "-"}</td>
                  {esSecretaria && <td>{c.medico_usuario || "-"}</td>}
                  <td>{c.estado || "-"}</td>
                </tr>
              ))}
              {citasProximas.length === 0 && (
                <tr>
                  <td colSpan={esSecretaria ? 5 : 4} style={{ padding: 14, textAlign: "center" }}>
                    No hay citas proximas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
