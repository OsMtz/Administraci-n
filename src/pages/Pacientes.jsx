export default function Pacientes() {
  return (
    <>
      <h2>Gestión de Pacientes</h2>

      <div className="section-header">
        <input type="text" placeholder="Buscar paciente..." />
        <button>+ Agregar Paciente</button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>DNI</th>
              <th>Teléfono</th>
              <th>Expediente</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Juan Pérez</td>
              <td>48333425</td>
              <td>88333425</td>
              <td><button>Ver</button></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="alert-success">
        Paciente registrado exitosamente
      </div>
    </>
  )
}
