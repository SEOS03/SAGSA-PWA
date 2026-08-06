export default function Encabezado({ subtitulo }) {
  return (
    <header className="encabezado">
      <div className="encabezado__marca">
        <img
          src="/branding/sagsa_logo.jpg"
          alt="Escudo Sagsa Academy"
          className="encabezado__logo"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <div className="encabezado__texto">
          <span className="encabezado__titulo">Sagsa Academy</span>
          {subtitulo && <span className="encabezado__subtitulo">{subtitulo}</span>}
        </div>
      </div>
    </header>
  );
}
