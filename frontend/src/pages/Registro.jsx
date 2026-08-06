import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Registro() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("instructor");
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);
  const [cargando, setCargando] = useState(false);

  const { registrar } = useAuth();
  const navigate = useNavigate();

  async function manejarEnvio(e) {
    e.preventDefault();
    setError("");
    setCargando(true);

    try {
      await registrar(nombre, correo, password, rol);
      setExito(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      const mensaje = err.response?.data?.mensaje || "No se pudo completar el registro.";
      setError(mensaje);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="contenedor-auth">
      <h1>Crear cuenta</h1>
      <p className="subtitulo">Sistema de Control de Vuelos — Escuela de Aviación Sagsa</p>

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
          placeholder="tu.correo@ejemplo.com"
          required
        />

        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />

        <label htmlFor="rol">Rol</label>
        <select id="rol" value={rol} onChange={(e) => setRol(e.target.value)}>
          <option value="administrador">Administrador</option>
          <option value="instructor">Instructor</option>
          <option value="alumno">Alumno</option>
        </select>

        {error && <p className="mensaje-error">{error}</p>}
        {exito && <p className="mensaje-exito">Cuenta creada. Redirigiendo al inicio de sesión...</p>}

        <button type="submit" disabled={cargando}>
          {cargando ? "Creando cuenta..." : "Registrarme"}
        </button>
      </form>

      <p className="enlace-secundario">
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </div>
  );
}
