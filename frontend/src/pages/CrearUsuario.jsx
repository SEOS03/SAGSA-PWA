import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Encabezado from "../components/Encabezado";

const ROLES_DISPONIBLES = [
  { valor: "administrador", etiqueta: "Administrador" },
  { valor: "instructor", etiqueta: "Instructor" },
  { valor: "alumno", etiqueta: "Alumno" },
];

export default function CrearUsuario() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [rol, setRol] = useState("instructor");
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [cargando, setCargando] = useState(false);

  const { usuario, crearUsuario } = useAuth();

  // El administrador regular no debe poder crear otros administradores:
  // la opción se quita del arreglo, no solo se oculta visualmente.
  const opcionesRol = usuario?.esSuperAdmin
    ? ROLES_DISPONIBLES
    : ROLES_DISPONIBLES.filter((opcion) => opcion.valor !== "administrador");

  async function manejarEnvio(e) {
    e.preventDefault();
    setError("");
    setExito("");
    setCargando(true);

    try {
      const datos = await crearUsuario(nombre, correo, rol);
      setExito(datos.mensaje);
      setNombre("");
      setCorreo("");
      setRol("instructor");
    } catch (err) {
      const mensaje = err.response?.data?.mensaje || "No se pudo crear el usuario.";
      setError(mensaje);
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <Encabezado subtitulo="Crear usuario" />
      <div className="pagina">
        <div className="contenedor-auth">
          <h1>Crear usuario</h1>
          <p className="subtitulo">
            Se generará una contraseña temporal y se enviará por correo al nuevo usuario.
          </p>

          <form onSubmit={manejarEnvio} className="formulario-auth">
            <label htmlFor="nombre">Nombre completo</label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />

            <label htmlFor="correo">Correo electrónico</label>
            <input
              id="correo"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="correo@ejemplo.com"
              required
            />

            <label htmlFor="rol">Rol</label>
            <select id="rol" value={rol} onChange={(e) => setRol(e.target.value)}>
              {opcionesRol.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>
                  {opcion.etiqueta}
                </option>
              ))}
            </select>

            {error && <p className="mensaje-error">{error}</p>}
            {exito && <p className="mensaje-exito">{exito}</p>}

            <button type="submit" disabled={cargando}>
              {cargando ? "Creando..." : "Crear usuario"}
            </button>
          </form>

          <p className="enlace-secundario">
            <Link to="/panel">Volver al panel</Link>
          </p>
        </div>
      </div>
    </>
  );
}
