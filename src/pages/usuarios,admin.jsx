import { useState } from "react";
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

export default function UsuariosAdmin() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalUsuario, setModalUsuario] = useState(false);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState(null);
  const [nuevoUsuario, setNuevoUsuario] = useState({ nombre: "", correo: "", role: "Medico" });
  const [nuevoPassword, setNuevoPassword] = useState("");
  const [usuarioAEditar, setUsuarioAEditar] = useState(null);
  const [formEditar, setFormEditar] = useState({ nombre: "", correo: "", role: "Medico" });

  // Solo el admin puede ver esta pantalla
  if (user?.role !== "Admin") {
    return <div>No tienes permisos para acceder a esta sección.</div>;
  }

  // Obtener token del usuario
  const token = user?.token || localStorage.getItem('token');

  // Cargar usuarios desde backend
  useEffect(() => {
    fetch('http://localhost:5000/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setUsuarios(data);
        setLoading(false);
      });
  }, [modalUsuario, usuarioAEliminar, usuarioAEditar]);
  const handleCrearUsuario = () => {
    if (!nuevoUsuario.nombre || !nuevoUsuario.correo || !nuevoPassword) return alert("Completa los datos");
    fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        usuario: nuevoUsuario.nombre,
        email: nuevoUsuario.correo,
        password: nuevoPassword,
        role: nuevoUsuario.role
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.message === 'Usuario registrado exitosamente') {
          setModalUsuario(false);
          setNuevoUsuario({ nombre: "", correo: "", role: "Medico" });
          setNuevoPassword("");
        } else {
          alert(data.message || 'Error al registrar usuario');
        }
      });
  };

  const confirmarEliminacion = () => {
    fetch(`http://localhost:5000/api/users/${usuarioAEliminar.id_usuario}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.message === 'Usuario eliminado correctamente') {
          setUsuarioAEliminar(null);
        } else {
          alert(data.message || 'Error al eliminar usuario');
        }
      });
  };

  const toggleEstado = (id) => {
    setUsuarios(usuarios.map(u => u.id === id ? { ...u, activo: !u.activo } : u));
  };

  return (
    <div className="content">
      <h2>Gestión de Usuarios (Solo Admin)</h2>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <button onClick={() => setModalUsuario(true)} style={{ background: '#2c7be5', color: 'white', padding: '8px 18px', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>+ Crear Nuevo Usuario</button>
        <button onClick={() => window.history.back()} style={{ background: '#7f8c8d', color: 'white', padding: '8px 18px', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer', marginLeft: '10px' }}>Volver</button>
      </div>
      {loading ? <div>Cargando usuarios...</div> : (
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id_usuario}>
                  <td><strong>{u.username}</strong></td>
                  <td>{u.email}</td>
                  <td>{u.nombre_role === 'Medico' ? 'Médico' : u.nombre_role}</td>
                  <td>
                    <button
                      onClick={() => {
                        setUsuarioAEditar(u);
                        setFormEditar({
                          nombre: u.username,
                          correo: u.email,
                          role: u.nombre_role === 'Medico' ? 'Medico' : u.nombre_role
                        });
                      }}
                      style={{ background: '#2c7be5', marginRight: '8px', marginTop: 0 }}
                    >
                      Editar
                    </button>
                    <button onClick={() => setUsuarioAEliminar(u)} style={{ background: '#d93025', marginTop: 0 }}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Modal para crear usuario */}
      {modalUsuario && (
        <div className="modal">
          <div className="modal-content">
            <h3>Nuevo Usuario</h3>
            <input type="text" placeholder="Nombre" value={nuevoUsuario.nombre} onChange={e => setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })} />
            <input type="email" placeholder="Correo" value={nuevoUsuario.correo} onChange={e => setNuevoUsuario({ ...nuevoUsuario, correo: e.target.value })} />
            <input type="password" placeholder="Contraseña" value={nuevoPassword} onChange={e => setNuevoPassword(e.target.value)} />
            <select value={nuevoUsuario.role} onChange={e => setNuevoUsuario({ ...nuevoUsuario, role: e.target.value })}>
              <option value="Medico">Médico</option>
              <option value="Secretaria">Secretaria</option>
              <option value="Admin">Admin</option>
            </select>
            <button onClick={handleCrearUsuario}>Crear</button>
            <button onClick={() => setModalUsuario(false)}>Cancelar</button>
          </div>
        </div>
      )}
      {/* Modal para eliminar usuario */}
      {usuarioAEliminar && (
        <div className="modal">
          <div className="modal-content">
            <h3>¿Eliminar usuario?</h3>
            <p>{usuarioAEliminar.username} ({usuarioAEliminar.email})</p>
            <button onClick={confirmarEliminacion}>Eliminar</button>
            <button onClick={() => setUsuarioAEliminar(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {usuarioAEditar && (
        <div className="modal">
          <div className="modal-content">
            <h3>Editar Usuario</h3>
            <input
              type="text"
              placeholder="Nombre"
              value={formEditar.nombre}
              onChange={e => setFormEditar({ ...formEditar, nombre: e.target.value })}
            />
            <input
              type="email"
              placeholder="Correo"
              value={formEditar.correo}
              onChange={e => setFormEditar({ ...formEditar, correo: e.target.value })}
            />
            <select value={formEditar.role} onChange={e => setFormEditar({ ...formEditar, role: e.target.value })}>
              <option value="Medico">Médico</option>
              <option value="Secretaria">Secretaria</option>
              <option value="Admin">Admin</option>
            </select>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                onClick={() => {
                  if (!formEditar.nombre || !formEditar.correo) {
                    alert('Completa nombre y correo');
                    return;
                  }
                  fetch(`http://localhost:5000/api/users/${usuarioAEditar.id_usuario}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                      usuario: formEditar.nombre,
                      email: formEditar.correo,
                      role: formEditar.role
                    })
                  })
                    .then(res => res.json())
                    .then(data => {
                      if (data.message === 'Usuario actualizado correctamente') {
                        setUsuarioAEditar(null);
                      } else {
                        alert(data.message || 'Error al actualizar usuario');
                      }
                    });
                }}
              >
                Guardar
              </button>
              <button onClick={() => setUsuarioAEditar(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
