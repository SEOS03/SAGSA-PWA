import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import RutaProtegida from "./components/RutaProtegida";
import RutaSoloAdmin from "./components/RutaSoloAdmin";
import Login from "./pages/Login";
import CambiarPassword from "./pages/CambiarPassword";
import CrearUsuario from "./pages/CrearUsuario";
import Panel from "./pages/Panel";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
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
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
