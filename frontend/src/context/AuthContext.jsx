import { createContext, useContext, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const guardado = localStorage.getItem("usuario");
    return guardado ? JSON.parse(guardado) : null;
  });

  async function login(correo, password) {
    const respuesta = await api.post("/auth/login", { correo, password });
    const { token, usuario: datosUsuario } = respuesta.data;

    localStorage.setItem("token", token);
    localStorage.setItem("usuario", JSON.stringify(datosUsuario));
    setUsuario(datosUsuario);

    return datosUsuario;
  }

  async function crearUsuario(nombre, correo, rol, dpi) {
    const respuesta = await api.post("/usuarios/crear", { nombre, correo, rol, dpi });
    return respuesta.data;
  }

  async function buscarUsuarioPorDpi(dpi) {
    const respuesta = await api.get(`/usuarios/buscar-por-dpi/${dpi}`);
    return respuesta.data;
  }

  async function listarUsuariosPorRol(rol) {
    const respuesta = await api.get("/usuarios", { params: { rol } });
    return respuesta.data;
  }

  async function solicitarRecuperacion(correo) {
    const respuesta = await api.post("/auth/solicitar-recuperacion", { correo });
    return respuesta.data;
  }

  async function restablecerPassword(token, nuevaPassword) {
    const respuesta = await api.post("/auth/restablecer-password", { token, nuevaPassword });
    return respuesta.data;
  }

  async function cambiarPassword(passwordActual, passwordNueva) {
    await api.post("/auth/cambiar-password", { passwordActual, passwordNueva });

    const actualizado = { ...usuario, debeCambiarPassword: false };
    localStorage.setItem("usuario", JSON.stringify(actualizado));
    setUsuario(actualizado);
  }

  function cerrarSesion() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    setUsuario(null);
  }

  // ---------- Módulo 2: Recursos (aeronaves y simuladores) ----------

  async function listarRecursos(tipoRecurso) {
    const respuesta = await api.get("/recursos", { params: tipoRecurso ? { tipoRecurso } : {} });
    return respuesta.data;
  }

  async function obtenerRecurso(id) {
    const respuesta = await api.get(`/recursos/${id}`);
    return respuesta.data;
  }

  async function crearRecurso(datos) {
    const respuesta = await api.post("/recursos", datos);
    return respuesta.data;
  }

  async function actualizarRecurso(id, datos) {
    const respuesta = await api.put(`/recursos/${id}`, datos);
    return respuesta.data;
  }

  async function darDeBajaRecurso(id) {
    const respuesta = await api.delete(`/recursos/${id}`);
    return respuesta.data;
  }

  async function cambiarEstadoRecurso(id, estado) {
    const respuesta = await api.patch(`/recursos/${id}/estado`, { estado });
    return respuesta.data;
  }

  async function actualizarHorasRecurso(id, horasAcumuladas) {
    const respuesta = await api.patch(`/recursos/${id}/horas`, { horasAcumuladas });
    return respuesta.data;
  }

  async function registrarMantenimiento(recursoId, datos) {
    const respuesta = await api.post(`/recursos/${recursoId}/mantenimientos`, datos);
    return respuesta.data;
  }

  async function listarMantenimientos(recursoId) {
    const respuesta = await api.get(`/recursos/${recursoId}/mantenimientos`);
    return respuesta.data;
  }

  async function finalizarMantenimiento(mantenimientoId, datos) {
    const respuesta = await api.put(`/mantenimientos/${mantenimientoId}/finalizar`, datos);
    return respuesta.data;
  }

  async function listarSolicitudesPendientes() {
    const respuesta = await api.get("/solicitudes", { params: { estado: "pendiente" } });
    return respuesta.data;
  }

  async function listarHistorialSolicitudes() {
    const respuesta = await api.get("/solicitudes", { params: { estado: "aprobada,rechazada" } });
    return respuesta.data;
  }

  async function aprobarSolicitud(id) {
    const respuesta = await api.put(`/solicitudes/${id}/aprobar`);
    return respuesta.data;
  }

  async function rechazarSolicitud(id, motivoRechazo) {
    const respuesta = await api.put(`/solicitudes/${id}/rechazar`, { motivoRechazo });
    return respuesta.data;
  }

  // ---------- Módulo 3: Vuelos ----------

  async function listarVuelos(filtros) {
    const respuesta = await api.get("/vuelos", { params: filtros });
    return respuesta.data;
  }

  async function obtenerVuelo(id) {
    const respuesta = await api.get(`/vuelos/${id}`);
    return respuesta.data;
  }

  async function crearVuelo(datos) {
    const respuesta = await api.post("/vuelos", datos);
    return respuesta.data;
  }

  async function cancelarVuelo(id, motivoCancelacion) {
    const respuesta = await api.patch(`/vuelos/${id}/cancelar`, { motivoCancelacion });
    return respuesta.data;
  }

  async function confirmarInstructor(id) {
    const respuesta = await api.patch(`/vuelos/${id}/confirmar-instructor`);
    return respuesta.data;
  }

  async function confirmarAlumno(id) {
    const respuesta = await api.patch(`/vuelos/${id}/confirmar-alumno`);
    return respuesta.data;
  }

  async function aprobarVueloSuperAdmin(id) {
    const respuesta = await api.patch(`/vuelos/${id}/aprobar-superadmin`);
    return respuesta.data;
  }

  async function registrarHorometroInstructor(id, datos) {
    const respuesta = await api.post(`/vuelos/${id}/horometro-instructor`, datos);
    return respuesta.data;
  }

  async function registrarHorometroAlumno(id, datos) {
    const respuesta = await api.post(`/vuelos/${id}/horometro-alumno`, datos);
    return respuesta.data;
  }

  async function obtenerHorometro(id) {
    const respuesta = await api.get(`/vuelos/${id}/horometro`);
    return respuesta.data;
  }

  async function listarHorometrosPendientesValidacion() {
    const respuesta = await api.get("/vuelos/horometros/pendientes-validacion");
    return respuesta.data;
  }

  async function validarHorometro(id) {
    const respuesta = await api.put(`/vuelos/${id}/horometro/validar`);
    return respuesta.data;
  }

  async function otorgarPermisoValidarHorometro(id, puedeValidarHorometro) {
    const respuesta = await api.patch(`/usuarios/${id}/permiso-validar-horometro`, { puedeValidarHorometro });
    return respuesta.data;
  }

  async function listarPrioridadAlumnos() {
    const respuesta = await api.get("/alumnos/lista-prioridad");
    return respuesta.data;
  }

  // ---------- Progreso de alumnos (inscripción a programas) ----------

  async function listarProgramas() {
    const respuesta = await api.get("/programas");
    return respuesta.data;
  }

  async function inscribirAlumno(datos) {
    const respuesta = await api.post("/progreso", datos);
    return respuesta.data;
  }

  async function listarProgresoDeAlumno(alumnoId) {
    const respuesta = await api.get("/progreso", { params: { alumnoId } });
    return respuesta.data;
  }

  async function reasignarInstructorProgreso(id, instructorAsignadoId) {
    const respuesta = await api.patch(`/progreso/${id}/instructor`, { instructorAsignadoId });
    return respuesta.data;
  }

  // ---------- Sprint 4: Reportes ----------

  async function listarReporteVuelos(filtros) {
    const respuesta = await api.get("/reportes/vuelos", { params: filtros });
    return respuesta.data;
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        login,
        crearUsuario,
        cambiarPassword,
        cerrarSesion,
        buscarUsuarioPorDpi,
        listarUsuariosPorRol,
        solicitarRecuperacion,
        restablecerPassword,
        listarRecursos,
        obtenerRecurso,
        crearRecurso,
        actualizarRecurso,
        darDeBajaRecurso,
        cambiarEstadoRecurso,
        actualizarHorasRecurso,
        registrarMantenimiento,
        listarMantenimientos,
        finalizarMantenimiento,
        listarSolicitudesPendientes,
        listarHistorialSolicitudes,
        aprobarSolicitud,
        rechazarSolicitud,
        listarVuelos,
        obtenerVuelo,
        crearVuelo,
        cancelarVuelo,
        confirmarInstructor,
        confirmarAlumno,
        aprobarVueloSuperAdmin,
        registrarHorometroInstructor,
        registrarHorometroAlumno,
        obtenerHorometro,
        listarHorometrosPendientesValidacion,
        validarHorometro,
        otorgarPermisoValidarHorometro,
        listarPrioridadAlumnos,
        listarProgramas,
        inscribirAlumno,
        listarProgresoDeAlumno,
        reasignarInstructorProgreso,
        listarReporteVuelos,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
