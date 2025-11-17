// src/pages/Dashboard.tsx
import type { User, Ticket } from "..//types/types";
import TicketList from "../components/TicketList";

interface DashboardProps {
  user: User;
  tickets: Ticket[];
  users: User[];
  logout: () => void;

  createTicket: (title: string, desc: string) => void;
  updateTicketStatus: (id: number, status: string) => void;
  requestTransfer: (ticketId: number, newUserId: number) => void;
  approveTransfer: (ticketId: number, approve: boolean) => void;

  getVisibleTickets: () => Ticket[];
  getTicketColor: (c: string, la?: string) => string;

  openComments: number | null;
  setOpenComments: (v: number | null) => void;

  title: string;
  setTitle: (v: string) => void;

  description: string;
  setDescription: (v: string) => void;

  transferUserId: number | null;
  setTransferUserId: (v: number | null) => void;

  fetchTickets: () => void;
}

export default function Dashboard(props: DashboardProps) {
  const {
    user,
    users,
    logout,
    createTicket,
    updateTicketStatus,
    requestTransfer,
    approveTransfer,
    getVisibleTickets,
    getTicketColor,
    openComments,
    setOpenComments,
    title,
    setTitle,
    description,
    setDescription,
    transferUserId,
    setTransferUserId,
    fetchTickets,
  } = props;

  const visibleTickets = getVisibleTickets();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 flex flex-col items-center py-10 px-4">
      <div className="bg-white shadow-2xl rounded-3xl p-10 w-full max-w-4xl">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-extrabold text-indigo-700">Panel de Tickets</h1>
          <button
            onClick={logout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
          >
            Cerrar sesión
          </button>
        </div>

        {/* Info del usuario */}
        <div className="mb-8 bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-indigo-800 shadow-sm">
          <p className="text-lg font-semibold">Bienvenido, {user.name}</p>
          <p className="text-sm text-gray-600">
            {user.email} — <span className="font-medium">{user.role}</span>
          </p>
        </div>

        {/* Crear ticket */}
        {user.role === "USER" && (
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
              onClick={() => createTicket(title, description)}
              className="w-full bg-indigo-600 text-white py-3 rounded-md font-semibold hover:bg-indigo-700 transition"
            >
              Crear Ticket
            </button>
          </div>
        )}

        {/* Título */}
        <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
          {user.role === "ADMIN"
            ? "Panel de Administración"
            : user.role === "MANAGER"
            ? "Tickets del Equipo"
            : "Mis Tickets"}
        </h2>

        {/* TicketList */}
        {visibleTickets.length === 0 ? (
          <p className="text-gray-500 text-center italic">
            No hay tickets disponibles para tu rol.
          </p>
        ) : (
          <TicketList
            tickets={visibleTickets}
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
        )}
      </div>
    </div>
  );
}
