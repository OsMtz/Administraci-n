import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Register() {

  const navigate = useNavigate();

  const [usuario, setUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRegister = (e) => {
    e.preventDefault();

    if (!usuario || !email || !password || !confirmar) {
      setError("Todos los campos son obligatorios");
      setSuccess("");
      return;
    }

    if (password !== confirmar) {
      setError("Las contraseñas no coinciden");
      setSuccess("");
      return;
    }

    setError("");
    setSuccess("Registro exitoso");

    setTimeout(() => {
      navigate("/");
    }, 1500);
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">

        <h2>Registro de Usuario</h2>

        <form onSubmit={handleRegister}>

          <input
            type="text"
            placeholder="Usuario"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
          />

          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            type="password"
            placeholder="Confirmar contraseña"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
          />

          <button type="submit">Registrarse</button>

        </form>

        {error && <div className="alert-error">{error}</div>}
        {success && <div className="alert-success">{success}</div>}

        <p className="register-text">
          ¿Ya tienes cuenta?{" "}
          <span onClick={() => navigate("/")}>
            Inicia sesión
          </span>
        </p>

      </div>
    </div>
  );
}
