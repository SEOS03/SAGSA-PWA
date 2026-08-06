import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Encabezado from "../components/Encabezado";

export default function CambiarPassword() {
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const { cambiarPassword } = useAuth();
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
      await cambiarPassword(passwordActual, passwordNueva);
      navigate("/panel");
    } catch (err) {
      const mensaje = err.response?.data?.mensaje || "No se pudo cambiar la contraseña.";
      setError(mensaje);
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <Encabezado subtitulo="Cambio de contraseña" />
      <div className="pagina">
        <div className="contenedor-auth">
          <h1>Cambia tu contraseña</h1>
          <p className="subtitulo">
            Por seguridad debes definir una contraseña propia antes de continuar.
          </p>

          <form onSubmit={manejarEnvio} className="formulario-auth">
            <label htmlFor="passwordActual">Contraseña temporal</label>
            <input
              id="passwordActual"
              type="password"
              value={passwordActual}
              onChange={(e) => setPasswordActual(e.target.value)}
              required
            />

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
              {cargando ? "Guardando..." : "Cambiar contraseña"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
