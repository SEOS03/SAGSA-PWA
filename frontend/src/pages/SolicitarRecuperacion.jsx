import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Encabezado from "../components/Encabezado";

export default function SolicitarRecuperacion() {
  const [correo, setCorreo] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const { solicitarRecuperacion } = useAuth();

  async function manejarEnvio(e) {
    e.preventDefault();
    setError("");
    setCargando(true);

    try {
      await solicitarRecuperacion(correo);
      // Se muestra siempre este mensaje, exista o no el correo, para no
      // revelar qué direcciones están registradas en el sistema.
      setEnviado(true);
    } catch (err) {
      const mensaje = err.response?.data?.mensaje || "No se pudo procesar la solicitud.";
      setError(mensaje);
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <Encabezado subtitulo="Recuperar contraseña" />
      <div className="pagina">
        <div className="contenedor-auth">
          <h1>Recuperar contraseña</h1>
          <p className="subtitulo">
            Ingresa tu correo y te enviaremos un enlace para restablecerla.
          </p>

          {enviado ? (
            <p className="mensaje-exito">
              Si el correo existe en el sistema, recibirás un enlace para restablecer tu
              contraseña.
            </p>
          ) : (
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

              {error && <p className="mensaje-error">{error}</p>}

              <button type="submit" disabled={cargando}>
                {cargando ? "Enviando..." : "Enviar enlace"}
              </button>
            </form>
          )}

          <p className="enlace-secundario">
            <Link to="/login">Volver a iniciar sesión</Link>
          </p>
        </div>
      </div>
    </>
  );
}
