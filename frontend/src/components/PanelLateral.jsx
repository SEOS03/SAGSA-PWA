import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Lista de enlaces del panel lateral. Para agregar uno nuevo (Confirmaciones,
// Horómetro, Validar Horómetro, Mi Progreso, Lista de Prioridad, Gestionar
// Permisos, etc.) solo hace falta un objeto más aquí — `visible` es opcional
// y recibe el usuario autenticado para restringir por rol cuando aplique.
const ITEMS_NAV = [
  { etiqueta: "Calendario", ruta: "/panel" },
  { etiqueta: "Recursos", ruta: "/panel/recursos" },
  {
    etiqueta: "Historial de solicitudes",
    ruta: "/panel/historial-solicitudes",
    visible: (usuario) => usuario?.rol === "administrador" || usuario?.rol === "instructor",
  },
  { etiqueta: "Crear usuario", ruta: "/panel/crear-usuario", visible: (usuario) => usuario?.rol === "administrador" },
  { etiqueta: "Buscar usuario", ruta: "/panel/buscar-usuario", visible: (usuario) => usuario?.rol === "administrador" },
  {
    etiqueta: "Reportes de vuelos",
    ruta: "/panel/reportes-vuelos",
    visible: (usuario) => usuario?.rol === "administrador",
  },
  {
    etiqueta: "Permisos de Validación",
    ruta: "/panel/permisos-validacion",
    visible: (usuario) => usuario?.esSuperAdmin,
  },
];

export default function PanelLateral() {
  const [abierto, setAbierto] = useState(false);
  const { usuario, cerrarSesion } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const itemsVisibles = ITEMS_NAV.filter((item) => !item.visible || item.visible(usuario));

  function manejarSalida() {
    setAbierto(false);
    cerrarSesion();
    navigate("/login");
  }

  return (
    <>
      <button
        type="button"
        className="panel-lateral__boton"
        onClick={() => setAbierto(true)}
        aria-label="Abrir menú de navegación"
        aria-expanded={abierto}
      >
        <span className="panel-lateral__icono" />
      </button>

      {abierto && (
        <div className="panel-lateral__fondo" onClick={() => setAbierto(false)}>
          <nav className="panel-lateral" onClick={(e) => e.stopPropagation()} aria-label="Navegación principal">
            <div className="panel-lateral__cabecera">
              <span className="panel-lateral__titulo">Menú</span>
              <button
                type="button"
                className="panel-lateral__cerrar"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar menú"
              >
                ✕
              </button>
            </div>

            {itemsVisibles.map((item) => (
              <Link
                key={item.ruta}
                to={item.ruta}
                className={`panel-lateral__enlace ${
                  location.pathname === item.ruta ? "panel-lateral__enlace--activo" : ""
                }`}
                onClick={() => setAbierto(false)}
              >
                {item.etiqueta}
              </Link>
            ))}

            <button type="button" className="panel-lateral__salir" onClick={manejarSalida}>
              Cerrar sesión
            </button>
          </nav>
        </div>
      )}
    </>
  );
}
