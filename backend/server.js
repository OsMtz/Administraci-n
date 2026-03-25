const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // En produccion usa variable de entorno

// Middleware global
app.use(
  cors({
    exposedHeaders: ['X-Backup-Server-Path', 'X-Backup-Filename']
  })
);
app.use(bodyParser.json());

// Promesa simple para usar async/await con mysql2 pool
const dbQuery = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

const dbGetConnection = () =>
  new Promise((resolve, reject) => {
    db.getConnection((err, conn) => {
      if (err) return reject(err);
      resolve(conn);
    });
  });

const connQuery = (conn, sql, params = []) =>
  new Promise((resolve, reject) => {
    conn.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

const connBegin = (conn) =>
  new Promise((resolve, reject) => conn.beginTransaction((err) => (err ? reject(err) : resolve())));
const connCommit = (conn) => new Promise((resolve, reject) => conn.commit((err) => (err ? reject(err) : resolve())));
const connRollback = (conn) =>
  new Promise((resolve) => conn.rollback(() => resolve())); // rollback no debe reventar el handler

// ======== AUTH HELPERS ========
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Acceso denegado' });
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified; // { id, usuario, role }
    next();
  } catch {
    res.status(400).json({ message: 'Token invalido' });
  }
};

// Uso: requireRole('Admin') o requireRole(['Medico','Admin'])
const requireRole = (allowed) => {
  const allowedArray = Array.isArray(allowed) ? allowed : [allowed];
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: 'Rol no presente en token' });
    }
    if (!allowedArray.includes(req.user.role)) {
      return res.status(403).json({ message: 'No tienes permisos para esta accion' });
    }
    next();
  };
};

// Debe coincidir con la tabla roles
const VALID_ROLES = ['Admin', 'Medico', 'Secretaria'];

// ======== ACCESS HELPERS ========
// Regla de negocio:
// - Medico solo puede ver/editar pacientes que el mismo creo (pacientes.id_medico_creador).
// - Secretaria puede ver (solo lectura) todo.
// - Admin puede ver (y administrar desde su apartado).
const assertPacienteOwnership = async (req, idPaciente) => {
  if (req.user?.role !== 'Medico') return;
  const rows = await dbQuery('SELECT id_medico_creador FROM pacientes WHERE id_paciente = ?', [idPaciente]);
  if (!rows.length) {
    const err = new Error('Paciente no encontrado');
    err.status = 404;
    throw err;
  }
  const ownerId = rows[0].id_medico_creador;
  if (!ownerId || Number(ownerId) !== Number(req.user.id)) {
    const err = new Error('No tienes permisos para acceder a este paciente');
    err.status = 403;
    throw err;
  }
};

// ======== BOOTSTRAP ========
const todayISO = () => {
  try {
    return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD (local)
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const waitForDb = async (retries = 25, delayMs = 1200) => {
  for (let i = 0; i < retries; i++) {
    try {
      await dbQuery('SELECT 1');
      return;
    } catch (e) {
      if (i === retries - 1) throw e;
      await sleep(delayMs);
    }
  }
};

const ensureDefaultAdmin = async () => {
  const DEFAULT_ADMIN_USERNAME = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
  const DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL || 'admin@clinica.com';
  const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || '123456';

  // Asegura que la DB este arriba (especialmente importante en Docker)
  await waitForDb();

  // Asegura que las tablas existan (en Docker, puede tardar mientras corren scripts init)
  let roleRows = [];
  for (let i = 0; i < 25; i++) {
    try {
      roleRows = await dbQuery('SELECT id_role FROM roles WHERE nombre_role = ? LIMIT 1', ['Admin']);
      break;
    } catch (e) {
      if (e && e.code === 'ER_NO_SUCH_TABLE') {
        await sleep(1200);
        continue;
      }
      throw e;
    }
  }

  // Asegura rol Admin
  if (!roleRows.length) {
    await dbQuery('INSERT INTO roles (nombre_role) VALUES (?)', ['Admin']);
    roleRows = await dbQuery('SELECT id_role FROM roles WHERE nombre_role = ? LIMIT 1', ['Admin']);
  }
  const adminRoleId = roleRows[0]?.id_role;
  if (!adminRoleId) throw new Error('No se pudo asegurar el rol Admin');

  // Si ya existe admin por username/email, no hacemos nada.
  const existing = await dbQuery('SELECT id_usuario FROM usuarios WHERE username = ? OR email = ? LIMIT 1', [
    DEFAULT_ADMIN_USERNAME,
    DEFAULT_ADMIN_EMAIL
  ]);
  if (existing.length) return;

  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
  await dbQuery('INSERT INTO usuarios (username, password, email, role_id) VALUES (?, ?, ?, ?)', [
    DEFAULT_ADMIN_USERNAME,
    hashedPassword,
    DEFAULT_ADMIN_EMAIL,
    adminRoleId
  ]);
  console.log(`Admin bootstrap: creado usuario '${DEFAULT_ADMIN_USERNAME}' (${DEFAULT_ADMIN_EMAIL})`);
};

// ======== AUTH ========
// Registro: solo Admin (el usuario admin principal se crea automaticamente al arrancar el servidor)
app.post('/api/auth/register', verifyToken, requireRole('Admin'), async (req, res) => {
  const { usuario, email, password, role } = req.body;
  if (!usuario || !email || !password || !role) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ message: 'Rol invalido. Use Admin, Medico o Secretaria' });
  }

  try {
    const exists = await dbQuery('SELECT * FROM usuarios WHERE username = ? OR email = ?', [usuario, email]);
    if (exists.length > 0) {
      return res.status(400).json({ message: 'Usuario o email ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const roleRows = await dbQuery('SELECT id_role FROM roles WHERE nombre_role = ?', [role]);
    if (!roleRows.length) return res.status(400).json({ message: 'Rol invalido' });

    await dbQuery('INSERT INTO usuarios (username, password, email, role_id) VALUES (?, ?, ?, ?)', [
      usuario,
      hashedPassword,
      email,
      roleRows[0].id_role
    ]);

    res.status(201).json({ message: 'Usuario registrado exitosamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error de base de datos' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { usuario, password } = req.body;
  if (!usuario || !password) {
    return res.status(400).json({ message: 'Usuario y contrasena son obligatorios' });
  }

  try {
    const results = await dbQuery(
      'SELECT u.*, r.nombre_role FROM usuarios u LEFT JOIN roles r ON u.role_id = r.id_role WHERE u.username = ?',
      [usuario]
    );
    if (!results.length) return res.status(400).json({ message: 'Usuario no encontrado' });

    const user = results[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: 'Contrasena incorrecta' });

    const roleName = user.nombre_role; // 'Admin' | 'Medico' | 'Secretaria'
    if (!VALID_ROLES.includes(roleName)) {
      return res.status(500).json({ message: 'Rol del usuario no coincide con la configuracion del sistema' });
    }

    const token = jwt.sign({ id: user.id_usuario, usuario: user.username, role: roleName }, JWT_SECRET);
    res.json({
      token,
      user: { id: user.id_usuario, usuario: user.username, email: user.email, role: roleName }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error de base de datos' });
  }
});

app.get('/api/auth/verify', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

// ======== USUARIOS (ADMIN) ========
app.get('/api/users', verifyToken, requireRole('Admin'), async (req, res) => {
  try {
    const rows = await dbQuery(
      'SELECT u.id_usuario, u.username, u.email, r.nombre_role FROM usuarios u LEFT JOIN roles r ON u.role_id = r.id_role WHERE u.email != ?',
      ['admin@clinica.com']
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error de base de datos' });
  }
});

// ======== BACKUP (ADMIN) ========
// Genera un respaldo .zip (mysqldump) y lo descarga al equipo del usuario.
// Configurable por variables de entorno:
// - DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
// - BACKUP_DIR (ruta donde se generan archivos en el servidor)
// - BACKUP_PERSIST=1 para conservar el .zip en BACKUP_DIR (por defecto se borra tras descargar)
app.get('/api/admin/backup', verifyToken, requireRole('Admin'), async (req, res) => {
  const DB_HOST = process.env.DB_HOST || 'localhost';
  const DB_USER = process.env.DB_USER || 'root';
  const DB_PASSWORD = process.env.DB_PASSWORD || 'root';
  const DB_NAME = process.env.DB_NAME || 'hospital_db';

  const persist = process.env.BACKUP_PERSIST === '1';
  const backupDir = process.env.BACKUP_DIR || path.join(__dirname, 'tmp', 'backups');

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const baseName = `backup_${DB_NAME}_${ts}`;
  const dumpPath = path.join(backupDir, `${baseName}.sql`);
  const zipPath = path.join(backupDir, `${baseName}.zip`);

  const ensureDir = async () => {
    await fs.promises.mkdir(backupDir, { recursive: true });
  };

  const run = (cmd, args, opts = {}) =>
    new Promise((resolve, reject) => {
      const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
      let stderr = '';
      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) return resolve();
        reject(new Error(`${cmd} exited with code ${code}: ${stderr.trim()}`));
      });
    });

  const safeUnlink = async (p) => {
    try {
      await fs.promises.unlink(p);
    } catch {
      // ignore
    }
  };

  try {
    await ensureDir();

    // 1) Dump completo de la base (incluye tablas no usadas aun: facturacion/pagos/etc)
    // Nota: mysqldump debe estar disponible en PATH del servidor.
    const dumpArgs = [
      `-h${DB_HOST}`,
      `-u${DB_USER}`,
      `-p${DB_PASSWORD}`,
      '--single-transaction',
      '--routines',
      '--triggers',
      '--events',
      '--databases',
      DB_NAME
    ];

    await new Promise((resolve, reject) => {
      const child = spawn('mysqldump', dumpArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
      const out = fs.createWriteStream(dumpPath, { encoding: 'utf8' });
      let stderr = '';

      child.stdout.pipe(out);
      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });
      child.on('error', reject);
      child.on('close', (code) => {
        out.end();
        if (code === 0) return resolve();
        reject(new Error(`mysqldump fallo (${code}): ${stderr.trim()}`));
      });
    });

    // 2) Comprimir a .zip usando herramientas del sistema (sin dependencias npm)
    if (process.platform === 'win32') {
      // Compress-Archive es nativo en PowerShell
      const psCmd = `Compress-Archive -Path "${dumpPath}" -DestinationPath "${zipPath}" -Force`;
      await run('powershell', ['-NoProfile', '-Command', psCmd]);
    } else {
      // Linux/Mac: requiere 'zip' instalado
      await run('zip', ['-j', '-9', zipPath, dumpPath]);
    }

    // 3) Descargar al equipo del usuario
    res.setHeader('X-Backup-Server-Path', zipPath);
    res.setHeader('X-Backup-Filename', path.basename(zipPath));

    res.download(zipPath, path.basename(zipPath), async (err) => {
      // Limpieza: dump siempre, zip solo si no persistimos.
      await safeUnlink(dumpPath);
      if (!persist) await safeUnlink(zipPath);

      if (err) {
        console.error(err);
        // Si ya se empezaron a enviar headers, no podemos responder JSON aqui.
      }
    });
  } catch (err) {
    console.error(err);
    await safeUnlink(dumpPath);
    if (!persist) await safeUnlink(zipPath);

    const msg = String(err?.message || err || '');
    if (msg.toLowerCase().includes('mysqldump')) {
      return res.status(500).json({
        message:
          'No se pudo generar el respaldo porque mysqldump no esta disponible en el servidor. Instala MySQL client tools o agrega mysqldump al PATH.'
      });
    }
    if (msg.toLowerCase().includes('zip') && process.platform !== 'win32') {
      return res.status(500).json({
        message: "No se pudo comprimir el respaldo: el comando 'zip' no esta disponible en el servidor."
      });
    }

    res.status(500).json({ message: 'Error generando respaldo' });
  }
});

app.delete('/api/users/:id', verifyToken, requireRole('Admin'), async (req, res) => {
  const userId = req.params.id;
  try {
    const rows = await dbQuery('SELECT * FROM usuarios WHERE id_usuario = ?', [userId]);
    if (!rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (rows[0].email === 'admin@clinica.com') {
      return res.status(403).json({ message: 'No se puede eliminar el admin principal' });
    }
    await dbQuery('DELETE FROM usuarios WHERE id_usuario = ?', [userId]);
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error de base de datos' });
  }
});

app.put('/api/users/:id', verifyToken, requireRole('Admin'), async (req, res) => {
  const userId = req.params.id;
  const { usuario, email, role } = req.body || {};
  if (!usuario || !email || !role) {
    return res.status(400).json({ message: 'usuario, email y role son obligatorios' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ message: 'Rol invalido. Use Admin, Medico o Secretaria' });
  }

  try {
    const existing = await dbQuery('SELECT * FROM usuarios WHERE id_usuario = ?', [userId]);
    if (!existing.length) return res.status(404).json({ message: 'Usuario no encontrado' });

    // No permitir cambiar el admin principal por seguridad (ni username/email/rol).
    if (existing[0].email === 'admin@clinica.com') {
      return res.status(403).json({ message: 'No se puede modificar el admin principal' });
    }

    // Validar duplicados de username/email en otros usuarios
    const dup = await dbQuery(
      'SELECT id_usuario FROM usuarios WHERE (username = ? OR email = ?) AND id_usuario <> ?',
      [usuario, email, userId]
    );
    if (dup.length) return res.status(400).json({ message: 'Usuario o email ya existe' });

    const roleRows = await dbQuery('SELECT id_role FROM roles WHERE nombre_role = ?', [role]);
    if (!roleRows.length) return res.status(400).json({ message: 'Rol invalido' });

    await dbQuery('UPDATE usuarios SET username = ?, email = ?, role_id = ? WHERE id_usuario = ?', [
      usuario,
      email,
      roleRows[0].id_role,
      userId
    ]);

    res.json({ message: 'Usuario actualizado correctamente' });
  } catch (err) {
    console.error(err);
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Usuario o email ya existe' });
    res.status(500).json({ message: 'Error de base de datos' });
  }
});

// ======== ADMIN: EXPEDIENTES POR MEDICO ========
// Lista medicos con conteo de pacientes asociados (por expedientes.id_medico)
app.get('/api/admin/medicos', verifyToken, requireRole('Admin'), async (req, res) => {
  try {
    const rows = await dbQuery(
      `
      SELECT
        u.id_usuario,
        u.username,
        u.email,
        COUNT(p.id_paciente) AS pacientes_count
      FROM usuarios u
      INNER JOIN roles r ON r.id_role = u.role_id AND r.nombre_role = 'Medico'
      LEFT JOIN pacientes p ON p.id_medico_creador = u.id_usuario
      GROUP BY u.id_usuario, u.username, u.email
      ORDER BY u.username ASC
      `
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error de base de datos (admin medicos)' });
  }
});

// Pacientes asociados a un medico (por ultimo editor del expediente)
app.get('/api/admin/medicos/:id/pacientes', verifyToken, requireRole('Admin'), async (req, res) => {
  const medicoId = req.params.id;
  try {
    const rows = await dbQuery(
      `
      SELECT
        p.id_paciente,
        p.nombre,
        p.apellido,
        p.fecha_nacimiento,
        p.dni,
        p.telefono,
        p.contacto,
        p.id_medico_creador,
        e.id_expediente,
        e.created_at AS expediente_created_at,
        e.updated_at AS expediente_updated_at,
        mc.username AS medico_usuario,
        mc.email AS medico_email
      FROM pacientes p
      LEFT JOIN expedientes e ON e.id_paciente = p.id_paciente
      LEFT JOIN usuarios mc ON mc.id_usuario = p.id_medico_creador
      WHERE p.id_medico_creador = ?
      ORDER BY p.id_paciente DESC
      `,
      [medicoId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error de base de datos (admin pacientes por medico)' });
  }
});

// ======== ADMIN: FACTURAS / PAGOS ========
// Lista de facturas con pagos asociados (para guardar/imprimir en el panel de Expedientes).
app.get('/api/admin/facturas', verifyToken, requireRole('Admin'), async (req, res) => {
  const { from = null, to = null, limit = 300 } = req.query || {};
  try {
    const params = [];
    let where = '1=1';
    if (from) {
      where += ' AND f.fecha_emision >= ?';
      params.push(from);
    }
    if (to) {
      where += ' AND f.fecha_emision <= ?';
      params.push(to);
    }

    const lim = Math.max(1, Math.min(Number(limit) || 300, 2000));

    let rows = [];
    try {
      // Query extendido (si existen columnas extra en facturacion: id_cita, id_usuario, notas)
      rows = await dbQuery(
        `
        SELECT
          f.id_factura,
          f.id_paciente,
          f.monto_total,
          f.fecha_emision,
          f.id_cita,
          f.id_usuario AS medico_id,
          f.notas,
          pa.nombre AS paciente_nombre,
          pa.apellido AS paciente_apellido,
          pa.dni AS paciente_dni,
          pg.id_pago,
          pg.monto AS pago_monto,
          pg.fecha_pago,
          pg.metodo_pago,
          c.fecha AS cita_fecha,
          c.hora AS cita_hora,
          mu.username AS medico_usuario
        FROM facturacion f
        LEFT JOIN pacientes pa ON pa.id_paciente = f.id_paciente
        LEFT JOIN pagos pg ON pg.id_factura = f.id_factura
        LEFT JOIN citas c ON c.id_cita = f.id_cita
        LEFT JOIN usuarios mu ON mu.id_usuario = COALESCE(f.id_usuario, c.id_usuario)
        WHERE ${where}
        ORDER BY f.id_factura DESC, pg.id_pago DESC
        LIMIT ?
        `,
        [...params, lim]
      );
    } catch (e) {
      // Fallback base (sin columnas extra)
      if (e && e.code === 'ER_BAD_FIELD_ERROR') {
        rows = await dbQuery(
          `
          SELECT
            f.id_factura,
            f.id_paciente,
            f.monto_total,
            f.fecha_emision,
            pa.nombre AS paciente_nombre,
            pa.apellido AS paciente_apellido,
            pa.dni AS paciente_dni,
            pg.id_pago,
            pg.monto AS pago_monto,
            pg.fecha_pago,
            pg.metodo_pago
          FROM facturacion f
          LEFT JOIN pacientes pa ON pa.id_paciente = f.id_paciente
          LEFT JOIN pagos pg ON pg.id_factura = f.id_factura
          WHERE ${where}
          ORDER BY f.id_factura DESC, pg.id_pago DESC
          LIMIT ?
          `,
          [...params, lim]
        );
      } else {
        throw e;
      }
    }

    res.json(rows);
  } catch (err) {
    console.error(err);
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({
        message:
          'Faltan tablas pagos/facturacion en MySQL. Importa los scripts hospital_db_facturacion.sql y hospital_db_pagos.sql (o el dump completo) en tu base.'
      });
    }
    res.status(500).json({ message: 'Error de base de datos (admin facturas)' });
  }
});

app.get('/api/admin/facturas/:id_factura', verifyToken, requireRole('Admin'), async (req, res) => {
  const idFactura = req.params.id_factura;
  try {
    let rows = [];
    try {
      rows = await dbQuery(
        `
        SELECT
          f.id_factura,
          f.id_paciente,
          f.monto_total,
          f.fecha_emision,
          f.id_cita,
          f.id_usuario AS medico_id,
          f.notas,
          pa.nombre AS paciente_nombre,
          pa.apellido AS paciente_apellido,
          pa.dni AS paciente_dni,
          pg.id_pago,
          pg.monto AS pago_monto,
          pg.fecha_pago,
          pg.metodo_pago,
          c.fecha AS cita_fecha,
          c.hora AS cita_hora,
          mu.username AS medico_usuario
        FROM facturacion f
        LEFT JOIN pacientes pa ON pa.id_paciente = f.id_paciente
        LEFT JOIN pagos pg ON pg.id_factura = f.id_factura
        LEFT JOIN citas c ON c.id_cita = f.id_cita
        LEFT JOIN usuarios mu ON mu.id_usuario = COALESCE(f.id_usuario, c.id_usuario)
        WHERE f.id_factura = ?
        ORDER BY pg.id_pago DESC
        LIMIT 50
        `,
        [idFactura]
      );
    } catch (e) {
      if (e && e.code === 'ER_BAD_FIELD_ERROR') {
        rows = await dbQuery(
          `
          SELECT
            f.id_factura,
            f.id_paciente,
            f.monto_total,
            f.fecha_emision,
            pa.nombre AS paciente_nombre,
            pa.apellido AS paciente_apellido,
            pa.dni AS paciente_dni,
            pg.id_pago,
            pg.monto AS pago_monto,
            pg.fecha_pago,
            pg.metodo_pago
          FROM facturacion f
          LEFT JOIN pacientes pa ON pa.id_paciente = f.id_paciente
          LEFT JOIN pagos pg ON pg.id_factura = f.id_factura
          WHERE f.id_factura = ?
          ORDER BY pg.id_pago DESC
          LIMIT 50
          `,
          [idFactura]
        );
      } else {
        throw e;
      }
    }

    if (!rows.length) return res.status(404).json({ message: 'Factura no encontrada' });
    res.json(rows);
  } catch (err) {
    console.error(err);
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({
        message:
          'Faltan tablas pagos/facturacion en MySQL. Importa los scripts hospital_db_facturacion.sql y hospital_db_pagos.sql (o el dump completo) en tu base.'
      });
    }
    res.status(500).json({ message: 'Error de base de datos (admin factura detalle)' });
  }
});

// ======== PACIENTES ========
// Requiere (recomendado) ALTER TABLE para agregar: pacientes.dni, pacientes.telefono, pacientes.id_medico_creador
// y para expedientes: expedientes.id_medico, created_at, updated_at
app.get('/api/pacientes', verifyToken, requireRole(['Secretaria', 'Medico', 'Admin']), async (req, res) => {
  try {
    const params = [];
    let where = '1=1';

    // Medico: solo sus pacientes (creados por el mismo)
    if (req.user?.role === 'Medico') {
      where += ' AND p.id_medico_creador = ?';
      params.push(req.user.id);
    }

    const rows = await dbQuery(
      `
      SELECT
        p.id_paciente,
        p.nombre,
        p.apellido,
        p.fecha_nacimiento,
        p.dni,
        p.telefono,
        p.contacto,
        p.id_medico_creador,
        e.id_expediente,
        e.updated_at AS expediente_updated_at,
        mc.username AS medico_usuario,
        mc.email AS medico_email
      FROM pacientes p
      LEFT JOIN expedientes e ON e.id_paciente = p.id_paciente
      LEFT JOIN usuarios mc ON mc.id_usuario = p.id_medico_creador
      WHERE ${where}
      ORDER BY p.id_paciente DESC
      `,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    if (err && err.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({
        message:
          'Falta aplicar la migracion de pacientes (agregar id_medico_creador / dni / telefono). Ejecuta el script de alter correspondiente en MySQL Workbench.'
      });
    }
    res.status(500).json({ message: 'Error de base de datos (pacientes)' });
  }
});

app.get('/api/pacientes/:id', verifyToken, requireRole(['Secretaria', 'Medico', 'Admin']), async (req, res) => {
  const id = req.params.id;
  try {
    await assertPacienteOwnership(req, id);
    const rows = await dbQuery(
      'SELECT id_paciente, nombre, apellido, fecha_nacimiento, dni, telefono, contacto, id_medico_creador FROM pacientes WHERE id_paciente = ?',
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Paciente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    if (err?.status) return res.status(err.status).json({ message: err.message });
    res.status(500).json({ message: 'Error de base de datos (paciente)' });
  }
});

// Solo Medico (y Admin si fuese necesario) pueden crear pacientes.
app.post('/api/pacientes', verifyToken, requireRole(['Medico', 'Admin']), async (req, res) => {
  const { nombre, apellido = null, fecha_nacimiento = null, dni = null, telefono = null, contacto = null } = req.body;
  if (!nombre) return res.status(400).json({ message: 'El nombre es obligatorio' });

  try {
    const result = await dbQuery(
      'INSERT INTO pacientes (nombre, apellido, fecha_nacimiento, dni, telefono, contacto, id_medico_creador) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nombre, apellido, fecha_nacimiento, dni, telefono, contacto, req.user?.role === 'Medico' ? req.user.id : null]
    );

    // Si el creador es Medico, dejamos creado el expediente y registramos al medico como ultimo editor.
    // Requiere la migracion que agrega `expedientes.id_medico`.
    if (req.user?.role === 'Medico') {
      await dbQuery(
        'INSERT INTO expedientes (id_paciente, id_medico, historial_medico) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id_medico = VALUES(id_medico)',
        [result.insertId, req.user.id, JSON.stringify([])]
      );
    }

    const inserted = await dbQuery(
      'SELECT id_paciente, nombre, apellido, fecha_nacimiento, dni, telefono, contacto, id_medico_creador FROM pacientes WHERE id_paciente = ?',
      [result.insertId]
    );
    res.status(201).json(inserted[0]);
  } catch (err) {
    console.error(err);
    if (err && err.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({
        message:
          'Falta aplicar la migracion de pacientes (agregar id_medico_creador / dni / telefono). Ejecuta el script de alter correspondiente en MySQL Workbench.'
      });
    }
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'DNI ya registrado' });
    res.status(500).json({ message: 'Error de base de datos (crear paciente)' });
  }
});

// Secretaria: solo lectura. Medico/Admin: pueden actualizar.
app.put('/api/pacientes/:id', verifyToken, requireRole(['Medico', 'Admin']), async (req, res) => {
  const id = req.params.id;
  const { nombre, apellido, fecha_nacimiento, dni, telefono, contacto } = req.body;
  if (!nombre) return res.status(400).json({ message: 'El nombre es obligatorio' });

  try {
    await assertPacienteOwnership(req, id);
    await dbQuery(
      'UPDATE pacientes SET nombre = ?, apellido = ?, fecha_nacimiento = ?, dni = ?, telefono = ?, contacto = ? WHERE id_paciente = ?',
      [nombre, apellido ?? null, fecha_nacimiento ?? null, dni ?? null, telefono ?? null, contacto ?? null, id]
    );
    const rows = await dbQuery(
      'SELECT id_paciente, nombre, apellido, fecha_nacimiento, dni, telefono, contacto, id_medico_creador FROM pacientes WHERE id_paciente = ?',
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Paciente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    if (err?.status) return res.status(err.status).json({ message: err.message });
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'DNI ya registrado' });
    res.status(500).json({ message: 'Error de base de datos (actualizar paciente)' });
  }
});

app.delete('/api/pacientes/:id', verifyToken, requireRole(['Admin']), async (req, res) => {
  const id = req.params.id;
  try {
    await dbQuery('DELETE FROM expedientes WHERE id_paciente = ?', [id]);
    const result = await dbQuery('DELETE FROM pacientes WHERE id_paciente = ?', [id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Paciente no encontrado' });
    res.json({ message: 'Paciente eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error de base de datos (eliminar paciente)' });
  }
});

// ======== EXPEDIENTES ========
app.get('/api/expedientes/:id_paciente', verifyToken, requireRole(['Secretaria', 'Medico', 'Admin']), async (req, res) => {
  const idPaciente = req.params.id_paciente;
  try {
    await assertPacienteOwnership(req, idPaciente);
    const rows = await dbQuery(
      'SELECT id_expediente, id_paciente, historial_medico, id_medico, created_at, updated_at FROM expedientes WHERE id_paciente = ?',
      [idPaciente]
    );
    if (!rows.length) return res.json(null);

    const row = rows[0];
    let historial = [];
    try {
      historial = row.historial_medico ? JSON.parse(row.historial_medico) : [];
      if (!Array.isArray(historial)) historial = [];
    } catch {
      historial = [];
    }
    res.json({ ...row, historial });
  } catch (err) {
    console.error(err);
    if (err?.status) return res.status(err.status).json({ message: err.message });
    if (err && err.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({
        message:
          'Falta aplicar la migracion de pacientes (id_medico_creador). Ejecuta el script alter_2026_03_15_pacientes_medico_creador.sql en MySQL Workbench.'
      });
    }
    res.status(500).json({ message: 'Error de base de datos (expediente)' });
  }
});

// Agrega una entrada al historial y marca al medico que edito por ultima vez (id_medico)
app.put('/api/expedientes/:id_paciente', verifyToken, requireRole(['Medico', 'Admin']), async (req, res) => {
  const idPaciente = req.params.id_paciente;
  const { diagnostico, observaciones, tratamiento } = req.body;
  if (!diagnostico || !observaciones || !tratamiento) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  const entry = {
    fecha: new Date().toISOString(),
    medico_id: req.user.id,
    medico_usuario: req.user.usuario,
    diagnostico,
    observaciones,
    tratamiento
  };

  try {
    await assertPacienteOwnership(req, idPaciente);
    const existing = await dbQuery('SELECT id_expediente, historial_medico FROM expedientes WHERE id_paciente = ?', [
      idPaciente
    ]);

    if (!existing.length) {
      await dbQuery('INSERT INTO expedientes (id_paciente, id_medico, historial_medico) VALUES (?, ?, ?)', [
        idPaciente,
        req.user.id,
        JSON.stringify([entry])
      ]);
    } else {
      let historial = [];
      try {
        historial = existing[0].historial_medico ? JSON.parse(existing[0].historial_medico) : [];
        if (!Array.isArray(historial)) historial = [];
      } catch {
        historial = [];
      }
      historial.push(entry);
      await dbQuery('UPDATE expedientes SET id_medico = ?, historial_medico = ? WHERE id_paciente = ?', [
        req.user.id,
        JSON.stringify(historial),
        idPaciente
      ]);
    }

    const rows = await dbQuery(
      'SELECT id_expediente, id_paciente, historial_medico, id_medico, created_at, updated_at FROM expedientes WHERE id_paciente = ?',
      [idPaciente]
    );
    const row = rows[0];
    let historial = [];
    try {
      historial = row.historial_medico ? JSON.parse(row.historial_medico) : [];
      if (!Array.isArray(historial)) historial = [];
    } catch {
      historial = [];
    }
    res.json({ ...row, historial });
  } catch (err) {
    console.error(err);
    if (err?.status) return res.status(err.status).json({ message: err.message });
    if (err && err.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({
        message:
          'Falta aplicar la migracion de pacientes (id_medico_creador). Ejecuta el script alter_2026_03_15_pacientes_medico_creador.sql en MySQL Workbench.'
      });
    }
    res.status(500).json({ message: 'Error de base de datos (guardar expediente)' });
  }
});

// ======== MEDICOS (para agendar citas) ========
app.get('/api/medicos', verifyToken, requireRole(['Secretaria', 'Medico', 'Admin']), async (req, res) => {
  try {
    const rows = await dbQuery(
      `
      SELECT u.id_usuario, u.username, u.email
      FROM usuarios u
      INNER JOIN roles r ON r.id_role = u.role_id
      WHERE r.nombre_role = 'Medico'
      ORDER BY u.username ASC
      `
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error de base de datos (medicos)' });
  }
});

// ======== CITAS ========
// Tabla: citas(id_cita, id_paciente, id_usuario, fecha, hora, estado)
app.get('/api/citas', verifyToken, requireRole(['Secretaria', 'Medico', 'Admin']), async (req, res) => {
  const { fecha, from, to } = req.query; // 'YYYY-MM-DD' (opcionales)
  try {
    const params = [];
    let where = '1=1';

    if (fecha) {
      where += ' AND c.fecha = ?';
      params.push(fecha);
    }
    if (!fecha && from) {
      where += ' AND c.fecha >= ?';
      params.push(from);
    }
    if (!fecha && to) {
      where += ' AND c.fecha <= ?';
      params.push(to);
    }

    const rows = await dbQuery(
      `
      SELECT
        c.id_cita,
        c.fecha,
        c.hora,
        c.estado,
        p.id_paciente,
        p.nombre AS paciente_nombre,
        p.apellido AS paciente_apellido,
        p.dni AS paciente_dni,
        u.id_usuario AS medico_id,
        u.username AS medico_usuario
      FROM citas c
      INNER JOIN pacientes p ON p.id_paciente = c.id_paciente
      LEFT JOIN usuarios u ON u.id_usuario = c.id_usuario
      WHERE ${where}
      ORDER BY c.fecha DESC, c.hora ASC, c.id_cita DESC
      `,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error de base de datos (citas)' });
  }
});

app.get('/api/citas/paciente/:id_paciente', verifyToken, requireRole(['Secretaria', 'Medico', 'Admin']), async (req, res) => {
  const idPaciente = req.params.id_paciente;
  try {
    await assertPacienteOwnership(req, idPaciente);
    const params = [idPaciente];
    const where = 'c.id_paciente = ?';

    const rows = await dbQuery(
      `
      SELECT
        c.id_cita,
        c.fecha,
        c.hora,
        c.estado,
        c.id_paciente,
        c.id_usuario AS medico_id,
        u.username AS medico_usuario
      FROM citas c
      LEFT JOIN usuarios u ON u.id_usuario = c.id_usuario
      WHERE ${where}
      ORDER BY c.fecha DESC, c.hora DESC, c.id_cita DESC
      `,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    if (err?.status) return res.status(err.status).json({ message: err.message });
    if (err && err.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({
        message:
          'Falta aplicar la migracion de pacientes (id_medico_creador). Ejecuta el script alter_2026_03_15_pacientes_medico_creador.sql en MySQL Workbench.'
      });
    }
    res.status(500).json({ message: 'Error de base de datos (citas paciente)' });
  }
});

app.post('/api/citas', verifyToken, requireRole(['Secretaria', 'Medico', 'Admin']), async (req, res) => {
  let { id_paciente, id_usuario, fecha, hora, estado } = req.body;
  if (!id_paciente || !fecha || !hora) {
    return res.status(400).json({ message: 'id_paciente, fecha y hora son obligatorios' });
  }

  // Si agenda un Medico, se asigna a si mismo.
  if (req.user?.role === 'Medico') {
    id_usuario = req.user.id;
  }

  if (!id_usuario) {
    return res.status(400).json({ message: 'id_usuario (medico) es obligatorio' });
  }

  estado = estado || 'Programada';

  try {
    // Medico: solo puede agendar citas para pacientes que el mismo creo.
    // (Secretaria/Admin pueden agendar para cualquier paciente)
    await assertPacienteOwnership(req, id_paciente);

    const result = await dbQuery(
      'INSERT INTO citas (id_paciente, id_usuario, fecha, hora, estado) VALUES (?, ?, ?, ?, ?)',
      [id_paciente, id_usuario, fecha, hora, estado]
    );

    const rows = await dbQuery(
      `
      SELECT
        c.id_cita,
        c.fecha,
        c.hora,
        c.estado,
        p.id_paciente,
        p.nombre AS paciente_nombre,
        p.apellido AS paciente_apellido,
        u.id_usuario AS medico_id,
        u.username AS medico_usuario
      FROM citas c
      INNER JOIN pacientes p ON p.id_paciente = c.id_paciente
      LEFT JOIN usuarios u ON u.id_usuario = c.id_usuario
      WHERE c.id_cita = ?
      `,
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    if (err?.status) return res.status(err.status).json({ message: err.message });
    if (err && err.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({
        message:
          'Falta aplicar la migracion de pacientes (id_medico_creador). Ejecuta el script alter_2026_03_15_pacientes_medico_creador.sql en MySQL Workbench.'
      });
    }
    res.status(500).json({ message: 'Error de base de datos (crear cita)' });
  }
});

// ======== PAGOS / FACTURACION ========
// Tablas:
// - facturacion(id_factura, id_paciente, monto_total, fecha_emision)
// - pagos(id_pago, id_factura, monto, fecha_pago, metodo_pago)
//
// Nota: La secretaria genera pagos/facturas. El Admin puede consultar en expediente.
app.post('/api/pagos/facturar', verifyToken, requireRole(['Secretaria', 'Admin']), async (req, res) => {
  const {
    id_paciente,
    id_cita = null,
    monto,
    metodo_pago,
    fecha_pago = null,
    notas = null
  } = req.body || {};

  if (!id_paciente) return res.status(400).json({ message: 'id_paciente es obligatorio' });
  if (monto === undefined || monto === null || String(monto).trim() === '') {
    return res.status(400).json({ message: 'monto es obligatorio' });
  }
  if (!metodo_pago) return res.status(400).json({ message: 'metodo_pago es obligatorio' });

  const montoNum = Number(monto);
  if (!Number.isFinite(montoNum) || montoNum <= 0) {
    return res.status(400).json({ message: 'monto invalido' });
  }

  const fechaPagoISO = fecha_pago || todayISO();

  let conn;
  try {
    // Medico no puede facturar; pero si algun dia se habilita, respetamos ownership.
    await assertPacienteOwnership(req, id_paciente);

    conn = await dbGetConnection();
    await connBegin(conn);

    let citaDb = null;
    if (id_cita) {
      const citaRows = await connQuery(
        conn,
        `
        SELECT c.id_cita, c.id_usuario AS medico_id, c.fecha, c.hora
        FROM citas c
        WHERE c.id_cita = ?
        `,
        [id_cita]
      );
      citaDb = citaRows[0] || null;
    }

    // Insert flexible: si el usuario aplico una migracion para guardar id_cita/id_usuario/notas, las usamos.
    let facturaRes;
    try {
      if (id_cita || citaDb?.medico_id || notas) {
        facturaRes = await connQuery(
          conn,
          'INSERT INTO facturacion (id_paciente, monto_total, fecha_emision, id_cita, id_usuario, notas) VALUES (?, ?, ?, ?, ?, ?)',
          [
            id_paciente,
            montoNum,
            fechaPagoISO,
            id_cita ? Number(id_cita) : null,
            citaDb?.medico_id ? Number(citaDb.medico_id) : null,
            notas ? String(notas) : null
          ]
        );
      } else {
        facturaRes = await connQuery(conn, 'INSERT INTO facturacion (id_paciente, monto_total, fecha_emision) VALUES (?, ?, ?)', [
          id_paciente,
          montoNum,
          fechaPagoISO
        ]);
      }
    } catch (e) {
      // Si no existen columnas extra, reintenta insert base.
      if (e && e.code === 'ER_BAD_FIELD_ERROR') {
        facturaRes = await connQuery(conn, 'INSERT INTO facturacion (id_paciente, monto_total, fecha_emision) VALUES (?, ?, ?)', [
          id_paciente,
          montoNum,
          fechaPagoISO
        ]);
      } else {
        throw e;
      }
    }
    const id_factura = facturaRes.insertId;

    const pagoRes = await connQuery(
      conn,
      'INSERT INTO pagos (id_factura, monto, fecha_pago, metodo_pago) VALUES (?, ?, ?, ?)',
      [id_factura, montoNum, fechaPagoISO, String(metodo_pago)]
    );
    const id_pago = pagoRes.insertId;

    if (id_cita) await connQuery(conn, 'UPDATE citas SET estado = ? WHERE id_cita = ?', ['Pagada', id_cita]);

    await connCommit(conn);

    const pacienteRows = await dbQuery('SELECT id_paciente, nombre, apellido, dni FROM pacientes WHERE id_paciente = ?', [
      id_paciente
    ]);
    const paciente = pacienteRows[0] || null;

    let cita = null;
    if (id_cita) {
      const citaRows = await dbQuery(
        `
        SELECT
          c.id_cita,
          c.fecha,
          c.hora,
          c.estado,
          u.id_usuario AS medico_id,
          u.username AS medico_usuario
        FROM citas c
        LEFT JOIN usuarios u ON u.id_usuario = c.id_usuario
        WHERE c.id_cita = ?
        `,
        [id_cita]
      );
      cita = citaRows[0] || null;
    }

    res.status(201).json({
      id_factura,
      id_pago,
      id_paciente: Number(id_paciente),
      id_cita: id_cita ? Number(id_cita) : null,
      medico_id: citaDb?.medico_id ? Number(citaDb.medico_id) : cita?.medico_id ? Number(cita.medico_id) : null,
      notas: notas ? String(notas) : null,
      monto: montoNum,
      metodo_pago: String(metodo_pago),
      fecha_pago: fechaPagoISO,
      paciente,
      cita
    });
  } catch (err) {
    console.error(err);
    if (conn) await connRollback(conn);
    const msg = err?.message || 'Error de base de datos (facturar)';
    if (err?.status) return res.status(err.status).json({ message: msg });
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({
        message:
          'Faltan tablas pagos/facturacion en MySQL. Importa los scripts hospital_db_facturacion.sql y hospital_db_pagos.sql (o el dump completo) en tu base.'
      });
    }
    res.status(500).json({ message: msg });
  } finally {
    try {
      conn?.release?.();
    } catch {
      // ignore
    }
  }
});

app.get('/api/pagos/paciente/:id_paciente', verifyToken, requireRole(['Secretaria', 'Medico', 'Admin']), async (req, res) => {
  const idPaciente = req.params.id_paciente;
  try {
    await assertPacienteOwnership(req, idPaciente);

    let rows = [];
    try {
      rows = await dbQuery(
        `
        SELECT
          f.id_factura,
          f.id_paciente,
          f.monto_total,
          f.fecha_emision,
          f.id_cita,
          f.id_usuario AS medico_id,
          f.notas,
          p.id_pago,
          p.monto AS pago_monto,
          p.fecha_pago,
          p.metodo_pago
        FROM facturacion f
        LEFT JOIN pagos p ON p.id_factura = f.id_factura
        WHERE f.id_paciente = ?
        ORDER BY f.id_factura DESC, p.id_pago DESC
        `,
        [idPaciente]
      );
    } catch (e) {
      // Fallback si aun no hay columnas extra (id_cita/id_usuario/notas).
      if (e && e.code === 'ER_BAD_FIELD_ERROR') {
        rows = await dbQuery(
          `
          SELECT
            f.id_factura,
            f.id_paciente,
            f.monto_total,
            f.fecha_emision,
            p.id_pago,
            p.monto AS pago_monto,
            p.fecha_pago,
            p.metodo_pago
          FROM facturacion f
          LEFT JOIN pagos p ON p.id_factura = f.id_factura
          WHERE f.id_paciente = ?
          ORDER BY f.id_factura DESC, p.id_pago DESC
          `,
          [idPaciente]
        );
      } else {
        throw e;
      }
    }

    res.json(rows);
  } catch (err) {
    console.error(err);
    if (err?.status) return res.status(err.status).json({ message: err.message });
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({
        message:
          'Faltan tablas pagos/facturacion en MySQL. Importa los scripts hospital_db_facturacion.sql y hospital_db_pagos.sql (o el dump completo) en tu base.'
      });
    }
    res.status(500).json({ message: 'Error de base de datos (pagos por paciente)' });
  }
});

// ======== SERVIDOR ========
(async () => {
  try {
    await ensureDefaultAdmin();
  } catch (err) {
    console.error('Bootstrap admin fallo:', err?.message || err);
  }

  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
})();
