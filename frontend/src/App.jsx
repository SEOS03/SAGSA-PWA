import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import RutaProtegida from "./components/RutaProtegida";
import RutaSoloAdmin from "./components/RutaSoloAdmin";
import RutaSoloSuperAdmin from "./components/RutaSoloSuperAdmin";
import RutaValidadorHorometro from "./components/RutaValidadorHorometro";
import RutaHistorialSolicitudes from "./components/RutaHistorialSolicitudes";
import RutaSoloAlumno from "./components/RutaSoloAlumno";
import RutaSoloInstructor from "./components/RutaSoloInstructor";
import Login from "./pages/Login";
import CambiarPassword from "./pages/CambiarPassword";
import CrearUsuario from "./pages/CrearUsuario";
import ConsultaUsuarios from "./pages/ConsultaUsuarios";
import SolicitarRecuperacion from "./pages/SolicitarRecuperacion";
import RestablecerPassword from "./pages/RestablecerPassword";
import Panel from "./pages/Panel";
import Recursos from "./pages/Recursos";
import RecursoFormulario from "./pages/RecursoFormulario";
import SolicitudesPendientes from "./pages/SolicitudesPendientes";
import HistorialSolicitudes from "./pages/HistorialSolicitudes";
import ValidarHorometro from "./pages/ValidarHorometro";
import PermisosValidacion from "./pages/PermisosValidacion";
import ReportesVuelos from "./pages/ReportesVuelos";
import MiProgreso from "./pages/MiProgreso";
import MisAlumnos from "./pages/MisAlumnos";
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
                <ConsultaUsuarios />
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
            path="/panel/historial-solicitudes"
            element={
              <RutaHistorialSolicitudes>
                <HistorialSolicitudes />
              </RutaHistorialSolicitudes>
            }
          />
          <Route
            path="/panel/validar-horometro"
            element={
              <RutaValidadorHorometro>
                <ValidarHorometro />
              </RutaValidadorHorometro>
            }
          />
          <Route
            path="/panel/permisos-validacion"
            element={
              <RutaSoloSuperAdmin>
                <PermisosValidacion />
              </RutaSoloSuperAdmin>
            }
          />
          <Route
            path="/panel/reportes-vuelos"
            element={
              <RutaSoloAdmin>
                <ReportesVuelos />
              </RutaSoloAdmin>
            }
          />
          <Route
            path="/panel/mi-progreso"
            element={
              <RutaSoloAlumno>
                <MiProgreso />
              </RutaSoloAlumno>
            }
          />
          <Route
            path="/panel/mis-alumnos"
            element={
              <RutaSoloInstructor>
                <MisAlumnos />
              </RutaSoloInstructor>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
