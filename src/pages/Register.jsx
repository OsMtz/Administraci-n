import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [formData, setFormData] = useState({ username: '', password: '', email: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    if (users.find(user => user.username === formData.username || user.email === formData.email)) {
      setError('Usuario o email ya existe');
      return;
    }
    const newUser = { ...formData, id: Date.now(), role: 'user' };
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    alert('Registro exitoso. Ahora puedes iniciar sesión.');
    navigate('/');
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h2>Registro de Usuario</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="username"
            placeholder="Usuario"
            value={formData.username}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Correo electrónico"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Contraseña"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <button type="submit">Registrarse</button>
        </form>
        {error && <div className="alert-error">{error}</div>}
        <p className="register-text">
          ¿Ya tienes cuenta?{' '}
          <span onClick={() => navigate('/')}>Inicia sesión</span>
        </p>
      </div>
    </div>
  );
};

export default Register;
