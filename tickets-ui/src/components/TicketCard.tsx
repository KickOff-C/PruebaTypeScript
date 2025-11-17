import type { Ticket, User } from "../types/types";
import CommentSection from "./CommentSection";
import TransferSection from "./TransferSection";
import TicketHistory from "./TicketHistory";

interface TicketCardProps {
  ticket: Ticket;
  user: User;
  users: User[];

  updateTicketStatus: (id: number, status: string) => void;
  requestTransfer: (id: number, newUser: number) => void;
  approveTransfer: (id: number, approve: boolean) => void;

  transferUserId: number | null;
  setTransferUserId: (v: number | null) => void;

  openComments: number | null;
  setOpenComments: (v: number | null) => void;

  getTicketColor: (c: string, la?: string) => string;

  fetchTickets: () => void;
}

export default function TicketCard(props: TicketCardProps) {
  const {
    ticket,
    user,
    users,
    updateTicketStatus,
    requestTransfer,
    transferUserId,
    setTransferUserId,
    openComments,
    setOpenComments,
    getTicketColor,
    fetchTickets
  } = props;

  const t = ticket;

  return (
    <div
      className={`border rounded-2xl shadow-lg p-6 ${getTicketColor(
        t.createdAt,
        t.lastActivityAt
      )}`}
    >
      {/* Header */}
      <div className="flex justify-between mb-3">
        <h3 className="text-2xl font-bold">{t.title}</h3>
        <span className="px-4 py-1 rounded-full bg-gray-200">{t.status}</span>
      </div>

      {/* Cambiar estado */}
      {(user.id === t.assignedToId || user.role !== "USER") && (
        <select
          value={t.status}
          onChange={(e) => updateTicketStatus(t.id, e.target.value)}
          className="border px-4 py-2 rounded-md"
        >
          <option value="OPEN">Abierto</option>
          <option value="IN_PROGRESS">En progreso</option>
          <option value="CLOSED">Cerrado</option>
        </select>
      )}

      {/* Transferencia */}
      <TransferSection
        ticket={t}
        user={user}
        users={users}
        transferUserId={transferUserId}
        setTransferUserId={setTransferUserId}
        requestTransfer={requestTransfer}
      />

      {/* Comentarios */}
      <CommentSection
        ticket={t}
        user={user}
        openComments={openComments}
        setOpenComments={setOpenComments}
        fetchTickets={fetchTickets}
      />

      {/* Historial */}
      <TicketHistory
        ticket={t}
        isAdmin={user.role === "ADMIN"}
        fetchTickets={fetchTickets}
      />
    </div>
  );
}
