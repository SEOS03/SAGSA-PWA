import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Encabezado from "../components/Encabezado";

export default function RestablecerPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [passwordNueva, setPasswordNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);
  const [cargando, setCargando] = useState(false);

  const { restablecerPassword } = useAuth();
  const navigate = useNavigate();

  async function manejarEnvio(e) {
    e.preventDefault();
    setError("");

    if (passwordNueva !== confirmacion) {
      setError("La nueva contraseña y la confirmación no coinciden.");
      return;
    }

    setCargando(true);
    try {
      await restablecerPassword(token, passwordNueva);
      setExito(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      const mensaje = err.response?.data?.mensaje || "No se pudo restablecer la contraseña.";
      setError(mensaje);
    } finally {
      setCargando(false);
    }
  }

  if (!token) {
    return (
      <>
        <Encabezado subtitulo="Restablecer contraseña" />
        <div className="pagina">
          <div className="contenedor-auth">
            <h1>Enlace inválido</h1>
            <p className="mensaje-error">
              Este enlace no incluye un token de recuperación válido.
            </p>
            <p className="enlace-secundario">
              <Link to="/recuperar-password">Solicitar un nuevo enlace</Link>
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Encabezado subtitulo="Restablecer contraseña" />
      <div className="pagina">
        <div className="contenedor-auth">
          <h1>Crea una nueva contraseña</h1>
          <p className="subtitulo">Ingresa y confirma tu nueva contraseña.</p>

          {exito ? (
            <p className="mensaje-exito">
              Contraseña actualizada. Redirigiendo al inicio de sesión...
            </p>
          ) : (
            <form onSubmit={manejarEnvio} className="formulario-auth">
              <label htmlFor="passwordNueva">Nueva contraseña</label>
              <input
                id="passwordNueva"
                type="password"
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
                minLength={6}
                required
              />

              <label htmlFor="confirmacion">Confirmar nueva contraseña</label>
              <input
                id="confirmacion"
                type="password"
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                minLength={6}
                required
              />

              {error && <p className="mensaje-error">{error}</p>}

              <button type="submit" disabled={cargando}>
                {cargando ? "Guardando..." : "Restablecer contraseña"}
              </button>
            </form>
          )}

          {error && (
            <p className="enlace-secundario">
              <Link to="/recuperar-password">Solicitar un nuevo enlace</Link>
            </p>
          )}
        </div>
      </div>
    </>
  );
}
