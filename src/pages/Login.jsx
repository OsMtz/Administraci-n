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

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleLogin = (e) => {
    e.preventDefault();

    if (!usuario.trim() || !password.trim()) {
      setError("Debe ingresar usuario y contraseña");
      return;
    }

    setError("");
    setLoading(true);

    // --- SIMULACIÓN DE BACKEND CON ROLES ---
    setTimeout(() => {
      let userData = null;

      // Definimos credenciales de prueba para cada rol
      if (usuario === "admin" && password === "1234") {
        userData = { nombre: "Administrador Global", rol: "Admin", token: "fake_jwt_admin" };
      } 
      else if (usuario === "doctor" && password === "1234") {
        userData = { nombre: "Dr. López", rol: "Médico", token: "fake_jwt_doctor" };
      } 
      else if (usuario === "secretaria" && password === "1234") {
        userData = { nombre: "Ana (Recepción)", rol: "Recepcionista", token: "fake_jwt_recep" };
      }

      if (userData) {
        // IMPORTANTE: Ahora pasamos un objeto al login, no solo un string
        // Asegúrate de que tu AuthContext acepte este objeto y lo guarde en el estado 'user'
        login(userData); 
      } else {
        setError("Usuario o contraseña incorrectos (Pruebe: admin, doctor o secretaria)");
        setLoading(false);
      }
    }, 1200);
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h2>ClínicaMed - Acceso</h2>
        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Usuario (admin, doctor, secretaria)"
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

        <p className="register-text" style={{ fontSize: '12px', marginTop: '10px', color: '#7f8c8d' }}>
           Credenciales de prueba: <b>1234</b>
        </p>
      </div>
    </div>
  );
}