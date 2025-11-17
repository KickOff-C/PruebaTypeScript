import { useState} from "react";
import { api } from "./api/api";
import type { User } from "./types/types";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import { useTickets } from "./hooks/useTickets";

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [logged, setLogged] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const {
    tickets,
    users,
    createTicket,
    updateTicketStatus,
    requestTransfer,
    approveTransfer,
    getVisibleTickets,
    getTicketColor,
  } = useTickets(user);

  const login = async () => {
    try {
      const res = await api.post("/login", { email, password });
      localStorage.setItem("token", res.data.token);

      const me = await api.get("/me");
      setUser(me.data);

      setLogged(true);
    } catch {
      alert("Error al iniciar sesión");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setLogged(false);
    setUser(null);
  };

  if (!logged) {
    return (
      <LoginPage
        email={email}
        password={password}
        setEmail={setEmail}
        setPassword={setPassword}
        onLogin={login}
      />
    );
  }

  return (
    <Dashboard
      user={user!}
      tickets={tickets}
      users={users}
      logout={logout}
      createTicket={createTicket}
      updateTicketStatus={updateTicketStatus}
      requestTransfer={requestTransfer}
      approveTransfer={approveTransfer}
      getVisibleTickets={getVisibleTickets}
      getTicketColor={getTicketColor}

      // props que aún vienen de App
      title={""}
      setTitle={() => {}}
      description={""}
      setDescription={() => {}}
      openComments={null}
      setOpenComments={() => {}}
      transferUserId={null}
      setTransferUserId={() => {}}

      fetchTickets={() => {}}
    />
  );
}
