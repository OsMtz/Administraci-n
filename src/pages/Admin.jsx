import { useState } from "react";

export default function Admin() {
  const [seccion, setSeccion] = useState("usuarios");

  // ESTADOS NUEVOS PARA RESPALDO Y CONFIG
  const [procesandoRespaldo, setProcesandoRespaldo] = useState(false);
  const [showConfirmConfig, setShowConfirmConfig] = useState(false);
  const [configData, setConfigData] = useState({
    clinica: "ClinicaMed",
    telefono: "+506 2233-4455",
    mantenimiento: false
  });

  // Función para simular la descarga/generación del respaldo
  const ejecutarRespaldo = () => {
    setProcesandoRespaldo(true);
    setTimeout(() => {
      setProcesandoRespaldo(false);
      alert("Copia de seguridad descargada correctamente en su equipo.");
    }, 3000); // Simula 3 segundos de proceso
  };

  // ESTADOS PARA MODALES DE USUARIO
  const [modalUsuario, setModalUsuario] = useState(false);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState(null);

  // ESTADO DE FORMULARIO NUEVO USUARIO
  const [nuevoUsuario, setNuevoUsuario] = useState({ nombre: "", correo: "", rol: "Médico" });

  const [usuarios, setUsuarios] = useState([
    { id: 1, nombre: "Dr. López", correo: "lopez@clinica.com", rol: "Médico", activo: true },
    { id: 2, nombre: "Dra. García", correo: "garcia@clinica.com", rol: "Médico", activo: false },
    { id: 3, nombre: "Admin Principal", correo: "admin@clinica.com", rol: "Admin", activo: true },
  ]);

  // LÓGICA DE USUARIOS
  const handleCrearUsuario = () => {
    if (!nuevoUsuario.nombre || !nuevoUsuario.correo) return alert("Completa los datos");
    const nuevo = { ...nuevoUsuario, id: Date.now(), activo: true };
    setUsuarios([...usuarios, nuevo]);
    setModalUsuario(false);
    setNuevoUsuario({ nombre: "", correo: "", rol: "Médico" });
  };

  const confirmarEliminacion = () => {
    setUsuarios(usuarios.filter(u => u.id !== usuarioAEliminar.id));
    setUsuarioAEliminar(null);
  };

  const toggleEstado = (id) => {
    setUsuarios(usuarios.map(u => u.id === id ? { ...u, activo: !u.activo } : u));
  };

  return (
    <div className="content">
      <h2 className="dashboard-title">Panel de Administración Profesional</h2>

      {/* GRID DE NAVEGACIÓN */}
      <div className="admin-grid" style={{ marginBottom: "30px" }}>
        <div className={`admin-card ${seccion === "usuarios" ? "active-card" : ""}`} onClick={() => setSeccion("usuarios")}>
          <div style={{ fontSize: "30px" }}>👥</div>
          <h3>Usuarios</h3>
        </div>
        <div className={`admin-card ${seccion === "respaldos" ? "active-card" : ""}`} onClick={() => setSeccion("respaldos")}>
          <div style={{ fontSize: "30px" }}>💾</div>
          <h3>Respaldos</h3>
        </div>
        <div className={`admin-card ${seccion === "config" ? "active-card" : ""}`} onClick={() => setSeccion("config")}>
          <div style={{ fontSize: "30px" }}>⚙️</div>
          <h3>Configuración</h3>
        </div>
      </div>

      {/* ÁREA PRINCIPAL */}
      <div className="card">
        {/* SECCIÓN USUARIOS */}
        {seccion === "usuarios" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
              <h3>Personal de la Clínica</h3>
              <button style={{ marginTop: 0 }} onClick={() => setModalUsuario(true)}>+ Crear Nuevo Médico</button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Nombre / Rol</th><th>Correo</th><th>Estado</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id} style={{ opacity: u.activo ? 1 : 0.5 }}>
                      <td><strong>{u.nombre}</strong><br/><small>{u.rol}</small></td>
                      <td>{u.correo}</td>
                      <td><span className={u.activo ? "status-confirmada" : "status-pendiente"}>{u.activo ? "Activo" : "Suspendido"}</span></td>
                      <td>
                        <button onClick={() => toggleEstado(u.id)} style={{ background: u.activo ? "#f39c12" : "#16a085", marginRight: "8px", marginTop: 0 }}>{u.activo ? "Suspender" : "Activar"}</button>
                        <button onClick={() => setUsuarioAEliminar(u)} style={{ background: "#d93025", marginTop: 0 }}>Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECCIÓN RESPALDOS (Integrado Punto 2) */}
        {seccion === "respaldos" && (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <h3>Copias de Seguridad</h3>
            <p style={{ margin: "15px 0", color: "#7f8c8d" }}>Genera un archivo comprimido con todos los expedientes de pacientes.</p>
            <div className="alert-success" style={{ marginBottom: "20px" }}>
              ✅ Último respaldo exitoso: Hace 2 horas.
            </div>
            <button 
              style={{ background: "#2c3e50" }} 
              onClick={ejecutarRespaldo}
              disabled={procesandoRespaldo}
            >
              {procesandoRespaldo ? "Generando..." : "Generar Respaldo Ahora"}
            </button>
          </div>
        )}

        {/* SECCIÓN CONFIGURACIÓN (Integrado Punto 3) */}
        {seccion === "config" && (
          <div>
            <h3 style={{ marginBottom: "20px" }}>Configuración del Sistema</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div className="info-box">
                <label>Nombre de la Clínica</label>
                <input type="text" value={configData.clinica} onChange={(e) => setConfigData({...configData, clinica: e.target.value})} />
                <label>Teléfono Oficial</label>
                <input type="text" value={configData.telefono} onChange={(e) => setConfigData({...configData, telefono: e.target.value})} />
              </div>
              <div className="info-box" style={{ borderLeftColor: "#e74c3c" }}>
                <label>Seguridad</label>
                <div style={{ marginTop: "10px" }}>
                  <input type="checkbox" style={{ width: "auto", marginRight: "10px" }} />
                  <span>Modo Mantenimiento</span>
                </div>
                <button 
                  className="btn-save" 
                  style={{ width: "100%", marginTop: "30px", background: "#2c3e50" }}
                  onClick={() => setShowConfirmConfig(true)}
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODALES ================= */}

      {/* CREAR USUARIO */}
      {modalUsuario && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Registrar Nuevo Médico</h3>
            <label>Nombre Completo</label>
            <input type="text" value={nuevoUsuario.nombre} onChange={(e) => setNuevoUsuario({...nuevoUsuario, nombre: e.target.value})} />
            <label>Correo Electrónico</label>
            <input type="email" value={nuevoUsuario.correo} onChange={(e) => setNuevoUsuario({...nuevoUsuario, correo: e.target.value})} />
            <label>Rol</label>
            <select style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccd6e0'}} value={nuevoUsuario.rol} onChange={(e) => setNuevoUsuario({...nuevoUsuario, rol: e.target.value})}>
              <option value="Médico">Médico</option>
              <option value="Admin">Administrador</option>
            </select>
            <div className="modal-buttons" style={{marginTop: '20px'}}>
              <button onClick={handleCrearUsuario}>Guardar</button>
              <button onClick={() => setModalUsuario(false)} style={{background: '#7f8c8d'}}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ELIMINAR USUARIO */}
      {usuarioAEliminar && (
        <div className="modal-overlay">
          <div className="modal" style={{textAlign: 'center'}}>
            <div style={{fontSize: '50px', color: '#d93025'}}>⚠️</div>
            <h3>¿Eliminar a {usuarioAEliminar.nombre}?</h3>
            <div className="modal-buttons" style={{marginTop: '20px'}}>
              <button onClick={confirmarEliminacion} style={{background: '#d93025'}}>Sí, Eliminar</button>
              <button onClick={() => setUsuarioAEliminar(null)} style={{background: '#7f8c8d'}}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* PROCESANDO RESPALDO (Punto 2) */}
      {procesandoRespaldo && (
        <div className="modal-overlay">
          <div className="modal" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>⏳</div>
            <h3>Generando Respaldo...</h3>
            <p>Estamos protegiendo la base de datos.</p>
            <div style={{ width: '100%', background: '#eee', height: '10px', borderRadius: '5px', marginTop: '15px', overflow: 'hidden' }}>
              <div style={{ width: '70%', background: '#2c7be5', height: '100%' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* ÉXITO CONFIGURACIÓN (Punto 3) */}
      {showConfirmConfig && (
        <div className="modal-overlay">
          <div className="modal" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '50px', color: '#16a085' }}>✅</div>
            <h3>¡Cambios Guardados!</h3>
            <p>La configuración de <strong>{configData.clinica}</strong> se actualizó.</p>
            <button onClick={() => setShowConfirmConfig(false)} style={{ marginTop: "20px", width: "100%" }}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}