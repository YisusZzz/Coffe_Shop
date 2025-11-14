// server.js (Versión COMPLETA con todas las rutas)

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const port = 3000;
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "cafedb",
});

db.connect((err) => {
  if (err) {
    console.error("ERROR: No se pudo conectar a la base de datos.", err);
    return;
  }
  console.log("¡Conexión exitosa a la base de datos!");
});

app.use(express.static("public"));

app.get("/api/productos", (req, res) => {
  const sqlQuery = "SELECT * FROM Productos";
  db.query(sqlQuery, (err, results) => {
    if (err) {
      console.error("Error al consultar productos:", err);
      return res.status(500).json({ error: "Error al obtener los productos" });
    }
    res.json(results);
  });
});

app.post("/api/pedidos", (req, res) => {
  const { carrito } = req.body;
  if (!carrito || carrito.length === 0)
    return res.status(400).json({ error: "El carrito está vacío." });
  db.beginTransaction((err) => {
    if (err) return res.status(500).json({ error: "Error en el servidor." });
    const total = carrito.reduce(
      (sum, item) => sum + item.precio * item.cantidad,
      0
    );
    const pedidoQuery =
      "INSERT INTO Pedidos (cliente_id, total, estado) VALUES (?, ?, ?)";
    db.query(pedidoQuery, [1, total, "En preparación"], (err, result) => {
      if (err)
        return db.rollback(() =>
          res.status(500).json({ error: "Error al crear el pedido." })
        );
      const pedidoId = result.insertId;
      const detallesValues = carrito.map((item) => [
        pedidoId,
        item.id,
        item.cantidad,
        item.precio,
      ]);
      const detallesQuery =
        "INSERT INTO Detalles_Pedido (pedido_id, producto_id, cantidad, precio_unitario) VALUES ?";
      db.query(detallesQuery, [detallesValues], (err, result) => {
        if (err)
          return db.rollback(() =>
            res.status(500).json({ error: "Error al guardar los detalles." })
          );
        db.commit((err) => {
          if (err)
            return db.rollback(() =>
              res.status(500).json({ error: "Error al finalizar la compra." })
            );
          console.log(`Pedido ${pedidoId} creado exitosamente.`);
          res
            .status(201)
            .json({
              message: "Pedido creado exitosamente",
              pedidoId: pedidoId,
            });
        });
      });
    });
  });
});

app.post("/api/suscripciones", (req, res) => {
  const { email } = req.body;
  if (!email)
    return res
      .status(400)
      .json({ error: "El campo de correo es obligatorio." });
  const sqlQuery = "INSERT INTO Suscripciones (email) VALUES (?)";
  db.query(sqlQuery, [email], (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY")
        return res
          .status(409)
          .json({ message: "Este correo ya está registrado." });
      console.error("Error al registrar la suscripción:", err);
      return res.status(500).json({ error: "Error en el servidor." });
    }
    res.status(201).json({ message: "¡Gracias por suscribirte!" });
  });
});

app.listen(port, () => {
  console.log(`Servidor iniciado. Escuchando en http://localhost:${port}`);
});
