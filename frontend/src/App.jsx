import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import RutaProtegida from "./components/RutaProtegida";
import RutaSoloAdmin from "./components/RutaSoloAdmin";
import RutaSoloSuperAdmin from "./components/RutaSoloSuperAdmin";
import Login from "./pages/Login";
import CambiarPassword from "./pages/CambiarPassword";
import CrearUsuario from "./pages/CrearUsuario";
import BuscarUsuarioPorDpi from "./pages/BuscarUsuarioPorDpi";
import SolicitarRecuperacion from "./pages/SolicitarRecuperacion";
import RestablecerPassword from "./pages/RestablecerPassword";
import Panel from "./pages/Panel";
import Recursos from "./pages/Recursos";
import RecursoFormulario from "./pages/RecursoFormulario";
import SolicitudesPendientes from "./pages/SolicitudesPendientes";
import MisSolicitudes from "./pages/MisSolicitudes";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/recuperar-password" element={<SolicitarRecuperacion />} />
          <Route path="/restablecer-password" element={<RestablecerPassword />} />
          <Route
            path="/cambiar-password"
            element={
              <RutaProtegida>
                <CambiarPassword />
              </RutaProtegida>
            }
          />
          <Route
            path="/panel"
            element={
              <RutaProtegida>
                <Panel />
              </RutaProtegida>
            }
          />
          <Route
            path="/panel/crear-usuario"
            element={
              <RutaSoloAdmin>
                <CrearUsuario />
              </RutaSoloAdmin>
            }
          />
          <Route
            path="/panel/buscar-usuario"
            element={
              <RutaSoloAdmin>
                <BuscarUsuarioPorDpi />
              </RutaSoloAdmin>
            }
          />
          <Route
            path="/panel/recursos"
            element={
              <RutaProtegida>
                <Recursos />
              </RutaProtegida>
            }
          />
          <Route
            path="/panel/recursos/nuevo"
            element={
              <RutaSoloSuperAdmin>
                <RecursoFormulario />
              </RutaSoloSuperAdmin>
            }
          />
          <Route
            path="/panel/recursos/:id/editar"
            element={
              <RutaSoloSuperAdmin>
                <RecursoFormulario />
              </RutaSoloSuperAdmin>
            }
          />
          <Route
            path="/panel/solicitudes"
            element={
              <RutaSoloSuperAdmin>
                <SolicitudesPendientes />
              </RutaSoloSuperAdmin>
            }
          />
          <Route
            path="/panel/mis-solicitudes"
            element={
              <RutaSoloAdmin>
                <MisSolicitudes />
              </RutaSoloAdmin>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
