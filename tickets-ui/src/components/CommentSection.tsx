import type { Ticket, User } from "../types/types";
import { api } from "../api/api";

interface CommentSectionProps {
  ticket: Ticket;
  user: User;

  openComments: number | null;
  setOpenComments: (v: number | null) => void;

  fetchTickets: () => void;
}

export default function CommentSection({
  ticket,
  user,
  openComments,
  setOpenComments,
  fetchTickets
}: CommentSectionProps) {
  const t = ticket;

  const handleAddComment = async () => {
    const input = document.getElementById(`comment-${t.id}`) as HTMLInputElement;
    const value = input.value.trim();

    if (!value) {
      alert("Escribe algo antes de guardar");
      return;
    }

    await api.post(`/tickets/${t.id}/comments`, { content: value });
    input.value = "";
    fetchTickets();
  };

  return (
    <div className="mt-4">
      {/* Botón colapsable */}
      <button
        onClick={() => setOpenComments(openComments === t.id ? null : t.id)}
        className="font-semibold text-indigo-700 hover:text-indigo-900"
      >
        {openComments === t.id
          ? "Ocultar comentarios ▲"
          : `Ver comentarios (${t.comments?.length || 0}) ▼`}
      </button>

      {/* Panel de comentarios */}
      {openComments === t.id && (
        <div className="mt-3 p-3 border rounded-xl bg-white shadow-inner max-h-60 overflow-y-auto">
          {t.comments?.length ? (
            t.comments.map((c) => (
              <div key={c.id} className="mb-2 p-2 rounded bg-gray-50">
                <p className="text-sm">
                  <strong className="text-indigo-700">{c.user?.name}:</strong>{" "}
                  {c.content}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(c.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">No hay comentarios aún.</p>
          )}
        </div>
      )}

      {/* Caja para escribir comentarios */}
      {user.id === t.assignedToId && (
        <div className="mt-3 flex gap-2">
          <input
            id={`comment-${t.id}`}
            type="text"
            placeholder="Agregar comentario..."
            className="flex-1 border rounded-md px-3 py-2"
          />

          <button
            onClick={handleAddComment}
            className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600"
          >
            Guardar
          </button>
        </div>
      )}
    </div>
  );
}
