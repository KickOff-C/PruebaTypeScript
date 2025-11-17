// src/pages/LoginPage.tsx
interface LoginPageProps {
  email: string;
  password: string;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  onLogin: () => void;
}

export default function LoginPage({
  email,
  password,
  setEmail,
  setPassword,
  onLogin,
}: LoginPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-96">
        <h1 className="text-3xl font-bold text-center mb-6 text-indigo-700">
          Iniciar sesión
        </h1>

        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded mb-4"
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded mb-6"
        />

        <button
          onClick={onLogin}
          className="w-full bg-indigo-600 text-white py-3 rounded font-semibold hover:bg-indigo-700 transition"
        >
          Entrar
        </button>
      </div>
    </div>
  );
}
