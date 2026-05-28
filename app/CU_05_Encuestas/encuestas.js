import { lanzarToast } from '../js/lanzar_toast.js';
import { renderMenu } from "../js/menu.js";

// --- Control de Sesión y Roles ---
const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
};

// Captura de datos de sesión corporativa
const idUsuarioAutenticado = getCookie('Id_usuario') || "ID_PRUEBA_LOCAL";
const idTipoUsuario = parseInt(getCookie('Id_tipo_usuario')) || 2;
const idCarreraUsuario = getCookie('Id_carrera') || "1";

// Estado global del flujo de la interfaz
let idAlumnoContexto = (idTipoUsuario === 2) ? (getCookie('Id_alumno')) : null;
let encuestaActualId = null;

// ==========================================
// FUNCIÓN PARA MODAL DE CONFIRMACIÓN PERSONALIZADO
// ==========================================
function renderModalConfirmacion(mensaje, onConfirmar, onCancelar = null) {
    const elModalPrevio = document.getElementById('modal-confirmacion');
    if (elModalPrevio) elModalPrevio.remove();

    const elFondo = document.createElement('div');
    elFondo.id = 'modal-confirmacion';

    const elContenido = document.createElement('div');

    const elParrafo = document.createElement('p');
    elParrafo.textContent = mensaje;

    const elBtnCancelar = document.createElement('button');
    elBtnCancelar.textContent = 'Cancelar';
    elBtnCancelar.addEventListener('click', function () {
        elFondo.remove();
        if (onCancelar && typeof onCancelar === 'function') {
            onCancelar();
        }
    });

    const elBtnConfirmar = document.createElement('button');
    elBtnConfirmar.textContent = 'Enviar respuestas';
    elBtnConfirmar.addEventListener('click', function () {
        elFondo.remove();
        if (onConfirmar && typeof onConfirmar === 'function') {
            onConfirmar();
        }
    });

    elContenido.appendChild(elParrafo);
    elContenido.appendChild(elBtnCancelar);
    elContenido.appendChild(elBtnConfirmar);
    elFondo.appendChild(elContenido);
    document.body.appendChild(elFondo);
}

// ==========================================
// FUNCIÓN PARA ENVIAR RESPUESTAS CON CONFIRMACIÓN
// ==========================================
async function enviarRespuestasConConfirmacion() {
    const wrappers = document.querySelectorAll('.pregunta-wrapper');
    let respuestas = [];
    let errores = false;
    let primerErrorDiv = null;

    wrappers.forEach(div => {
        const idPregunta = div.id.replace('wrapper_', '');
        const esObligatoria = div.getAttribute('data-required') === 'true';
        let valor = null;

        const radioChecked = div.querySelector('input[type="radio"]:checked');
        const textarea = div.querySelector('textarea');
        const select = div.querySelector('select');
        const textInput = div.querySelector('input[type="text"]');

        if (radioChecked) {
            valor = radioChecked.value;
        } else if (textarea) {
            valor = textarea.value.trim();
        } else if (select) {
            valor = select.value;
        } else if (textInput) {
            valor = textInput.value.trim();
        }

        if (esObligatoria && (!valor || valor === "")) {
            div.classList.add('pregunta-error');
            div.style.borderLeft = "4px solid #dc3545";
            div.style.backgroundColor = "#fff8f8";
            errores = true;
            if (!primerErrorDiv) primerErrorDiv = div;
        } else {
            div.classList.remove('pregunta-error');
            div.style.borderLeft = "none";
            div.style.backgroundColor = "transparent";
            if (!valor || valor === "") valor = "No contestó";
            respuestas.push({
                Id_pregunta: parseInt(idPregunta),
                Respuesta: valor
            });
        }
    });

    if (errores) {
        lanzarToast("Por favor, completa las preguntas obligatorias marcadas.", "advertencia");
        if (primerErrorDiv) primerErrorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    // Mostrar modal de confirmación personalizado
    renderModalConfirmacion(
        "¿Estás seguro de que deseas enviar tus respuestas? Una vez enviadas, no podrán ser editadas.",
        async function() {
            // Función que se ejecuta al confirmar
            try {
                const payload = {
                    respuestas: respuestas,
                    Id_alumno: parseInt(idAlumnoContexto),
                    Id_encuesta: parseInt(encuestaActualId)
                };

                const response = await fetch('procesar_encuesta.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (data.success) {
                    lanzarToast('¡Encuesta completada con éxito!', 'exito');
                    if (idTipoUsuario === 2) {
                        idAlumnoContexto = getCookie('Id_alumno') || "1";
                    } else {
                        idAlumnoContexto = null;
                    }
                    document.getElementById('contenedor-preguntas').style.display = 'none';
                    document.getElementById('seccion-lista').style.display = 'block';
                    inicializarModulo();
                } else {
                    const msgFeedback = document.getElementById('mensaje-feedback');
                    lanzarToast("Error: " + (data.message || "No se pudo guardar la encuesta"), "error");
                    msgFeedback.style.display = 'block';
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            } catch (err) {
                lanzarToast("Error al conectar con el servidor. Por favor, intenta nuevamente.", "error");
                document.getElementById('lista-encuestas-alumno').innerHTML = '<p class="error">Error al cargar</p>';
            }
        }
    );
}

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    renderMenu();
    if (!idUsuarioAutenticado) {
        lanzarToast("Sesión no válida. Redirigiendo al login...", "error");
        setTimeout(() => {
            window.location.href = '../CU_01_Login/login.html';
        }, 1500);
        return;
    }
    inicializarModulo();

    // ✅ Listener del formulario - AHORA USA LA CONFIRMACIÓN PERSONALIZADA
    document.getElementById('form-encuesta').addEventListener('submit', (e) => {
        e.preventDefault();
        enviarRespuestasConConfirmacion();
    });
});

// ==========================================
// MÓDULO PRINCIPAL
// ==========================================
function inicializarModulo() {
    document.getElementById('vista-alumno').style.display = 'none';
    document.getElementById('vista-coordinador').style.display = 'none';
    document.getElementById('estado-vacio-alumno').style.display = 'none';
    document.getElementById('estado-vacio-coordinador').style.display = 'none';

    if (idTipoUsuario === 2) {
        document.getElementById('vista-alumno').style.display = 'block';
        cargarEncuestasAlumno();
    } else if (idTipoUsuario === 1 || idTipoUsuario === 3) {
        document.getElementById('vista-coordinador').style.display = 'block';
        cargarAlumnosCoordinador();
    }
}

// ==========================================
// FLUJO 1: VISTA ALUMNO (Id_tipo_usuario = 2)
// ==========================================
async function cargarEncuestasAlumno() {
    try {
        const resp = await fetch(`obtener_encuestas_alumno.php?alumno=${idAlumnoContexto}`);
        const data = await resp.json();
        const encuestas = data.pendientes || [];

        const listaDiv = document.getElementById('lista-encuestas-alumno');
        const estadoVacio = document.getElementById('estado-vacio-alumno');

        if (encuestas.length === 0) {
            listaDiv.innerHTML = '';
            estadoVacio.style.display = 'block';
        } else {
            estadoVacio.style.display = 'none';
            listaDiv.innerHTML = encuestas.map(e => {
                const nombreSanitizado = e.Nombre.replace(/'/g, "\\'");
                const descSanitizada = e.Descripcion.replace(/'/g, "\\'");
                return `
                    <div class="card-encuesta">
                        <div class="card-body">
                            <h4>Servicio: ${e.NombreServicio || e.servicio_nombre || 'N/A'}</h4>
                            <h5>${e.Nombre}</h5>
                            <p>${e.Descripcion}</p>
                            <button type="button" class="btn-responder"
                                onclick="abrirEncuesta(${e.Id_encuesta}, '${nombreSanitizado}', '${descSanitizada}', '${idAlumnoContexto}')">
                                Responder encuesta
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (err) {
        lanzarToast("Error al cargar las encuestas disponibles.", "error");
        document.getElementById('lista-encuestas-alumno').innerHTML = '<p class="error">Error al cargar encuestas</p>';
    }
}

// ==========================================
// FLUJO 2: VISTA COORDINADOR / ADMINISTRADOR (Id_tipo_usuario = 1 o 3)
// ==========================================
async function cargarAlumnosCoordinador() {
    try {
        const resp = await fetch(`obtener_alumnos_pendientes.php?carrera=${idCarreraUsuario}`);
        const data = await resp.json();
        const alumnos = data.alumnos || [];

        const listaDiv = document.getElementById('lista-alumnos-pendientes');
        const estadoVacio = document.getElementById('estado-vacio-coordinador');

        const alumnosConPendientes = alumnos.filter(a => a.total_pendientes > 0);

        if (alumnosConPendientes.length === 0) {
            listaDiv.innerHTML = '';
            estadoVacio.style.display = 'block';
        } else {
            estadoVacio.style.display = 'none';
            listaDiv.innerHTML = alumnosConPendientes.map(a => `
                <div class="tarjeta-alumno">
                    <div class="info-alumno" style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px;">
                        <span class="alumno-nombre" style="font-size: 1.1rem;">
                            <strong>${a.NombreCompleto}</strong>
                            <small style="color: #666; margin-left: 8px;">(Exp: ${a.No_Expediente})</small>
                        </span>
                        <span class="alumno-contador">
                            Encuestas pendientes: <b style="color: #dc3545;">${a.total_pendientes}</b>
                        </span>
                        <button type="button" class="btn-toggle-acordeon"
                            style="align-self: flex-start; margin-top: 5px;"
                            onclick="toggleAcordeonAlumno(${a.Id_alumno})">
                            Ver encuestas pendientes
                        </button>
                    </div>
                    <div id="acordeon-${a.Id_alumno}" class="lista-encuestas-desplegable"
                        style="display: none; padding-left: 15px; border-left: 2px solid #ccc; margin-top: 10px;">
                        ${a.encuestas.map(e => {
                const nombreSanitizado = e.Nombre.replace(/'/g, "\\'");
                const descSanitizada = e.Descripcion.replace(/'/g, "\\'");
                return `
                                <div class="subcard-encuesta" style="background-color: #f9f9f9; padding: 12px; margin-bottom: 10px; border-radius: 6px; border: 1px solid #e0e0e0;">
                                    <h4 style="margin: 0 0 4px 0; color: #333;">Servicio: ${e.NombreServicio || 'N/A'}</h4>
                                    <h6 style="margin: 0 0 8px 0; color: #0066cc; font-weight: bold;">Empresa: ${e.NombreEmpresa}</h6>
                                    <h5 style="margin: 0 0 6px 0;">${e.Nombre}</h5>
                                    <p style="margin: 0 0 10px 0; font-size: 0.9rem; color: #555;">${e.Descripcion}</p>
                                    <button type="button" class="btn-responder-admin"
                                        onclick="abrirEncuesta(${e.Id_encuesta}, '${nombreSanitizado}', '${descSanitizada}', ${a.Id_alumno})">
                                        Responder encuesta
                                    </button>
                                </div>
                            `;
            }).join('')}
                    </div>
                </div>
            `).join('');
        }
    } catch (err) {
        lanzarToast("Error al cargar la lista de alumnos con encuestas pendientes.", "error");
        document.getElementById('lista-alumnos-pendientes').innerHTML = '<p class="error">Error al cargar alumnos</p>';
    }
}

// ==========================================
// FORMULARIO DE RESPUESTA
// ==========================================
async function abrirEncuesta(idEncuesta, nombre, desc, idAlumnoDestino) {
    encuestaActualId = idEncuesta;
    idAlumnoContexto = idAlumnoDestino;

    try {
        const resp = await fetch(`obtener_preguntas.php?encuesta=${idEncuesta}`);
        const data = await resp.json();
        const preguntas = data.preguntas || [];

        preguntas.sort((a, b) => (a.Orden || 0) - (b.Orden || 0));

        document.getElementById('seccion-lista').style.display = 'none';
        document.getElementById('contenedor-preguntas').style.display = 'block';

        document.getElementById('titulo-encuesta').innerText = nombre;
        document.getElementById('descripcion-encuesta').innerText = desc;

        const contenedor = document.getElementById('preguntas-dinamicas');
        contenedor.innerHTML = preguntas.map(p => renderizarPregunta(p)).join('');

        const msgFeedback = document.getElementById('mensaje-feedback');
        msgFeedback.style.display = 'none';
        msgFeedback.innerText = '';

        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
        lanzarToast("Error al cargar las preguntas de la encuesta.", "error");
    }
}

function renderizarPregunta(p) {
    const esObligatoria = parseInt(p.Obligatoria) === 1;
    const obligatoriaAttr = esObligatoria ? 'data-required="true"' : 'data-required="false"';
    const asterisco = esObligatoria ? '<span class="obligatorio" style="color: red; margin-left: 4px;">*</span>' : '';
    const requiredProp = esObligatoria ? 'required' : '';
    const numeroOrden = p.Orden ? `${p.Orden}. ` : '';
    const tagSeccion = p.Seccion
        ? `<span class="badge-seccion" style="font-size: 0.8rem; color: #555; background-color: #eee; padding: 2px 6px; border-radius: 4px; margin-right: 8px; font-weight: normal;">${p.Seccion}</span>`
        : '';

    let htmlInput = '';

    switch (p.Tipo_respuesta) {
        case 'ESCALA_1_5':
            htmlInput = `
                <select name="q_${p.Id_pregunta}" class="form-control" ${requiredProp}>
                    <option value="">-- Selecciona una opción --</option>
                    <option value="1">1 - Deficiente</option>
                    <option value="2">2 - Suficiente</option>
                    <option value="3">3 - Bien</option>
                    <option value="4">4 - Muy Bien</option>
                    <option value="5">5 - Excelente</option>
                </select>
            `;
            break;

        case 'TEXTO':
            htmlInput = `
                <textarea name="q_${p.Id_pregunta}"
                          maxlength="2000"
                          placeholder="Escribe tu respuesta aquí..."
                          class="form-control"
                          rows="4"
                          style="width: 100%; box-sizing: border-box;"
                          oninput="actualizarContadorCaracteres(this)"
                          ${requiredProp}></textarea>
                <small class="contador-caracteres" style="display: block; margin-top: 4px; color: #666;">
                    Caracteres restantes: <span id="chars_q_${p.Id_pregunta}">2000</span>
                </small>
            `;
            break;

        case 'BOOLEANO':
            htmlInput = `
                <div class="radio-group" style="display: flex; gap: 15px; margin-top: 5px;">
                    <label class="radio-label" style="cursor: pointer;">
                        <input type="radio" name="q_${p.Id_pregunta}" value="Si" ${requiredProp}> Sí
                    </label>
                    <label class="radio-label" style="cursor: pointer;">
                        <input type="radio" name="q_${p.Id_pregunta}" value="No" ${requiredProp}> No
                    </label>
                </div>
            `;
            break;

        default:
            htmlInput = `<input type="text" name="q_${p.Id_pregunta}" class="form-control" ${requiredProp}>`;
    }

    return `
        <div class="pregunta-wrapper" id="wrapper_${p.Id_pregunta}" ${obligatoriaAttr}
            style="margin-bottom: 25px; padding: 15px; border-bottom: 1px solid #f0f0f0;">
            <p class="pregunta-header" style="margin-top: 0; margin-bottom: 10px; font-size: 1.05rem;">
                ${tagSeccion}<strong>${numeroOrden}${p.Pregunta}</strong>${asterisco}
            </p>
            <div class="input-container">
                ${htmlInput}
            </div>
        </div>
    `;
}

function actualizarContadorCaracteres(textarea) {
    const name = textarea.getAttribute('name');
    const spanContador = document.getElementById(`chars_${name}`);
    if (spanContador) {
        spanContador.innerText = 2000 - textarea.value.length;
    }
}

// ==========================================
// CANCELACIÓN Y VOLVER
// ==========================================
function cancelarEncuesta() {
    renderModalConfirmacion(
        "¿Seguro que deseas cancelar? Las respuestas no se guardarán como borrador.",
        function() {
            if (idTipoUsuario === 2) {
                idAlumnoContexto = getCookie('Id_alumno') || "1";
            } else {
                idAlumnoContexto = null;
            }
            document.getElementById('contenedor-preguntas').style.display = 'none';
            document.getElementById('seccion-lista').style.display = 'block';
            inicializarModulo();
        }
    );
}

function volverALista() {
    renderModalConfirmacion(
        "¿Seguro que deseas volver? Las respuestas no se guardarán.",
        function() {
            if (idTipoUsuario === 2) {
                idAlumnoContexto = getCookie('Id_alumno') || "1";
            } else {
                idAlumnoContexto = null;
            }
            document.getElementById('contenedor-preguntas').style.display = 'none';
            document.getElementById('seccion-lista').style.display = 'block';
            inicializarModulo();
        }
    );
}

function toggleAcordeonAlumno(idAlumno) {
    const el = document.getElementById(`acordeon-${idAlumno}`);
    if (el.style.display === 'none' || el.style.display === '') {
        el.style.display = 'block';
    } else {
        el.style.display = 'none';
    }
}

// ==========================================
// ✅ EXPOSICIÓN GLOBAL
// ==========================================
window.abrirEncuesta = abrirEncuesta;
window.volverALista = volverALista;
window.cancelarEncuesta = cancelarEncuesta;
window.toggleAcordeonAlumno = toggleAcordeonAlumno;
window.actualizarContadorCaracteres = actualizarContadorCaracteres;