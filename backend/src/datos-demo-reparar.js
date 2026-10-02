// Repara los datos de demo generados por datos-demo.js + datos-demo-extra.js:
// borra y regenera TODOS los vuelos/horómetros de los 14 alumnos de demo
// (nunca toca usuarios ni datos de otros alumnos/instructores), usando el
// algoritmo de reparto disperso para que ninguna semana quede vacía, y
// verificando cero choques contra CUALQUIER vuelo real del sistema.
//
// Uso: node src/datos-demo-reparar.js

const { Op } = require("sequelize");
const sequelize = require("./config/database");
const { User, Recurso, Programa, ProgresoAlumno, Vuelo, LecturaHorometro } = require("./models");

const BLOQUES_HORA = [6, 8, 10, 12, 14, 16];
const DURACIONES_MINUTOS = [90, 105, 120];

// La ventana histórica termina el día -15 (~10 días antes del 11-sep, que es
// cuando empieza la racha de vuelos REALES ya existentes en TG-MSA/TG-MSD —
// ver hallazgo reportado). Así la demo nunca necesita encadenarse a esos
// registros reales, que además ya tienen saltos de horómetro no físicos
// preexistentes (no generados por mis scripts, no se tocan).
const DIAS_HIST_DESDE = -91;
const DIAS_HIST_HASTA = -15;
const REPASO_MIN_POR_ALUMNO = 3;
const REPASO_MAX_POR_ALUMNO = 5;

const DIAS_FUTURO_DESDE = 0;
const DIAS_FUTURO_HASTA = 21;

// Mismo orden/objetivo que datos-demo.js — es la única fuente de esta
// asignación (no se guarda en ninguna tabla), así que se reproduce aquí
// literal para no perder la distribución de lecciones ya reportada.
const ALUMNOS_DEMO = [
  { correo: "fernando.castillo@ejemplo.com", objetivo: 25 },
  { correo: "valeria.montenegro@ejemplo.com", objetivo: 27 },
  { correo: "diego.soto@ejemplo.com", objetivo: 23 },
  { correo: "camila.reyes@ejemplo.com", objetivo: 11 },
  { correo: "sebastian.giron@ejemplo.com", objetivo: 9 },
  { correo: "paola.cabrera@ejemplo.com", objetivo: 12 },
  { correo: "andres.mazariegos@ejemplo.com", objetivo: 18 },
  { correo: "gabriela.ochoa@ejemplo.com", objetivo: 14 },
  { correo: "mario.vasquez@ejemplo.com", objetivo: 21 },
  { correo: "luisa.barrios@ejemplo.com", objetivo: 16 },
  { correo: "emilio.perez@ejemplo.com", objetivo: 3 },
  { correo: "renata.cardona@ejemplo.com", objetivo: 7 },
  { correo: "kevin.morales@ejemplo.com", objetivo: 1 },
  { correo: "daniela.pineda@ejemplo.com", objetivo: 5 },
];

const MOTIVOS_CANCELACION_DEMO = [
  "cancelado_por_alumno",
  "cancelado_por_clima",
  "cancelado_por_mantenimiento_aeronave",
  "cancelado_por_instructor",
];

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

async function main() {
  const alumnosDemoUsers = await User.findAll({
    where: { correo: { [Op.like]: "%@ejemplo.com" }, rol: "alumno" },
    order: [["id", "ASC"]],
  });
  if (alumnosDemoUsers.length !== 14) {
    throw new Error(`Se esperaban 14 alumnos de demo — se encontraron ${alumnosDemoUsers.length}.`);
  }
  const porCorreo = new Map(alumnosDemoUsers.map((u) => [u.correo, u]));

  const programa = await Programa.findOne({ where: { nombre: "piloto_privado" } });
  const superadmin = await User.findOne({ where: { esSuperAdmin: true }, order: [["id", "ASC"]] });

  const aeronaves = await Recurso.findAll({
    where: { tipoRecurso: "ala_fija", estado: "disponible", activo: true },
    order: [["id", "ASC"]],
  });
  const aeronavesDemo = aeronaves.slice(0, 3);
  const ID_TG_MSA = aeronavesDemo[0].id; // única con vuelos finalizados reales que respetar

  // Reconstruir la asignación instructor/recurso EXACTAMENTE como quedó la
  // primera vez (mismo orden de ALUMNOS_DEMO, mismo % usado originalmente).
  // El instructor ya está guardado en ProgresoAlumno; el recurso no se
  // guarda en ninguna tabla, así que se recalcula con el mismo criterio.
  const asignaciones = [];
  for (let i = 0; i < ALUMNOS_DEMO.length; i++) {
    const datos = ALUMNOS_DEMO[i];
    const alumno = porCorreo.get(datos.correo);
    const progreso = await ProgresoAlumno.findOne({ where: { alumnoId: alumno.id } });
    asignaciones.push({
      alumno,
      progreso,
      objetivo: datos.objetivo,
      recursoId: aeronavesDemo[i % aeronavesDemo.length].id,
      instructorId: progreso.instructorAsignadoId,
    });
  }

  // ---------- Borrar TODOS los vuelos/horómetros de demo ----------
  const idsAlumnosDemo = alumnosDemoUsers.map((u) => u.id);
  const vuelosDemoActuales = await Vuelo.findAll({ where: { alumnoId: { [Op.in]: idsAlumnosDemo } }, attributes: ["id"] });
  const idsVuelosBorrar = vuelosDemoActuales.map((v) => v.id);
  const totalBorrados = idsVuelosBorrar.length;

  const resultado = await sequelize.transaction(async (transaction) => {
    await LecturaHorometro.destroy({ where: { vueloId: idsVuelosBorrar }, transaction });
    await Vuelo.destroy({ where: { id: idsVuelosBorrar }, transaction });

    // Ocupación fresca: ya sin los vuelos de demo, así que refleja
    // exactamente los reales que hay que respetar (incluye id 50, 83, y
    // cualquier otro).
    const ocupacion = await cargarOcupacionExistente();
    for (const a of asignaciones) {
      asegurarClave(ocupacion.recurso, a.recursoId);
      asegurarClave(ocupacion.instructor, a.instructorId);
      asegurarClave(ocupacion.alumno, a.alumno.id);
    }

    // ---------- Vuelos históricos (progresión 1..objetivo + repaso) ----------
    const vuelosNuevosPorRecurso = new Map();
    for (const a of asignaciones) {
      asegurarClave(vuelosNuevosPorRecurso, a.recursoId);
      const cantidadRepaso = REPASO_MIN_POR_ALUMNO + Math.floor(Math.random() * (REPASO_MAX_POR_ALUMNO - REPASO_MIN_POR_ALUMNO + 1));
      const cantidadTotal = a.objetivo + cantidadRepaso;

      const reservados = reservarSlotsDispersos(
        DIAS_HIST_DESDE,
        DIAS_HIST_HASTA,
        cantidadTotal,
        a.recursoId,
        a.instructorId,
        a.alumno.id,
        (k) => DURACIONES_MINUTOS[(a.alumno.id + k) % DURACIONES_MINUTOS.length],
        ocupacion
      );

      // Los primeros `objetivo` slots (ya en orden cronológico ascendente
      // porque cada bucket sucesivo cae más tarde) llevan la progresión
      // 1..objetivo; el resto son repaso de una lección ya alcanzada.
      const ordenados = reservados
        .map((r) => ({ ...r, fechaHora: fechaDeSlot(r.slot) }))
        .sort((x, y) => x.fechaHora - y.fechaHora);

      ordenados.forEach((r, indice) => {
        const leccionProgramada = indice < a.objetivo ? indice + 1 : 1 + Math.floor(Math.random() * a.objetivo);
        vuelosNuevosPorRecurso.get(a.recursoId).push({
          alumnoId: a.alumno.id,
          instructorId: a.instructorId,
          recursoId: a.recursoId,
          fechaHora: r.fechaHora,
          duracionMinutos: r.duracionMinutos,
          horasSesion: redondear2(r.duracionMinutos / 60),
          leccionProgramada,
        });
      });
    }

    let totalHistoricos = 0;
    for (const [recursoId, lista] of vuelosNuevosPorRecurso) {
      lista.sort((x, y) => x.fechaHora - y.fechaHora);
      let horasCorriendo = 0; // narrativa propia de la demo, ver nota arriba
      for (const v of lista) {
        const horometroInicial = horasCorriendo;
        const horometroFinal = redondear2(horometroInicial + v.horasSesion);
        await crearVueloFinalizado(v, horometroInicial, horometroFinal, superadmin.id, transaction);
        horasCorriendo = horometroFinal;
        totalHistoricos++;
      }
      // Solo se persiste en Recurso.horasAcumuladas si no hay un vuelo REAL
      // finalizado posterior que ya sea dueño legítimo del valor "actual"
      // (caso de TG-MSA, con vuelos reales el 11/23/24-sep).
      if (recursoId !== ID_TG_MSA) {
        await Recurso.update({ horasAcumuladas: horasCorriendo }, { where: { id: recursoId }, transaction });
      }
    }

    // ---------- Vuelos cancelados (4, un motivo cada uno) ----------
    let totalCancelados = 0;
    for (let i = 0; i < MOTIVOS_CANCELACION_DEMO.length; i++) {
      const a = asignaciones[i];
      const motivo = MOTIVOS_CANCELACION_DEMO[i];
      const canceladoPor =
        motivo === "cancelado_por_alumno" ? a.alumno.id : motivo === "cancelado_por_instructor" ? a.instructorId : superadmin.id;

      const diasAtras = DIAS_HIST_HASTA - 3 - i * 10;
      const fechaHora = new Date();
      fechaHora.setDate(fechaHora.getDate() + diasAtras);
      fechaHora.setHours(BLOQUES_HORA[i % BLOQUES_HORA.length], 0, 0, 0);

      await Vuelo.create(
        {
          recursoId: a.recursoId,
          instructorId: a.instructorId,
          alumnoId: a.alumno.id,
          fechaHora,
          duracionMinutos: 120,
          leccionProgramada: a.objetivo + 1,
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

    // ---------- Recalcular ProgresoAlumno con la suma REAL ----------
    for (const a of asignaciones) {
      const vuelosFinalizados = await Vuelo.findAll({
        where: { alumnoId: a.alumno.id, estado: "finalizado" },
        include: [{ model: LecturaHorometro }],
        transaction,
      });
      let sumaHoras = 0;
      let leccionMaxima = 0;
      let fechaMasAntigua = null;
      for (const v of vuelosFinalizados) {
        sumaHoras += Number(v.LecturaHorometro.horasSesionReportadas);
        leccionMaxima = Math.max(leccionMaxima, v.leccionProgramada || 0);
        if (!fechaMasAntigua || v.fechaHora < fechaMasAntigua) fechaMasAntigua = v.fechaHora;
      }
      sumaHoras = redondear2(sumaHoras);
      leccionMaxima = Math.min(leccionMaxima, programa.totalLecciones);

      a.progreso.horasAvionAcumuladas = sumaHoras;
      a.progreso.leccionActual = leccionMaxima;
      a.progreso.vueloSoloCompletado = leccionMaxima >= programa.leccionSolo;
      if (fechaMasAntigua) a.progreso.fechaInicio = fechaMasAntigua;
      await a.progreso.save({ transaction });
    }

    // ---------- Vuelos próximos (día 0 a 21) ----------
    const anchoFuturo = DIAS_FUTURO_HASTA - DIAS_FUTURO_DESDE + 1;
    let totalProximos = 0;
    let vueloEnCursoCreado = false;

    for (let i = 0; i < asignaciones.length; i++) {
      const a = asignaciones[i];
      const bucketDesde = DIAS_FUTURO_DESDE + Math.floor((i * anchoFuturo) / asignaciones.length);
      const bucketHasta = DIAS_FUTURO_DESDE + Math.floor(((i + 1) * anchoFuturo) / asignaciones.length) - 1;
      const slot = reservarSlotDisperso(
        bucketDesde,
        Math.max(bucketDesde, bucketHasta),
        DIAS_FUTURO_DESDE,
        DIAS_FUTURO_HASTA,
        a.recursoId,
        a.instructorId,
        a.alumno.id,
        120,
        ocupacion
      );

      const esEnProceso = i % 4 === 3;
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
          leccionProgramada: a.objetivo + 1,
          estado: esEnProceso ? "en_proceso" : "confirmado",
          ...banderas,
          creadoPor: superadmin.id,
        },
        { transaction }
      );
      totalProximos++;

      // Uno de los alumnos (el primero) recibe además el vuelo "hace ~90
      // minutos, confirmado" para que la transición perezosa YA EXISTENTE lo
      // muestre como en_curso automáticamente. Deliberadamente NO alineado a
      // bloque (necesita ser "recién pasado", no un horario limpio).
      if (i === 0 && !vueloEnCursoCreado) {
        const inicio = new Date(Date.now() - 90 * 60000).getTime();
        const fin = inicio + 90 * 60000;
        if (
          !haySolape(inicio, fin, ocupacion.recurso.get(a.recursoId)) &&
          !haySolape(inicio, fin, ocupacion.instructor.get(a.instructorId)) &&
          !haySolape(inicio, fin, ocupacion.alumno.get(a.alumno.id))
        ) {
          ocupacion.recurso.get(a.recursoId).push({ inicio, fin });
          ocupacion.instructor.get(a.instructorId).push({ inicio, fin });
          ocupacion.alumno.get(a.alumno.id).push({ inicio, fin });
          await Vuelo.create(
            {
              recursoId: a.recursoId,
              instructorId: a.instructorId,
              alumnoId: a.alumno.id,
              fechaHora: new Date(inicio),
              duracionMinutos: 90,
              leccionProgramada: a.objetivo + 1,
              estado: "confirmado",
              confirmacionInstructor: true,
              confirmacionAlumno: true,
              aprobacionSuperAdmin: true,
              creadoPor: superadmin.id,
            },
            { transaction }
          );
          totalProximos++;
          vueloEnCursoCreado = true;
        }
      }
    }

    return { totalBorrados, totalHistoricos, totalCancelados, totalProximos };
  });

  console.log("Reparación completa.");
  console.log(`  Vuelos de demo borrados: ${resultado.totalBorrados}`);
  console.log(`  Vuelos históricos regenerados: ${resultado.totalHistoricos}`);
  console.log(`  Vuelos cancelados regenerados: ${resultado.totalCancelados}`);
  console.log(`  Vuelos próximos regenerados: ${resultado.totalProximos}`);
  console.log("  No se creó ni modificó ningún usuario. No se tocó ningún vuelo real preexistente.");

  await sequelize.close();
}

main().catch(async (err) => {
  console.error("Error reparando los datos de demostración — no se guardó nada (la transacción se revirtió):");
  console.error(err);
  process.exit(1);
});
