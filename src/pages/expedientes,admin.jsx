import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { buildTicketHtml } from "../utils/ticket";

const API_BASE = "http://localhost:5000/api";

const todayLocal = () => {
  try {
    return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

const downloadTextFile = (filename, contents, mime = "text/html;charset=utf-8") => {
  const blob = new Blob([contents], { type: mime });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

const ticketFromFacturaRow = (r) => {
  const pacienteNombre = `${r?.paciente_nombre || ""} ${r?.paciente_apellido || ""}`.trim();
  return {
    id_factura: r?.id_factura,
    monto: r?.pago_monto ?? r?.monto_total,
    metodo_pago: r?.metodo_pago || "-",
    fecha_pago: r?.fecha_pago || r?.fecha_emision || "-",
    paciente_nombre: pacienteNombre || "-",
    paciente_dni: r?.paciente_dni || "-",
    medico_usuario: r?.medico_usuario || "-",
    cita_fecha: r?.cita_fecha || "-",
    cita_hora: r?.cita_hora ? String(r.cita_hora).slice(0, 5) : "-",
    notas: r?.notas || "",
  };
};

export default function ExpedientesAdmin() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const hasAccess = user?.role === "Admin";

  const token = user?.token || localStorage.getItem("token");
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [seccion, setSeccion] = useState("expedientes"); // expedientes | facturas

  const [medicos, setMedicos] = useState([]);
  const [medicosLoading, setMedicosLoading] = useState(false);
  const [medicosError, setMedicosError] = useState("");

  const [selectedMedico, setSelectedMedico] = useState(null);
  const [pacientes, setPacientes] = useState([]);
  const [pacientesLoading, setPacientesLoading] = useState(false);
  const [pacientesError, setPacientesError] = useState("");

  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    if (!token || !hasAccess) return;
    Promise.resolve().then(() => {
      setMedicosLoading(true);
      setMedicosError("");
    });
    fetch(`${API_BASE}/admin/medicos`, { headers: authHeaders })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data?.message || "No se pudieron cargar los medicos");
        setMedicos(Array.isArray(data) ? data : []);
      })
      .catch((e) => setMedicosError(e.message || "Error cargando medicos"))
      .finally(() => setMedicosLoading(false));
  }, [token, authHeaders, hasAccess]);

  const [facturas, setFacturas] = useState([]);
  const [facturasLoading, setFacturasLoading] = useState(false);
  const [facturasError, setFacturasError] = useState("");
  const [facturasFrom, setFacturasFrom] = useState("");
  const [facturasTo, setFacturasTo] = useState(todayLocal());
  const [busquedaFactura, setBusquedaFactura] = useState("");

  useEffect(() => {
    if (!token || !hasAccess) return;
    if (seccion !== "facturas") return;

    Promise.resolve().then(() => {
      setFacturasLoading(true);
      setFacturasError("");
    });

    const params = new URLSearchParams();
    if (facturasFrom) params.set("from", facturasFrom);
    if (facturasTo) params.set("to", facturasTo);
    params.set("limit", "800");

    fetch(`${API_BASE}/admin/facturas?${params.toString()}`, { headers: authHeaders })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data?.message || "No se pudieron cargar las facturas");
        setFacturas(Array.isArray(data) ? data : []);
      })
      .catch((e) => setFacturasError(e.message || "Error cargando facturas"))
      .finally(() => setFacturasLoading(false));
  }, [token, authHeaders, hasAccess, seccion, facturasFrom, facturasTo]);

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

  const facturasFiltradas = facturas.filter((r) => {
    const q = busquedaFactura.trim().toLowerCase();
    if (!q) return true;
    const paciente = `${r?.paciente_nombre || ""} ${r?.paciente_apellido || ""}`.toLowerCase();
    return (
      String(r?.id_factura || "").includes(q) ||
      paciente.includes(q) ||
      String(r?.paciente_dni || "").toLowerCase().includes(q) ||
      String(r?.metodo_pago || "").toLowerCase().includes(q)
    );
  });

  const imprimirFactura = (row) => {
    const ticket = ticketFromFacturaRow(row);
    const w = window.open("", "_blank", "width=420,height=700");
    if (!w) {
      setFacturasError("El navegador bloqueo la ventana emergente. Habilita popups para imprimir.");
      return;
    }
    w.document.open();
    w.document.write(buildTicketHtml(ticket, { autoPrint: true }));
    w.document.close();
  };

  const guardarFactura = (row) => {
    const ticket = ticketFromFacturaRow(row);
    const html = buildTicketHtml(ticket, { autoPrint: false });
    const fileName = `factura_${ticket?.id_factura || "sin_id"}.html`;
    downloadTextFile(fileName, html);
  };

  if (!hasAccess) {
    return <div className="content">No tienes permisos para acceder a esta seccion.</div>;
  }

  return (
    <div className="content">
      <h2 className="dashboard-title">Expedientes (Admin)</h2>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => setSeccion("expedientes")}
            style={{ marginTop: 0, background: seccion === "expedientes" ? "#2c3e50" : "#7f8c8d" }}
            disabled={medicosLoading || pacientesLoading || facturasLoading}
          >
            Expedientes
          </button>
          <button
            onClick={() => setSeccion("facturas")}
            style={{ marginTop: 0, background: seccion === "facturas" ? "#2c3e50" : "#7f8c8d" }}
            disabled={medicosLoading || pacientesLoading || facturasLoading}
          >
            Facturas
          </button>
        </div>
        <button
          onClick={() => window.history.back()}
          style={{ background: "#7f8c8d", marginTop: 0 }}
          disabled={medicosLoading || pacientesLoading}
        >
          Volver
        </button>
      </div>

      {seccion === "expedientes" && (
        <>
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
                    <th>Acciones</th>
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
                      <td>
                        <button
                          style={{ marginTop: 0 }}
                          onClick={() => navigate(`/expediente/${p.id_paciente}`)}
                          disabled={pacientesLoading}
                        >
                          Ver expediente
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!pacientesLoading && pacientesFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={10} style={{ padding: 14, textAlign: "center" }}>
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
        </>
      )}

      {seccion === "facturas" && (
        <div className="card">
          <h3>Facturas</h3>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <label style={{ margin: 0, fontWeight: 700 }}>Desde</label>
              <input type="date" value={facturasFrom} onChange={(e) => setFacturasFrom(e.target.value)} disabled={facturasLoading} />
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <label style={{ margin: 0, fontWeight: 700 }}>Hasta</label>
              <input type="date" value={facturasTo} onChange={(e) => setFacturasTo(e.target.value)} disabled={facturasLoading} />
            </div>
            <input
              type="text"
              placeholder="Buscar por #factura, paciente, DNI o metodo..."
              value={busquedaFactura}
              onChange={(e) => setBusquedaFactura(e.target.value)}
              style={{ flexGrow: 1, minWidth: 220 }}
              disabled={facturasLoading}
            />
          </div>

          {facturasError && <div className="alert-error" style={{ marginBottom: 12, marginTop: 12 }}>{facturasError}</div>}
          {facturasLoading && <p style={{ margin: "10px 0" }}>Cargando...</p>}

          <div className="table-container" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Factura</th>
                  <th>Fecha</th>
                  <th>Paciente</th>
                  <th>DNI</th>
                  <th>Monto</th>
                  <th>Metodo</th>
                  <th>Pago</th>
                  <th>Notas</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {facturasFiltradas.map((r, idx) => (
                  <tr key={`${r.id_factura}-${r.id_pago || "x"}-${idx}`}>
                    <td>#{r.id_factura}</td>
                    <td>{r.fecha_emision || "-"}</td>
                    <td>{`${r.paciente_nombre || ""} ${r.paciente_apellido || ""}`.trim() || "-"}</td>
                    <td>{r.paciente_dni || "-"}</td>
                    <td>{r.monto_total ?? "-"}</td>
                    <td>{r.metodo_pago || "-"}</td>
                    <td>{r.pago_monto ?? "-"}</td>
                    <td>{r.notas || "-"}</td>
                    <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button style={{ marginTop: 0 }} onClick={() => imprimirFactura(r)} disabled={facturasLoading}>
                        Imprimir
                      </button>
                      <button style={{ marginTop: 0, background: "#2c3e50" }} onClick={() => guardarFactura(r)} disabled={facturasLoading}>
                        Guardar
                      </button>
                      {r.id_paciente && (
                        <button
                          style={{ marginTop: 0, background: "#7f8c8d" }}
                          onClick={() => navigate(`/expediente/${r.id_paciente}`)}
                          disabled={facturasLoading}
                        >
                          Ver paciente
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!facturasLoading && facturasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: 14, textAlign: "center" }}>
                      Sin facturas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
