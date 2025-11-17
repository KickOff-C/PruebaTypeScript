import type { Ticket } from "../types/types";
import { api } from "../api/api";

interface Props {
  ticket: Ticket;
  isAdmin: boolean;
  fetchTickets: () => void;
}

export default function TicketHistory({ ticket, isAdmin }: Props) {
  const t = ticket;

  if (!isAdmin) return null;

  const loadHistory = async () => {
    const res = await api.get(`/tickets/${t.id}/history`);
    const history = res.data;

    if (!Array.isArray(history) || history.length === 0) {
      alert("Este ticket no tiene historial.");
      return;
    }

    // Optional: puedes actualizar el estado desde el padre.
    alert("Historial cargado. (Aquí lo mostraríamos en un modal o panel.)");
  };

  return (
    <div className="mt-4">
      <details className="group border rounded-xl p-3 bg-gray-50">
        <summary className="cursor-pointer font-semibold">
          Historial del ticket
        </summary>

        <div className="mt-2">
          <button
            onClick={loadHistory}
            className="bg-indigo-500 text-white px-3 py-1 rounded-md"
          >
            Cargar historial
          </button>

          {t.history?.length ? (
            <div className="mt-3 max-h-48 overflow-y-auto bg-white p-3 border rounded-lg">
              {t.history.map((h) => (
                <div key={h.id} className="border-b py-1 text-sm">
                  <strong>{new Date(h.createdAt).toLocaleString()}</strong> —{" "}
                  <em>{h.action}</em>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm mt-2">
              No se ha cargado el historial aún.
            </p>
          )}
        </div>
      </details>
    </div>
  );
}
