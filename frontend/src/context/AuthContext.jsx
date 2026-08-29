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

  async function listarMisSolicitudes() {
    const respuesta = await api.get("/solicitudes/mias");
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

  return (
    <AuthContext.Provider
      value={{
        usuario,
        login,
        crearUsuario,
        cambiarPassword,
        cerrarSesion,
        buscarUsuarioPorDpi,
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
        listarMisSolicitudes,
        aprobarSolicitud,
        rechazarSolicitud,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
