export default function Expediente() {
  return (
    <>
      <h2>Juan Pérez</h2>

      <div className="expediente-info">
        <p><span>Edad:</span> 30 años</p>
        <p><span>Género:</span> Masculino</p>
        <p><span>DNI:</span> 48333425</p>
      </div>

      <label>Diagnóstico</label>
      <input type="text" />

      <label>Observaciones</label>
      <textarea rows="4"></textarea>

      <button>Guardar</button>

      <div className="alert-success">
        Expediente actualizado exitosamente
      </div>
    </>
  )
}
