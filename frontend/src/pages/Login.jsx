import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Encabezado from "../components/Encabezado";

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
      const datosUsuario = await login(correo, password);
      navigate(datosUsuario.debeCambiarPassword ? "/cambiar-password" : "/panel");
    } catch (err) {
      const mensaje = err.response?.data?.mensaje || "No se pudo iniciar sesión.";
      setError(mensaje);
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <Encabezado subtitulo="Sistema de Control de Vuelos" />
      <div className="pagina">
        <div className="contenedor-auth">
          <h1>Iniciar sesión</h1>
          <p className="subtitulo">Ingresa con tu correo institucional</p>

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

            <p className="enlace-olvido">
              <Link to="/recuperar-password">¿Olvidaste tu contraseña?</Link>
            </p>

            {error && <p className="mensaje-error">{error}</p>}

            <button type="submit" disabled={cargando}>
              {cargando ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
