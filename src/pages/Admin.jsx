import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_BASE = "http://localhost:5000/api";

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [seccion, setSeccion] = useState("respaldos");
  const [procesandoRespaldo, setProcesandoRespaldo] = useState(false);
  const [backupInfo, setBackupInfo] = useState(null);
  const [backupError, setBackupError] = useState("");

  // Solo el admin puede ver esta pantalla
  if (user?.role !== "Admin") {
    return <div className="content">No tienes permisos para acceder a esta seccion.</div>;
  }

  const token = user?.token || localStorage.getItem("token");
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const ejecutarRespaldo = async () => {
    if (!token) return;
    setProcesandoRespaldo(true);
    setBackupError("");
    setBackupInfo(null);

    try {
      const res = await fetch(`${API_BASE}/admin/backup`, { headers: authHeaders });
      if (!res.ok) {
        let msg = "No se pudo generar el respaldo";
        try {
          const data = await res.json();
          msg = data?.message || msg;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      const fileName = res.headers.get("X-Backup-Filename") || "backup.zip";
      const serverPath = res.headers.get("X-Backup-Server-Path") || "(no disponible)";
      const blob = await res.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setBackupInfo({
        fileName,
        serverPath,
        createdAt: new Date().toLocaleString(),
        clientHint: "Se descargara en la carpeta de descargas configurada en tu navegador.",
      });
    } catch (e) {
      setBackupError(e.message || "Error generando respaldo");
    } finally {
      setProcesandoRespaldo(false);
    }
  };

  return (
    <div className="content">
      <h2 className="dashboard-title">Panel de Administracion</h2>

      <div className="admin-grid" style={{ marginBottom: 30 }}>
        <button
          className="admin-card"
          style={{ border: "none", background: "white", cursor: "pointer", padding: 0 }}
          onClick={() => navigate("/usuarios-admin")}
        >
          <div style={{ fontSize: 30 }}>Usuarios</div>
          <h3 style={{ color: "#2c3e50" }}>Usuarios</h3>
        </button>

        <div
          className={`admin-card ${seccion === "respaldos" ? "active-card" : ""}`}
          onClick={() => setSeccion("respaldos")}
        >
          <div style={{ fontSize: 30 }}>Respaldos</div>
        
        </div>

        <button
          className="admin-card"
          style={{ border: "none", background: "white", cursor: "pointer", padding: 0 }}
          onClick={() => navigate("/expedientes-admin")}
        >
          <div style={{ fontSize: 30 }}>Expedientes</div>
          <h3 style={{ color: "#2c3e50" }}>Expedientes</h3>
        </button>
      </div>

      <div className="card">
        {seccion === "respaldos" && (
          <div style={{ textAlign: "center", padding: 20 }}>
            <h3>Copias de Seguridad</h3>
            <p style={{ margin: "15px 0", color: "#7f8c8d" }}>
              Genera un archivo .zip con el respaldo completo de la base de datos.
            </p>
            {backupError && (
              <div className="alert-error" style={{ marginBottom: 12, textAlign: "left" }}>
                {backupError}
              </div>
            )}
            {backupInfo && (
              <div className="alert-success" style={{ marginBottom: 12, textAlign: "left" }}>
                <div><strong>Archivo:</strong> {backupInfo.fileName}</div>
                <div><strong>Servidor:</strong> {backupInfo.serverPath}</div>
                <div><strong>Hora:</strong> {backupInfo.createdAt}</div>
                <div style={{ marginTop: 6 }}>{backupInfo.clientHint}</div>
              </div>
            )}
            <button style={{ background: "#2c3e50" }} onClick={ejecutarRespaldo} disabled={procesandoRespaldo}>
              {procesandoRespaldo ? "Generando..." : "Generar Respaldo Ahora"}
            </button>
          </div>
        )}
      </div>

      {procesandoRespaldo && (
        <div className="modal-overlay">
          <div className="modal" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>...</div>
            <h3>Generando Respaldo...</h3>
            <p>Estamos protegiendo la base de datos.</p>
            <div
              style={{
                width: "100%",
                background: "#eee",
                height: 10,
                borderRadius: 5,
                marginTop: 15,
                overflow: "hidden",
              }}
            >
              <div style={{ width: "70%", background: "#2c7be5", height: "100%" }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
