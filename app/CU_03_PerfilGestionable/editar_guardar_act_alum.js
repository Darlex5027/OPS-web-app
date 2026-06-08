// ================================
// Archivo : editar_guardar_act_alum.js
// Módulo  : CU_03_PerfilGestionable
// Fecha   : 06/06/2026
// Descripción : Gestiona los botones de edición, guardado y cancelación
//               para cuatro secciones independientes del perfil del alumno:
//               1. Perfil Alumno
//               2. Actividades (primera inscripción)
//               3. Actividades (segunda inscripción)
//               4. Prácticas Profesionales
// ================================

import { lanzarToast } from '../js/lanzar_toast.js';

// ================================
// UTILIDADES GENERALES
// ================================

// Obtiene un elemento del DOM por su id
function obtenerElemento(id) {
    return document.getElementById(id);
}

// Obtiene el valor de un input, limpiando espacios al inicio y al final
function obtenerValor(id) {
    return obtenerElemento(id)?.value?.trim() ?? "";
}

// Habilita o deshabilita una lista de campos por su id
function toggleCampos(ids, deshabilitar) {
    ids.forEach(function (id) {
        const elCampo = obtenerElemento(id);
        if (elCampo) elCampo.disabled = deshabilitar;
    });
}

// Muestra u oculta un elemento usando la clase CSS "oculto"
function toggleVisibilidad(id, mostrar) {
    obtenerElemento(id)?.classList.toggle("oculto", !mostrar);
}

// Muestra u oculta un botón usando display inline-block o none
function toggleBoton(id, visible) {
    const elBoton = obtenerElemento(id);
    if (elBoton) elBoton.style.display = visible ? "inline-block" : "none";
}

// ================================
// CONSTANTES — IDs de campos editables por sección
// ================================

const CAMPOS_PERFIL = [
    "grupo_alumno", "horario_entrada", "horario_salida"
];

const CAMPOS_ACTIVIDADES_1 = [
    "area", "programa", "estado", "fecha_inicio", "fecha_fin"
];

const CAMPOS_ACTIVIDADES_2 = [
    "area_2", "programa_2", "estado_2", "fecha_inicio_2", "fecha_fin_2"
];

const CAMPOS_PRACTICAS = [
    "pp_id_empresa", "pp_area", "pp_programa", "pp_estado",
    "pp_periodo_tipo", "pp_periodo_año", "pp_fecha_inicio", "pp_fecha_fin"
];

// Expresiones regulares para validar los datos de una nueva empresa
const regexEmpresa = {
    nombre:      /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\.,\-]{2,100}$/,
    razonSocial: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\.,\-&]{2,150}$/,
    rfc:         /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/,
    direccion:   /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\.,\-#]{5,200}$/,
    sitioWeb:    /^https?:\/\/(www\.)?[a-zA-Z0-9\-]+(\.[a-zA-Z]{2,})+/
};

// ================================
// HELPERS — cambio de estado de botones por prefijo de sección
// ================================

// Activa el modo edición: muestra Guardar y Cancelar, oculta Editar
function activarModoEdicion(prefijo) {
    toggleBoton(`btn_editar_${prefijo}`,   false);
    toggleBoton(`btn_guardar_${prefijo}`,  true);
    toggleBoton(`btn_cancelar_${prefijo}`, true);
}

// Activa el modo lectura: muestra Editar, oculta Guardar y Cancelar
function activarModoLectura(prefijo) {
    toggleBoton(`btn_editar_${prefijo}`,   true);
    toggleBoton(`btn_guardar_${prefijo}`,  false);
    toggleBoton(`btn_cancelar_${prefijo}`, false);
}

// ================================
// MODAL — Nueva Empresa
// ================================

// Guarda el id del select destino al abrir el modal de nueva empresa
let selectDestinoEmpresa = "id_empresa";

// Abre el modal para registrar una nueva empresa y define su select destino
function abrirModalEmpresa(destino) {
    selectDestinoEmpresa = destino || "id_empresa";
    obtenerElemento("modal_nueva_empresa").style.display = "flex";
}

// Cierra el modal de nueva empresa y limpia sus campos
function cerrarModalEmpresa() {
    obtenerElemento("modal_nueva_empresa").style.display = "none";
    const camposModal = [
        "nueva_empresa_nombre", "nueva_empresa_descripcion", "nueva_empresa_razon_social",
        "nueva_empresa_rfc",    "nueva_empresa_direccion",   "nueva_empresa_web"
    ];
    camposModal.forEach(function (id) {
        const elCampo = obtenerElemento(id);
        if (elCampo) elCampo.value = "";
    });
}

// Valida los campos del modal y envía la nueva empresa al servidor
function guardarNuevaEmpresa() {
    const nombre      = obtenerValor("nueva_empresa_nombre");
    const descripcion = obtenerValor("nueva_empresa_descripcion");
    const razonSocial = obtenerValor("nueva_empresa_razon_social");
    const rfc         = obtenerValor("nueva_empresa_rfc").toUpperCase();
    const direccion   = obtenerValor("nueva_empresa_direccion");
    const sitioWeb    = obtenerValor("nueva_empresa_web");

    if (!nombre)                                                    return lanzarToast("El nombre es obligatorio", "error");
    if (!regexEmpresa.nombre.test(nombre))                          return lanzarToast("Nombre inválido", "error");
    if (!descripcion)                                               return lanzarToast("La descripción es obligatoria", "error");
    if (razonSocial && !regexEmpresa.razonSocial.test(razonSocial)) return lanzarToast("Razón social inválida", "error");
    if (rfc         && !regexEmpresa.rfc.test(rfc))                 return lanzarToast("RFC inválido", "error");
    if (direccion   && !regexEmpresa.direccion.test(direccion))     return lanzarToast("Dirección inválida", "error");
    if (sitioWeb    && !regexEmpresa.sitioWeb.test(sitioWeb))       return lanzarToast("Sitio web inválido", "error");

    fetch("crear_empresa.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, descripcion, razonSocial, rfc, direccion, sitioWeb })
    })
        .then(function (respuesta) {
            return respuesta.json();
        })
        .then(function (resultado) {
            if (!resultado.success) return lanzarToast("Error al crear empresa", "error");
            const elSelect = obtenerElemento(selectDestinoEmpresa);
            if (elSelect) elSelect.appendChild(new Option(nombre, resultado.id_empresa, true, true));
            lanzarToast("Empresa creada correctamente", "exito");
            cerrarModalEmpresa();
        })
        .catch(function () {
            lanzarToast("Error de conexión", "error");
        });
}

// Consulta la lista de empresas al servidor y llena el select indicado
async function cargarEmpresas(selectId, idActual) {
    try {
        const respuesta = await fetch("obtener_empresas.php");
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        const datos = await respuesta.json();
        const lista = Array.isArray(datos) ? datos
                    : Array.isArray(datos?.data) ? datos.data
                    : (() => { throw new Error("Formato inválido"); })();

        const elSelect = obtenerElemento(selectId);
        if (!elSelect) return;
        elSelect.innerHTML = '<option value="">-- Selecciona una empresa --</option>';
        lista.forEach(function (empresa) {
            elSelect.appendChild(new Option(empresa.Nombre, empresa.Id_empresa));
        });
        if (idActual && elSelect.querySelector(`option[value="${idActual}"]`)) {
            elSelect.value = idActual;
        }
    } catch (error) {
        console.error("cargarEmpresas:", error);
        lanzarToast("Error al cargar empresas", "error");
    }
}

// ================================
// SECCIÓN 1 — Perfil Alumno
// ================================

// Habilita los campos del perfil y activa el modo edición
function editarPerfil() {
    const elInputFoto = obtenerElemento("foto_perfil_input");
    if (elInputFoto) elInputFoto.disabled = false;
    // Muestra el botón de cambiar foto al entrar en modo edición
    obtenerElemento("btn_cambiar_foto")?.classList.remove("oculto");
    toggleCampos(CAMPOS_PERFIL, false);
    activarModoEdicion("perfil");
}

// Deshabilita los campos del perfil, cancela cambios y recarga la página
function cancelarPerfil() {
    toggleCampos(CAMPOS_PERFIL, true);
    const elInputFoto = obtenerElemento("foto_perfil_input");
    if (elInputFoto) elInputFoto.disabled = true;
    // Oculta el botón de cambiar foto al salir del modo edición
    obtenerElemento("btn_cambiar_foto")?.classList.add("oculto");
    activarModoLectura("perfil");
    location.reload();
}

// Envía la foto de perfil al servidor y actualiza el preview si tiene éxito
async function subirFotoAlumno() {
    const elInput = obtenerElemento("foto_perfil_input");
    if (!elInput || elInput.files.length === 0) return true; // Sin foto nueva, continúa normal

    const archivo = elInput.files[0];
    try {
        const fd = new FormData();
        fd.append("foto_perfil", archivo);
        const respuesta = await fetch("guardar_foto.php", { method: "POST", body: fd });
        const texto     = await respuesta.text();
        let resultado;
        try {
            resultado = JSON.parse(texto);
        } catch {
            lanzarToast("Respuesta inesperada al subir la foto", "error");
            return false;
        }
        if (!resultado.success) {
            lanzarToast(resultado.error || "Error al subir la foto", "error");
            return false;
        }
        const elPreview = obtenerElemento("foto_perfil_preview");
        if (elPreview && resultado.url) elPreview.src = resultado.url;
        return true;
    } catch {
        lanzarToast("Error de conexión al subir la foto", "error");
        return false;
    }
}

// Valida y prepara los datos del perfil para guardarlos
async function guardarPerfil() {
    // Sube la foto primero si el alumno seleccionó una nueva
    const fotoOk = await subirFotoAlumno();
    if (!fotoOk) return;

    const grupoInput = (obtenerElemento("grupo_alumno")?.value || "").trim().toUpperCase();
    if (grupoInput && !/^[1-9][A-Z]$/.test(grupoInput)) {
        return lanzarToast("Formato de grupo inválido. Ej: 1A, 9B", "error");
    }

    const horaEntrada = (obtenerElemento("horario_entrada")?.value || "").trim();
    const horaSalida  = (obtenerElemento("horario_salida")?.value  || "").trim();

    if ((horaEntrada || horaSalida) && (!horaEntrada || !horaSalida)) {
        return lanzarToast("Completa ambos horarios o deja ambos vacíos", "error");
    }
    if (horaEntrada && horaSalida && horaSalida <= horaEntrada) {
        return lanzarToast("La salida debe ser posterior a la entrada", "error");
    }

    const datos = { tipo: "PERFIL" };
    if (grupoInput)                datos.grupo   = grupoInput;
    if (horaEntrada && horaSalida) datos.horario = `${horaEntrada} - ${horaSalida}`;

    // Detecta si el alumno alcanza el semestre 9 para activar Prácticas Profesionales
    const grupoOriginal    = obtenerElemento("grupo_alumno")?.dataset.grupoOriginal || "";
    const semestreNuevo    = parseInt(grupoInput?.match(/^([1-9])/)?.[1]    || "0");
    const semestreAnterior = parseInt(grupoOriginal?.match(/^([1-9])/)?.[1] || "0");

    const yaTienePracticas = obtenerElemento("contenedor-practicas") &&
        !obtenerElemento("contenedor-practicas").classList.contains("oculto");

    const llegaASemestre9 = semestreNuevo >= 9 && !yaTienePracticas;

    if (llegaASemestre9) {
        abrirModalPracticas(datos);
        return;
    }

    ejecutarGuardado(datos, "perfil");
}

// ================================
// SECCIÓN 2 — Actividades (primera inscripción)
// ================================

// Habilita los campos de la primera actividad según el estado actual
function editarActividades() {
    const estadoActual = obtenerElemento("estado")?.value || "";

    if (estadoActual === "PENDIENTE") {
        toggleCampos([...CAMPOS_ACTIVIDADES_1, "id_empresa"], false);
        toggleVisibilidad("id_empresa",        true);
        toggleVisibilidad("btn_crear_empresa", true);
        toggleVisibilidad("empresa_texto",     false);
        cargarEmpresas("id_empresa", obtenerElemento("empresa_texto")?.dataset.idEmpresa);
    } else if (estadoActual === "EN_CURSO") {
        toggleCampos(CAMPOS_ACTIVIDADES_1, false);
        toggleVisibilidad("id_empresa",        false);
        toggleVisibilidad("btn_crear_empresa", false);
        toggleVisibilidad("empresa_texto",     true);
    } else {
        toggleCampos(CAMPOS_ACTIVIDADES_1, false);
        toggleCampos(["id_empresa"], false);
        toggleVisibilidad("id_empresa",        true);
        toggleVisibilidad("btn_crear_empresa", true);
        toggleVisibilidad("empresa_texto",     false);
        cargarEmpresas("id_empresa", obtenerElemento("empresa_texto")?.dataset.idEmpresa);
    }

    activarModoEdicion("act");
}

// Deshabilita los campos de la primera actividad, cancela cambios y recarga la página
function cancelarActividades() {
    toggleCampos([...CAMPOS_ACTIVIDADES_1, "id_empresa"], true);
    toggleVisibilidad("id_empresa",        false);
    toggleVisibilidad("btn_crear_empresa", false);
    toggleVisibilidad("empresa_texto",     true);
    activarModoLectura("act");
    location.reload();
}

// Verifica que los campos obligatorios estén completos para el estado COMPLETADO
function validarCamposCompletado() {
    const camposRequeridos = [
        { id: "area",            label: "Área" },
        { id: "programa",        label: "Programa" },
        { id: "fecha_inicio",    label: "Fecha de inicio" },
        { id: "fecha_fin",       label: "Fecha de fin" },
        { id: "grupo_alumno",    label: "Semestre y Grupo" },
        { id: "horario_entrada", label: "Horario de entrada" },
        { id: "horario_salida",  label: "Horario de salida" },
    ];
    const camposVacios = camposRequeridos.filter(function (campo) {
        return !obtenerValor(campo.id);
    });
    if (camposVacios.length) {
        lanzarToast(`Campos incompletos: ${camposVacios.map(function (c) { return c.label; }).join(", ")}`, "error");
        return false;
    }
    return true;
}

// Valida y prepara los datos de la primera actividad para guardarlos
function guardarActividades() {
    const estadoActual = obtenerElemento("estado")?.value || "";
    const fechaInicio  = obtenerElemento("fecha_inicio")?.value || "";
    const fechaFin     = obtenerElemento("fecha_fin")?.value    || "";

    if (estadoActual === "COMPLETADO" && !validarCamposCompletado()) return;
    if (fechaInicio && fechaFin && fechaFin <= fechaInicio) {
        return lanzarToast("La fecha fin debe ser posterior a la fecha inicio", "error");
    }

    const datos = { tipo: "ACTIVIDADES" };
    if (estadoActual)             datos.estado       = estadoActual;
    if (obtenerValor("area"))     datos.area         = obtenerValor("area");
    if (obtenerValor("programa")) datos.programa     = obtenerValor("programa");
    if (fechaInicio)              datos.fecha_inicio = fechaInicio;
    if (fechaFin)                 datos.fecha_fin    = fechaFin;

    const elSelectEmpresa = obtenerElemento("id_empresa");
    if (elSelectEmpresa && !elSelectEmpresa.classList.contains("oculto") && elSelectEmpresa.value) {
        datos.id_empresa = elSelectEmpresa.value;
        const elTextoEmpresa = obtenerElemento("empresa_texto");
        if (elTextoEmpresa) {
            elTextoEmpresa.value = elSelectEmpresa.options[elSelectEmpresa.selectedIndex]?.text || "";
            elTextoEmpresa.dataset.idEmpresa = elSelectEmpresa.value;
        }
    } else if (estadoActual === "PENDIENTE") {
        return lanzarToast("Selecciona una empresa", "error");
    }

    ejecutarGuardado(datos, "act");
}

// ================================
// SECCIÓN 3 — Actividades (segunda inscripción)
// ================================

// Habilita los campos de la segunda actividad según el estado actual
function editarActividades2() {
    const estadoActual = obtenerElemento("estado_2")?.value || "";

    if (estadoActual === "PENDIENTE") {
        toggleCampos([...CAMPOS_ACTIVIDADES_2, "id_empresa_2"], false);
        toggleVisibilidad("id_empresa_2",        true);
        toggleVisibilidad("btn_crear_empresa_2", true);
        toggleVisibilidad("empresa_texto_2",     false);
        cargarEmpresas("id_empresa_2", obtenerElemento("empresa_texto_2")?.dataset.idEmpresa);
    } else if (estadoActual === "EN_CURSO") {
        toggleCampos(CAMPOS_ACTIVIDADES_2, false);
        toggleVisibilidad("id_empresa_2",        false);
        toggleVisibilidad("btn_crear_empresa_2", false);
        toggleVisibilidad("empresa_texto_2",     true);
    } else {
        toggleCampos(CAMPOS_ACTIVIDADES_2, false);
        toggleCampos(["id_empresa_2"], false);
        toggleVisibilidad("id_empresa_2",        true);
        toggleVisibilidad("btn_crear_empresa_2", true);
        toggleVisibilidad("empresa_texto_2",     false);
        cargarEmpresas("id_empresa_2", obtenerElemento("empresa_texto_2")?.dataset.idEmpresa);
    }

    activarModoEdicion("act_2");
}

// Deshabilita los campos de la segunda actividad, cancela cambios y recarga la página
function cancelarActividades2() {
    toggleCampos([...CAMPOS_ACTIVIDADES_2, "id_empresa_2"], true);
    toggleVisibilidad("id_empresa_2",        false);
    toggleVisibilidad("btn_crear_empresa_2", false);
    toggleVisibilidad("empresa_texto_2",     true);
    activarModoLectura("act_2");
    location.reload();
}

// Valida y prepara los datos de la segunda actividad para guardarlos
function guardarActividades2() {
    const estadoActual = obtenerElemento("estado_2")?.value || "";
    const fechaInicio  = obtenerElemento("fecha_inicio_2")?.value || "";
    const fechaFin     = obtenerElemento("fecha_fin_2")?.value    || "";

    if (fechaInicio && fechaFin && fechaFin <= fechaInicio) {
        return lanzarToast("La fecha fin debe ser posterior a la fecha inicio", "error");
    }

    const datos = { tipo: "ACTIVIDADES_2" };
    if (estadoActual)               datos.estado       = estadoActual;
    if (obtenerValor("area_2"))     datos.area         = obtenerValor("area_2");
    if (obtenerValor("programa_2")) datos.programa     = obtenerValor("programa_2");
    if (fechaInicio)                datos.fecha_inicio = fechaInicio;
    if (fechaFin)                   datos.fecha_fin    = fechaFin;

    const elSelectEmpresa2 = obtenerElemento("id_empresa_2");
    if (elSelectEmpresa2 && !elSelectEmpresa2.classList.contains("oculto") && elSelectEmpresa2.value) {
        datos.id_empresa = elSelectEmpresa2.value;
        const elTextoEmpresa2 = obtenerElemento("empresa_texto_2");
        if (elTextoEmpresa2) {
            elTextoEmpresa2.value = elSelectEmpresa2.options[elSelectEmpresa2.selectedIndex]?.text || "";
            elTextoEmpresa2.dataset.idEmpresa = elSelectEmpresa2.value;
        }
    } else if (estadoActual === "PENDIENTE") {
        return lanzarToast("Selecciona una empresa", "error");
    }

    ejecutarGuardado(datos, "act_2");
}

// ================================
// SECCIÓN 4 — Prácticas Profesionales
// ================================

// Habilita los campos de Prácticas Profesionales y carga la lista de empresas
function editarPracticas() {
    toggleCampos(CAMPOS_PRACTICAS, false);
    toggleVisibilidad("pp_empresa_texto",     false);
    toggleVisibilidad("pp_id_empresa",        true);
    toggleVisibilidad("pp_btn_crear_empresa", true);
    cargarEmpresas("pp_id_empresa", obtenerElemento("pp_empresa_texto")?.dataset.idEmpresa);
    activarModoEdicion("pp");
}

// Deshabilita los campos de Prácticas Profesionales y cancela los cambios
function cancelarPracticas() {
    toggleCampos(CAMPOS_PRACTICAS, true);
    toggleVisibilidad("pp_empresa_texto",     true);
    toggleVisibilidad("pp_id_empresa",        false);
    toggleVisibilidad("pp_btn_crear_empresa", false);
    activarModoLectura("pp");
    location.reload();
}

// Verifica que los campos de Prácticas Profesionales sean válidos según el estado seleccionado
function validarPracticasPorEstado(estado, area, programa, fechaInicio, fechaFin) {
    if (!estado) {
        return { valido: false, mensaje: "Selecciona el Estado" };
    }
    // PENDIENTE: solo el estado es requerido
    if (estado === "PENDIENTE") {
        return { valido: true, mensaje: "" };
    }
    // EN_CURSO: requiere Área, Programa y Fecha de inicio
    if (estado === "EN_CURSO") {
        if (!area)        return { valido: false, mensaje: "En EN_CURSO, el Área es obligatoria" };
        if (!programa)    return { valido: false, mensaje: "En EN_CURSO, el Programa es obligatorio" };
        if (!fechaInicio) return { valido: false, mensaje: "En EN_CURSO, la Fecha Inicio es obligatoria" };
        return { valido: true, mensaje: "" };
    }
    // COMPLETADO: requiere todos los campos, incluyendo Fecha de fin
    if (estado === "COMPLETADO") {
        if (!area)        return { valido: false, mensaje: "Para COMPLETADO, el Área es obligatoria" };
        if (!programa)    return { valido: false, mensaje: "Para COMPLETADO, el Programa es obligatorio" };
        if (!fechaInicio) return { valido: false, mensaje: "Para COMPLETADO, la Fecha Inicio es obligatoria" };
        if (!fechaFin)    return { valido: false, mensaje: "Para COMPLETADO, la Fecha Fin es obligatoria" };
        if (fechaInicio && fechaFin && fechaFin <= fechaInicio) {
            return { valido: false, mensaje: "La Fecha Fin debe ser posterior a la Fecha Inicio" };
        }
        return { valido: true, mensaje: "" };
    }
    return { valido: true, mensaje: "" };
}

// Valida y envía los datos de Prácticas Profesionales al servidor
function guardarPracticas() {
    const area         = obtenerValor("pp_area");
    const programa     = obtenerValor("pp_programa");
    const estadoActual = obtenerElemento("pp_estado")?.value || "";
    const fechaInicio  = obtenerElemento("pp_fecha_inicio")?.value || "";
    const fechaFin     = obtenerElemento("pp_fecha_fin")?.value    || "";
    const idActividad  = obtenerElemento("practicas_profesionales")?.dataset.idActividad || null;

    const validacion = validarPracticasPorEstado(estadoActual, area, programa, fechaInicio, fechaFin);
    if (!validacion.valido) {
        return lanzarToast(validacion.mensaje, "error");
    }

    // La empresa es opcional en todos los estados
    const idEmpresa   = obtenerElemento("pp_id_empresa")?.value || "";

    // Usa valores por defecto si los campos de periodo están vacíos
    const periodoTipo = obtenerValor("pp_periodo_tipo") || "primavera";
    const periodoAnio = obtenerValor("pp_periodo_año")  || String(new Date().getFullYear());

    const datos = {
        tipo:          "PRACTICAS",
        id_actividad:  idActividad,
        id_empresa:    idEmpresa,
        area,
        programa,
        estado:        estadoActual,
        periodo_tipo:  periodoTipo,
        "periodo_año": periodoAnio,
        fecha_inicio:  fechaInicio,
        fecha_fin:     fechaFin
    };

    fetch("guardar_datos.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos)
    })
        .then(function (respuesta) {
            return respuesta.json();
        })
        .then(function (resultado) {
            if (resultado.success) {
                const elSelect = obtenerElemento("pp_id_empresa");
                const elTexto  = obtenerElemento("pp_empresa_texto");
                if (elSelect && elTexto) {
                    elTexto.value = elSelect.options[elSelect.selectedIndex]?.text || "";
                    elTexto.dataset.idEmpresa = elSelect.value;
                }
                toggleVisibilidad("pp_empresa_texto",     true);
                toggleVisibilidad("pp_id_empresa",        false);
                toggleVisibilidad("pp_btn_crear_empresa", false);
                toggleCampos(CAMPOS_PRACTICAS, true);
                lanzarToast("Prácticas Profesionales guardadas ✓", "exito");
                activarModoLectura("pp");
            } else {
                lanzarToast(resultado.error || "Error al guardar Prácticas", "error");
            }
        })
        .catch(function () {
            lanzarToast("Error de conexión", "error");
        });
}

// ================================
// GUARDADO GENERAL — usado por Perfil y Actividades
// ================================

// Envía los datos al servidor y muestra el resultado al usuario
function ejecutarGuardado(datos, prefijo) {
    fetch("guardar_datos.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos)
    })
        .then(async function (respuesta) {
            const textoRespuesta = await respuesta.text();
            try {
                return JSON.parse(textoRespuesta);
            } catch {
                throw new Error("Respuesta no es JSON válido: " + textoRespuesta);
            }
        })
        .then(function (resultado) {
            if (resultado.success) {
                lanzarToast("Datos guardados correctamente", "exito");
                setTimeout(function () { location.reload(); }, 1500);
            } else {
                let mensaje = resultado.error || "Error al guardar los datos";
                if (mensaje.includes("Grupo") || mensaje.includes("grupo")) {
                    mensaje = "Por favor, completa el campo 'Semestre y Grupo'";
                } else if (mensaje.includes("Empresa") || mensaje.includes("empresa")) {
                    mensaje = "Por favor, selecciona una empresa";
                } else if (mensaje.includes("constraint") || mensaje.includes("Integrity")) {
                    mensaje = "Hay datos requeridos incompletos. Verifica todos los campos.";
                }
                lanzarToast(mensaje, "error");
            }
        })
        .catch(function (error) {
            console.error("ejecutarGuardado error:", error);
            lanzarToast("Error de conexión", "error");
        });
}

// ================================
// PRÁCTICAS — lógica de transición al semestre 9
// ================================

// Abre el modal que pregunta si el alumno desea iniciar Prácticas Profesionales
function abrirModalPracticas(datos) {
    const semestre   = parseInt(datos.grupo?.match(/^([1-9])/)?.[1] || "0");
    const elSemestre = obtenerElemento("semestre_detectado");
    if (elSemestre) elSemestre.textContent = semestre ? `${semestre}°` : "avanzado";

    const elModal = obtenerElemento("modal_practicas_profesionales");
    if (!elModal) return;
    elModal.style.display = "flex";

    // Reemplaza los botones para evitar duplicar listeners
    ["btn_si_practicas", "btn_no_practicas"].forEach(function (id) {
        const elViejo = obtenerElemento(id);
        if (!elViejo) return;
        const elNuevo = elViejo.cloneNode(true);
        elViejo.parentNode.replaceChild(elNuevo, elViejo);
    });

    obtenerElemento("btn_si_practicas").addEventListener("click", function () {
        cerrarModalPracticas();
        guardarConPracticas(datos);
    });
    obtenerElemento("btn_no_practicas").addEventListener("click", function () {
        cerrarModalPracticas();
        ejecutarGuardado(datos, "perfil");
    });

    elModal.addEventListener("click", function (e) {
        if (e.target === elModal) cerrarModalPracticas();
    }, { once: true });
}

// Cierra el modal de confirmación de Prácticas Profesionales
function cerrarModalPracticas() {
    const elModal = obtenerElemento("modal_practicas_profesionales");
    if (elModal) elModal.style.display = "none";
}

// Guarda el perfil actualizado y crea el registro de Prácticas Profesionales en secuencia
function guardarConPracticas(datos) {
    fetch("guardar_datos.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos)
    })
        .then(function (respuesta) {
            return respuesta.json();
        })
        .then(function (resultado) {
            if (!resultado.success) {
                lanzarToast(resultado.error || "Error al guardar semestre", "error");
                return Promise.reject("fallido");
            }
            return fetch("crear_practica.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ grupo: datos.grupo })
            });
        })
        .then(function (respuesta) {
            return respuesta?.json();
        })
        .then(function (resultado) {
            if (!resultado) return;
            if (resultado.success) {
                lanzarToast("Semestre actualizado y Prácticas Profesionales iniciadas ✓", "exito");
                mostrarFormularioPracticas(resultado.id_actividad ?? null);
                activarModoLectura("perfil");
            } else {
                lanzarToast(resultado.error || "Error al crear Prácticas", "error");
            }
        })
        .catch(function (error) {
            if (error !== "fallido") lanzarToast("Error de conexión", "error");
        });
}

// ================================
// PRÁCTICAS — renderizado en el DOM
// ================================

// Muestra la sección de Prácticas Profesionales después de crearla
function mostrarFormularioPracticas(idActividad) {
    const elContenedor = obtenerElemento("contenedor-practicas");
    const elFormulario = obtenerElemento("practicas_profesionales");
    if (!elContenedor || !elFormulario) return;

    if (idActividad) elFormulario.dataset.idActividad = idActividad;
    elContenedor.classList.remove("oculto");
    activarModoLectura("pp");
    elContenedor.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Pre-llena la sección de Prácticas Profesionales en modo lectura con los datos del servidor
function mostrarFormularioPracticasLectura(practicas) {
    if (!practicas) return;

    function setValor(id, valor) {
        const el = obtenerElemento(id);
        if (el) el.value = valor || "";
    }

    setValor("pp_servicio",           "Prácticas Profesionales");
    setValor("pp_empresa_texto",      practicas.Nombre_empresa);
    setValor("pp_area",               practicas.Area);
    setValor("pp_programa",           practicas.Programa);
    setValor("pp_estado",             practicas.Estado);
    setValor("pp_periodo_tipo",       practicas.periodo_tipo);
    setValor("pp_periodo_año",        practicas.periodo_año);
    setValor("pp_fecha_inicio",       practicas.Fecha_inicio);
    setValor("pp_fecha_fin",          practicas.Fecha_fin);
    setValor("pp_fecha_registro",     practicas.Fecha_registro_act);
    setValor("pp_fecha_modificacion", practicas.Fecha_modificacion);

    const elFormulario = obtenerElemento("practicas_profesionales");
    if (elFormulario) elFormulario.dataset.idActividad = practicas.Id_actividad || "";

    obtenerElemento("contenedor-practicas")?.classList.remove("oculto");
    toggleVisibilidad("pp_empresa_texto",     true);
    toggleVisibilidad("pp_id_empresa",        false);
    toggleVisibilidad("pp_btn_crear_empresa", false);
    toggleCampos(CAMPOS_PRACTICAS, true);
    activarModoLectura("pp");
}

// ================================
// INICIALIZACIÓN — funciones llamadas desde DOMContentLoaded
// ================================

// Oculta las tablas hasta que los datos estén disponibles
function inicializarVistas() {
    if (obtenerElemento("tabla_perfil_alumno")) obtenerElemento("tabla_perfil_alumno").style.display = "none";
    if (obtenerElemento("tabla_actividades"))   obtenerElemento("tabla_actividades").style.display   = "none";
}

// Deshabilita todos los campos y oculta los selects de empresa al inicio
function inicializarCampos() {
    toggleCampos(CAMPOS_PERFIL,        true);
    toggleCampos(CAMPOS_ACTIVIDADES_1, true);
    toggleCampos(CAMPOS_ACTIVIDADES_2, true);
    toggleCampos(CAMPOS_PRACTICAS,     true);
    toggleCampos(["id_empresa", "id_empresa_2"], true);

    toggleVisibilidad("id_empresa",           false);
    toggleVisibilidad("btn_crear_empresa",    false);
    toggleVisibilidad("id_empresa_2",         false);
    toggleVisibilidad("btn_crear_empresa_2",  false);
    toggleVisibilidad("pp_id_empresa",        false);
    toggleVisibilidad("pp_btn_crear_empresa", false);
}

// Registra los eventos de cambio de fecha para ajustar los mínimos de fecha fin
function inicializarEventosFecha() {
    obtenerElemento("grupo_alumno")?.addEventListener("input", function (e) {
        e.target.value = e.target.value.toUpperCase();
    });
    obtenerElemento("fecha_inicio")?.addEventListener("change", function (e) {
        const elFechaFin = obtenerElemento("fecha_fin");
        if (elFechaFin) elFechaFin.min = e.target.value;
    });
    obtenerElemento("fecha_inicio_2")?.addEventListener("change", function (e) {
        const elFechaFin = obtenerElemento("fecha_fin_2");
        if (elFechaFin) elFechaFin.min = e.target.value;
    });
    obtenerElemento("pp_fecha_inicio")?.addEventListener("change", function (e) {
        const elFechaFin = obtenerElemento("pp_fecha_fin");
        if (elFechaFin) elFechaFin.min = e.target.value;
    });
}

// Evita que el estado cambie a COMPLETADO si los campos requeridos están vacíos
function inicializarValidacionEstado() {
    let estadoAnterior = "";
    obtenerElemento("estado")?.addEventListener("focus", function () {
        estadoAnterior = obtenerElemento("estado").value;
    });
    obtenerElemento("estado")?.addEventListener("change", function (e) {
        if (e.target.value === "COMPLETADO" && !validarCamposCompletado()) {
            e.target.value = estadoAnterior;
            return;
        }
        estadoAnterior = e.target.value;
    });
}

// Registra los botones de edición, guardado y cancelación del Perfil Alumno
function inicializarBotonesPerfil() {
    obtenerElemento("btn_editar_perfil")  ?.addEventListener("click", editarPerfil);
    obtenerElemento("btn_guardar_perfil") ?.addEventListener("click", guardarPerfil);
    obtenerElemento("btn_cancelar_perfil")?.addEventListener("click", cancelarPerfil);
    // Abre el selector de archivo al hacer clic en "Cambiar foto"
    obtenerElemento("btn_cambiar_foto")   ?.addEventListener("click", function () {
        obtenerElemento("foto_perfil_input")?.click();
    });
}
// Registra los botones de edición, guardado y cancelación de la primera Actividad
function inicializarBotonesActividades() {
    obtenerElemento("btn_editar_act")  ?.addEventListener("click", editarActividades);
    obtenerElemento("btn_guardar_act") ?.addEventListener("click", guardarActividades);
    obtenerElemento("btn_cancelar_act")?.addEventListener("click", cancelarActividades);
}

// Registra los botones de edición, guardado y cancelación de la segunda Actividad
function inicializarBotonesActividades2() {
    obtenerElemento("btn_editar_act_2")  ?.addEventListener("click", editarActividades2);
    obtenerElemento("btn_guardar_act_2") ?.addEventListener("click", guardarActividades2);
    obtenerElemento("btn_cancelar_act_2")?.addEventListener("click", cancelarActividades2);
}

// Registra los botones de edición, guardado y cancelación de Prácticas Profesionales
function inicializarBotonesPracticas() {
    obtenerElemento("btn_editar_pp")  ?.addEventListener("click", editarPracticas);
    obtenerElemento("btn_guardar_pp") ?.addEventListener("click", guardarPracticas);
    obtenerElemento("btn_cancelar_pp")?.addEventListener("click", cancelarPracticas);
}

// Registra los botones y eventos del modal de nueva empresa
function inicializarModalEmpresa() {
    obtenerElemento("btn_crear_empresa")    ?.addEventListener("click", function () { abrirModalEmpresa("id_empresa"); });
    obtenerElemento("btn_crear_empresa_2")  ?.addEventListener("click", function () { abrirModalEmpresa("id_empresa_2"); });
    obtenerElemento("pp_btn_crear_empresa") ?.addEventListener("click", function () { abrirModalEmpresa("pp_id_empresa"); });
    obtenerElemento("cerrar_modal_empresa") ?.addEventListener("click", cerrarModalEmpresa);
    obtenerElemento("guardar_nueva_empresa")?.addEventListener("click", guardarNuevaEmpresa);
    obtenerElemento("modal_nueva_empresa")  ?.addEventListener("click", function (e) {
        if (e.target === obtenerElemento("modal_nueva_empresa")) cerrarModalEmpresa();
    });
}

// Escucha el evento datosCargados para mostrar las tablas y cargar Prácticas si aplica
function inicializarEventoDatosCargados() {
    document.addEventListener("datosCargados", function () {
        const elTablaPerfil      = obtenerElemento("tabla_perfil_alumno");
        const elTablaActividades = obtenerElemento("tabla_actividades");
        if (elTablaPerfil)      elTablaPerfil.style.display      = "block";
        if (elTablaActividades) elTablaActividades.style.display = "block";

        const elGrupo = obtenerElemento("grupo_alumno");
        if (elGrupo) elGrupo.dataset.grupoOriginal = elGrupo.value || "";

        const elEstado = obtenerElemento("estado");
        if (elEstado) elEstado.dataset.estadoActual = elEstado.value || "";

        // Si el alumno ya está en semestre 9 o más, consulta si tiene prácticas registradas
        const semestre = parseInt(elGrupo?.value?.match(/^([1-9])/)?.[1] || "0");
        if (semestre >= 9) {
            fetch("obtener_practica.php")
                .then(function (respuesta) {
                    return respuesta.ok ? respuesta.json() : null;
                })
                .then(function (datos) {
                    if (datos?.success && datos.practica) {
                        mostrarFormularioPracticasLectura(datos.practica);
                    } else {
                        obtenerElemento("contenedor-practicas")?.classList.remove("oculto");
                    }
                })
                .catch(function () {
                    obtenerElemento("contenedor-practicas")?.classList.remove("oculto");
                });
        }
    });
}

// ================================
// DOMContentLoaded — punto de entrada
// ================================

document.addEventListener("DOMContentLoaded", function () {
    inicializarVistas();
    inicializarCampos();
    inicializarEventosFecha();
    inicializarValidacionEstado();
    iniciarPreviewFotoAlumno();
    inicializarBotonesPerfil();
    inicializarBotonesActividades();
    inicializarBotonesActividades2();
    inicializarBotonesPracticas();
    inicializarModalEmpresa();
    inicializarEventoDatosCargados();
});

// ================================
// FOTO DE PERFIL — Preview para alumno
// ================================

// Inicializa el preview de la foto de perfil al seleccionar un archivo
function iniciarPreviewFotoAlumno() {
    const elInput   = obtenerElemento("foto_perfil_input");
    const elPreview = obtenerElemento("foto_perfil_preview");
    if (!elInput || !elPreview) return;

    elInput.addEventListener("change", function (e) {
        const archivo = e.target.files[0];
        if (!archivo) return;

        const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];
        if (!tiposPermitidos.includes(archivo.type)) {
            lanzarToast("Solo se permiten imágenes JPG, PNG o WEBP", "error");
            elInput.value = "";
            return;
        }
        if (archivo.size > 2 * 1024 * 1024) {
            lanzarToast("La imagen no debe superar los 2MB", "error");
            elInput.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = function (ev) { elPreview.src = ev.target.result; };
        reader.readAsDataURL(archivo);
    });
}