import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_BASE = "http://localhost:5000/api";


export default function Expediente() {
  const { id } = useParams(); // id_paciente
  const navigate = useNavigate();
  const { user } = useAuth();

  const token = user?.token || localStorage.getItem("token");
  const authHeaders = useMemo(() => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, [token]);

  // En backend los roles validos son: Admin | Medico | Secretaria
  // Regla: solo Medico puede realizar entradas medicas.
  const puedeEditar = user?.role === "Medico";

  const [paciente, setPaciente] = useState(null);
  const [expediente, setExpediente] = useState(null); // { historial: [] ... } | null
  const [citas, setCitas] = useState([]);
  const [pagosFacturacion, setPagosFacturacion] = useState([]);
  const [pagosError, setPagosError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [diagnostico, setDiagnostico] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [tratamiento, setTratamiento] = useState("");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError("");
    setPagosError("");

    const baseFetches = [
      fetch(`${API_BASE}/pacientes/${id}`, { headers: authHeaders }).then((res) =>
        res.json().then((data) => ({ ok: res.ok, data }))
      ),
      fetch(`${API_BASE}/expedientes/${id}`, { headers: authHeaders }).then((res) =>
        res.json().then((data) => ({ ok: res.ok, data }))
      ),
      fetch(`${API_BASE}/citas/paciente/${id}`, { headers: authHeaders }).then((res) =>
        res.json().then((data) => ({ ok: res.ok, data }))
      ),
    ];

    const extraFetches =
      user?.role === "Admin"
        ? [
            fetch(`${API_BASE}/pagos/paciente/${id}`, { headers: authHeaders }).then((res) =>
              res.json().then((data) => ({ ok: res.ok, data }))
            ),
          ]
        : [];

    Promise.all([...baseFetches, ...extraFetches])
      .then((results) => {
        const [pRes, eRes, cRes, pagosRes] = results;
        if (!pRes.ok) throw new Error(pRes.data?.message || "No se pudo cargar el paciente");
        if (!eRes.ok) throw new Error(eRes.data?.message || "No se pudo cargar el expediente");
        if (!cRes.ok) throw new Error(cRes.data?.message || "No se pudieron cargar las citas");
        setPaciente(pRes.data);
        setExpediente(eRes.data); // puede ser null si aun no existe
        setCitas(Array.isArray(cRes.data) ? cRes.data : []);

        if (user?.role === "Admin") {
          if (pagosRes?.ok) {
            setPagosFacturacion(Array.isArray(pagosRes.data) ? pagosRes.data : []);
          } else {
            setPagosFacturacion([]);
            setPagosError(pagosRes?.data?.message || "No se pudieron cargar pagos/facturacion");
          }
        } else {
          setPagosFacturacion([]);
        }
      })
      .catch((e) => setError(e.message || "Error cargando expediente"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  const handleGuardar = () => {
    if (!puedeEditar) return;
    if (!diagnostico.trim() || !observaciones.trim() || !tratamiento.trim()) {
      setMensaje("Error: Todos los campos son obligatorios");
      return;
    }

    setLoading(true);
    setError("");
    setMensaje("");

    fetch(`${API_BASE}/expedientes/${id}`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({
        diagnostico: diagnostico.trim(),
        observaciones: observaciones.trim(),
        tratamiento: tratamiento.trim(),
      }),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data?.message || "No se pudo guardar el expediente");
        setExpediente(data);
        setDiagnostico("");
        setObservaciones("");
        setTratamiento("");
        setMensaje("Expediente actualizado correctamente");
        setTimeout(() => setMensaje(""), 2500);
      })
      .catch((e) => setError(e.message || "Error guardando expediente"))
      .finally(() => setLoading(false));
  };

  const nombreCompleto = paciente ? `${paciente.nombre || ""} ${paciente.apellido || ""}`.trim() : "";

  return (
    <div className="expediente-container">
      <div className="header-flex">
        <h2>Expediente Clinico de {nombreCompleto || `Paciente #${id}`}</h2>
        {user?.role === "Admin" ? (
          <button className="btn-back" onClick={() => navigate("/expedientes-admin")} disabled={loading}>
            Volver a Expedientes
          </button>
        ) : (
          <button className="btn-back" onClick={() => navigate("/pacientes")} disabled={loading}>
            Volver a Lista
          </button>
        )}
      </div>

      {error && (
        <div className="alert-error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading && <p style={{ margin: "10px 0" }}>Cargando...</p>}

      <div className="grid-expediente">
        <section className="card info-paciente">
          <h3>Datos Generales</h3>
          <p>
            <strong>DNI:</strong> {paciente?.dni || "-"}
          </p>
          <p>
            <strong>Telefono:</strong> {paciente?.telefono || paciente?.contacto || "-"}
          </p>
          <p>
            <strong>Fecha Nacimiento:</strong> {paciente?.fecha_nacimiento || "-"}
          </p>
        </section>

        {user?.role === "Medico" && (
          <section className="card consulta-actual">
            <h3>Nueva Entrada Medica</h3>

            <label>Diagnostico</label>
            <input
              type="text"
              value={diagnostico}
              onChange={(e) => setDiagnostico(e.target.value)}
              placeholder="Ej: Gripe estacional"
              disabled={loading}
            />

            <label>Observaciones Clinicas</label>
            <textarea
              rows="3"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              disabled={loading}
            />

            <label>Plan de Tratamiento (Receta)</label>
            <textarea
              rows="3"
              value={tratamiento}
              onChange={(e) => setTratamiento(e.target.value)}
              placeholder="Medicamentos y dosis..."
              disabled={loading}
            />

            <button className="btn-save" onClick={handleGuardar} disabled={loading}>
              Guardar Evolucion
            </button>

            {mensaje && <p className="status-msg">{mensaje}</p>}
          </section>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Historial</h3>
        {Array.isArray(expediente?.historial) && expediente.historial.length > 0 ? (
          <div style={{ display: "grid", gap: 10 }}>
            {expediente.historial
              .slice()
              .reverse()
              .map((h, idx) => (
                <div
                  key={`${h.fecha || "x"}-${idx}`}
                  style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}
                >
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
                    {h.fecha ? new Date(h.fecha).toLocaleString() : "-"}
                    {h.medico_usuario ? ` | Medico: ${h.medico_usuario}` : ""}
                  </div>
                  <div>
                    <strong>Diagnostico:</strong> {h.diagnostico || "-"}
                  </div>
                  <div>
                    <strong>Observaciones:</strong> {h.observaciones || "-"}
                  </div>
                  <div>
                    <strong>Tratamiento:</strong> {h.tratamiento || "-"}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p style={{ margin: 0, color: "#666" }}>Aun no hay entradas en el expediente.</p>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Citas</h3>
        {Array.isArray(citas) && citas.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Medico</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {citas.map((c) => (
                <tr key={c.id_cita}>
                  <td>{c.fecha || "-"}</td>
                  <td>{c.hora ? String(c.hora).slice(0, 5) : "-"}</td>
                  <td>{c.medico_usuario || "-"}</td>
                  <td>{c.estado || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ margin: 0, color: "#666" }}>Este paciente no tiene citas registradas.</p>
        )}
      </div>

      {user?.role === "Admin" && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Pagos y Facturacion</h3>
          {pagosError && (
            <div className="alert-error" style={{ marginBottom: 12 }}>
              {pagosError}
            </div>
          )}
          {Array.isArray(pagosFacturacion) && pagosFacturacion.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Factura</th>
                  <th>Fecha emision</th>
                  <th>Monto total</th>
                  <th>Cita</th>
                  <th>Medico</th>
                  <th>Pago</th>
                  <th>Fecha pago</th>
                  <th>Metodo</th>
                  <th>Notas</th>
                </tr>
              </thead>
              <tbody>
                {pagosFacturacion.map((r, idx) => (
                  <tr key={`${r.id_factura}-${r.id_pago || "x"}-${idx}`}>
                    <td>#{r.id_factura}</td>
                    <td>{r.fecha_emision || "-"}</td>
                    <td>{r.monto_total ?? "-"}</td>
                    <td>{r.id_cita ?? "-"}</td>
                    <td>{r.medico_id ?? "-"}</td>
                    <td>{r.pago_monto ?? "-"}</td>
                    <td>{r.fecha_pago || "-"}</td>
                    <td>{r.metodo_pago || "-"}</td>
                    <td>{r.notas || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ margin: 0, color: "#666" }}>Aun no hay pagos/facturas registrados para este paciente.</p>
          )}
        </div>
      )}
    </div>
  );
}
