export default function Dashboard() {
  return (
    <>
      <h2 className="dashboard-title">
        Bienvenido, Dr. Juan Pérez
      </h2>

      <div className="card">

        <h3>Citas del Día</h3>

        <table>
          <thead>
            <tr>
              <th>Horario</th>
              <th>Paciente</th>
              <th>Doctor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>10:00 AM</td>
              <td>Juan Pérez</td>
              <td>Dr. Pérez</td>
            </tr>
            <tr>
              <td>11:00 AM</td>
              <td>María Gómez</td>
              <td>Dr. González</td>
            </tr>
            <tr>
              <td>1:00 PM</td>
              <td>Carlos Sánchez</td>
              <td>Dr. Martínez</td>
            </tr>
          </tbody>
        </table>

      </div>

      <div className="dashboard-grid">

        <div className="dashboard-box box-pacientes">
          Pacientes
        </div>

        <div className="dashboard-box box-citas">
          Citas
        </div>

        <div className="dashboard-box box-facturacion">
          Facturación
        </div>

      </div>
    </>
  );
}
