import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login, user } = useAuth();

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => { if (user) { if (user.role === 'Admin') navigate('/admin'); 
    else navigate('/dashboard'); } }, [user, navigate]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!usuario.trim() || !password.trim()) {
      setError("Debe ingresar usuario y contraseña");
      return;
    }
    setError("");
    setLoading(true);
    fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, password })
    })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          login({ ...data.user, token: data.token });
        } else {
          setError(data.message || 'Usuario o contraseña incorrectos');
          setLoading(false);
        }
      })
      .catch(() => {
        setError('Error de conexión');
        setLoading(false);
      });
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h2>ClínicaMed - Acceso</h2>
        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Usuario (Ejemplo: admin)"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
          />

          <div className="password-container">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </span>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Ingresando..." : "Iniciar Sesión"}
          </button>
        </form>
        {error && <div className="alert-error">{error}</div>}
      </div>
    </div>
  );
}