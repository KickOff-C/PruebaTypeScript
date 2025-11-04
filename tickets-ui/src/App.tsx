import { useEffect, useState } from "react";
import { api } from "./api.ts";

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: string;
  createdAt: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [logged, setLogged] = useState(false);
  const [user, setUser] = useState<User | null>(null); // 👈 NUEVO
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const login = async () => {
    try {
      const res = await api.post("/login", { email, password });
      localStorage.setItem("token", res.data.token);
      setLogged(true);
      await fetchUser(); // 👈 Cargar info del usuario
      fetchTickets();
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

  const fetchUser = async () => { // 👈 NUEVA FUNCIÓN
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

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setLogged(true);
      fetchUser(); // 👈 cargar info del usuario al entrar
      fetchTickets();
    }
  }, []);

  if (!logged) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-96">
          <h1 className="text-3xl font-bold text-center mb-6 text-indigo-700">🎟️ Iniciar sesión</h1>
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
      <div className="bg-white shadow-2xl rounded-3xl p-10 w-full max-w-3xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-extrabold text-indigo-700">🎫 Mis Tickets</h1>
          <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
            Cerrar sesión
          </button>
        </div>

        {user && ( // 👇 NUEVA SECCIÓN
          <div className="mb-8 bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-indigo-800 shadow-sm">
            <p className="text-lg font-semibold">👋 Bienvenido, {user.name}</p>
            <p className="text-sm text-gray-600">
              {user.email} — <span className="font-medium">{user.role}</span>
            </p>
          </div>
        )}

        {/* Crear ticket */}
        <div className="bg-gray-50 rounded-2xl p-6 shadow-inner mb-10">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Crear nuevo ticket</h2>
          <input
            type="text"
            placeholder="Título del ticket"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-3 mb-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <textarea
            placeholder="Descripción del problema"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-3 h-28 mb-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <button
            onClick={createTicket}
            className="w-full bg-indigo-600 text-white py-3 rounded-md font-semibold hover:bg-indigo-700 transition"
          >
            Crear Ticket
          </button>
        </div>

        {/* Tickets */}
        <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Tickets registrados</h2>
        <div className="space-y-6">
          {tickets.length === 0 ? (
            <p className="text-gray-500 text-center italic">No hay tickets creados aún.</p>
          ) : (
            tickets.map((t) => (
              <div
                key={t.id}
                className="relative bg-white border border-gray-300 rounded-2xl shadow-lg p-6"
              >
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
                <p className="text-gray-700 mb-4">{t.description}</p>
                <small className="text-gray-500 block mb-4">
                  Creado el {new Date(t.createdAt).toLocaleString()}
                </small>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
