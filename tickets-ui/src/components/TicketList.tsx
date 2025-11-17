import TicketCard from "./TicketCard";
import type { Ticket, User } from "../types/types";

interface TicketListProps {
  tickets: Ticket[];
  user: User;
  users: User[];

  updateTicketStatus: (id: number, status: string) => void;
  requestTransfer: (id: number, newUser: number) => void;
  approveTransfer: (id: number, approve: boolean) => void;

  getTicketColor: (c: string, la?: string) => string;

  openComments: number | null;
  setOpenComments: (v: number | null) => void;

  transferUserId: number | null;
  setTransferUserId: (v: number | null) => void;

  fetchTickets: () => void;
}

export default function TicketList({
  tickets,
  user,
  users,
  updateTicketStatus,
  requestTransfer,
  approveTransfer,
  getTicketColor,
  openComments,
  setOpenComments,
  transferUserId,
  setTransferUserId,
  fetchTickets
}: TicketListProps) {
  return (
    <div className="space-y-6">
      {tickets.map((t) => (
        <TicketCard
          key={t.id}
          ticket={t}
          user={user}
          users={users}
          updateTicketStatus={updateTicketStatus}
          requestTransfer={requestTransfer}
          approveTransfer={approveTransfer}
          getTicketColor={getTicketColor}
          openComments={openComments}
          setOpenComments={setOpenComments}
          transferUserId={transferUserId}
          setTransferUserId={setTransferUserId}
          fetchTickets={fetchTickets}
        />
      ))}
    </div>
  );
}
