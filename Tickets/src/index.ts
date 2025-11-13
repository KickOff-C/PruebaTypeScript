import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { PrismaClient, Status, Role } from "@prisma/client";
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
// --- Registro de usuario ---
app.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, areaId } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: "Faltan datos obligatorios" });

    // Validar que no exista el correo
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
      return res.status(400).json({ error: "Ya existe un usuario con ese email" });

    // Hashear contraseña
    const hashed = crypto.createHash("sha256").update(password).digest("hex");

    // Crear usuario con área asignada (si aplica)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: role || "USER",
        areaId: areaId || null, // null si no se especifica
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        areaId: true,
      },
    });

    res.status(201).json({
      message: "Usuario creado correctamente",
      user,
    });
  } catch (err: any) {
    console.error("Error en /register:", err);
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

// --- Listar usuarios (solo para transferencias) ---
app.get("/users", auth, async (req, res) => {
  try {
    console.log("Entró al endpoint /users"); // <-- esto debería verse apenas el front lo llame
    const { userId } = (req as any).user;

    const users = await prisma.user.findMany({
      where: {
        role: Role.USER,     // Usa enum (seguro, evita errores de texto)
        NOT: { id: userId }  // No incluir al propio usuario
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    // 👇 Esto te muestra en consola si realmente encuentra usuarios
    console.log(`Usuarios encontrados: ${users.length}`);

    res.json(users);
  } catch (error) {
    console.error("Error en /users:", error);
    res.status(500).json({ error: "Error cargando usuarios" });
  }
});

// --- Crear ticket (autenticado) ---
app.post("/tickets", auth, async (req, res) => {
  try {
    const { title, description, targetAreaId } = req.body;
    const userId = (req as any).user.userId;

    if (!title || !description)
      return res.status(400).json({ error: "title y description son obligatorios" });

    // Obtener usuario para conocer su área
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user)
      return res.status(404).json({ error: "Usuario no encontrado" });

    if (!user.areaId)
      return res.status(400).json({ error: "Usuario sin área asignada" });

    // Si no se indica un área destino, el ticket es interno (misma área)
    const finalTargetAreaId = targetAreaId || user.areaId;

    // Crear ticket con área de origen y destino
    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        assignedToId: userId,
        areaId: user.areaId,
        targetAreaId: finalTargetAreaId,
      },
      include: {
        area: { select: { id: true, name: true } },
        targetArea: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({
      message: "Ticket creado correctamente",
      ticket,
    });
  } catch (e) {
    console.error("Error creando ticket:", e);
    res.status(500).json({ error: "Error creando ticket" });
  }
});


// --- Listar tickets (con permisos según rol y área) ---
app.get("/tickets", auth, async (req, res) => {
  try {
    const status = req.query.status as Status | undefined;
    const user = (req as any).user;

    let whereClause: any = {};

    // Filtro opcional por estado
    if (status) whereClause.status = status;

    // Filtrado dinámico según rol
    if (user.role === "USER") {
      // Solo los suyos
      whereClause.assignedToId = user.userId;
    }

    if (user.role === "MANAGER") {
      // Tickets suyos + los de su equipo
      const managedUsers = await prisma.user.findMany({
        where: { managerId: user.userId },
        select: { id: true },
      });
      const ids = managedUsers.map((u) => u.id).concat(user.userId);
      whereClause.assignedToId = { in: ids };
    }

    if (user.role === "ADMIN") {
      // Tickets del área que administra
      const admin = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { areaId: true },
      });
      whereClause.areaId = admin?.areaId ?? undefined;
    }

    if (user.role === "SUPERADMIN") {
      // Sin restricción: ve todo
      whereClause = {}; 
    }

    // Obtener tickets
    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        transferTo: { select: { id: true, name: true, email: true } },
        area: { select: { id: true, name: true } },          // área origen
        targetArea: { select: { id: true, name: true } },    // área destino
        comments: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            user: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    res.json(tickets);
  } catch (e) {
    console.error("❌ Error listando tickets:", e);
    res.status(500).json({ error: "Error listando tickets" });
  }
});


// --- Agregar comentario a un ticket ---
app.post("/tickets/:id/comments", auth, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    const { content } = req.body;
    const ticketId = Number(req.params.id);

    if (!content || content.trim() === "") {
      return res.status(400).json({ error: "El comentario no puede estar vacío" });
    }

    // Verificar que el usuario tiene asignado el ticket
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.assignedToId !== userId) {
      return res.status(403).json({ error: "No puedes comentar este ticket" });
    }

    // Crear comentario
    const comment = await prisma.ticketComment.create({
      data: { content, ticketId, userId },
    });

    // Actualizar la última actividad del ticket
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { lastActivityAt: new Date() },
    });

    res.status(201).json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error agregando comentario" });
  }
});


// --- Obtener comentarios de un ticket ---
app.get("/tickets/:id/comments", auth, async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const requester = (req as any).user;

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({ error: "Ticket no encontrado" });
    }

    // Permisos
    if (
      ticket.assignedToId !== requester.userId &&
      requester.role !== "MANAGER" &&
      requester.role !== "ADMIN"
    ) {
      return res.status(403).json({ error: "No tienes acceso a este ticket" });
    }

    const comments = await prisma.ticketComment.findMany({
      where: { ticketId },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { name: true, email: true } } },
    });

    res.json(comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo comentarios" });
  }
});



// --- Transferencia de ticket ---
app.post("/tickets/:id/transfer", auth, async (req, res) => {
  try {
    const { userId, role } = (req as any).user;
    const { newUserId } = req.body;
    const ticketId = Number(req.params.id);

    if (role === "MANAGER" || role === "ADMIN") {
      return res.status(403).json({ error: "Solo usuarios pueden solicitar transferencias" });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.assignedToId !== userId) {
      return res.status(403).json({ error: "No puedes transferir un ticket que no es tuyo" });
    }

    // Validar estado antes de permitir transferencia
    if (ticket.status === "CLOSED") {
      return res.status(400).json({ error: "No se pueden transferir tickets cerrados" });
    }

    if (ticket.status !== "IN_PROGRESS") {
      return res.status(400).json({
        error: "Solo se pueden transferir tickets en estado 'IN_PROGRESS'",
      });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        transferToId: newUserId,
        transferStatus: "PENDING",
      },
    });

    await prisma.ticketHistory.create({
      data: {
        ticketId,
        fromId: userId,
        toId: newUserId,
        action: "Solicitud de transferencia pendiente de aprobación",
      },
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al solicitar transferencia" });
  }
});


app.post("/tickets/:id/approve-transfer", auth, async (req, res) => {
  try {
    const { role, userId } = (req as any).user;
    const ticketId = Number(req.params.id);
    const { approve } = req.body; // true o false

    if (role !== "MANAGER" && role !== "ADMIN") {
      return res.status(403).json({ error: "Solo managers o admin pueden aprobar transferencias" });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket || ticket.transferStatus !== "PENDING") {
      return res.status(400).json({ error: "No hay transferencia pendiente" });
    }

    let updated;

    if (approve) {
      // Validar destino
      if (!ticket.transferToId) {
        return res.status(400).json({ error: "No se encontró usuario destino en la transferencia" });
      }

      console.log("Aprobando transferencia:", {
        ticketId,
        transferToId: ticket.transferToId,
        assignedToId: ticket.assignedToId,
      });

      // Actualizar ticket correctamente
      updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          assignedToId: ticket.transferToId,
          transferStatus: "APPROVED",
          transferToId: null,
        },
      });

      // Registrar historial
      await prisma.ticketHistory.create({
        data: {
          ticketId: ticketId,
          fromId: ticket.assignedToId!,
          toId: ticket.transferToId!,
          action: `Transferencia aprobada por manager ${userId}`,
        },
      });
    } else {
      // Transferencia rechazada
      updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: { transferToId: null, transferStatus: "REJECTED" },
      });

      await prisma.ticketHistory.create({
        data: {
          ticketId: ticketId,
          action: `Transferencia rechazada por manager ${userId}`,
        },
      });
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error procesando aprobación" });
  }
});

// --- Obtener ticket por ID ---
app.get("/tickets/:id", auth, async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "id inválido" });

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      transferTo: { select: { id: true, name: true, email: true } },
     },
  });

  if (!ticket) return res.status(404).json({ error: "No encontrado" });
  res.json(ticket);
});

// --- Obtener historial de un ticket ---
app.get("/tickets/:id/history", auth, async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const requester = (req as any).user;

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ error: "Ticket no encontrado" });

    // Permisos: solo el asignado, managers o admins
    if (
      ticket.assignedToId !== requester.userId &&
      requester.role !== "MANAGER" &&
      requester.role !== "ADMIN"
    ) {
      return res.status(403).json({ error: "No tienes acceso a este historial" });
    }

    const history = await prisma.ticketHistory.findMany({
      where: { ticketId },
      orderBy: { createdAt: "desc" },
      include: {
        fromUser: { select: { name: true } },
        toUser: { select: { name: true } },
      },
    });

    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo historial" });
  }
});

// --- Actualizar ticket (con validación de estados realista) ---
app.put("/tickets/:id", auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "id inválido" });

    const { title, description, status } = req.body;
    const { role } = (req as any).user;

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) return res.status(404).json({ error: "Ticket no encontrado" });

    // --- Validación de transiciones ---
    const currentStatus = ticket.status;

    // Evitar reabrir tickets cerrados (salvo admin)
    if (currentStatus === "CLOSED" && role !== "ADMIN") {
      return res
        .status(400)
        .json({ error: "No puedes reabrir un ticket cerrado" });
    }

    // Transiciones válidas
    const validTransitions: Record<Status, Status[]> = {
      OPEN: ["IN_PROGRESS"],
      IN_PROGRESS: ["CLOSED"],
      CLOSED: [],
    };

    if (
      status &&
      !validTransitions[currentStatus].includes(status) &&
      !(role === "ADMIN" && currentStatus === "CLOSED")
    ) {
      return res.status(400).json({
        error: `Transición inválida: no puedes pasar de ${currentStatus} a ${status}`,
      });
    }

    // --- Actualizar ticket ---
    const updated = await prisma.ticket.update({
      where: { id },
      data: { title, description, status },
    });

    // Registrar en historial
    if (status && status !== currentStatus) {
      await prisma.ticketHistory.create({
        data: {
          ticketId: id,
          action: `Estado cambiado de ${currentStatus} a ${status}`,
        },
      });
    }

    res.json(updated);
  } catch (e) {
    console.error("Error actualizando ticket:", e);
    res.status(500).json({ error: "Error actualizando ticket" });
  }
});


// --- Cerrar ticket ---
app.post("/tickets/:id/close", auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { userId, role } = (req as any).user;

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      return res.status(404).json({ error: "Ticket no encontrado" });
    }

    // 🧠 Solo el usuario asignado, un manager o un admin puede cerrarlo
    if (
      ticket.assignedToId !== userId &&
      role !== "MANAGER" &&
      role !== "ADMIN"
    ) {
      return res.status(403).json({ error: "No tienes permiso para cerrar este ticket" });
    }

    // 🚫 Si ya está cerrado, prevenir re-cierre
    if (ticket.status === "CLOSED") {
      return res.status(400).json({ error: "El ticket ya está cerrado" });
    }

    // ✅ Cerrar el ticket
    const closed = await prisma.ticket.update({
      where: { id },
      data: { status: "CLOSED" },
    });

    // 🔖 Registrar historial de cierre
    await prisma.ticketHistory.create({
      data: {
        ticketId: id,
        fromId: userId,
        action: `Ticket cerrado por usuario con rol ${role}`,
      },
    });

    res.json(closed);
  } catch (err) {
    console.error("❌ Error al cerrar ticket:", err);
    res.status(500).json({ error: "Error al cerrar el ticket" });
  }
});

// --- CRUD de Áreas (solo SUPERADMIN) ---
app.get("/areas", auth, async (req, res) => {
  try {
    const { role } = (req as any).user;
    if (role !== "SUPERADMIN") {
      return res.status(403).json({ error: "Solo el SUPERADMIN puede listar áreas" });
    }

    const areas = await prisma.area.findMany({
      orderBy: { name: "asc" },
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    res.json(areas);
  } catch (err) {
    console.error("Error obteniendo áreas:", err);
    res.status(500).json({ error: "Error al obtener áreas" });
  }
});

app.post("/areas", auth, async (req, res) => {
  try {
    const { role } = (req as any).user;
    if (role !== "SUPERADMIN") {
      return res.status(403).json({ error: "Solo el SUPERADMIN puede crear áreas" });
    }

    const { name } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "El nombre del área es obligatorio" });
    }

    // Validar duplicados
    const existing = await prisma.area.findUnique({ where: { name } });
    if (existing) {
      return res.status(409).json({ error: "Ya existe un área con ese nombre" });
    }

    const area = await prisma.area.create({ data: { name: name.trim() } });
    res.status(201).json(area);
  } catch (err) {
    console.error("Error creando área:", err);
    res.status(500).json({ error: "Error al crear el área" });
  }
});

// Actualizar área
app.put("/areas/:id", auth, async (req, res) => {
  try {
    const { role } = (req as any).user;
    if (role !== "SUPERADMIN") {
      return res.status(403).json({ error: "Solo el SUPERADMIN puede modificar áreas" });
    }

    const id = Number(req.params.id);
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    const area = await prisma.area.update({
      where: { id },
      data: { name: name.trim() },
    });

    res.json(area);
  } catch (err) {
    console.error("Error actualizando área:", err);
    res.status(500).json({ error: "Error al actualizar el área" });
  }
});

// Eliminar área
app.delete("/areas/:id", auth, async (req, res) => {
  try {
    const { role } = (req as any).user;
    if (role !== "SUPERADMIN") {
      return res.status(403).json({ error: "Solo el SUPERADMIN puede eliminar áreas" });
    }

    const id = Number(req.params.id);

    // Verificar que no haya usuarios o tickets asociados
    const relatedUsers = await prisma.user.count({ where: { areaId: id } });
    const relatedTickets = await prisma.ticket.count({
      where: { OR: [{ areaId: id }, { targetAreaId: id }] },
    });

    if (relatedUsers > 0 || relatedTickets > 0) {
      return res.status(400).json({
        error: "No se puede eliminar el área: tiene usuarios o tickets asociados",
      });
    }

    await prisma.area.delete({ where: { id } });
    res.json({ message: "Área eliminada correctamente" });
  } catch (err) {
    console.error("Error eliminando área:", err);
    res.status(500).json({ error: "Error al eliminar el área" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
});

