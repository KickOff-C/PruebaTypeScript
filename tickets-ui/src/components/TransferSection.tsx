import type { Ticket, User } from "../types/types";

interface TransferSectionProps {
  ticket: Ticket;
  user: User;
  users: User[];

  transferUserId: number | null;
  setTransferUserId: (v: number | null) => void;

  requestTransfer: (id: number, newUser: number) => void;
}

export default function TransferSection({
  ticket,
  user,
  users,
  transferUserId,
  setTransferUserId,
  requestTransfer
}: TransferSectionProps) {
  const t = ticket;

  if (user.role !== "USER") return null;

  return (
    <div className="mt-4">
      <label className="block text-sm font-semibold mb-1 text-gray-700">
        Transferir ticket
      </label>

      <div className="flex gap-2">
        <select
          onChange={(e) => setTransferUserId(Number(e.target.value))}
          className="border px-3 py-2 rounded-md"
        >
          <option value="">-- Selecciona usuario --</option>
          {users
            .filter((u) => u.id !== user.id)
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
        </select>

        <button
          onClick={() =>
            transferUserId
              ? requestTransfer(t.id, transferUserId)
              : alert("Selecciona un usuario destino")
          }
          className="bg-yellow-500 text-white px-4 py-2 rounded-md"
        >
          Transferir
        </button>
      </div>

      {t.transferStatus && (
        <p className="text-sm mt-1">
          Estado:{" "}
          <strong
            className={
              t.transferStatus === "PENDING"
                ? "text-yellow-600"
                : t.transferStatus === "APPROVED"
                ? "text-green-600"
                : "text-red-600"
            }
          >
            {t.transferStatus}
          </strong>
        </p>
      )}
    </div>
  );
}
