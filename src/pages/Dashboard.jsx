export default function Dashboard() {
  return (
    <div>
      <h2>Bienvenido, Doctor</h2>

      <section>
        <h3>Citas del Día</h3>

        <table border="1" width="100%">
          <thead>
            <tr>
              <th>Hora</th>
              <th>Paciente</th>
              <th>Médico</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>10:00</td>
              <td>Juan Pérez</td>
              <td>Dr. Pérez</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  )
}
