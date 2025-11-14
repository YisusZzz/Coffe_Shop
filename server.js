const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
require('dotenv').config(); // Vercel usa sus propias variables de entorno

const app = express();
app.use(cors());
app.use(express.json());

// 1. CONFIGURACIÓN DE DB USANDO VARIABLES DE ENTORNO
// Usamos createPool para que Vercel maneje bien las conexiones
const db = mysql.createPool({
  host: process.env.DB_HOST,      // Usará la variable de Vercel
  user: process.env.DB_USER,      // Usará la variable de Vercel
  password: process.env.DB_PASSWORD, // Usará la variable de Vercel
  database: process.env.DB_NAME,  // Usará la variable de Vercel
  port: process.env.DB_PORT || 3306, // Usará la variable de Vercel
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 2. SERVIR ARCHIVOS ESTÁTICOS
// Si tienes un index.html en una carpeta 'public', esto lo sirve en la raíz '/'
app.use(express.static("public"));

// Ruta de prueba para la raíz (si no hay index.html en 'public')
// Esto también ayuda a Vercel a saber que la app responde.
app.get('/', (req, res) => {
  res.send('API de Café Aromas de la Sierra funcionando ☕');
});

// --- TUS RUTAS API (Estas están bien) ---

app.get("/api/productos", (req, res) => {
  const sqlQuery = "SELECT * FROM Productos";
  // Usamos el pool para hacer la consulta
  db.query(sqlQuery, (err, results) => {
    if (err) {
      console.error("Error DB:", err);
      return res.status(500).json({ error: "Error al obtener productos", details: err.message });
    }
    res.json(results);
  });
});

app.post("/api/pedidos", (req, res) => {
  const { carrito } = req.body;
  if (!carrito || carrito.length === 0) {
    return res.status(400).json({ error: "El carrito está vacío." });
  }

  // Obtenemos una conexión del pool para la transacción
  db.getConnection((err, connection) => {
    if (err) return res.status(500).json({ error: "Error de conexión DB" });

    connection.beginTransaction((err) => {
      if (err) {
        connection.release(); // Liberar conexión
        return res.status(500).json({ error: "Error al iniciar transacción." });
      }

      const total = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
      const pedidoQuery = "INSERT INTO Pedidos (cliente_id, total, estado) VALUES (?, ?, ?)";

      connection.query(pedidoQuery, [1, total, "En preparación"], (err, result) => {
        if (err) {
          return connection.rollback(() => {
            connection.release();
            res.status(500).json({ error: "Error al crear el pedido." });
          });
        }
        const pedidoId = result.insertId;
        const detallesValues = carrito.map((item) => [pedidoId, item.id, item.cantidad, item.precio]);
        const detallesQuery = "INSERT INTO Detalles_Pedido (pedido_id, producto_id, cantidad, precio_unitario) VALUES ?";

        connection.query(detallesQuery, [detallesValues], (err, result) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              res.status(500).json({ error: "Error al guardar detalles." });
            });
          }
          connection.commit((err) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                res.status(500).json({ error: "Error al finalizar compra." });
              });
            }
            connection.release(); // Liberar conexión al terminar
            console.log(`Pedido ${pedidoId} creado.`);
            res.status(201).json({ message: "Pedido creado exitosamente", pedidoId: pedidoId });
          });
        });
      });
    });
  });
});

app.post("/api/suscripciones", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email obligatorio." });

  const sqlQuery = "INSERT INTO Suscripciones (email) VALUES (?)";
  db.query(sqlQuery, [email], (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Correo ya registrado." });
      return res.status(500).json({ error: "Error servidor." });
    }
    res.status(201).json({ message: "¡Gracias por suscribirte!" });
  });
});


// 3. EXPORTAR LA APP (NO USAR APP.LISTEN)
// Esta es la línea más importante para Vercel
module.exports = app;
