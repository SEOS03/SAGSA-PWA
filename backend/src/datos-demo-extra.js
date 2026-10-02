// Amplía los datos de demo ya creados por datos-demo.js: más vuelos pasados
// (semanas más antiguas) y más vuelos próximos (semanas 2-3), para los
// MISMOS 14 alumnos de demo ya existentes. Este script NO crea usuarios —
// solo AGREGA Vuelo + LecturaHorometro, y actualiza ProgresoAlumno de esos
// mismos 14 alumnos (nunca toca datos de otros usuarios).
//
// Uso: node src/datos-demo-extra.js

const { Op } = require("sequelize");
const sequelize = require("./config/database");
const { User, Recurso, Programa, ProgresoAlumno, Vuelo, LecturaHorometro } = require("./models");

const BLOQUES_HORA = [6, 8, 10, 12, 14, 16];
const DURACIONES_MINUTOS = [90, 105, 120];

// Paso 1: nueva ventana MÁS ANTIGUA que la ya existente (que cubre -56 a -1).
const DIAS_ANTIGUOS_DESDE = -91; // ~13 semanas atrás
const DIAS_ANTIGUOS_HASTA = -57;
const REPASO_MIN_POR_ALUMNO = 3;
const REPASO_MAX_POR_ALUMNO = 5;

// Paso 2: semanas 2-3 (los próximos 10 días ya están cubiertos).
const DIAS_FUTUROS_DESDE = 11;
const DIAS_FUTUROS_HASTA = 21;

function redondear2(n) {
  return Math.round(n * 100) / 100;
}

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

function fechaDeSlot(slot) {
  const fecha = new Date(slot.dia);
  fecha.setHours(slot.horaInicio, 0, 0, 0);
  return fecha;
}

// Solapamiento real de intervalos (mismo criterio que usa el backend real en
// vueloController.crearVuelo), no solo coincidencia exacta de bloque — así
// también se respeta cualquier vuelo real ya existente que no esté alineado
// a la cuadrícula de 2h.
function seSolapan(inicioA, finA, inicioB, finB) {
  return inicioA < finB && finA > inicioB;
}

function haySolape(inicioMs, finMs, intervalos) {
  return intervalos.some((iv) => seSolapan(inicioMs, finMs, iv.inicio, iv.fin));
}

function barajar(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Intenta reservar un slot dentro de un sub-rango de días concreto (orden
// aleatorio); si ese sub-rango ya está lleno para este recurso/instructor/
// alumno, cae de respaldo a buscar en TODO el rango total antes de fallar.
function reservarSlotDisperso(bucketDesde, bucketHasta, desdeTotal, hastaTotal, recursoId, instructorId, alumnoId, duracionMinutos, ocupacion) {
  function intentar(candidatos) {
    for (const slot of candidatos) {
      const inicio = fechaDeSlot(slot).getTime();
      const fin = inicio + duracionMinutos * 60000;
      if (
        haySolape(inicio, fin, ocupacion.recurso.get(recursoId)) ||
        haySolape(inicio, fin, ocupacion.instructor.get(instructorId)) ||
        haySolape(inicio, fin, ocupacion.alumno.get(alumnoId))
      ) {
        continue;
      }
      ocupacion.recurso.get(recursoId).push({ inicio, fin });
      ocupacion.instructor.get(instructorId).push({ inicio, fin });
      ocupacion.alumno.get(alumnoId).push({ inicio, fin });
      return slot;
    }
    return null;
  }

  const delBucket = intentar(barajar(generarPoolSlots(bucketDesde, bucketHasta)));
  if (delBucket) return delBucket;

  const deTodoElRango = intentar(barajar(generarPoolSlots(desdeTotal, hastaTotal)));
  if (deTodoElRango) return deTodoElRango;

  throw new Error(`No se encontró un horario libre (recurso ${recursoId}, instructor ${instructorId}, alumno ${alumnoId}).`);
}

// Reparte `cantidad` slots de UN alumno en `cantidad` sub-rangos iguales
// dentro de [desde, hasta] (uno por sub-rango) — así sus vuelos quedan
// distribuidos por todo el rango de fechas en vez de amontonados al inicio
// (que es lo que pasa si simplemente se toma el primer horario libre).
function reservarSlotsDispersos(desde, hasta, cantidad, recursoId, instructorId, alumnoId, duracionPorIndice, ocupacion) {
  const anchoTotal = hasta - desde + 1;
  const resultados = [];
  for (let k = 0; k < cantidad; k++) {
    const bucketDesde = desde + Math.floor((k * anchoTotal) / cantidad);
    const bucketHasta = desde + Math.floor(((k + 1) * anchoTotal) / cantidad) - 1;
    const duracionMinutos = duracionPorIndice(k);
    const slot = reservarSlotDisperso(
      bucketDesde,
      Math.max(bucketDesde, bucketHasta),
      desde,
      hasta,
      recursoId,
      instructorId,
      alumnoId,
      duracionMinutos,
      ocupacion
    );
    resultados.push({ slot, duracionMinutos });
  }
  return resultados;
}

async function cargarOcupacionExistente() {
  const vuelos = await Vuelo.findAll({ where: { estado: { [Op.ne]: "cancelado" } } });
  const ocupacion = { recurso: new Map(), instructor: new Map(), alumno: new Map() };

  function agregar(mapa, id, inicio, fin) {
    if (!mapa.has(id)) mapa.set(id, []);
    mapa.get(id).push({ inicio, fin });
  }

  for (const v of vuelos) {
    const inicio = new Date(v.fechaHora).getTime();
    const fin = inicio + Number(v.duracionMinutos) * 60000;
    agregar(ocupacion.recurso, v.recursoId, inicio, fin);
    agregar(ocupacion.instructor, v.instructorId, inicio, fin);
    agregar(ocupacion.alumno, v.alumnoId, inicio, fin);
  }
  return ocupacion;
}

function asegurarClave(mapa, id) {
  if (!mapa.has(id)) mapa.set(id, []);
}

async function main() {
  const alumnosDemoUsers = await User.findAll({
    where: { correo: { [Op.like]: "%@ejemplo.com" }, rol: "alumno" },
    order: [["id", "ASC"]],
  });
  if (alumnosDemoUsers.length !== 14) {
    throw new Error(
      `Se esperaban exactamente 14 alumnos de demo (correo @ejemplo.com) — se encontraron ${alumnosDemoUsers.length}. Corre primero datos-demo.js.`
    );
  }

  const alumnoIds = alumnosDemoUsers.map((a) => a.id);

  // Reconstruir la asignación de cada alumno (recurso + instructor) a partir
  // de su vuelo ya existente más antiguo — datos-demo.js les asignó UNO solo
  // para toda su historia, así que cualquiera de sus vuelos sirve.
  const asignaciones = [];
  for (const alumno of alumnosDemoUsers) {
    const progreso = await ProgresoAlumno.findOne({ where: { alumnoId: alumno.id } });
    if (!progreso) throw new Error(`El alumno ${alumno.nombre} (id ${alumno.id}) no tiene ProgresoAlumno.`);

    const vueloReferencia = await Vuelo.findOne({ where: { alumnoId: alumno.id }, order: [["fechaHora", "ASC"]] });
    if (!vueloReferencia) throw new Error(`El alumno ${alumno.nombre} (id ${alumno.id}) no tiene ningún vuelo todavía.`);

    asignaciones.push({
      alumno,
      progreso,
      recursoId: vueloReferencia.recursoId,
      instructorId: progreso.instructorAsignadoId,
      leccionActual: progreso.leccionActual,
    });
  }

  // Guarda de seguridad: si ya hay vuelos de estos alumnos en cualquiera de
  // las 2 ventanas que este script va a poblar, no seguir (evita duplicar si
  // se corre dos veces por error — este script no tiene otra forma de
  // detectarlo, ya que no crea usuarios con correo/DPI únicos).
  const yaTieneAntiguos = await Vuelo.count({
    where: {
      alumnoId: { [Op.in]: alumnoIds },
      fechaHora: { [Op.between]: [fechaDeSlot({ dia: diaConOffset(DIAS_ANTIGUOS_DESDE), horaInicio: 0 }), fechaDeSlot({ dia: diaConOffset(DIAS_ANTIGUOS_HASTA), horaInicio: 23 })] },
    },
  });
  if (yaTieneAntiguos > 0) {
    console.error(
      `Ya existen ${yaTieneAntiguos} vuelo(s) de alumnos de demo en la ventana antigua (día ${DIAS_ANTIGUOS_DESDE} a ${DIAS_ANTIGUOS_HASTA}). Este script ya se corrió antes — no se agregó nada.`
    );
    process.exit(1);
  }
  const yaTieneFuturos = await Vuelo.count({
    where: {
      alumnoId: { [Op.in]: alumnoIds },
      fechaHora: { [Op.between]: [fechaDeSlot({ dia: diaConOffset(DIAS_FUTUROS_DESDE), horaInicio: 0 }), fechaDeSlot({ dia: diaConOffset(DIAS_FUTUROS_HASTA), horaInicio: 23 })] },
    },
  });
  if (yaTieneFuturos > 0) {
    console.error(
      `Ya existen ${yaTieneFuturos} vuelo(s) de alumnos de demo en la ventana futura (día ${DIAS_FUTUROS_DESDE} a ${DIAS_FUTUROS_HASTA}). Este script ya se corrió antes — no se agregó nada.`
    );
    process.exit(1);
  }

  const programa = await Programa.findOne({ where: { nombre: "piloto_privado" } });
  const superadmin = await User.findOne({ where: { esSuperAdmin: true }, order: [["id", "ASC"]] });

  // TG-MSA (id 1) tiene muchísimo margen (aeronave real, historial previo a
  // la demo) — se puede encadenar el horómetro hacia atrás desde su vuelo
  // más antiguo. TG-MSD/TG-MSF nacieron casi en 0 con la demo anterior — no
  // hay margen para retroceder sin quedar negativo, así que sus vuelos más
  // antiguos arrancan en 0 y avanzan hacia adelante como una cadena propia
  // (aceptando una pequeña discontinuidad en el empalme con el vuelo que
  // hoy es "el más antiguo" — decisión tomada explícitamente para esta demo,
  // ver conversación).
  const ID_RECURSO_CON_MARGEN = 1; // TG-MSA
  const anclaMSA = await LecturaHorometro.findOne({
    where: {},
    include: [{ model: Vuelo, where: { recursoId: ID_RECURSO_CON_MARGEN, estado: "finalizado" } }],
    order: [[{ model: Vuelo }, "fechaHora", "ASC"]],
  });
  if (!anclaMSA) throw new Error("No se encontró el vuelo más antiguo de TG-MSA para anclar el horómetro.");
  const anclaHorasMSA = Number(anclaMSA.horometroInicialSistema);

  const ocupacion = await cargarOcupacionExistente();
  for (const a of asignaciones) {
    asegurarClave(ocupacion.recurso, a.recursoId);
    asegurarClave(ocupacion.instructor, a.instructorId);
    asegurarClave(ocupacion.alumno, a.alumno.id);
  }

  const resultado = await sequelize.transaction(async (transaction) => {
    // ================= PASO 1: vuelos históricos más antiguos =================
    // Se reservan los horarios de TODOS los alumnos primero (para que la
    // comprobación de choques sea contra el cuadro completo), agrupando
    // cada vuelo nuevo por recurso para poder armar la cadena de horómetro
    // de cada aeronave por separado. Cada alumno reparte sus propios
    // `cantidad` vuelos en sub-rangos parejos de todo el rango antiguo, para
    // que caigan en semanas distintas en vez de amontonarse al inicio.
    const vuelosNuevosPorRecurso = new Map();
    for (const a of asignaciones) {
      asegurarClave(vuelosNuevosPorRecurso, a.recursoId);
      const cantidad = REPASO_MIN_POR_ALUMNO + Math.floor(Math.random() * (REPASO_MAX_POR_ALUMNO - REPASO_MIN_POR_ALUMNO + 1));

      const reservados = reservarSlotsDispersos(
        DIAS_ANTIGUOS_DESDE,
        DIAS_ANTIGUOS_HASTA,
        cantidad,
        a.recursoId,
        a.instructorId,
        a.alumno.id,
        (k) => DURACIONES_MINUTOS[(a.alumno.id + k) % DURACIONES_MINUTOS.length],
        ocupacion
      );

      for (const { slot, duracionMinutos } of reservados) {
        // Repaso: repite una lección YA alcanzada (1..leccionActual), nunca
        // avanza más allá del objetivo ya logrado en la corrida anterior.
        const leccionProgramada = 1 + Math.floor(Math.random() * a.leccionActual);

        vuelosNuevosPorRecurso.get(a.recursoId).push({
          alumnoId: a.alumno.id,
          instructorId: a.instructorId,
          recursoId: a.recursoId,
          fechaHora: fechaDeSlot(slot),
          duracionMinutos,
          horasSesion: redondear2(duracionMinutos / 60),
          leccionProgramada,
        });
      }
    }

    let totalAntiguos = 0;
    for (const [recursoId, lista] of vuelosNuevosPorRecurso) {
      const esConMargen = recursoId === ID_RECURSO_CON_MARGEN;

      if (esConMargen) {
        // Retroceder: del más nuevo (más cercano al vuelo ya existente) al
        // más viejo, restando horas desde el ancla fija.
        lista.sort((a, b) => b.fechaHora - a.fechaHora);
        let horasCorriendo = anclaHorasMSA;
        for (const v of lista) {
          const horometroFinal = horasCorriendo;
          const horometroInicial = redondear2(horometroFinal - v.horasSesion);
          await crearVueloFinalizado(v, horometroInicial, horometroFinal, superadmin.id, transaction);
          horasCorriendo = horometroInicial;
          totalAntiguos++;
        }
      } else {
        // Reiniciar: del más viejo al más nuevo, arrancando en 0 (aeronave
        // "nueva" al inicio de esta ventana extendida).
        lista.sort((a, b) => a.fechaHora - b.fechaHora);
        let horasCorriendo = 0;
        for (const v of lista) {
          const horometroInicial = horasCorriendo;
          const horometroFinal = redondear2(horometroInicial + v.horasSesion);
          await crearVueloFinalizado(v, horometroInicial, horometroFinal, superadmin.id, transaction);
          horasCorriendo = horometroFinal;
          totalAntiguos++;
        }
      }
    }

    // Recalcular ProgresoAlumno con la suma REAL de todos sus vuelos
    // finalizados (los de antes + los nuevos de este paso).
    for (const a of asignaciones) {
      const vuelosFinalizados = await Vuelo.findAll({
        where: { alumnoId: a.alumno.id, estado: "finalizado" },
        include: [{ model: LecturaHorometro }],
        transaction,
      });

      let sumaHoras = 0;
      let leccionMaxima = 0;
      for (const v of vuelosFinalizados) {
        sumaHoras += Number(v.LecturaHorometro.horasSesionReportadas);
        leccionMaxima = Math.max(leccionMaxima, v.leccionProgramada || 0);
      }
      sumaHoras = redondear2(sumaHoras);
      leccionMaxima = Math.min(leccionMaxima, programa.totalLecciones);

      a.progreso.horasAvionAcumuladas = sumaHoras;
      a.progreso.leccionActual = leccionMaxima;
      a.progreso.vueloSoloCompletado = leccionMaxima >= programa.leccionSolo;
      await a.progreso.save({ transaction });
    }

    // ================= PASO 2: más vuelos próximos (semanas 2-3) =================
    // Cada alumno cae en un sub-rango distinto de [11,21] (según su índice),
    // para que las 2 semanas siguientes se vean con actividad repartida en
    // vez de que los 14 caigan todos el mismo día.
    const anchoFuturo = DIAS_FUTUROS_HASTA - DIAS_FUTUROS_DESDE + 1;
    let totalProximos = 0;

    for (let i = 0; i < asignaciones.length; i++) {
      const a = asignaciones[i];
      const bucketDesde = DIAS_FUTUROS_DESDE + Math.floor((i * anchoFuturo) / asignaciones.length);
      const bucketHasta = DIAS_FUTUROS_DESDE + Math.floor(((i + 1) * anchoFuturo) / asignaciones.length) - 1;
      const slot = reservarSlotDisperso(
        bucketDesde,
        Math.max(bucketDesde, bucketHasta),
        DIAS_FUTUROS_DESDE,
        DIAS_FUTUROS_HASTA,
        a.recursoId,
        a.instructorId,
        a.alumno.id,
        120,
        ocupacion
      );

      const esEnProceso = i % 4 === 3; // ~25% en_proceso, resto confirmado
      const banderas = esEnProceso
        ? i % 2 === 0
          ? { confirmacionInstructor: true, confirmacionAlumno: false, aprobacionSuperAdmin: false }
          : { confirmacionInstructor: true, confirmacionAlumno: true, aprobacionSuperAdmin: false }
        : { confirmacionInstructor: true, confirmacionAlumno: true, aprobacionSuperAdmin: true };

      await Vuelo.create(
        {
          recursoId: a.recursoId,
          instructorId: a.instructorId,
          alumnoId: a.alumno.id,
          fechaHora: fechaDeSlot(slot),
          duracionMinutos: 120,
          leccionProgramada: a.leccionActual + 1,
          estado: esEnProceso ? "en_proceso" : "confirmado",
          ...banderas,
          creadoPor: superadmin.id,
        },
        { transaction }
      );
      totalProximos++;
    }

    return { totalAntiguos, totalProximos };
  });

  console.log("Datos de demostración ampliados correctamente.");
  console.log(`  Vuelos históricos nuevos (más antiguos): ${resultado.totalAntiguos}`);
  console.log(`  Vuelos próximos nuevos (semanas 2-3): ${resultado.totalProximos}`);
  console.log(`  Total agregado: ${resultado.totalAntiguos + resultado.totalProximos}`);
  console.log("  No se creó ni modificó ningún usuario — solo se agregaron vuelos/horómetros y se actualizó el ProgresoAlumno de los 14 alumnos de demo.");

  await sequelize.close();
}

async function crearVueloFinalizado(v, horometroInicial, horometroFinal, superadminId, transaction) {
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
      creadoPor: superadminId,
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
      validadoPor: superadminId,
      fechaValidacion,
    },
    { transaction }
  );
}

function diaConOffset(offset) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  hoy.setDate(hoy.getDate() + offset);
  return hoy;
}

main().catch(async (err) => {
  console.error("Error ampliando los datos de demostración — no se guardó nada (la transacción se revirtió):");
  console.error(err);
  process.exit(1);
});
