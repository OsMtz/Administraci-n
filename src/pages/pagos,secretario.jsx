import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { buildTicketHtml } from "../utils/ticket";

const API_BASE = "http://localhost:5000/api";

const todayLocal = () => {
  try {
    return new Date().toLocaleDateString("en-CA");
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

export default function PagosSecretario() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const token = user?.token || localStorage.getItem("token");
  const authHeaders = useMemo(() => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, [token]);

  const hasAccess = user?.role === "Secretaria";

  const [fechaFiltro, setFechaFiltro] = useState(todayLocal());
  const [citas, setCitas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [medicos, setMedicos] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [selectedCita, setSelectedCita] = useState(null);
  const [ticketData, setTicketData] = useState(null);

  const [formPago, setFormPago] = useState({
    monto: "",
    metodo_pago: "Efectivo",
    fecha_pago: todayLocal(),
    notas: "",
  });

  const [modalNuevaCita, setModalNuevaCita] = useState(false);
  const [formCita, setFormCita] = useState({
    id_paciente: "",
    id_usuario: "",
    fecha: todayLocal(),
    hora: "09:00",
  });

  const cargar = async () => {
    if (!token || !hasAccess) return;
    setLoading(true);
    setError("");
    try {
      const [cRes, pRes, mRes] = await Promise.all([
        fetch(`${API_BASE}/citas?fecha=${encodeURIComponent(fechaFiltro)}`, { headers: authHeaders }),
        fetch(`${API_BASE}/pacientes`, { headers: authHeaders }),
        fetch(`${API_BASE}/medicos`, { headers: authHeaders }),
      ]);

      const cData = await cRes.json();
      const pData = await pRes.json();
      const mData = await mRes.json();
      if (!cRes.ok) throw new Error(cData?.message || "No se pudieron cargar las citas");
      if (!pRes.ok) throw new Error(pData?.message || "No se pudieron cargar los pacientes");
      if (!mRes.ok) throw new Error(mData?.message || "No se pudieron cargar los medicos");

      setCitas(Array.isArray(cData) ? cData : []);
      setPacientes(Array.isArray(pData) ? pData : []);
      setMedicos(Array.isArray(mData) ? mData : []);

      if (Array.isArray(mData) && mData.length && !formCita.id_usuario) {
        setFormCita((prev) => ({ ...prev, id_usuario: String(mData[0].id_usuario) }));
      }
    } catch (e) {
      setError(e.message || "Error cargando datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasAccess) return;
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, fechaFiltro, hasAccess]);

  const citasPendientes = citas.filter((c) => String(c?.estado || "").toLowerCase() !== "pagada");

  const seleccionarCita = (c) => {
    setSelectedCita(c);
    setMensaje("");
    setError("");
    setTicketData(null);
    setFormPago((prev) => ({ ...prev, fecha_pago: c?.fecha || todayLocal() }));
  };

  const crearCitaRapida = async () => {
    if (!formCita.id_paciente) {
      setError("Selecciona un paciente");
      return;
    }
    if (!formCita.id_usuario) {
      setError("Selecciona un medico");
      return;
    }
    if (!formCita.fecha || !formCita.hora) {
      setError("Fecha y hora son obligatorias");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const payload = {
        id_paciente: Number(formCita.id_paciente),
        id_usuario: Number(formCita.id_usuario),
        fecha: formCita.fecha,
        hora: formCita.hora,
        estado: "Programada",
      };
      const res = await fetch(`${API_BASE}/citas`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudo crear la cita");

      setModalNuevaCita(false);
      setMensaje("Cita creada. Ahora puedes facturarla.");
      setSelectedCita(data);
      setFormPago((prev) => ({ ...prev, fecha_pago: data?.fecha || todayLocal() }));
      await cargar();
    } catch (e) {
      setError(e.message || "Error creando cita");
    } finally {
      setLoading(false);
    }
  };

  const facturar = async () => {
    if (!selectedCita?.id_cita || !selectedCita?.id_paciente) {
      setError("Selecciona una cita para facturar");
      return;
    }
    if (!formPago.monto || Number(formPago.monto) <= 0) {
      setError("Ingresa un monto valido");
      return;
    }

    setLoading(true);
    setError("");
    setMensaje("");
    setTicketData(null);

    try {
      const payload = {
        id_paciente: Number(selectedCita.id_paciente),
        id_cita: Number(selectedCita.id_cita),
        monto: Number(formPago.monto),
        metodo_pago: formPago.metodo_pago,
        fecha_pago: formPago.fecha_pago || todayLocal(),
        ...(formPago.notas.trim() ? { notas: formPago.notas.trim() } : {}),
      };

      const res = await fetch(`${API_BASE}/pagos/facturar`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudo facturar");

      const pacienteNombre = `${data?.paciente?.nombre || selectedCita?.paciente_nombre || ""} ${
        data?.paciente?.apellido || selectedCita?.paciente_apellido || ""
      }`.trim();

      const ticket = {
        id_factura: data?.id_factura,
        monto: data?.monto,
        metodo_pago: data?.metodo_pago,
        fecha_pago: data?.fecha_pago,
        paciente_nombre: pacienteNombre || "-",
        paciente_dni: data?.paciente?.dni || selectedCita?.paciente_dni || "-",
        medico_usuario: data?.cita?.medico_usuario || selectedCita?.medico_usuario || "-",
        cita_fecha: data?.cita?.fecha || selectedCita?.fecha || "-",
        cita_hora: data?.cita?.hora ? String(data.cita.hora).slice(0, 5) : selectedCita?.hora ? String(selectedCita.hora).slice(0, 5) : "-",
      };

      setTicketData(ticket);
      setMensaje("Pago registrado y factura generada.");
      setFormPago((prev) => ({ ...prev, monto: "", notas: "" }));
      await cargar();
    } catch (e) {
      setError(e.message || "Error facturando");
    } finally {
      setLoading(false);
    }
  };

  const imprimirTicket = () => {
    if (!ticketData) return;
    const w = window.open("", "_blank", "width=420,height=700");
    if (!w) {
      setError("El navegador bloqueo la ventana emergente. Habilita popups para imprimir.");
      return;
    }
    w.document.open();
    w.document.write(buildTicketHtml(ticketData));
    w.document.close();
  };

  if (!hasAccess) {
    return <div className="content">No tienes permisos para acceder a esta seccion.</div>;
  }

  return (
    <div className="content">
      <h2 className="dashboard-title">Pagos</h2>

      <div className="card" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <label style={{ margin: 0, fontWeight: 700 }}>Fecha</label>
          <input type="date" value={fechaFiltro} onChange={(e) => setFechaFiltro(e.target.value)} disabled={loading} />
        </div>
        <button onClick={() => setModalNuevaCita(true)} style={{ marginTop: 0 }} disabled={loading}>
          Cita nueva
        </button>
        <button onClick={() => navigate("/dashboard")} style={{ marginTop: 0 }} disabled={loading}>
          Volver
        </button>
      </div>

      {error && (
        <div className="alert-error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}
      {mensaje && (
        <div className="alert-success" style={{ marginBottom: 12 }}>
          {mensaje}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Citas ({fechaFiltro})</h3>
          {loading && <p style={{ margin: "10px 0" }}>Cargando...</p>}

          <table>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Paciente</th>
                <th>Doctor</th>
                <th>Estado</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {citasPendientes.map((c) => (
                <tr key={c.id_cita}>
                  <td>{c.hora ? String(c.hora).slice(0, 5) : "-"}</td>
                  <td>{`${c.paciente_nombre || ""} ${c.paciente_apellido || ""}`.trim() || "-"}</td>
                  <td>{c.medico_usuario || "-"}</td>
                  <td>{c.estado || "-"}</td>
                  <td>
                    <button style={{ marginTop: 0 }} onClick={() => seleccionarCita(c)} disabled={loading}>
                      {Number(selectedCita?.id_cita) === Number(c.id_cita) ? "Seleccionada" : "Seleccionar"}
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && citasPendientes.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 14, textAlign: "center" }}>
                    No hay citas pendientes para este dia
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Facturar</h3>
          {selectedCita ? (
            <>
              <p style={{ marginTop: 6, color: "#666" }}>
                Cita: <strong>#{selectedCita.id_cita}</strong> |{" "}
                <strong>{`${selectedCita.paciente_nombre || ""} ${selectedCita.paciente_apellido || ""}`.trim()}</strong>
              </p>
              <p style={{ marginTop: 0, color: "#666" }}>
                Doctor: <strong>{selectedCita.medico_usuario || "-"}</strong>
              </p>
            </>
          ) : (
            <p style={{ marginTop: 6, color: "#666" }}>Selecciona una cita para registrar el pago.</p>
          )}

          <label>Monto</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formPago.monto}
            onChange={(e) => setFormPago((prev) => ({ ...prev, monto: e.target.value }))}
            disabled={loading}
            placeholder="Ej: 500"
          />

          <label>Metodo de pago</label>
          <select
            value={formPago.metodo_pago}
            onChange={(e) => setFormPago((prev) => ({ ...prev, metodo_pago: e.target.value }))}
            disabled={loading}
          >
            <option value="Efectivo">Efectivo</option>
            <option value="Tarjeta">Tarjeta</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Otro">Otro</option>
          </select>

          <label>Fecha de pago</label>
          <input
            type="date"
            value={formPago.fecha_pago}
            onChange={(e) => setFormPago((prev) => ({ ...prev, fecha_pago: e.target.value }))}
            disabled={loading}
          />

          <label>Notas (opcional)</label>
          <textarea
            rows="2"
            value={formPago.notas}
            onChange={(e) => setFormPago((prev) => ({ ...prev, notas: e.target.value }))}
            disabled={loading}
            placeholder="Ej: anticipo, promocion, observaciones..."
          />

          <button className="btn-save" onClick={facturar} disabled={loading || !selectedCita}>
            {loading ? "Procesando..." : "Facturar"}
          </button>

          {ticketData && (
            <button onClick={imprimirTicket} style={{ marginTop: 10, background: "#2c3e50" }} disabled={loading}>
              Imprimir ticket
            </button>
          )}
        </div>
      </div>

      {modalNuevaCita && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Nueva cita (rapida)</h3>

            <label>Paciente</label>
            <select
              value={formCita.id_paciente}
              onChange={(e) => setFormCita((prev) => ({ ...prev, id_paciente: e.target.value }))}
              disabled={loading}
            >
              <option value="">Selecciona...</option>
              {pacientes.map((p) => (
                <option key={p.id_paciente} value={p.id_paciente}>
                  {`${p.nombre || ""} ${p.apellido || ""}`.trim() || `Paciente #${p.id_paciente}`}
                </option>
              ))}
            </select>

            <label>Doctor</label>
            <select
              value={formCita.id_usuario}
              onChange={(e) => setFormCita((prev) => ({ ...prev, id_usuario: e.target.value }))}
              disabled={loading}
            >
              <option value="">Selecciona...</option>
              {medicos.map((m) => (
                <option key={m.id_usuario} value={m.id_usuario}>
                  {m.username || `Medico #${m.id_usuario}`}
                </option>
              ))}
            </select>

            <label>Fecha</label>
            <input
              type="date"
              value={formCita.fecha}
              onChange={(e) => setFormCita((prev) => ({ ...prev, fecha: e.target.value }))}
              disabled={loading}
            />

            <label>Hora</label>
            <input
              type="time"
              value={formCita.hora}
              onChange={(e) => setFormCita((prev) => ({ ...prev, hora: e.target.value }))}
              disabled={loading}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button onClick={crearCitaRapida} disabled={loading}>
                Crear cita
              </button>
              <button
                onClick={() => setModalNuevaCita(false)}
                style={{ background: "#d93025" }}
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
