import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {

  const navigate = useNavigate();

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    if (!usuario || !password) {
      setError("Debe ingresar usuario y contraseña");
      return;
    }

    // Simulación de usuario registrado
    if (usuario === "admin" && password === "1234") {
      setError("");
      navigate("/dashboard");
    } else {
      setError("Usuario o contraseña incorrectos");
    }
  };

  return (
    <div className="login-wrapper">

      <div className="login-card">
        <h2>Inicio de Sesión</h2>

        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Usuario"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit">Iniciar Sesión</button>
        </form>

        {error && <div className="alert-error">{error}</div>}

        <p className="register-text">
        ¿No estás registrado?{" "}
        <span onClick={() => navigate("/register")}>
           Regístrate aquí
         </span>
        </p>


      </div>
    </div>
  );
}
