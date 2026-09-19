import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Encabezado from "../components/Encabezado";
import ModalInscribirPrograma from "../components/ModalInscribirPrograma";

export default function BuscarUsuarioPorDpi() {
  const [dpi, setDpi] = useState("");
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrarInscripcion, setMostrarInscripcion] = useState(false);

  const { buscarUsuarioPorDpi } = useAuth();

  async function manejarEnvio(e) {
    e.preventDefault();
    setError("");
    setResultado(null);

    if (!/^\d{13}$/.test(dpi)) {
      setError("El DPI debe tener exactamente 13 dígitos numéricos.");
      return;
    }

    setCargando(true);
    try {
      const datos = await buscarUsuarioPorDpi(dpi);
      setResultado(datos.usuario);
    } catch (err) {
      const mensaje = err.response?.data?.mensaje || "No se pudo realizar la búsqueda.";
      setError(mensaje);
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <Encabezado subtitulo="Buscar usuario por DPI" />
      <div className="pagina">
        <div className="contenedor-auth">
          <h1>Buscar usuario por DPI</h1>
          <p className="subtitulo">Ingresa el número de DPI completo (13 dígitos).</p>

          <form onSubmit={manejarEnvio} className="formulario-auth">
            <label htmlFor="dpi">Número de DPI</label>
            <input
              id="dpi"
              type="text"
              inputMode="numeric"
              maxLength={13}
              value={dpi}
              onChange={(e) => setDpi(e.target.value.replace(/\D/g, ""))}
              placeholder="13 dígitos, sin espacios ni guiones"
              required
            />

            {error && <p className="mensaje-error">{error}</p>}

            {resultado && (
              <p className="mensaje-exito">
                <strong>{resultado.nombre}</strong>
                <br />
                {resultado.correo}
              </p>
            )}

            <button type="submit" disabled={cargando}>
              {cargando ? "Buscando..." : "Buscar"}
            </button>
          </form>

          {resultado && resultado.rol === "alumno" && (
            <div className="tarjeta-recurso__acciones-admin">
              <button type="button" className="btn-chip btn-chip--secundario" onClick={() => setMostrarInscripcion(true)}>
                Inscribir a programa
              </button>
            </div>
          )}
        </div>
      </div>

      {mostrarInscripcion && resultado && (
        <ModalInscribirPrograma alumno={resultado} onCerrar={() => setMostrarInscripcion(false)} />
      )}
    </>
  );
}
