import { useLocation, useNavigate, useParams } from 'react-router-dom';

export default function ExpedientesAlmacenados() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // ListaExpedientes manda el paciente por `state`.
  // Si recargas la pagina, ese state se pierde: intentamos recuperar un snapshot desde localStorage.
  let paciente = location.state?.paciente ?? null;
  if (!paciente && id) {
    try {
      const raw = localStorage.getItem(`expediente_paciente_${id}`);
      if (raw) paciente = JSON.parse(raw);
    } catch {
      // Sin fallback si falla el parse/storage.
    }
  }

  const goBack = () => navigate(-1);

  const Field = ({ label, value }) => (
    <p style={{ margin: '6px 0' }}>
      <strong>{label}:</strong> {value ?? '-'}
    </p>
  );

  if (!paciente) {
    return (
      <div className="content">
        <h2 className="dashboard-title">Expediente</h2>
        <div className="card">
          <p>No se encontro informacion del expediente para el ID: {id}</p>
          <button onClick={goBack} style={{ marginTop: 8 }}>Volver</button>
        </div>
      </div>
    );
  }

  const {
    id: pid,
    nombre,
    dni,
    ultima,
    email,
    telefono,
    direccion,
    fecha_nacimiento,
    sexo,
    antecedentes,
    alergias,
    notas,
  } = paciente;

  const idToUse = pid ?? id;
  const goToExpediente = () => navigate(`/expediente/${idToUse}`);

  return (
    <div className="content">
      <h2 className="dashboard-title">Expediente del Paciente</h2>

      <div className="card">
        <h3>Datos Generales</h3>
        <Field label="ID" value={pid} />
        <Field label="Nombre" value={nombre} />
        <Field label="DNI" value={dni} />
        <Field label="Ultima Visita" value={ultima} />
        {email !== undefined && <Field label="Email" value={email} />}
        {telefono !== undefined && <Field label="Telefono" value={telefono} />}
        {direccion !== undefined && <Field label="Direccion" value={direccion} />}
        {fecha_nacimiento !== undefined && <Field label="Fecha de Nacimiento" value={fecha_nacimiento} />}
        {sexo !== undefined && <Field label="Sexo" value={sexo} />}
      </div>

      {(antecedentes !== undefined || alergias !== undefined || notas !== undefined) && (
        <div className="card">
          <h3>Informacion Clinica</h3>
          {antecedentes !== undefined && (
            <div style={{ margin: '6px 0' }}>
              <strong>Antecedentes:</strong>
              <div>{antecedentes || '-'}</div>
            </div>
          )}
          {alergias !== undefined && (
            <div style={{ margin: '6px 0' }}>
              <strong>Alergias:</strong>
              <div>{alergias || '-'}</div>
            </div>
          )}
          {notas !== undefined && (
            <div style={{ margin: '6px 0' }}>
              <strong>Notas:</strong>
              <div>{notas || '-'}</div>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '1rem' }}>
        <button onClick={goToExpediente} style={{ marginTop: 0, marginRight: 10, background: '#2c3e50' }}>
          Ver / Actualizar Expediente
        </button>
        <button onClick={goBack}>Volver</button>
      </div>
    </div>
  );
}
