export default function Admin() {
  return (
    <>
      <h2>Administración del Sistema</h2>

      <div className="admin-grid">
        <div className="admin-card">Gestión de Usuarios</div>
        <div className="admin-card">Respaldos del Sistema</div>
        <div className="admin-card">Configuración</div>
      </div>

      <div className="alert-success">
        Respaldo generado exitosamente
      </div>
    </>
  )
}
