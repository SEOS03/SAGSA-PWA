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

  async function crearUsuario(nombre, correo, rol) {
    const respuesta = await api.post("/usuarios/crear", { nombre, correo, rol });
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

  return (
    <AuthContext.Provider
      value={{ usuario, login, crearUsuario, cambiarPassword, cerrarSesion }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
