const { Op } = require("sequelize");
const { Vuelo, Recurso, User, LecturaHorometro, ProgresoAlumno, Programa } = require("../models");
const actualizarEstadoPorHora = require("../utils/actualizarEstadoPorHora");

const ESTADOS_PROGRAMA_ACTIVOS = ["en_curso", "pendiente_chequeo"];

const INCLUDE_REPORTE_VUELOS = [
  { model: Recurso, as: "recurso", attributes: ["id", "matricula", "tipoRecurso"] },
  { model: User, as: "instructor", attributes: ["id", "nombre"] },
  { model: User, as: "alumno", attributes: ["id", "nombre"] },
  { model: User, as: "canceladoPorUsuario", attributes: ["id", "nombre"] },
  {
    model: LecturaHorometro,
    required: false,
    include: [{ model: User, as: "validador", attributes: ["id", "nombre"] }],
  },
];

// Un vuelo no guarda su programaId directamente: el "programa" se infiere
// del ProgresoAlumno del alumno. Un alumno puede tener inscripciones
// activas en varios programas a la vez (ver progresoController), así que
// no hay una respuesta 100% inequívoca — se prefiere la inscripción activa
// más reciente y, si no tiene ninguna, la más reciente en cualquier estado.
// Se resuelve en un solo query por lote (no N+1 por vuelo).
async function resolverProgramaPorAlumno(alumnoIds) {
  if (alumnoIds.length === 0) return {};

  const progresos = await ProgresoAlumno.findAll({
    where: { alumnoId: { [Op.in]: alumnoIds } },
    include: [{ model: Programa }],
    order: [["fechaInicio", "DESC"]],
  });

  const activoPorAlumno = {};
  const cualquieraPorAlumno = {};
  for (const p of progresos) {
    if (!cualquieraPorAlumno[p.alumnoId]) cualquieraPorAlumno[p.alumnoId] = p;
    if (!activoPorAlumno[p.alumnoId] && ESTADOS_PROGRAMA_ACTIVOS.includes(p.estadoPrograma)) {
      activoPorAlumno[p.alumnoId] = p;
    }
  }

  const resultado = {};
  for (const alumnoId of alumnoIds) {
    const elegido = activoPorAlumno[alumnoId] || cualquieraPorAlumno[alumnoId];
    resultado[alumnoId] = elegido?.Programa?.nombre || null;
  }
  return resultado;
}

function calcularResumen(filas) {
  const resumen = {
    totalVuelos: filas.length,
    totalFinalizados: 0,
    totalCancelados: 0,
    totalOtrosEstados: 0,
    totalHoras: 0,
    totalHorasSimulador: 0,
    totalHorasAvion: 0,
  };

  for (const fila of filas) {
    if (fila.estado === "finalizado") resumen.totalFinalizados++;
    else if (fila.estado === "cancelado") resumen.totalCancelados++;
    else resumen.totalOtrosEstados++;

    // "finalizado" solo ocurre cuando su horómetro ya fue validado (ver
    // horometroController.validarHorometro: ambos cambios de estado pasan
    // juntos, en la misma transacción) — chequear el estado del vuelo
    // alcanza, sin necesitar leer el estado de LecturaHorometro aparte.
    if (fila.estado === "finalizado" && fila.horasSesionReportadas != null) {
      const horas = Number(fila.horasSesionReportadas);
      resumen.totalHoras += horas;
      if (fila.recurso?.tipoRecurso === "simulador") resumen.totalHorasSimulador += horas;
      else resumen.totalHorasAvion += horas;
    }
  }

  resumen.totalHoras = Number(resumen.totalHoras.toFixed(2));
  resumen.totalHorasSimulador = Number(resumen.totalHorasSimulador.toFixed(2));
  resumen.totalHorasAvion = Number(resumen.totalHorasAvion.toFixed(2));
  return resumen;
}

// GET /api/reportes/vuelos?tipo=alumno|aeronave&alumnoId=&recursoId=&desde=&hasta=
// (administrador regular o super admin — ver reporteRoutes.js)
async function listarReporteVuelos(req, res) {
  try {
    const { tipo, alumnoId, recursoId, desde, hasta } = req.query;
    const filtro = {};

    if (tipo === "alumno" && alumnoId) filtro.alumnoId = alumnoId;
    if (tipo === "aeronave" && recursoId) filtro.recursoId = recursoId;

    if (desde || hasta) {
      filtro.fechaHora = {};
      if (desde) filtro.fechaHora[Op.gte] = new Date(desde);
      if (hasta) filtro.fechaHora[Op.lte] = new Date(hasta);
    }

    const vuelos = await Vuelo.findAll({
      where: filtro,
      include: INCLUDE_REPORTE_VUELOS,
      order: [["fechaHora", "ASC"]],
    });
    await Promise.all(vuelos.map((v) => actualizarEstadoPorHora(v)));

    const alumnoIds = [...new Set(vuelos.map((v) => v.alumnoId))];
    const programaPorAlumno = await resolverProgramaPorAlumno(alumnoIds);

    const filas = vuelos.map((vuelo) => {
      const registro = vuelo.LecturaHorometro || null;
      return {
        id: vuelo.id,
        fechaHora: vuelo.fechaHora,
        duracionMinutos: vuelo.duracionMinutos,
        estado: vuelo.estado,
        alumno: vuelo.alumno ? { id: vuelo.alumno.id, nombre: vuelo.alumno.nombre } : null,
        instructor: vuelo.instructor ? { id: vuelo.instructor.id, nombre: vuelo.instructor.nombre } : null,
        recurso: vuelo.recurso
          ? { id: vuelo.recurso.id, matricula: vuelo.recurso.matricula, tipoRecurso: vuelo.recurso.tipoRecurso }
          : null,
        programa: programaPorAlumno[vuelo.alumnoId] || null,
        leccionProgramada: vuelo.leccionProgramada,
        motivoCancelacion: vuelo.motivoCancelacion,
        canceladoPor: vuelo.canceladoPorUsuario
          ? { id: vuelo.canceladoPorUsuario.id, nombre: vuelo.canceladoPorUsuario.nombre }
          : null,
        horometroInicialSistema: registro?.horometroInicialSistema ?? null,
        horometroInicialInstructor: registro?.horometroInicialInstructor ?? null,
        horometroFinalInstructor: registro?.horometroFinalInstructor ?? null,
        horometroInicialAlumno: registro?.horometroInicialAlumno ?? null,
        horometroFinalAlumno: registro?.horometroFinalAlumno ?? null,
        horasSesionReportadas: registro?.horasSesionReportadas ?? null,
        coincidenciaHorometroInicial: registro?.coincidenciaHorometroInicial ?? null,
        coherenciaHorometroFinal: registro?.coherenciaHorometroFinal ?? null,
        validadoPor: registro?.validador ? { id: registro.validador.id, nombre: registro.validador.nombre } : null,
        fechaValidacion: registro?.fechaValidacion ?? null,
      };
    });

    return res.json({
      mensaje: "Reporte de vuelos generado correctamente.",
      vuelos: filas,
      resumen: calcularResumen(filas),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al generar el reporte de vuelos." });
  }
}

module.exports = { listarReporteVuelos };
