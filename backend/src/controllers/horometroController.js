const { sequelize, Vuelo, Recurso, User, LecturaHorometro, ProgresoAlumno, Programa } = require("../models");
const actualizarEstadoPorHora = require("../utils/actualizarEstadoPorHora");

const TOLERANCIA_HORAS = 0.1;

// El reporte de horómetro se hace después del vuelo, así que para cuando
// alguien lo reporta, fechaHora casi siempre ya pasó y el vuelo pudo haber
// transicionado a "en_curso" automáticamente (ver actualizarEstadoPorHora) —
// se acepta en ambos estados, no solo "confirmado".
const ESTADOS_VUELO_PARA_HOROMETRO = ["confirmado", "en_curso"];

const CAMPOS_POR_ROL = {
  instructor: { inicial: "horometroInicialInstructor", final: "horometroFinalInstructor" },
  alumno: { inicial: "horometroInicialAlumno", final: "horometroFinalAlumno" },
};

const INCLUDE_VALIDADOR = [{ model: User, as: "validador", attributes: ["id", "nombre"] }];

// Recalcula las verificaciones informativas y decide si el registro ya
// puede pasar a "pendiente_validacion". No aplica ningún cambio a Recurso
// ni a ProgresoAlumno — eso solo ocurre al validar, nunca aquí.
function actualizarVerificaciones(registro) {
  // Ojo: en una instancia recién creada (antes de un save/reload real
  // contra la BD), un campo no asignado explícitamente queda "undefined"
  // en memoria, no "null". Por eso la comparación es "!= null" (laxa,
  // cubre ambos) y no "!== null" — con la estricta, el registro se
  // marcaba "ambos presentes" apenas reportaba uno solo de los dos.
  const ambosPresentes =
    registro.horometroInicialInstructor != null &&
    registro.horometroFinalInstructor != null &&
    registro.horometroInicialAlumno != null &&
    registro.horometroFinalAlumno != null;

  if (!ambosPresentes) return;

  const coincidenciaHorometroInicial =
    Number(registro.horometroInicialInstructor) === Number(registro.horometroInicialAlumno) &&
    Number(registro.horometroInicialAlumno) === Number(registro.horometroInicialSistema);

  const finalesCoinciden =
    Math.abs(Number(registro.horometroFinalInstructor) - Number(registro.horometroFinalAlumno)) <= TOLERANCIA_HORAS;

  const duracionCoincide =
    registro.horasSesionReportadas != null &&
    Math.abs(
      Number(registro.horometroFinalInstructor) -
        Number(registro.horometroInicialInstructor) -
        Number(registro.horasSesionReportadas)
    ) <= TOLERANCIA_HORAS;

  const coherenciaHorometroFinal = finalesCoinciden && duracionCoincide;

  registro.coincidenciaHorometroInicial = coincidenciaHorometroInicial;
  registro.coherenciaHorometroFinal = coherenciaHorometroFinal;
  registro.diferenciaDetectada = !coincidenciaHorometroInicial || !coherenciaHorometroFinal;

  if (registro.estado !== "validado") {
    registro.estado = "pendiente_validacion";
  }
}

// Lógica compartida por los 2 endpoints de reporte (instructor y alumno):
// valida permiso y estado del vuelo, crea el registro si no existe, y
// guarda solo los campos que le corresponden a ese rol.
async function registrarHorometro(req, res, rolReporte) {
  try {
    const vuelo = await Vuelo.findByPk(req.params.id);
    if (!vuelo) {
      return res.status(404).json({ mensaje: "Vuelo no encontrado." });
    }

    const idAsignado = rolReporte === "instructor" ? vuelo.instructorId : vuelo.alumnoId;
    if (Number(req.usuario.id) !== Number(idAsignado)) {
      return res.status(403).json({
        mensaje: `Solo el ${rolReporte} asignado a este vuelo puede registrar su horómetro.`,
      });
    }

    if (!ESTADOS_VUELO_PARA_HOROMETRO.includes(vuelo.estado)) {
      return res.status(409).json({
        mensaje: `El vuelo debe estar "confirmado" o "en_curso" para registrar el horómetro (estado actual: "${vuelo.estado}").`,
      });
    }

    const { horometroInicial, horometroFinal, horasSesionReportadas, observaciones } = req.body;

    if (horometroInicial === undefined || horometroInicial === null || horometroFinal === undefined || horometroFinal === null) {
      return res.status(400).json({ mensaje: "horometroInicial y horometroFinal son obligatorios." });
    }

    if (rolReporte === "instructor" && (horasSesionReportadas === undefined || horasSesionReportadas === null)) {
      return res.status(400).json({ mensaje: "horasSesionReportadas es obligatorio para el reporte del instructor." });
    }

    let registro = await LecturaHorometro.findOne({ where: { vueloId: vuelo.id } });

    if (!registro) {
      const recurso = await Recurso.findByPk(vuelo.recursoId);
      registro = await LecturaHorometro.create({
        vueloId: vuelo.id,
        recursoId: vuelo.recursoId,
        horometroInicialSistema: recurso.horasAcumuladas,
      });
    }

    if (registro.estado === "validado") {
      return res.status(409).json({ mensaje: "Este registro de horómetro ya fue validado y no se puede modificar." });
    }

    const campos = CAMPOS_POR_ROL[rolReporte];
    registro[campos.inicial] = horometroInicial;
    registro[campos.final] = horometroFinal;

    if (rolReporte === "instructor") {
      registro.horasSesionReportadas = horasSesionReportadas;
    }

    if (observaciones !== undefined) {
      registro.observaciones = observaciones;
    }

    actualizarVerificaciones(registro);
    await registro.save();

    return res.json({
      mensaje: `Reporte de horómetro del ${rolReporte} registrado correctamente.`,
      registro,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al registrar el horómetro." });
  }
}

// POST /api/vuelos/:id/horometro-instructor (solo el instructor asignado)
async function registrarHorometroInstructor(req, res) {
  return registrarHorometro(req, res, "instructor");
}

// POST /api/vuelos/:id/horometro-alumno (solo el alumno asignado)
async function registrarHorometroAlumno(req, res) {
  return registrarHorometro(req, res, "alumno");
}

// GET /api/vuelos/:id/horometro (cualquier rol autenticado)
async function obtenerHorometro(req, res) {
  try {
    const vuelo = await Vuelo.findByPk(req.params.id);
    if (!vuelo) {
      return res.status(404).json({ mensaje: "Vuelo no encontrado." });
    }

    const registro = await LecturaHorometro.findOne({
      where: { vueloId: vuelo.id },
      include: INCLUDE_VALIDADOR,
    });

    if (!registro) {
      return res.status(404).json({ mensaje: "Este vuelo todavía no tiene registro de horómetro." });
    }

    return res.json({ mensaje: "Registro de horómetro obtenido correctamente.", registro });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al obtener el registro de horómetro." });
  }
}

// GET /api/vuelos/horometros/pendientes-validacion
// (super admin siempre; administrador regular solo con puedeValidarHorometro)
// Reemplaza el patrón anterior de listar vuelos "confirmado" y consultar el
// horómetro de cada uno por separado: aquí se trae todo en una sola consulta,
// desde LecturaHorometro con el Vuelo (y sus relaciones) incluido.
async function listarPendientesValidacion(req, res) {
  try {
    const esSuperAdmin = !!req.usuario.esSuperAdmin;
    let tienePermiso = esSuperAdmin;

    if (!esSuperAdmin) {
      // Igual que en validarHorometro: se relee de la base de datos, no del
      // token, porque el permiso debe poder revocarse de inmediato.
      const usuarioActual = await User.findByPk(req.usuario.id);
      tienePermiso = !!usuarioActual?.puedeValidarHorometro;
    }

    if (!tienePermiso) {
      return res
        .status(403)
        .json({ mensaje: "No tiene permisos para consultar los registros pendientes de validación." });
    }

    // No se filtra nada más por permiso: un administrador con el permiso ve
    // exactamente los mismos registros que el super admin, discrepancias
    // incluidas — el frontend decide si le muestra el botón de validar.
    const registros = await LecturaHorometro.findAll({
      where: { estado: "pendiente_validacion" },
      include: [
        {
          model: Vuelo,
          required: true,
          include: [
            { model: Recurso, as: "recurso", attributes: ["id", "matricula"] },
            { model: User, as: "instructor", attributes: ["id", "nombre"] },
            { model: User, as: "alumno", attributes: ["id", "nombre"] },
          ],
        },
      ],
      order: [[{ model: Vuelo }, "fechaHora", "ASC"]],
    });

    await Promise.all(registros.map((registro) => actualizarEstadoPorHora(registro.Vuelo)));

    const pendientes = registros.map((registro) => ({
      vueloId: registro.vueloId,
      recurso: registro.Vuelo.recurso
        ? { id: registro.Vuelo.recurso.id, matricula: registro.Vuelo.recurso.matricula }
        : null,
      instructor: registro.Vuelo.instructor
        ? { id: registro.Vuelo.instructor.id, nombre: registro.Vuelo.instructor.nombre }
        : null,
      alumno: registro.Vuelo.alumno ? { id: registro.Vuelo.alumno.id, nombre: registro.Vuelo.alumno.nombre } : null,
      fechaHora: registro.Vuelo.fechaHora,
      horometroInicialSistema: registro.horometroInicialSistema,
      horometroInicialInstructor: registro.horometroInicialInstructor,
      horometroFinalInstructor: registro.horometroFinalInstructor,
      horometroInicialAlumno: registro.horometroInicialAlumno,
      horometroFinalAlumno: registro.horometroFinalAlumno,
      horasSesionReportadas: registro.horasSesionReportadas,
      observaciones: registro.observaciones,
      coincidenciaHorometroInicial: registro.coincidenciaHorometroInicial,
      coherenciaHorometroFinal: registro.coherenciaHorometroFinal,
    }));

    return res.json({ mensaje: "Registros pendientes de validación obtenidos correctamente.", pendientes });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al obtener los registros pendientes de validación." });
  }
}

// PUT /api/vuelos/:id/horometro/validar
// (super admin, o administrador con puedeValidarHorometro=true — y solo el
// super admin si coincidenciaHorometroInicial es false)
async function validarHorometro(req, res) {
  const vuelo = await Vuelo.findByPk(req.params.id);
  if (!vuelo) {
    return res.status(404).json({ mensaje: "Vuelo no encontrado." });
  }

  const transaction = await sequelize.transaction();

  try {
    const registro = await LecturaHorometro.findOne({
      where: { vueloId: vuelo.id },
      include: INCLUDE_VALIDADOR,
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!registro) {
      await transaction.rollback();
      return res.status(404).json({ mensaje: "Este vuelo todavía no tiene registro de horómetro." });
    }

    if (registro.estado === "validado") {
      await transaction.rollback();
      return res.status(409).json({
        mensaje: `Este registro ya fue validado por ${registro.validador?.nombre || "otro usuario"} el ${registro.fechaValidacion}.`,
        registro,
      });
    }

    if (registro.estado !== "pendiente_validacion") {
      await transaction.rollback();
      return res.status(409).json({
        mensaje: `El registro debe estar "pendiente_validacion" para poder validarse (estado actual: "${registro.estado}"; faltan reportes por completar).`,
      });
    }

    // El super admin siempre puede validar. Un administrador regular
    // necesita puedeValidarHorometro=true — se relee de la base de datos
    // (no del token) porque este permiso debe poder revocarse de inmediato.
    const esSuperAdmin = !!req.usuario.esSuperAdmin;
    let tienePermisoValidar = esSuperAdmin;

    if (!esSuperAdmin) {
      const usuarioActual = await User.findByPk(req.usuario.id, { transaction });
      tienePermisoValidar = !!usuarioActual?.puedeValidarHorometro;
    }

    if (!tienePermisoValidar) {
      await transaction.rollback();
      return res.status(403).json({ mensaje: "No tiene permisos para validar registros de horómetro." });
    }

    if (!registro.coincidenciaHorometroInicial && !esSuperAdmin) {
      await transaction.rollback();
      return res.status(403).json({
        mensaje:
          "Los horómetros iniciales no coinciden entre instructor, alumno y sistema: solo el super administrador puede validar este registro.",
      });
    }

    // Se aplica SIEMPRE el horómetro final del instructor; el del alumno
    // queda solo como referencia histórica dentro del registro.
    const recurso = await Recurso.findByPk(vuelo.recursoId, { transaction });
    recurso.horasAcumuladas = registro.horometroFinalInstructor;
    await recurso.save({ transaction });

    const progreso = await ProgresoAlumno.findOne({
      where: { alumnoId: vuelo.alumnoId },
      include: [{ model: Programa, where: { nombre: "piloto_privado" } }],
      transaction,
    });

    if (progreso) {
      const horasSesion = Number(registro.horasSesionReportadas);

      if (recurso.tipoRecurso === "simulador") {
        progreso.horasSimuladorAcumuladas = Number(progreso.horasSimuladorAcumuladas) + horasSesion;
      } else {
        progreso.horasAvionAcumuladas = Number(progreso.horasAvionAcumuladas) + horasSesion;
      }

      if (vuelo.leccionProgramada !== null && vuelo.leccionProgramada !== undefined) {
        progreso.leccionActual = Math.max(Number(progreso.leccionActual), Number(vuelo.leccionProgramada));

        const leccionSolo = progreso.Programa?.leccionSolo;
        if (leccionSolo !== null && leccionSolo !== undefined && Number(vuelo.leccionProgramada) >= Number(leccionSolo)) {
          progreso.vueloSoloCompletado = true;
        }
      }

      await progreso.save({ transaction });
    } else {
      console.warn(
        `Aviso: el alumno #${vuelo.alumnoId} no tiene ProgresoAlumno en piloto_privado; se validó el horómetro sin actualizar su progreso.`
      );
    }

    registro.estado = "validado";
    registro.validadoPor = req.usuario.id;
    registro.fechaValidacion = new Date();
    await registro.save({ transaction });

    vuelo.estado = "finalizado";
    await vuelo.save({ transaction });

    await transaction.commit();

    const registroFinal = await LecturaHorometro.findOne({
      where: { vueloId: vuelo.id },
      include: INCLUDE_VALIDADOR,
    });

    return res.json({
      mensaje: "Horómetro validado correctamente. El vuelo quedó finalizado.",
      registro: registroFinal,
      recurso,
      progreso,
    });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    return res.status(500).json({ mensaje: "Error al validar el horómetro." });
  }
}

module.exports = {
  registrarHorometroInstructor,
  registrarHorometroAlumno,
  obtenerHorometro,
  listarPendientesValidacion,
  validarHorometro,
};
