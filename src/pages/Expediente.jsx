export default function Expediente() {
  return (
    <div>
      <h2>Expediente del Paciente</h2>

      <p>Nombre: Juan Pérez</p>
      <p>Edad: 30</p>

      <label>Diagnóstico</label>
      <br />
      <textarea rows="4"></textarea>

      <br /><br />

      <label>Observaciones</label>
      <br />
      <textarea rows="4"></textarea>

      <br /><br />

      <button>Guardar</button>
    </div>
  )
}
