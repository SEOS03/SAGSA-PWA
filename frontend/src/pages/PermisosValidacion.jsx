import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import Encabezado from "../components/Encabezado";

export default function PermisosValidacion() {
  const { listarUsuariosPorRol, otorgarPermisoValidarHorometro } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [procesandoId, setProcesandoId] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const datos = await listarUsuariosPorRol("administrador");
      // El backend ya rechaza otorgar el permiso a un super admin (no lo
      // necesita); se excluye aquí también para no ofrecer esa opción.
      setUsuarios(datos.usuarios.filter((u) => !u.esSuperAdmin));
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudieron cargar los administradores.");
    } finally {
      setCargando(false);
    }
  }, [listarUsuariosPorRol]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function manejarCambio(usuarioFila) {
    setError("");
    setMensaje("");
    setProcesandoId(usuarioFila.id);
    const nuevoValor = !usuarioFila.puedeValidarHorometro;
    try {
      const datos = await otorgarPermisoValidarHorometro(usuarioFila.id, nuevoValor);
      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuarioFila.id ? { ...u, puedeValidarHorometro: nuevoValor } : u))
      );
      setMensaje(datos.mensaje);
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudo actualizar el permiso.");
    } finally {
      setProcesandoId(null);
    }
  }

  return (
    <>
      <Encabezado subtitulo="Permisos de validación" />
      <div className="pagina">
        <div className="contenedor-ancho">
          <h1>Permisos de validación de horómetro</h1>
          <p className="subtitulo">Administradores que pueden validar registros de horómetro.</p>

          {mensaje && <p className="mensaje-exito">{mensaje}</p>}
          {error && <p className="mensaje-error">{error}</p>}

          {cargando ? (
            <p className="subtitulo">Cargando...</p>
          ) : usuarios.length === 0 ? (
            <p className="subtitulo">No hay administradores regulares registrados.</p>
          ) : (
            <div className="lista-recursos">
              {usuarios.map((u) => (
                <div key={u.id} className="tarjeta-recurso fila-permiso">
                  <span className="fila-permiso__nombre">{u.nombre}</span>
                  <label className="interruptor">
                    <input
                      type="checkbox"
                      checked={!!u.puedeValidarHorometro}
                      disabled={procesandoId === u.id}
                      onChange={() => manejarCambio(u)}
                      aria-label={`Permiso de validación de horómetro para ${u.nombre}`}
                    />
                    <span className="interruptor__control" />
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
