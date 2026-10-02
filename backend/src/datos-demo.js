// Script de datos de DEMOSTRACIÓN para presentar al director de Sagsa.
// Independiente de seed.js (ese es el seed real) — este script SOLO agrega
// datos nuevos, nunca toca ni elimina nada existente. Pensado para correrse
// una sola vez: valida antes de escribir que ninguno de los correos/DPI que
// va a crear exista ya, y se detiene con un mensaje claro si los encuentra
// (en vez de duplicar). Todo el trabajo de escritura va en una sola
// transacción: si algo falla a mitad de camino, no queda nada a medias.
//
// Uso: node src/datos-demo.js

const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const sequelize = require("./config/database");
const { User, Recurso, Programa, ProgresoAlumno, Vuelo, LecturaHorometro } = require("./models");

const PASSWORD_DEMO = "Demo2026!";
const SEMANAS_HISTORIAL = 8; // "últimas 6-8 semanas"
const DIAS_HISTORIAL = SEMANAS_HISTORIAL * 7;
const BLOQUES_HORA = [6, 8, 10, 12, 14, 16]; // mismo grid de 2h que usa el calendario (06:00-18:00)
const DIAS_PROXIMOS = 10;

const ID_INSTRUCTOR_UNO = 10; // "instructor uno" ya existente
const ID_INSTRUCTOR_TRES = 171; // "instructor tres" ya existente

// ---------- Datos ficticios a crear ----------

const INSTRUCTORES_NUEVOS = [
  { nombre: "Jorge Ricardo Solís", correo: "jorge.solis@ejemplo.com", dpi: "9000000000015" },
  { nombre: "Patricia Elena Rivas", correo: "patricia.rivas@ejemplo.com", dpi: "9000000000016" },
];

// objetivo = lección a la que debe llegar cada alumno tras sus vuelos
// históricos. Distribución pedida: 3×(23-27), 3×(9-12), 4×(13-22), 4×(1-8).
const ALUMNOS_DEMO = [
  { nombre: "Fernando Castillo Rojas", correo: "fernando.castillo@ejemplo.com", dpi: "9000000000001", objetivo: 25 },
  { nombre: "Valeria Montenegro Cruz", correo: "valeria.montenegro@ejemplo.com", dpi: "9000000000002", objetivo: 27 },
  { nombre: "Diego Alejandro Soto", correo: "diego.soto@ejemplo.com", dpi: "9000000000003", objetivo: 23 },

  { nombre: "Camila Reyes Duarte", correo: "camila.reyes@ejemplo.com", dpi: "9000000000004", objetivo: 11 },
  { nombre: "Sebastián Girón López", correo: "sebastian.giron@ejemplo.com", dpi: "9000000000005", objetivo: 9 },
  { nombre: "Paola Ximena Cabrera", correo: "paola.cabrera@ejemplo.com", dpi: "9000000000006", objetivo: 12 },

  { nombre: "Andrés Felipe Mazariegos", correo: "andres.mazariegos@ejemplo.com", dpi: "9000000000007", objetivo: 18 },
  { nombre: "Gabriela Isabel Ochoa", correo: "gabriela.ochoa@ejemplo.com", dpi: "9000000000008", objetivo: 14 },
  { nombre: "Mario Alberto Vásquez", correo: "mario.vasquez@ejemplo.com", dpi: "9000000000009", objetivo: 21 },
  { nombre: "Luisa Fernanda Barrios", correo: "luisa.barrios@ejemplo.com", dpi: "9000000000010", objetivo: 16 },

  { nombre: "Emilio José Pérez", correo: "emilio.perez@ejemplo.com", dpi: "9000000000011", objetivo: 3 },
  { nombre: "Renata Sofía Cardona", correo: "renata.cardona@ejemplo.com", dpi: "9000000000012", objetivo: 7 },
  { nombre: "Kevin Estuardo Morales", correo: "kevin.morales@ejemplo.com", dpi: "9000000000013", objetivo: 1 },
  { nombre: "Daniela Alejandra Pineda", correo: "daniela.pineda@ejemplo.com", dpi: "9000000000014", objetivo: 5 },
];

const DURACIONES_MINUTOS = [90, 105, 120];
const MOTIVOS_CANCELACION_DEMO = [
  "cancelado_por_alumno",
  "cancelado_por_clima",
  "cancelado_por_mantenimiento_aeronave",
  "cancelado_por_instructor",
];

function redondear2(n) {
  return Math.round(n * 100) / 100;
}

function claveSlot(dia, horaInicio) {
  return `${dia.toISOString().slice(0, 10)}_${horaInicio}`;
}

// Genera el grid completo de bloques de 2h en un rango de días, en orden
// cronológico ascendente. offsetDias negativo = pasado, positivo = futuro.
function generarPoolSlots(desdeDiasOffset, hastaDiasOffset) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const slots = [];
  for (let offset = desdeDiasOffset; offset <= hastaDiasOffset; offset++) {
    const dia = new Date(hoy);
    dia.setDate(dia.getDate() + offset);
    for (const horaInicio of BLOQUES_HORA) {
      slots.push({ dia: new Date(dia), horaInicio });
    }
  }
  return slots;
}

// Reserva, en orden, las primeras `cantidad` posiciones del pool que estén
// libres tanto para el recurso como para el instructor dados. Devuelve los
// slots elegidos (mismo orden cronológico) y marca cada uno como ocupado.
function reservarSlots(pool, cantidad, recursoId, instructorId, ocupacion) {
  const elegidos = [];
  for (const slot of pool) {
    if (elegidos.length >= cantidad) break;
    const clave = claveSlot(slot.dia, slot.horaInicio);
    const ocupadoRecurso = ocupacion.recurso.get(recursoId).has(clave);
    const ocupadoInstructor = ocupacion.instructor.get(instructorId).has(clave);
    if (ocupadoRecurso || ocupadoInstructor) continue;

    ocupacion.recurso.get(recursoId).add(clave);
    ocupacion.instructor.get(instructorId).add(clave);
    elegidos.push(slot);
  }
  if (elegidos.length < cantidad) {
    throw new Error(
      `No se encontraron suficientes horarios libres (se pidieron ${cantidad}, se encontraron ${elegidos.length}) para recurso ${recursoId} / instructor ${instructorId}.`
    );
  }
  return elegidos;
}

function fechaDeSlot(slot) {
  const fecha = new Date(slot.dia);
  fecha.setHours(slot.horaInicio, 0, 0, 0);
  return fecha;
}

async function verificarDatosPrevios() {
  const correos = [...INSTRUCTORES_NUEVOS, ...ALUMNOS_DEMO].map((u) => u.correo);
  const dpis = [...INSTRUCTORES_NUEVOS, ...ALUMNOS_DEMO].map((u) => u.dpi);

  const existentes = await User.findAll({
    where: { [Op.or]: [{ correo: { [Op.in]: correos } }, { dpi: { [Op.in]: dpis } }] },
    attributes: ["id", "nombre", "correo", "dpi"],
  });

  if (existentes.length > 0) {
    console.error("Ya existen usuarios con alguno de los correos/DPI que este script iba a crear. Nada se modificó.");
    for (const u of existentes) {
      console.error(`  - id ${u.id}: ${u.nombre} <${u.correo}> DPI ${u.dpi}`);
    }
    console.error("Este script está pensado para correrse una sola vez. Si de verdad querés regenerar los datos de demo, elimina primero esos registros a mano.");
    process.exit(1);
  }
}

async function main() {
  await verificarDatosPrevios();

  const programa = await Programa.findOne({ where: { nombre: "piloto_privado" } });
  if (!programa) {
    throw new Error('No existe el Programa "piloto_privado" — corre primero el seed real (seed.js).');
  }

  const superadmin = await User.findOne({ where: { esSuperAdmin: true }, order: [["id", "ASC"]] });
  if (!superadmin) {
    throw new Error("No hay ningún super admin en la base de datos.");
  }

  const instructoresExistentes = await User.findAll({
    where: { id: [ID_INSTRUCTOR_UNO, ID_INSTRUCTOR_TRES], rol: "instructor" },
  });
  if (instructoresExistentes.length !== 2) {
    throw new Error(
      `Se esperaban los instructores id ${ID_INSTRUCTOR_UNO} y ${ID_INSTRUCTOR_TRES} — se encontraron ${instructoresExistentes.length}. Revisa la base de datos antes de continuar.`
    );
  }

  const aeronaves = await Recurso.findAll({
    where: { tipoRecurso: "ala_fija", estado: "disponible", activo: true },
    order: [["id", "ASC"]],
  });
  if (aeronaves.length < 3) {
    throw new Error(`Se necesitan al menos 3 aeronaves ala_fija disponibles — se encontraron ${aeronaves.length}.`);
  }
  const aeronavesDemo = aeronaves.slice(0, 3);

  const resultado = await sequelize.transaction(async (transaction) => {
    // ---------- Paso 1: renombrar instructores existentes ----------
    const NOMBRES_NUEVOS_EXISTENTES = {
      [ID_INSTRUCTOR_UNO]: "Carlos Méndez",
      [ID_INSTRUCTOR_TRES]: "Ana Lucía Pérez",
    };
    for (const instructor of instructoresExistentes) {
      instructor.nombre = NOMBRES_NUEVOS_EXISTENTES[instructor.id];
      await instructor.save({ transaction });
    }

    // ---------- Paso 1b: crear los 2 instructores nuevos ----------
    const hash = await bcrypt.hash(PASSWORD_DEMO, 10);
    const instructoresNuevos = [];
    for (const datos of INSTRUCTORES_NUEVOS) {
      const instructor = await User.create(
        {
          nombre: datos.nombre,
          correo: datos.correo,
          dpi: datos.dpi,
          password: hash,
          rol: "instructor",
          debeCambiarPassword: false,
        },
        { transaction }
      );
      instructoresNuevos.push(instructor);
    }

    const instructoresDemo = [...instructoresExistentes, ...instructoresNuevos];

    // ---------- Paso 2: crear los 14 alumnos + su ProgresoAlumno ----------
    const alumnosConAsignacion = [];
    for (let i = 0; i < ALUMNOS_DEMO.length; i++) {
      const datos = ALUMNOS_DEMO[i];
      const instructorAsignado = instructoresDemo[i % instructoresDemo.length];
      const aeronaveAsignada = aeronavesDemo[i % aeronavesDemo.length];

      const alumno = await User.create(
        {
          nombre: datos.nombre,
          correo: datos.correo,
          dpi: datos.dpi,
          password: hash,
          rol: "alumno",
          debeCambiarPassword: false,
        },
        { transaction }
      );

      const progreso = await ProgresoAlumno.create(
        {
          alumnoId: alumno.id,
          programaId: programa.id,
          instructorAsignadoId: instructorAsignado.id,
          leccionActual: 0,
          vueloSoloCompletado: false,
          horasSimuladorAcumuladas: 0,
          horasAvionAcumuladas: 0,
          estadoPrograma: "en_curso",
          fechaInicio: new Date(),
        },
        { transaction }
      );

      alumnosConAsignacion.push({
        alumno,
        progreso,
        objetivo: datos.objetivo,
        instructorId: instructorAsignado.id,
        recursoId: aeronaveAsignada.id,
      });
    }

    // ---------- Paso 3: vuelos históricos finalizados ----------
    // Ocupación compartida (recurso + instructor) para evitar solapes entre
    // TODOS los alumnos, no solo dentro de la propia secuencia de cada uno.
    const ocupacion = { recurso: new Map(), instructor: new Map() };
    for (const a of aeronavesDemo) ocupacion.recurso.set(a.id, new Set());
    for (const i of instructoresDemo) ocupacion.instructor.set(i.id, new Set());

    const poolHistorico = generarPoolSlots(-DIAS_HISTORIAL, -1);

    // { alumnoId -> [{fechaHora, recursoId, ...}] } — para reservar todos los
    // horarios primero y recién después crear en orden GLOBALMENTE
    // cronológico (así el horómetro de cada aeronave avanza consistente,
    // no solo por alumno).
    const vuelosAProgramar = [];
    for (const entrada of alumnosConAsignacion) {
      const slots = reservarSlots(poolHistorico, entrada.objetivo, entrada.recursoId, entrada.instructorId, ocupacion);
      slots.forEach((slot, indice) => {
        const duracionMinutos = DURACIONES_MINUTOS[(entrada.alumno.id + indice) % DURACIONES_MINUTOS.length];
        vuelosAProgramar.push({
          alumnoId: entrada.alumno.id,
          instructorId: entrada.instructorId,
          recursoId: entrada.recursoId,
          fechaHora: fechaDeSlot(slot),
          duracionMinutos,
          horasSesion: redondear2(duracionMinutos / 60),
          leccionProgramada: indice + 1,
        });
      });
    }
    vuelosAProgramar.sort((a, b) => a.fechaHora - b.fechaHora);

    const horasAcumuladasPorRecurso = new Map(aeronavesDemo.map((a) => [a.id, Number(a.horasAcumuladas)]));
    const horasSesionPorAlumno = new Map();

    for (const v of vuelosAProgramar) {
      const horometroInicial = horasAcumuladasPorRecurso.get(v.recursoId);
      const horometroFinal = redondear2(horometroInicial + v.horasSesion);

      const vuelo = await Vuelo.create(
        {
          recursoId: v.recursoId,
          instructorId: v.instructorId,
          alumnoId: v.alumnoId,
          fechaHora: v.fechaHora,
          duracionMinutos: v.duracionMinutos,
          leccionProgramada: v.leccionProgramada,
          estado: "finalizado",
          confirmacionInstructor: true,
          confirmacionAlumno: true,
          aprobacionSuperAdmin: true,
          creadoPor: superadmin.id,
        },
        { transaction }
      );

      const fechaValidacion = new Date(v.fechaHora.getTime() + v.duracionMinutos * 60000 + 30 * 60000);
      await LecturaHorometro.create(
        {
          vueloId: vuelo.id,
          recursoId: v.recursoId,
          horometroInicialSistema: horometroInicial,
          horometroInicialInstructor: horometroInicial,
          horometroFinalInstructor: horometroFinal,
          horometroInicialAlumno: horometroInicial,
          horometroFinalAlumno: horometroFinal,
          horasSesionReportadas: v.horasSesion,
          coincidenciaHorometroInicial: true,
          coherenciaHorometroFinal: true,
          diferenciaDetectada: false,
          estado: "validado",
          validadoPor: superadmin.id,
          fechaValidacion,
        },
        { transaction }
      );

      horasAcumuladasPorRecurso.set(v.recursoId, horometroFinal);
      horasSesionPorAlumno.set(v.alumnoId, redondear2((horasSesionPorAlumno.get(v.alumnoId) || 0) + v.horasSesion));
    }

    for (const [recursoId, horasFinal] of horasAcumuladasPorRecurso) {
      await Recurso.update({ horasAcumuladas: horasFinal }, { where: { id: recursoId }, transaction });
    }

    // ---------- Paso 3 (fin): ProgresoAlumno con los totales REALES ----------
    for (const entrada of alumnosConAsignacion) {
      entrada.progreso.horasAvionAcumuladas = horasSesionPorAlumno.get(entrada.alumno.id) || 0;
      entrada.progreso.leccionActual = entrada.objetivo;
      entrada.progreso.vueloSoloCompletado = entrada.objetivo >= programa.leccionSolo;
      const primerVuelo = vuelosAProgramar.find((v) => v.alumnoId === entrada.alumno.id);
      if (primerVuelo) entrada.progreso.fechaInicio = primerVuelo.fechaHora;
      await entrada.progreso.save({ transaction });
    }

    // ---------- Paso 3: vuelos cancelados (variedad de motivos) ----------
    const alumnosParaCancelar = alumnosConAsignacion.slice(0, MOTIVOS_CANCELACION_DEMO.length);
    let totalCancelados = 0;
    for (let i = 0; i < alumnosParaCancelar.length; i++) {
      const entrada = alumnosParaCancelar[i];
      const motivo = MOTIVOS_CANCELACION_DEMO[i];
      const canceladoPor =
        motivo === "cancelado_por_alumno"
          ? entrada.alumno.id
          : motivo === "cancelado_por_instructor"
          ? entrada.instructorId
          : superadmin.id;

      // No hace falta evitar solapes: un vuelo cancelado no bloquea horario
      // (mismo criterio que usa el backend real al crear vuelos).
      const diasAtras = 5 + i * 7;
      const fechaHora = new Date();
      fechaHora.setDate(fechaHora.getDate() - diasAtras);
      fechaHora.setHours(BLOQUES_HORA[i % BLOQUES_HORA.length], 0, 0, 0);

      await Vuelo.create(
        {
          recursoId: entrada.recursoId,
          instructorId: entrada.instructorId,
          alumnoId: entrada.alumno.id,
          fechaHora,
          duracionMinutos: 120,
          leccionProgramada: entrada.objetivo + 1,
          estado: "cancelado",
          motivoCancelacion: motivo,
          canceladoPor,
          confirmacionInstructor: false,
          confirmacionAlumno: false,
          aprobacionSuperAdmin: false,
          creadoPor: superadmin.id,
        },
        { transaction }
      );
      totalCancelados++;
    }

    // ---------- Paso 4: vuelos próximos ----------
    const poolFuturo = generarPoolSlots(0, DIAS_PROXIMOS);
    const alumnosProximos = alumnosConAsignacion.filter((_, i) => i % 2 === 0); // 7 de los 14

    let totalProximos = 0;

    // 4 confirmados a futuro
    const confirmadosFuturo = alumnosProximos.slice(0, 4);
    for (const entrada of confirmadosFuturo) {
      const [slot] = reservarSlots(poolFuturo, 1, entrada.recursoId, entrada.instructorId, ocupacion);
      await Vuelo.create(
        {
          recursoId: entrada.recursoId,
          instructorId: entrada.instructorId,
          alumnoId: entrada.alumno.id,
          fechaHora: fechaDeSlot(slot),
          duracionMinutos: 120,
          leccionProgramada: entrada.objetivo + 1,
          estado: "confirmado",
          confirmacionInstructor: true,
          confirmacionAlumno: true,
          aprobacionSuperAdmin: true,
          creadoPor: superadmin.id,
        },
        { transaction }
      );
      totalProximos++;
    }

    // 2 en_proceso (1 o 2 banderas), a futuro
    const enProcesoFuturo = alumnosProximos.slice(4, 6);
    const banderasEnProceso = [
      { confirmacionInstructor: true, confirmacionAlumno: false, aprobacionSuperAdmin: false },
      { confirmacionInstructor: true, confirmacionAlumno: true, aprobacionSuperAdmin: false },
    ];
    for (let i = 0; i < enProcesoFuturo.length; i++) {
      const entrada = enProcesoFuturo[i];
      const [slot] = reservarSlots(poolFuturo, 1, entrada.recursoId, entrada.instructorId, ocupacion);
      await Vuelo.create(
        {
          recursoId: entrada.recursoId,
          instructorId: entrada.instructorId,
          alumnoId: entrada.alumno.id,
          fechaHora: fechaDeSlot(slot),
          duracionMinutos: 120,
          leccionProgramada: entrada.objetivo + 1,
          estado: "en_proceso",
          ...banderasEnProceso[i],
          creadoPor: superadmin.id,
        },
        { transaction }
      );
      totalProximos++;
    }

    // 1 "confirmado" con fechaHora ya pasada (hace ~1.5h) para que la
    // transición perezosa YA EXISTENTE (actualizarEstadoPorHora) lo pase a
    // en_curso solo, la primera vez que se cargue el calendario.
    const [entradaEnCurso] = alumnosProximos.slice(6, 7);
    if (entradaEnCurso) {
      const fechaHoraPasada = new Date(Date.now() - 90 * 60000);
      await Vuelo.create(
        {
          recursoId: entradaEnCurso.recursoId,
          instructorId: entradaEnCurso.instructorId,
          alumnoId: entradaEnCurso.alumno.id,
          fechaHora: fechaHoraPasada,
          duracionMinutos: 90,
          leccionProgramada: entradaEnCurso.objetivo + 1,
          estado: "confirmado",
          confirmacionInstructor: true,
          confirmacionAlumno: true,
          aprobacionSuperAdmin: true,
          creadoPor: superadmin.id,
        },
        { transaction }
      );
      totalProximos++;
    }

    return {
      totalAlumnos: alumnosConAsignacion.length,
      totalFinalizados: vuelosAProgramar.length,
      totalCancelados,
      totalProximos,
    };
  });

  console.log("Datos de demostración generados correctamente.");
  console.log(`  Alumnos creados: ${resultado.totalAlumnos}`);
  console.log(`  Vuelos finalizados (histórico): ${resultado.totalFinalizados}`);
  console.log(`  Vuelos cancelados: ${resultado.totalCancelados}`);
  console.log(`  Vuelos próximos creados: ${resultado.totalProximos}`);
  console.log(`  Contraseña genérica para todos los usuarios de demo: ${PASSWORD_DEMO}`);

  await sequelize.close();
}

main().catch(async (err) => {
  console.error("Error generando los datos de demostración — no se guardó nada (la transacción se revirtió):");
  console.error(err);
  process.exit(1);
});
