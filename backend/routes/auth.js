const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const SECRET_KEY = 'tu_clave_secreta_jwt'; // Cambia esto en producción
const USERS_FILE = path.join(__dirname, '..', 'users.json');

// Función para leer usuarios del archivo
const readUsers = () => {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
};

// Función para escribir usuarios al archivo
const writeUsers = (users) => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

// Registro
router.post('/register', (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }
  const users = readUsers();
  if (users.find(user => user.username === username || user.email === email)) {
    return res.status(400).json({ error: 'Usuario o email ya existe' });
  }
  const newUser = { id: Date.now(), username, password, email, role: 'user' }; // Sin hash por simplicidad temporal
  users.push(newUser);
  writeUsers(users);
  res.status(201).json({ message: 'Usuario registrado exitosamente' });
});

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const users = readUsers();
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

// Middleware para verificar JWT
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(403).json({ error: 'Token requerido' });
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = decoded;
    next();
  });
};

// Ruta protegida para dashboard (ejemplo)
router.get('/dashboard', verifyToken, (req, res) => {
  res.json({ message: `Bienvenido al dashboard, ${req.user.username}` });
});

// Nueva ruta para obtener perfil del usuario
router.get('/profile', verifyToken, (req, res) => {
  const users = readUsers();
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ username: user.username, email: user.email, role: user.role });
});

module.exports = router;