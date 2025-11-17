import { useState, useEffect } from "react";
import { api } from "../api/api"
import type { Ticket, User } from "../types/types";

export function useTickets(user: User | null) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");
      setUsers(res.data);
    } catch (err) {
      console.error("Error cargando usuarios", err);
    }
  };

  const fetchTickets = async () => {
    try {
      const res = await api.get("/tickets");
      setTickets(res.data);
    } catch (err) {
      console.error(err);
      alert("Error cargando tickets");
    }
  };

  const createTicket = async (title: string, description: string) => {
    try {
      await api.post("/tickets", { title, description });
      fetchTickets();
    } catch {
      alert("Error creando ticket");
    }
  };

  const updateTicketStatus = async (ticketId: number, newStatus: string) => {
    try {
      if (newStatus === "CLOSED") {
        const confirmClose = window.confirm("¿Seguro que quieres cerrar este ticket?");
        if (!confirmClose) return;
      }

      await api.put(`/tickets/${ticketId}`, { status: newStatus });
      alert(`Estado actualizado a ${newStatus}`);

      fetchTickets();
    } catch (err) {
      console.error("Error actualizando estado", err);
      alert("No se pudo cambiar el estado");
    }
  };

  const requestTransfer = async (ticketId: number, newUserId: number) => {
    try {
      await api.post(`/tickets/${ticketId}/transfer`, { newUserId });
      fetchTickets();
    } catch (err) {
      alert("Error solicitando transferencia");
      console.error(err);
    }
  };

  const approveTransfer = async (ticketId: number, approve: boolean) => {
    try {
      await api.post(`/tickets/${ticketId}/approve-transfer`, { approve });
      fetchTickets();
    } catch (err) {
      alert("Error procesando transferencia");
      console.error(err);
    }
  };

  const getTicketColor = (createdAt: string, lastActivityAt?: string) => {
    const baseDate = lastActivityAt ? new Date(lastActivityAt) : new Date(createdAt);
    const diffDays = (Date.now() - baseDate.getTime()) / 86400000;

    if (diffDays > 5) return "bg-red-100 border-red-400";
    if (diffDays > 3) return "bg-yellow-100 border-yellow-400";
    return "bg-white border-gray-300";
  };

  const getVisibleTickets = () => {
    if (!user) return tickets;

    switch (user.role) {
      case "ADMIN":
        return tickets;

      case "MANAGER":
        return tickets.filter(
          (t) =>
            t.transferStatus === "PENDING" ||
            (t.assignedToId &&
              users.some((u) => u.managerId === user.id && u.id === t.assignedToId))
        );

      case "USER":
        return tickets.filter(
          (t) => t.assignedToId === user.id || t.transferToId === user.id
        );

      default:
        return tickets;
    }
  };

  // cargar tickets y usuarios automáticamente
  useEffect(() => {
    fetchTickets();
    fetchUsers();
  }, []);

  return {
    tickets,
    users,
    fetchTickets,
    createTicket,
    updateTicketStatus,
    requestTransfer,
    approveTransfer,
    getTicketColor,
    getVisibleTickets,
  };
}
