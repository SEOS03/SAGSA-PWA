import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function manejarEnvio(e) {
    e.preventDefault();
    setError("");
    setCargando(true);

    try {
      await login(correo, password);
      navigate("/panel");
    } catch (err) {
      const mensaje = err.response?.data?.mensaje || "No se pudo iniciar sesión.";
      setError(mensaje);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="contenedor-auth">
      <h1>Iniciar sesión</h1>
      <p className="subtitulo">Sistema de Control de Vuelos — Escuela de Aviación Sagsa</p>

      <form onSubmit={manejarEnvio} className="formulario-auth">
        <label htmlFor="correo">Correo electrónico</label>
        <input
          id="correo"
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          placeholder="tu.correo@ejemplo.com"
          required
        />

        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />

        {error && <p className="mensaje-error">{error}</p>}

        <button type="submit" disabled={cargando}>
          {cargando ? "Ingresando..." : "Ingresar"}
        </button>
      </form>

      <p className="enlace-secundario">
        ¿No tienes cuenta? <Link to="/registro">Regístrate aquí</Link>
      </p>
    </div>
  );
}
