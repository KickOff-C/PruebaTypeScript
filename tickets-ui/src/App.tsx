import { useEffect, useState } from "react";
import axios from "axios";

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: string;
  createdAt: string;
}

export default function App() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const fetchTickets = async () => {
    const res = await axios.get("http://localhost:3000/tickets");
    setTickets(res.data);
  };

  const createTicket = async () => {
    if (!title || !description) return;
    await axios.post("http://localhost:3000/tickets", { title, description });
    setTitle("");
    setDescription("");
    fetchTickets();
  };

  const updateTicket = async (id: number, status: string) => {
    await axios.put(`http://localhost:3000/tickets/${id}`, { status });
    fetchTickets();
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 flex flex-col items-center py-10 px-4">
      <div className="bg-white shadow-2xl rounded-3xl p-10 w-full max-w-3xl">
        <h1 className="text-4xl font-extrabold text-center text-indigo-700 mb-10">
          🎟️ Sistema de Tickets
        </h1>

        <div className="bg-gray-50 rounded-2xl p-6 shadow-inner mb-10">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            Crear nuevo ticket
          </h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Título del ticket"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <textarea
              placeholder="Descripción detallada del problema"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-3 h-28 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              onClick={createTicket}
              className="w-full bg-indigo-600 text-white py-3 rounded-md font-semibold hover:bg-indigo-700 transition"
            >
              Crear Ticket
            </button>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
          Tickets registrados
        </h2>

        <div className="space-y-6">
          {tickets.length === 0 && (
            <p className="text-gray-500 text-center italic">
              No hay tickets creados aún.
            </p>
          )}

          {tickets.map((t) => (
            <div
              key={t.id}
              className="relative bg-white border border-gray-300 rounded-2xl shadow-lg p-6 overflow-hidden
                        transition-transform transform hover:scale-[1.02] hover:shadow-2xl"
            >
              {/* Efecto de borde perforado */}
              <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-indigo-400 to-indigo-600"></div>
              <div className="absolute top-0 right-0 bottom-0 w-2 bg-gray-100 border-l-2 border-dotted border-gray-300"></div>

              {/* Contenido */}
              <div className="pl-6">
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
                <p className="text-gray-700 mb-4 leading-relaxed">{t.description}</p>
                <small className="text-gray-500 block mb-4">
                  Creado el {new Date(t.createdAt).toLocaleString()}
                </small>

                <div className="flex gap-3">
                  {t.status !== "IN_PROGRESS" && (
                    <button
                      onClick={() => updateTicket(t.id, "IN_PROGRESS")}
                      className="px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm shadow-sm"
                    >
                      En progreso
                    </button>
                  )}
                  {t.status !== "CLOSED" && (
                    <button
                      onClick={() => updateTicket(t.id, "CLOSED")}
                      className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm shadow-sm"
                    >
                      Cerrar
                    </button>
                  )}
                </div>
              </div>

              {/* Efecto de entrada animado */}
              <style jsx>{`
                div {
                  animation: fadeIn 0.5s ease forwards;
                }
                @keyframes fadeIn {
                  from {
                    opacity: 0;
                    transform: translateY(10px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
              `}</style>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
