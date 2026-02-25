const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'your-secret-key'; // En producción, usar variable de entorno

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Archivo para almacenar usuarios temporalmente
const usersFile = path.join(__dirname, 'users.json');

// Función para leer usuarios
const readUsers = () => {
  try {
    const data = fs.readFileSync(usersFile, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

// Función para escribir usuarios
const writeUsers = (users) => {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
};

// Inicializar archivo si no existe
if (!fs.existsSync(usersFile)) {
  writeUsers([]);
}

// Middleware para verificar JWT
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'Acceso denegado' });
  }
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ message: 'Token inválido' });
  }
};

// Rutas de autenticación
app.post('/api/auth/register', async (req, res) => {
  const { usuario, email, password } = req.body;

  if (!usuario || !email || !password) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  const users = readUsers();
  const existingUser = users.find(u => u.usuario === usuario || u.email === email);

  if (existingUser) {
    return res.status(400).json({ message: 'Usuario o email ya existe' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: Date.now().toString(),
    usuario,
    email,
    password: hashedPassword,
    role: 'user' // Por defecto, puede ser 'admin' o 'doctor' luego
  };

  users.push(newUser);
  writeUsers(users);

  res.status(201).json({ message: 'Usuario registrado exitosamente' });
});

app.post('/api/auth/login', async (req, res) => {
  const { usuario, password } = req.body;

  if (!usuario || !password) {
    return res.status(400).json({ message: 'Usuario y contraseña son obligatorios' });
  }

  const users = readUsers();
  const user = users.find(u => u.usuario === usuario);

  if (!user) {
    return res.status(400).json({ message: 'Usuario no encontrado' });
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(400).json({ message: 'Contraseña incorrecta' });
  }

  const token = jwt.sign({ id: user.id, usuario: user.usuario, role: user.role }, JWT_SECRET);
  res.json({ token, user: { id: user.id, usuario: user.usuario, email: user.email, role: user.role } });
});

// Ruta protegida para verificar token (ej. dashboard)
app.get('/api/auth/verify', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});