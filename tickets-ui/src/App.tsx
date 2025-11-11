import { useEffect, useState } from "react";
import { api } from "./api.ts";

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  user?: { name: string };
}

interface TicketUserLite {
  id: number;
  name: string;
  email: string;
}

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  lastActivityAt?: string;
  transferStatus?: string;
  transferToId?: number | null;
  assignedToId?: number | null;
  assignedTo?: TicketUserLite | null;
  transferTo?: TicketUserLite | null;
  comments?: Comment[];
  history?: {
    id: number;
    action: string;
    createdAt: string;
    fromUser?: { name: string };
    toUser?: { name: string };
  }[];
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  managerId?: number | null;
}

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [logged, setLogged] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [transferUserId, setTransferUserId] = useState<number | null>(null);
  const [openComments, setOpenComments] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");
      console.log("Usuarios recibidos del backend:", res.data);
      setUsers(res.data);
    } catch (err) {
      console.error("Error al cargar usuarios", err);
    }
  };

  const login = async () => {
    try {
      const res = await api.post("/login", { email, password });
      localStorage.setItem("token", res.data.token);
      setLogged(true);
      await fetchUser();
      fetchTickets();
      fetchUsers();
    } catch {
      alert("Error al iniciar sesión");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setLogged(false);
    setUser(null);
    setTickets([]);
  };

  const fetchUser = async () => {
    try {
      const res = await api.get("/me");
      setUser(res.data);
    } catch (err) {
      console.error("Error al obtener usuario", err);
      logout();
    }
  };

  const fetchTickets = async () => {
    try {
      const res = await api.get("/tickets");
      setTickets(res.data);
    } catch (err: any) {
      console.error(err);
      alert("Error cargando tickets");
    }
  };

  const createTicket = async () => {
    try {
      await api.post("/tickets", { title, description });
      setTitle("");
      setDescription("");
      fetchTickets();
    } catch {
      alert("Error creando ticket");
    }
  };

  const requestTransfer = async (ticketId: number, newUserId: number) => {
    try {
      await api.post(`/tickets/${ticketId}/transfer`, { newUserId });
      alert("Solicitud de transferencia enviada");
      fetchTickets();
    } catch (err) {
      alert("Error solicitando transferencia");
      console.error(err);
    }
  };

  const approveTransfer = async (ticketId: number, approve: boolean) => {
    try {
      await api.post(`/tickets/${ticketId}/approve-transfer`, { approve });
      alert(approve ? "Transferencia aprobada" : "Transferencia rechazada");
      fetchTickets();
    } catch (err) {
      alert("Error procesando transferencia");
      console.error(err);
    }
  };

  // --- Cambiar estado del ticket ---
  const updateTicketStatus = async (ticketId: number, newStatus: string) => {
    try {
      if (newStatus === "CLOSED") {
        const confirmClose = window.confirm(
          "¿Estás seguro de que quieres cerrar este ticket?"
        );
        if (!confirmClose) return;
      }

      await api.put(`/tickets/${ticketId}`, { status: newStatus });
      alert(`Estado actualizado a ${newStatus}`);

      if (newStatus === "CLOSED") {
        setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      } else {
        fetchTickets();
      }
    } catch (err) {
      console.error("Error actualizando estado", err);
      alert("No se pudo cambiar el estado");
    }
  };

  const getTicketColor = (createdAt: string, lastActivityAt?: string) => {
    const baseDate = lastActivityAt ? new Date(lastActivityAt) : new Date(createdAt);
    const diffDays = (Date.now() - baseDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 5) return "bg-red-100 border-red-400";
    if (diffDays > 3) return "bg-yellow-100 border-yellow-400";
    return "bg-white border-gray-300";
  };

  // --- NUEVO: Filtrar tickets según rol ---
  const getVisibleTickets = () => {
    if (!user) return tickets;

    switch (user.role) {
      case "ADMIN":
        return tickets; // ve todo
      case "MANAGER":
        return tickets.filter(
          (t) =>
            t.transferStatus === "PENDING" ||
            (t.assignedToId &&
              users.some(
                (u) => u.managerId === user.id && u.id === t.assignedToId
              ))
        );
      case "USER":
        return tickets.filter(
          (t) => t.assignedToId === user.id || t.transferToId === user.id
        );
      default:
        return tickets;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setLogged(true);
      fetchUser();
      fetchTickets();
      fetchUsers();
    }
  }, []);

  if (!logged) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-96">
          <h1 className="text-3xl font-bold text-center mb-6 text-indigo-700">
            Iniciar sesión
          </h1>
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded mb-4"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded mb-6"
          />
          <button
            onClick={login}
            className="w-full bg-indigo-600 text-white py-3 rounded font-semibold hover:bg-indigo-700 transition"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 flex flex-col items-center py-10 px-4">
      <div className="bg-white shadow-2xl rounded-3xl p-10 w-full max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-extrabold text-indigo-700">Panel de Tickets</h1>
          <button
            onClick={logout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Cerrar sesión
          </button>
        </div>

        {user && (
          <div className="mb-8 bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-indigo-800 shadow-sm">
            <p className="text-lg font-semibold">Bienvenido, {user.name}</p>
            <p className="text-sm text-gray-600">
              {user.email} — <span className="font-medium">{user.role}</span>
            </p>
          </div>
        )}

        {user?.role === "USER" && (
          <div className="bg-gray-50 rounded-2xl p-6 shadow-inner mb-10">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Crear nuevo ticket</h2>
            <input
              type="text"
              placeholder="Título del ticket"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-3 mb-4"
            />
            <textarea
              placeholder="Descripción del problema"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-3 h-28 mb-4"
            />
            <button
              onClick={createTicket}
              className="w-full bg-indigo-600 text-white py-3 rounded-md font-semibold hover:bg-indigo-700 transition"
            >
              Crear Ticket
            </button>
          </div>
        )}

        {/* Panel dinámico según rol */}
        <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
          {user?.role === "ADMIN"
            ? "Panel de Administración"
            : user?.role === "MANAGER"
            ? "Tickets del Equipo"
            : "Mis Tickets"}
        </h2>

        <div className="space-y-6">
          {getVisibleTickets().length === 0 ? (
            <p className="text-gray-500 text-center italic">
              No hay tickets disponibles para tu rol.
            </p>
          ) : (
            getVisibleTickets().map((t) => (
              <div
                key={t.id}
                className={`relative border rounded-2xl shadow-lg p-6 ${getTicketColor(
                  t.createdAt,
                  t.lastActivityAt
                )}`}
              >
                {/* Resto de tu renderizado de ticket */}
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-2xl font-bold text-gray-800">{t.title}</h3>
                  <span
                    className={`px-4 py-1 text-sm font-semibold rounded-full ${
                      t.status === "CLOSED"
                        ? "bg-red-200 text-red-800"
                        : t.status === "IN_PROGRESS"
                        ? "bg-yellow-200 text-yellow-800"
                        : "bg-green-200 text-green-800"
                    }`}
                  >
                    {t.status}
                  </span>
                </div>


                {/* CAMBIAR ESTADO DEL TICKET */}
                {(user?.id === t.assignedToId || user?.role !== "USER") && (
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Estado del ticket
                    </label>
                    <div className="relative inline-block w-56">
                      <select
                        value={t.status}
                        onChange={(e) => updateTicketStatus(t.id, e.target.value)}
                        className={`
                          appearance-none w-full bg-white border rounded-xl px-4 py-2 pr-8 text-sm font-medium
                          shadow-sm transition-all cursor-pointer
                          ${
                            t.status === "OPEN"
                              ? "border-green-400 text-green-700 bg-green-50 hover:bg-green-100"
                              : t.status === "IN_PROGRESS"
                              ? "border-yellow-400 text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
                              : "border-red-400 text-red-700 bg-red-50 hover:bg-red-100"
                          }
                        `}
                      >
                        <option value="OPEN">Abierto</option>
                        <option value="IN_PROGRESS">En progreso</option>
                        <option value="CLOSED">Cerrado</option>
                      </select>
                      <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                        ▼
                      </span>
                    </div>
                  </div>
                )}

                {/* TRANSFERENCIA DE TICKET (solo usuarios) */}
                {user?.role === "USER" && (
                  <div className="mt-5">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Transferir ticket a otro usuario
                    </label>

                    <div className="flex items-center gap-2">
                      <select
                        onChange={(e) => setTransferUserId(Number(e.target.value))}
                        className="border border-gray-300 bg-white rounded-xl px-3 py-2 text-sm shadow-sm w-64 focus:ring-2 focus:ring-indigo-400 transition-all"
                      >
                        <option value="">-- Selecciona usuario destino --</option>
                        {users
                          .filter((u) => u.id !== user.id)
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.email})
                            </option>
                          ))}
                      </select>

                      <button
                        onClick={() => {
                          if (transferUserId) requestTransfer(t.id, transferUserId);
                          else alert("Selecciona un usuario destino");
                        }}
                        className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-yellow-600 transition"
                      >
                        Transferir
                      </button>
                    </div>

                    {/* Mostrar estado de transferencia */}
                    {t.transferStatus && (
                      <p className="mt-2 text-sm text-gray-600">
                        Estado de transferencia:{" "}
                        <span
                          className={`font-semibold ${
                            t.transferStatus === "PENDING"
                              ? "text-yellow-600"
                              : t.transferStatus === "APPROVED"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {t.transferStatus}
                        </span>
                      </p>
                    )}
                  </div>
                )}

                {/* Detalle de transferencia visible para managers/admin */}
                {user?.role !== "USER" &&
                  t.transferStatus === "PENDING" &&
                  t.assignedTo &&
                  t.transferTo && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-gray-700">
                      <strong>{t.assignedTo.name}</strong> solicita transferir a{" "}
                      <strong>{t.transferTo.name}</strong>
                    </div>
                  )}

                <p className="text-gray-700 mb-4">{t.description}</p>

                {/* COMENTARIOS DESPLEGABLE */}
                <div className="mt-4">
                  <button
                    onClick={() => setOpenComments(openComments === t.id ? null : t.id)}
                    className="flex items-center gap-2 text-indigo-700 font-semibold hover:text-indigo-900 transition"
                  >
                    <span className="flex items-center">
                      {openComments === t.id
                        ? " Ocultar comentarios"
                        : ` Ver comentarios (${t.comments?.length || 0})`}
                    </span>
                    <span className="text-sm transition-transform duration-200 ease-in-out">
                      {openComments === t.id ? "▲" : "▼"}
                    </span>
                  </button>

                  {openComments === t.id && (
                    <div className="mt-3 border border-gray-200 rounded-2xl bg-white shadow-inner p-4 space-y-3 max-h-64 overflow-y-auto transition-all duration-300 ease-in-out">
                      {t.comments && t.comments.length > 0 ? (
                        t.comments.map((c) => (
                          <div
                            key={c.id}
                            className="p-2 rounded-md border border-gray-100 bg-gray-50 hover:bg-indigo-50 transition"
                          >
                            <p className="text-gray-800 text-sm">
                              <span className="font-semibold text-indigo-700">
                                {c.user?.name}:
                              </span>{" "}
                              {c.content}
                            </p>
                            <p className="text-gray-400 text-xs mt-1">
                              {new Date(c.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 italic text-sm">
                          No hay comentarios aún.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* AGREGAR COMENTARIO */}
                {user?.id === t.assignedToId && (
                  <div className="mt-3 flex gap-2">
                    <input
                      id={`comment-${t.id}`}
                      type="text"
                      placeholder="Agregar comentario..."
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                    <button
                      onClick={async () => {
                        const input = document.getElementById(
                          `comment-${t.id}`
                        ) as HTMLInputElement;
                        const value = input?.value.trim();
                        if (!value) {
                          alert("Escribe algo antes de guardar");
                          return;
                        }
                        await api.post(`/tickets/${t.id}/comments`, {
                          content: value,
                        });
                        input.value = "";
                        fetchTickets();
                      }}
                      className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 text-sm"
                    >
                      Guardar
                    </button>
                  </div>
                )}

                {/* HISTORIAL DEL TICKET (solo ADMIN) */}
                {user?.role === "ADMIN" && (
                  <div className="mt-4">
                    <details className="group bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                      <summary className="flex justify-between items-center cursor-pointer font-semibold text-gray-700 hover:text-indigo-700">
                        <span>Historial del ticket</span>
                        <span className="transition-transform group-open:rotate-180 text-gray-500">
                          ▼
                        </span>
                      </summary>

                      <div className="mt-3 space-y-2">
                        <button
                          onClick={async () => {
                            try {
                              const res = await api.get(`/tickets/${t.id}/history`);
                              const history = res.data;

                              if (!Array.isArray(history) || history.length === 0) {
                                alert("Este ticket no tiene historial todavía.");
                                return;
                              }

                              setTickets((prev) =>
                                prev.map((tk) =>
                                  tk.id === t.id ? { ...tk, history } : tk
                                )
                              );
                            } catch (err) {
                              console.error(err);
                              alert("Error al obtener historial del ticket.");
                            }
                          }}
                          className="bg-indigo-500 text-white text-sm px-3 py-1 rounded-md hover:bg-indigo-600 transition"
                        >
                          Cargar historial
                        </button>
 
                        {t.history && t.history.length > 0 ? (
                          <div className="max-h-48 overflow-y-auto mt-2 bg-white border border-gray-200 rounded-lg p-3">
                            {t.history.map((h: any) => (
                              <div key={h.id} className="text-sm border-b last:border-none py-1">
                                <p className="text-gray-800">
                                  <strong>{new Date(h.createdAt).toLocaleString()}</strong> —{" "}
                                  <span className="italic">{h.action}</span>
                                </p>
                                {(h.fromUser || h.toUser) && (
                                  <p className="text-gray-500 text-xs">
                                    {h.fromUser?.name && <>De: {h.fromUser.name} </>}
                                    {h.toUser?.name && <>→ Para: {h.toUser.name}</>}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic mt-2">
                            No se ha cargado historial aún.
                          </p>
                        )}
                      </div>
                    </details>
                  </div>
                )}
                {/* BLOQUE DE APROBACIÓN (MANAGER o ADMIN) */}
                {user?.role !== "USER" && t.transferStatus === "PENDING" && (
                  <div className="mt-5 flex gap-2">
                    <button
                      onClick={() => approveTransfer(t.id, true)}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600 transition"
                    >
                      Aprobar transferencia
                    </button>
                    <button
                      onClick={() => approveTransfer(t.id, false)}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600 transition"
                    >
                      Rechazar
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
