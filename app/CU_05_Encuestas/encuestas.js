// --- Control de Sesión y Roles ---
const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
};

// Captura de datos de sesión corporativa
const idUsuarioAutenticado = getCookie('Id_usuario') || "ID_PRUEBA_LOCAL";
const idTipoUsuario = parseInt(getCookie('Id_tipo_usuario')) || 2;       // 2 = Alumno, 1 o 3 = Coordinador/Admin
const idCarreraUsuario = getCookie('Id_carrera') || "1";

// Estado global del flujo de la interfaz
let idAlumnoContexto = (idTipoUsuario === 2) ? (getCookie('Id_alumno') || "43") : null;
let encuestaActualId = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!idUsuarioAutenticado) {
        window.location.href = '../CU_01_Login/login.html';
        return;
    }
    inicializarModulo();
});

function inicializarModulo() {
    // Ocultar ambas vistas primero
    document.getElementById('vista-alumno').style.display = 'none';
    document.getElementById('vista-coordinador').style.display = 'none';
    document.getElementById('estado-vacio-alumno').style.display = 'none';
    document.getElementById('estado-vacio-coordinador').style.display = 'none';

    // Según el documento: Id_tipo_usuario = 2 para Alumno, 1 o 3 para Coordinador/Admin
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
// Según documento: Encuesta.Contestador = 0
// ==========================================
async function cargarEncuestasAlumno() {
    try {
        // El backend debe aplicar todos los filtros del documento:
        // 1. Encuesta.Contestador = 0
        // 2. Encuesta.Activo = 1
        // 3. Encuesta.Id_encuesta existe en Periodo_Encuesta
        // 4. Periodo_Encuesta coincide con Actividades_Alumnos (EN_CURSO o COMPLETADO)
        // 5. No existe respuesta previa en Respuestas
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

            // Según documento: mostrar Nombre del servicio, Nombre de encuesta, Descripción, Botón "Responder encuesta"
listaDiv.innerHTML = encuestas.map(e => {
                // 1. Sanitización de comillas para evitar rupturas de sintaxis en el atributo onclick del DOM HTML
                const nombreSanitizado = e.Nombre.replace(/'/g, "\\'");
                const descSanitizada = e.Descripcion.replace(/'/g, "\\'");

                // 2. Retornamos el HTML estructurado cumpliendo la especificación funcional (Servicio, Nombre, Descripción)
                return `
                    <div class="card-encuesta">
                        <div class="card-body">
                            <h4>Servicio: ${e.NombreServicio || e.servicio_nombre || 'N/A'}</h4>
                            <h5>${e.Nombre}</h5>
                            <p>${e.Descripcion}</p>
                            <button type="button" class="btn-responder" onclick="abrirEncuesta(${e.Id_encuesta}, '${nombreSanitizado}', '${descSanitizada}', '${idAlumnoContexto}')">
                                Responder encuesta
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }catch (err) {
        console.error("Error al cargar encuestas del alumno:", err);
        document.getElementById('lista-encuestas-alumno').innerHTML = '<p class="error">Error al cargar encuestas</p>';
    }
}

// ==========================================
// FLUJO 2: VISTA COORDINADOR / ADMINISTRADOR (Id_tipo_usuario = 1 o 3)
// Según documento: Encuesta.Contestador = 1
// Mostrar SOLO alumnos con al menos una encuesta pendiente
// ==========================================
async function cargarAlumnosCoordinador() {
    try {
        // El backend debe:
        // 1. Obtener alumnos con Id_carrera = sesión
        // 2. Para cada alumno, calcular encuestas pendientes con Contestador = 1
        // 3. Aplicar mismos filtros: período, estado actividad, sin respuesta previa
        const resp = await fetch(`obtener_alumnos_pendientes.php?carrera=${idCarreraUsuario}`);
        const data = await resp.json();
        const alumnos = data.alumnos || [];

        const listaDiv = document.getElementById('lista-alumnos-pendientes');
        const estadoVacio = document.getElementById('estado-vacio-coordinador');

        // El backend ya retorna SOLO alumnos con pendientes según documento
        // "Mostrar únicamente a los alumnos que tengan al menos una encuesta pendiente"
        const alumnosConPendientes = alumnos.filter(a => a.total_pendientes > 0);

        if (alumnosConPendientes.length === 0) {
            listaDiv.innerHTML = '';
            estadoVacio.style.display = 'block';
        } else {
            estadoVacio.style.display = 'none';

            // Según documento por cada alumno: Mostrar nombre completo, contador y botón desplegable
            listaDiv.innerHTML = alumnosConPendientes.map(a => `
                <div class="tarjeta-alumno">
                    <div class="info-alumno">
                        <span class="alumno-nombre"><strong>${a.NombreCompleto}</strong></span>
                        <span class="alumno-contador">Encuestas pendientes: <b>${a.total_pendientes}</b></span>
                        <button type="button" class="btn-toggle-acordeon" onclick="toggleAcordeonAlumno(${a.Id_alumno})">
                            Ver encuestas pendientes
                        </button>
                    </div>
                    <div id="acordeon-${a.Id_alumno}" class="lista-encuestas-desplegable" style="display: none;">
                        ${a.encuestas.map(e => {
                            // CORRECCIÓN CRÍTICA: Sanitización de comillas para evitar la ruptura del onclick en el DOM
                            const nombreSanitizado = e.Nombre.replace(/'/g, "\\'");
                            const descSanitizada = e.Descripcion.replace(/'/g, "\\'");

                            // Renderizado estructurado con el contexto exacto del alumno del bucle (a.Id_alumno)
                            return `
                                <div class="subcard-encuesta">
                                    <h4>Servicio: ${e.NombreServicio || e.servicio_nombre || 'N/A'}</h4>
                                    <h5>${e.Nombre}</h5>
                                    <p>${e.Descripcion}</p>
                                    <button type="button" class="btn-responder-admin" onclick="abrirEncuesta(${e.Id_encuesta}, '${nombreSanitizado}', '${descSanitizada}', ${a.Id_alumno})">
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
        console.error("Error al cargar lista de alumnos:", err);
        document.getElementById('lista-alumnos-pendientes').innerHTML = '<p class="error">Error al cargar alumnos</p>';
    }
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
// FORMULARIO DE RESPUESTA (compartido)
// Según documento: Mostrar nombre encuesta como título y descripción debajo
// ==========================================
async function abrirEncuesta(idEncuesta, nombre, desc, idAlumnoDestino) {
    encuestaActualId = idEncuesta;
    idAlumnoContexto = idAlumnoDestino;

    try {
        const resp = await fetch(`obtener_preguntas.php?encuesta=${idEncuesta}`);
        const data = await resp.json();
        const preguntas = data.preguntas || [];

        preguntas.sort((a, b) => (a.Orden || 0) - (b.Orden || 0));

        // Ocultar lista, mostrar formulario (Manejo de estados lógicos compartidos)
        document.getElementById('seccion-lista').style.display = 'none';
        document.getElementById('contenedor-preguntas').style.display = 'block';

        // Encabezado según documento: Título principal y descripción debajo sin alteraciones de caracteres
        document.getElementById('titulo-encuesta').innerText = nombre;
        document.getElementById('descripcion-encuesta').innerText = desc;

        const contenedor = document.getElementById('preguntas-dinamicas');
        contenedor.innerHTML = preguntas.map(p => renderizarPregunta(p)).join('');

        // Ocultar mensaje feedback previo
        const msgFeedback = document.getElementById('mensaje-feedback');
        msgFeedback.style.display = 'none';
        msgFeedback.innerText = '';
        
        // Desplazar la pantalla automáticamente al inicio del formulario para mejorar la experiencia de usuario
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
    } catch (err) {
        console.error("Error al obtener preguntas:", err);
        alert("Error al cargar las preguntas de la encuesta");
    }
}

function renderizarPregunta(p) {
    const esObligatoria = parseInt(p.Obligatoria) === 1;
    const obligatoriaAttr = esObligatoria ? 'data-required="true"' : 'data-required="false"';
    const asterisco = esObligatoria ? '<span class="obligatorio" style="color: red; margin-left: 4px;">*</span>' : '';
    const requiredProp = esObligatoria ? 'required' : '';
    
    // Formatear los metadatos obligatorios solicitados en la especificación
    const numeroOrden = p.Orden ? `${p.Orden}. ` : '';
    const tagSeccion = p.Seccion ? `<span class="badge-seccion" style="font-size: 0.8rem; color: #555; background-color: #eee; padding: 2px 6px; border-radius: 4px; margin-right: 8px; font-weight: normal;">${p.Seccion}</span>` : '';

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
                          style="width: 100; box-sizing: border-box;"
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
        <div class="pregunta-wrapper" id="wrapper_${p.Id_pregunta}" ${obligatoriaAttr} style="margin-bottom: 25px; padding: 15px; border-bottom: 1px solid #f0f0f0;">
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
// ENVÍO DEL FORMULARIO (Validado según Rúbrica)
// ==========================================
document.getElementById('form-encuesta').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Confirmación exacta según texto obligatorio de la especificación
    if (!confirm("¿Estás seguro de que deseas enviar tus respuestas? Una vez enviadas, no podrán ser editadas.")) {
        return;
    }

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

        // Regla de obligatoriedad estricta
        if (esObligatoria && (!valor || valor === "")) {
            div.classList.add('pregunta-error');
            // Añadir borde rojo dinámico temporal si no manejas CSS externo fijo
            div.style.borderLeft = "4px solid #dc3545"; 
            div.style.backgroundColor = "#fff8f8";
            errores = true;
            if (!primerErrorDiv) {
                primerErrorDiv = div;
            }
        } else {
            div.classList.remove('pregunta-error');
            div.style.borderLeft = "none";
            div.style.backgroundColor = "transparent";
            
            // Regla de opción por defecto para opcionales vacías
            if (!valor || valor === "") {
                valor = "No contestó";
            }
            respuestas.push({
                Id_pregunta: parseInt(idPregunta),
                Respuesta: valor
            });
        }
    });

    if (errores) {
        alert("Por favor, responda las preguntas obligatorias marcadas antes de continuar.");
        if (primerErrorDiv) {
            primerErrorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }

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
            alert('¡Encuesta completada con éxito! ✅');
            // Restablecer los flujos de visualización y refrescar paneles
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
            msgFeedback.innerText = "Error: " + (data.message || "No se pudo guardar la encuesta");
            msgFeedback.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (err) {
        console.error("Error al enviar:", err);
        alert('Error de red con el servidor.');
    }
});

// ==========================================
// CANCELACIÓN Y VOLVER
// ==========================================
function cancelarEncuesta() {
    if (confirm("¿Seguro que deseas cancelar? Las respuestas no se guardarán como borrador.")) {
        if (idTipoUsuario === 2) {
            idAlumnoContexto = getCookie('Id_alumno') || "1";
        } else {
            idAlumnoContexto = null;
        }
        document.getElementById('contenedor-preguntas').style.display = 'none';
        document.getElementById('seccion-lista').style.display = 'block';
        inicializarModulo();
    }
}

function volverALista() {
    if (confirm("¿Seguro que deseas volver? Las respuestas no se guardarán.")) {
        if (idTipoUsuario === 2) {
            idAlumnoContexto = getCookie('Id_alumno') || "1";
        } else {
            idAlumnoContexto = null;
        }
        document.getElementById('contenedor-preguntas').style.display = 'none';
        document.getElementById('seccion-lista').style.display = 'block';
        inicializarModulo();
    }
}