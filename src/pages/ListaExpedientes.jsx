import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ListaExpedientes() {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState("");

  // Tus datos (Cambié los primeros por M. y J. como habías pedido)
  const pacientes = [
    { id: "1", nombre: "M.", dni: "45666777", ultima: "2026-02-14" },
    { id: "2", nombre: "J.", dni: "12333444", ultima: "2026-02-20" },
    { id: "3", nombre: "Carlos López", dni: "12345678", ultima: "2026-02-18" },
    { id: "4", nombre: "Ana Martínez", dni: "98765432", ultima: "2026-02-15" },
  ];

  // Lógica de filtrado para que la búsqueda funcione de verdad
  const pacientesFiltrados = pacientes.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    p.dni.includes(busqueda)
  );

  return (
    <div className="content"> {/* <--- Cambiado para que respete el layout */}
      <h2 className="dashboard-title">Buscador de Expedientes</h2>
      
      <div className="card">
        <label>Buscar Paciente</label>
        <input 
          type="text" 
          placeholder="Escribe nombre o DNI..." 
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="table-container"> {/* <--- Usamos tu clase de tablas */}
        <h3>Resultados</h3>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>DNI</th>
              <th>Última Visita</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {pacientesFiltrados.map(p => (
              <tr key={p.id}>
                <td>{p.nombre}</td>
                <td>{p.dni}</td>
                <td>{p.ultima}</td>
                <td>
                  {/* style inline para quitar el margen superior que da tu CSS */}
                  <button 
                    style={{ marginTop: 0 }} 
                    onClick={() => navigate(`/expediente/${p.id}`)}
                  >
                    Abrir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}