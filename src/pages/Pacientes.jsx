export default function Pacientes() {
  return (
    <div>
      <h2>Gestión de Pacientes</h2>

      <input type="text" placeholder="Buscar paciente" />
      <button>Agregar Paciente</button>

      <br /><br />

      <table border="1" width="100%">
        <tr>
          <th>Nombre</th>
          <th>DNI</th>
          <th>Teléfono</th>
          <th>Acción</th>
        </tr>
        <tr>
          <td>Juan Pérez</td>
          <td>12345678</td>
          <td>555-1234</td>
          <td><button>Ver</button></td>
        </tr>
      </table>
    </div>
  )
}
