import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { PrismaClient, Status } from "@prisma/client";
import jwt, { JwtPayload } from "jsonwebtoken";
import crypto from "crypto";

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// 👉 Lee del .env y corta la ejecución si falta
const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error("Falta JWT_SECRET en .env");
}
// A partir de aquí, TS ya sabe que SECRET es string



// --- Middleware de autenticación ---
function auth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ error: "Token requerido" });
  }

  // Soporta "Bearer <token>" o solo "<token>"
  const token = header.startsWith("Bearer ")
    ? header.split(" ")[1]
    : header;

  if (!token) {
    return res.status(401).json({ error: "Token no encontrado en cabecera" });
  }

  try {
    const decoded = jwt.verify(token, SECRET as string) as JwtPayload;
    const { userId, role } = decoded as { userId: number; role: string };
    (req as any).user = { userId, role };
    next();
  } catch (err) {
    console.error("JWT verify error:", err);
    return res.status(403).json({ error: "Token inválido o expirado" });
  }
}
// --- Obtener información del usuario logueado ---
app.get("/me", auth, async (req, res) => {
  try {
    const userData = (req as any).user;
    const user = await prisma.user.findUnique({
      where: { id: userData.userId },
      select: { id: true, name: true, email: true, role: true }
    });

    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    res.json(user);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error obteniendo datos del usuario" });
  }
});



// --- Rutas de autenticación ---
app.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "Faltan datos" });

    const hashed = crypto.createHash("sha256").update(password).digest("hex");
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: role || "USER" },
    });

    res.status(201).json({ id: user.id, name: user.name, email: user.email });
  } catch (err: any) {
    res.status(500).json({ error: "Error creando usuario", detail: err.message });
  }
});

app.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    const hashed = crypto.createHash("sha256").update(password).digest("hex");

    if (hashed !== user.password)
      return res.status(401).json({ error: "Contraseña incorrecta" });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      SECRET,
      { expiresIn: "8h" }
    );

    res.json({ token });
  } catch (err: any) {
    res.status(500).json({ error: "Error al iniciar sesión", detail: err.message });
  }
});

// --- Ruta base ---
app.get("/", (_req, res) => {
  res.json({ ok: true, service: "tickets-api", version: "2.0" });
});

// --- Crear ticket (autenticado) ---
app.post("/tickets", auth, async (req, res) => {
  try {
    const { title, description } = req.body;
    const userId = (req as any).user.userId;

    if (!title || !description)
      return res.status(400).json({ error: "title y description son obligatorios" });

    const ticket = await prisma.ticket.create({
      data: { title, description, assignedToId: userId },
    });

    res.status(201).json(ticket);
  } catch (e) {
    res.status(500).json({ error: "Error creando ticket" });
  }
});

// --- Listar tickets (con permisos según rol) ---
app.get("/tickets", auth, async (req, res) => {
  try {
    const status = req.query.status as Status | undefined;
    const user = (req as any).user;

    let whereClause: any = {};

    // filtro por estado (opcional)
    if (status) whereClause.status = status;

    // Usuarios normales: solo sus tickets
    if (user.role === "USER") {
      whereClause.assignedToId = user.userId;
    }

    // Managers: tickets de su equipo y los suyos
    if (user.role === "MANAGER") {
      const subordinates = await prisma.user.findMany({
        where: { managerId: user.userId },
        select: { id: true },
      });

      const ids = subordinates.map((s) => s.id).concat(user.userId);
      whereClause.assignedToId = { in: ids };
    }

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: { assignedTo: { select: { name: true, email: true } } },
    });

    res.json(tickets);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error listando tickets" });
  }
});

// --- Obtener ticket por ID ---
app.get("/tickets/:id", auth, async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "id inválido" });

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { assignedTo: true },
  });

  if (!ticket) return res.status(404).json({ error: "No encontrado" });
  res.json(ticket);
});

// --- Actualizar ticket ---
app.put("/tickets/:id", auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "id inválido" });
    const { title, description, status } = req.body;

    const updated = await prisma.ticket.update({
      where: { id },
      data: { title, description, status },
    });

    res.json(updated);
  } catch (e) {
    res.status(404).json({ error: "No encontrado o datos inválidos" });
  }
});

// --- Cerrar ticket ---
app.post("/tickets/:id/close", auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const closed = await prisma.ticket.update({
      where: { id },
      data: { status: "CLOSED" },
    });
    res.json(closed);
  } catch {
    res.status(404).json({ error: "No encontrado" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API escuchando en http://localhost:${PORT}`);
});
