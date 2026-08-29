const { Recurso, Mantenimiento } = require("../models");

// Reglas de negocio compartidas entre: (1) la aplicación directa de un cambio
// por el super administrador, (2) la validación previa a crear una
// SolicitudCambio, y (3) la aplicación real del cambio cuando el super
// administrador aprueba una solicitud. Mantenerlas en un solo lugar evita
// que las reglas 3 y 4 se dupliquen (y se desincronicen) en varios controladores.

const ESTADOS_RECURSO = [
  "disponible",
  "en_vuelo",
  "proximo_a_mantenimiento",
  "en_mantenimiento",
  "fuera_de_servicio",
];

const TIPOS_ACCION = [
  "cambiar_estado",
  "registrar_mantenimiento",
  "finalizar_mantenimiento",
  "actualizar_horas",
];

// Regla 3: no se permite pasar directamente de "fuera_de_servicio" a "en_vuelo";
// primero debe pasar por "disponible".
function validarTransicionEstado(estadoActual, estadoNuevo) {
  if (!ESTADOS_RECURSO.includes(estadoNuevo)) {
    return { valido: false, mensaje: "El estado indicado no es válido." };
  }

  if (estadoActual === "fuera_de_servicio" && estadoNuevo === "en_vuelo") {
    return {
      valido: false,
      mensaje:
        'No se puede pasar de "fuera de servicio" a "en vuelo" directamente. El recurso debe quedar "disponible" primero.',
    };
  }

  return { valido: true };
}

// Regla 4: nunca se acepta una lectura de horas menor a la ya registrada.
function validarHoras(horasActuales, horasPropuestas) {
  const nuevas = Number(horasPropuestas);

  if (horasPropuestas === undefined || horasPropuestas === null || Number.isNaN(nuevas)) {
    return { valido: false, mensaje: "Debe indicar un valor numérico de horas." };
  }

  if (nuevas < 0) {
    return { valido: false, mensaje: "Las horas no pueden ser un valor negativo." };
  }

  if (nuevas < Number(horasActuales)) {
    return {
      valido: false,
      mensaje: `Las horas ingresadas (${nuevas}) no pueden ser menores a las horas actuales del recurso (${horasActuales}).`,
    };
  }

  return { valido: true };
}

// Valida que los datos propuestos para una acción sean técnicamente correctos,
// sin aplicarlos todavía. `contexto.mantenimiento` solo es necesario para
// "finalizar_mantenimiento".
function validarDatosAccion(tipoAccion, datosPropuestos = {}, contexto = {}) {
  const { recurso, mantenimiento } = contexto;

  switch (tipoAccion) {
    case "cambiar_estado":
      return validarTransicionEstado(recurso.estado, datosPropuestos.estado);

    case "actualizar_horas":
      return validarHoras(recurso.horasAcumuladas, datosPropuestos.horasAcumuladas);

    case "registrar_mantenimiento": {
      if (!["preventivo", "correctivo"].includes(datosPropuestos.tipoMantenimiento)) {
        return { valido: false, mensaje: "El tipo de mantenimiento debe ser preventivo o correctivo." };
      }
      if (!datosPropuestos.fechaInicio) {
        return { valido: false, mensaje: "La fecha de inicio del mantenimiento es obligatoria." };
      }
      if (datosPropuestos.horasAlIngreso !== undefined && datosPropuestos.horasAlIngreso !== null) {
        const validacionHoras = validarHoras(recurso.horasAcumuladas, datosPropuestos.horasAlIngreso);
        if (!validacionHoras.valido) return validacionHoras;
      }
      return { valido: true };
    }

    case "finalizar_mantenimiento": {
      if (!mantenimiento) {
        return { valido: false, mensaje: "No se encontró el mantenimiento indicado." };
      }
      if (mantenimiento.estado !== "en_proceso") {
        return { valido: false, mensaje: "Este mantenimiento ya fue finalizado." };
      }
      if (datosPropuestos.horasActuales !== undefined && datosPropuestos.horasActuales !== null) {
        const validacionHoras = validarHoras(recurso.horasAcumuladas, datosPropuestos.horasActuales);
        if (!validacionHoras.valido) return validacionHoras;
      }
      return { valido: true };
    }

    default:
      return { valido: false, mensaje: "Tipo de acción no reconocido." };
  }
}

// Aplica el cambio real en firme. Asume que validarDatosAccion ya se ejecutó
// sobre el estado más reciente del recurso.
async function aplicarAccion(tipoAccion, datosPropuestos = {}, contexto = {}) {
  const { recurso, mantenimiento } = contexto;

  switch (tipoAccion) {
    case "cambiar_estado": {
      recurso.estado = datosPropuestos.estado;
      await recurso.save();
      return recurso;
    }

    case "actualizar_horas": {
      recurso.horasAcumuladas = datosPropuestos.horasAcumuladas;
      await recurso.save();
      return recurso;
    }

    case "registrar_mantenimiento": {
      const nuevoMantenimiento = await Mantenimiento.create({
        recursoId: recurso.id,
        tipoMantenimiento: datosPropuestos.tipoMantenimiento,
        fechaInicio: datosPropuestos.fechaInicio,
        horasAlIngreso: datosPropuestos.horasAlIngreso ?? null,
        descripcion: datosPropuestos.descripcion ?? null,
        estado: "en_proceso",
      });

      // Regla 1: registrar un mantenimiento pone el recurso en "en_mantenimiento"
      recurso.estado = "en_mantenimiento";
      await recurso.save();

      return nuevoMantenimiento;
    }

    case "finalizar_mantenimiento": {
      mantenimiento.estado = "completado";
      mantenimiento.fechaFin = datosPropuestos.fechaFin || new Date();
      await mantenimiento.save();

      // Regla 2: al finalizar, el recurso regresa a "disponible" y, si se
      // reportó una lectura de horas, se actualiza horasAcumuladas.
      recurso.estado = "disponible";
      if (datosPropuestos.horasActuales !== undefined && datosPropuestos.horasActuales !== null) {
        recurso.horasAcumuladas = datosPropuestos.horasActuales;
      }
      await recurso.save();

      return mantenimiento;
    }

    default:
      throw new Error("Tipo de acción no reconocido.");
  }
}

module.exports = {
  ESTADOS_RECURSO,
  TIPOS_ACCION,
  validarTransicionEstado,
  validarHoras,
  validarDatosAccion,
  aplicarAccion,
};
