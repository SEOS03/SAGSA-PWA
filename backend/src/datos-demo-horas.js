// Agrega horas de simulador a los 14 alumnos de demo (Paso 1) y corrige a
// los que ya superaban (o estaban a punto de superar) el 90% en horas de
// avión, simulador o total (Paso 2). Solo toca Vuelo/LecturaHorometro de los
// 14 alumnos de demo y sus ProgresoAlumno — nunca usuarios ni datos reales.
//
// Uso: node src/datos-demo-horas.js

const { Op } = require("sequelize");
const sequelize = require("./config/database");
const { User, Recurso, Programa, ProgresoAlumno, Vuelo, LecturaHorometro } = require("./models");

const BLOQUES_HORA = [6, 8, 10, 12, 14, 16];
const DIAS_HIST_DESDE = -91;
const DIAS_HIST_HASTA = -15; // misma ventana histórica ya establecida
const LIMITE_SEGURO_PORCENTAJE = 90;

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
    for (const horaInicio of BLOQUES_HORA) slots.push({ dia: new Date(dia), horaInicio });
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

function reservarSlotsDispersos(desde, hasta, cantidad, recursoId, instructorId, alumnoId, ocupacion) {
  const anchoTotal = hasta - desde + 1;
  const resultados = [];
  for (let k = 0; k < cantidad; k++) {
    const bucketDesde = desde + Math.floor((k * anchoTotal) / cantidad);
    const bucketHasta = desde + Math.floor(((k + 1) * anchoTotal) / cantidad) - 1;
    const duracionMinutos = [90, 105, 120][(alumnoId + k) % 3];
    const slot = reservarSlotDisperso(bucketDesde, Math.max(bucketDesde, bucketHasta), desde, hasta, recursoId, instructorId, alumnoId, duracionMinutos, ocupacion);
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

// Reparte `totalHoras` entre `cantidad` valores (2 decimales), el último
// absorbe el residuo del redondeo para que la suma sea EXACTA.
function repartirHoras(totalHoras, cantidad) {
  const partes = [];
  let acumulado = 0;
  for (let i = 0; i < cantidad - 1; i++) {
    const parte = redondear2(totalHoras / cantidad);
    partes.push(parte);
    acumulado += parte;
  }
  partes.push(redondear2(totalHoras - acumulado));
  return partes;
}

async function main() {
  const alumnosDemoUsers = await User.findAll({ where: { correo: { [Op.like]: "%@ejemplo.com" }, rol: "alumno" }, order: [["id", "ASC"]] });
  if (alumnosDemoUsers.length !== 14) throw new Error(`Se esperaban 14 alumnos de demo — se encontraron ${alumnosDemoUsers.length}.`);
  const porCorreo = new Map(alumnosDemoUsers.map((u) => [u.correo, u]));

  const programa = await Programa.findOne({ where: { nombre: "piloto_privado" } });
  const superadmin = await User.findOne({ where: { esSuperAdmin: true }, order: [["id", "ASC"]] });
  const totalAvion = Number(programa.horasAvionTotal);
  const totalSimulador = Number(programa.horasSimuladorTotal);
  const totalCombinado = totalAvion + totalSimulador;

  const aeronaves = await Recurso.findAll({ where: { tipoRecurso: "ala_fija", estado: "disponible", activo: true }, order: [["id", "ASC"]] });
  const aeronavesDemo = aeronaves.slice(0, 3);
  const ID_TG_MSA = aeronavesDemo[0].id;

  const simuladores = await Recurso.findAll({ where: { matricula: { [Op.in]: ["GX100", "PAS", "PHS-4M"] } }, order: [["id", "ASC"]] });
  if (simuladores.length !== 3) throw new Error(`Se esperaban 3 simuladores (GX100, PAS, PHS-4M) — se encontraron ${simuladores.length}.`);

  const asignaciones = [];
  for (let i = 0; i < ALUMNOS_DEMO.length; i++) {
    const datos = ALUMNOS_DEMO[i];
    const alumno = porCorreo.get(datos.correo);
    const progreso = await ProgresoAlumno.findOne({ where: { alumnoId: alumno.id } });
    asignaciones.push({
      alumno,
      progreso,
      objetivo: datos.objetivo,
      recursoAvionId: aeronavesDemo[i % aeronavesDemo.length].id,
      recursoSimuladorId: simuladores[i % simuladores.length].id,
      instructorId: progreso.instructorAsignadoId,
      horasAvionActual: Number(progreso.horasAvionAcumuladas),
    });
  }

  // Meta de horas de simulador por alumno: escala con su avance (más
  // lecciones -> más práctica de simulador ya acumulada), tope cómodo bien
  // por debajo del 90% de las 16h del programa.
  for (const a of asignaciones) {
    const pct = 25 + (a.objetivo / programa.totalLecciones) * 45; // ~27%-70%
    a.metaHorasSimulador = redondear2((pct / 100) * totalSimulador);
  }

  // Meta de horas de avión SOLO para quien ya está en/sobre el límite
  // seguro: se recorta a un porcentaje cómodo bajo el 90%, escalado también
  // por su avance (más lecciones -> tope más alto, pero siempre <90%).
  for (const a of asignaciones) {
    const pctActual = (a.horasAvionActual / totalAvion) * 100;
    if (pctActual >= 85) {
      const pctMeta = 72 + (a.objetivo / programa.totalLecciones) * 11; // ~76%-83%
      a.metaHorasAvion = redondear2((pctMeta / 100) * totalAvion);
    } else {
      a.metaHorasAvion = null; // no hace falta tocarlo
    }
  }

  const resultado = await sequelize.transaction(async (transaction) => {
    const ocupacion = await cargarOcupacionExistente();
    for (const a of asignaciones) {
      asegurarClave(ocupacion.recurso, a.recursoAvionId);
      asegurarClave(ocupacion.recurso, a.recursoSimuladorId);
      asegurarClave(ocupacion.instructor, a.instructorId);
      asegurarClave(ocupacion.alumno, a.alumno.id);
    }

    // ================= PASO 1: vuelos de simulador =================
    const CANTIDAD_VUELOS_SIMULADOR = 4;
    const simuladorPorRecurso = new Map();
    for (const s of simuladores) asegurarClave(simuladorPorRecurso, s.id);

    let totalVuelosSimulador = 0;
    for (const a of asignaciones) {
      const horasPorVuelo = repartirHoras(a.metaHorasSimulador, CANTIDAD_VUELOS_SIMULADOR);
      const reservados = reservarSlotsDispersos(
        DIAS_HIST_DESDE,
        DIAS_HIST_HASTA,
        CANTIDAD_VUELOS_SIMULADOR,
        a.recursoSimuladorId,
        a.instructorId,
        a.alumno.id,
        ocupacion
      );
      reservados.forEach(({ slot, duracionMinutos }, indice) => {
        simuladorPorRecurso.get(a.recursoSimuladorId).push({
          alumnoId: a.alumno.id,
          instructorId: a.instructorId,
          recursoId: a.recursoSimuladorId,
          fechaHora: fechaDeSlot(slot),
          duracionMinutos,
          horasSesion: horasPorVuelo[indice],
          leccionProgramada: null,
        });
      });
      totalVuelosSimulador += CANTIDAD_VUELOS_SIMULADOR;
    }

    async function crearVueloFinalizado(v, horometroInicial, horometroFinal) {
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
    }

    for (const [recursoId, lista] of simuladorPorRecurso) {
      lista.sort((x, y) => x.fechaHora - y.fechaHora);
      const recurso = simuladores.find((s) => s.id === recursoId);
      let horas = Number(recurso.horasAcumuladas);
      for (const v of lista) {
        const inicial = horas;
        const final = redondear2(inicial + v.horasSesion);
        await crearVueloFinalizado(v, inicial, final);
        horas = final;
      }
      await Recurso.update({ horasAcumuladas: horas }, { where: { id: recursoId }, transaction });
    }

    // ================= PASO 2: recortar avión de quien supera el límite =================
    const alumnosARecortar = asignaciones.filter((a) => a.metaHorasAvion !== null);
    for (const a of alumnosARecortar) {
      const vuelosAvion = await Vuelo.findAll({
        where: { alumnoId: a.alumno.id, estado: "finalizado", recursoId: a.recursoAvionId },
        include: [{ model: LecturaHorometro }],
        order: [["fechaHora", "ASC"]],
        transaction,
      });
      const horasOriginales = vuelosAvion.map((v) => Number(v.LecturaHorometro.horasSesionReportadas));
      const sumaOriginal = horasOriginales.reduce((s, h) => s + h, 0);
      const factor = a.metaHorasAvion / sumaOriginal;

      const nuevasHoras = horasOriginales.map((h) => redondear2(h * factor));
      const sumaNueva = nuevasHoras.reduce((s, h) => s + h, 0);
      const residuo = redondear2(a.metaHorasAvion - sumaNueva);
      nuevasHoras[nuevasHoras.length - 1] = redondear2(nuevasHoras[nuevasHoras.length - 1] + residuo);

      for (let i = 0; i < vuelosAvion.length; i++) {
        vuelosAvion[i].LecturaHorometro.horasSesionReportadas = nuevasHoras[i];
        await vuelosAvion[i].LecturaHorometro.save({ transaction });
      }
    }

    // ================= Reencadenar el horómetro de las 3 aeronaves =================
    // Necesario tras el recorte del Paso 2 (cambia horasSesionReportadas de
    // varios vuelos que comparten aeronave con otros alumnos). Se recorre
    // SOLO la porción de demo de cada aeronave (los vuelos reales, todos
    // fechados después del 11-sep, quedan fuera de esta ventana y no se
    // tocan).
    const idsAlumnosDemo = alumnosDemoUsers.map((u) => u.id);
    for (const recurso of aeronavesDemo) {
      const vuelosDemoAeronave = await Vuelo.findAll({
        where: { recursoId: recurso.id, estado: "finalizado", alumnoId: { [Op.in]: idsAlumnosDemo } },
        include: [{ model: LecturaHorometro }],
        order: [["fechaHora", "ASC"]],
        transaction,
      });
      let horas = 0;
      for (const v of vuelosDemoAeronave) {
        const inicial = horas;
        const final = redondear2(inicial + Number(v.LecturaHorometro.horasSesionReportadas));
        v.LecturaHorometro.horometroInicialSistema = inicial;
        v.LecturaHorometro.horometroInicialInstructor = inicial;
        v.LecturaHorometro.horometroFinalInstructor = final;
        v.LecturaHorometro.horometroInicialAlumno = inicial;
        v.LecturaHorometro.horometroFinalAlumno = final;
        await v.LecturaHorometro.save({ transaction });
        horas = final;
      }
      // TG-MSA: un vuelo REAL posterior (24-sep) ya es dueño del valor
      // "actual" del horómetro — no se sobreescribe. Las otras 2 aeronaves
      // no tienen ningún vuelo finalizado real, así que sí se persiste.
      if (recurso.id !== ID_TG_MSA) {
        await Recurso.update({ horasAcumuladas: horas }, { where: { id: recurso.id }, transaction });
      }
    }

    // ================= Recalcular ProgresoAlumno =================
    const reporte = [];
    for (const a of asignaciones) {
      const vuelosFinalizados = await Vuelo.findAll({
        where: { alumnoId: a.alumno.id, estado: "finalizado" },
        include: [{ model: LecturaHorometro }, { model: Recurso, as: "recurso", attributes: ["id", "tipoRecurso"] }],
        transaction,
      });
      let sumaAvion = 0;
      let sumaSimulador = 0;
      for (const v of vuelosFinalizados) {
        const horas = Number(v.LecturaHorometro.horasSesionReportadas);
        if (v.recurso.tipoRecurso === "simulador") sumaSimulador += horas;
        else sumaAvion += horas;
      }
      sumaAvion = redondear2(sumaAvion);
      sumaSimulador = redondear2(sumaSimulador);

      a.progreso.horasAvionAcumuladas = sumaAvion;
      a.progreso.horasSimuladorAcumuladas = sumaSimulador;
      await a.progreso.save({ transaction });

      reporte.push({
        nombre: a.alumno.nombre,
        horasAvion: sumaAvion,
        horasSimulador: sumaSimulador,
        pctAvion: redondear2((sumaAvion / totalAvion) * 100),
        pctSimulador: redondear2((sumaSimulador / totalSimulador) * 100),
        pctTotal: redondear2(((sumaAvion + sumaSimulador) / totalCombinado) * 100),
      });
    }

    return { totalVuelosSimulador, totalRecortados: alumnosARecortar.length, reporte };
  });

  console.log("Horas de simulador agregadas y límites verificados.");
  console.log(`  Vuelos de simulador nuevos: ${resultado.totalVuelosSimulador}`);
  console.log(`  Alumnos con avión recortado (estaban >=85%): ${resultado.totalRecortados}`);
  console.log("");
  console.log("Reporte final por alumno:");
  let algunoSobrePasado = false;
  for (const r of resultado.reporte) {
    const excede = r.pctAvion >= LIMITE_SEGURO_PORCENTAJE || r.pctSimulador >= LIMITE_SEGURO_PORCENTAJE || r.pctTotal >= LIMITE_SEGURO_PORCENTAJE;
    if (excede) algunoSobrePasado = true;
    console.log(
      `  ${r.nombre.padEnd(28)} | avión: ${String(r.horasAvion).padStart(6)}h (${r.pctAvion}%) | simulador: ${String(r.horasSimulador).padStart(5)}h (${r.pctSimulador}%) | total: ${r.pctTotal}%${excede ? "  <-- SUPERA 90%" : ""}`
    );
  }
  console.log("");
  console.log(algunoSobrePasado ? "ATENCIÓN: algún alumno todavía supera el 90% en alguna métrica." : "Ningún alumno alcanza el 90% en ninguna métrica.");

  await sequelize.close();
}

main().catch(async (err) => {
  console.error("Error agregando horas de simulador / corrigiendo límites — no se guardó nada (la transacción se revirtió):");
  console.error(err);
  process.exit(1);
});
