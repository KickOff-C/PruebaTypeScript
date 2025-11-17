export interface Comment {
  id: number;
  content: string;
  createdAt: string;
  user?: { name: string };
}

export interface TicketUserLite {
  id: number;
  name: string;
  email: string;
}

export interface Ticket {
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

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  managerId?: number | null;
}
