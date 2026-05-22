/*
 * Archivo     : visualizar_vacantes.js
 * Módulo      : Modulo 4 CU_04_VisualizarVacantes
 * Autor       : Viridiana Tonix Zarate
 * Fecha       : 2026
 * Descripción : Carga y muestra las vacantes activas desde la base de datos.
 *               Permite filtrar por servicio, visualizar detalles en modal
 *               y descargar vacantes en PDF o flyer original.
 *               Usuarios tipo 1 y 3 pueden eliminar vacantes.
 */

import { lanzarToast } from '../js/lanzar_toast.js';
import { obtenerCookie } from '../js/cookie.js';
import { renderMenu } from '../js/menu.js';

// ================= ESTADO GLOBAL =================
let todasLasVacantes = [];
const tipoUsuario = obtenerCookie('Id_tipo_usuario');
const puedeEliminar = tipoUsuario === '1' || tipoUsuario === '3';

// ================= INICIALIZACIÓN =================
document.addEventListener('DOMContentLoaded', function () {
    renderMenu();
    
    const idUsuario = obtenerCookie('Id_usuario');
    if (!idUsuario) {
        window.location.href = '../CU_01_Login/login.html';
        return;
    }

    setupEventListeners();
    fetchVacantes();
    fetchServicios();
});

// ================= CONFIGURACIÓN DE EVENT LISTENERS =================
/**
 * Configura todos los event listeners necesarios para la interfaz:
 * - Cierre de modal al hacer clic en overlay
 * - Filtrado por servicio
 */
function setupEventListeners() {
    const modalOverlay = document.getElementById('modal-overlay');
    modalOverlay?.addEventListener('click', function (e) {
        if (e.target === this) cerrarModal();
    });

    const filtroServicio = document.getElementById('filtro-servicio');
    filtroServicio?.addEventListener('change', handleFiltrar);
}

// ================= OBTENCIÓN DE DATOS =================
/**
 * Obtiene las vacantes del servidor y las almacena globalmente
 * Maneja errores de sesión expirada y errores de conexión
 */
function fetchVacantes() {
    fetch('obtener_vacantes.php')
        .then(function (respuesta) {
            if (respuesta.status === 401) {
                lanzarToast("La sesión expiró", "error");
                setTimeout(() => {
                    window.location.href = '../CU_01_Login/login.html';
                }, 3000);
                return null;
            }
            if (!respuesta.ok) throw new Error("Error al obtener vacantes");
            return respuesta.json();
        })
        .then(function (vacantes) {
            if (!vacantes) return;
            todasLasVacantes = vacantes;
            renderizarVacantes(vacantes);
        })
        .catch(function () {
            lanzarToast("No se pudieron cargar las vacantes", "error");
            const contador = document.getElementById('contador-resultados');
            if (contador) contador.textContent = 'Error al cargar.';
        });
}

/**
 * Obtiene la lista de servicios y los carga en el dropdown de filtro
 */
function fetchServicios() {
    fetch('../CU_06_PublicarVacantes/obtener_servicios.php')
        .then(r => r.json())
        .then(function (servicios) {
            const selectServicio = document.getElementById('filtro-servicio');
            if (!selectServicio) return;
            
            servicios.forEach(function (servicio) {
                const opcion = document.createElement('option');
                opcion.value = servicio.Id_servicio;
                opcion.textContent = servicio.Servicio;
                selectServicio.appendChild(opcion);
            });
        })
        .catch(function () {
            console.error('Error al cargar servicios');
        });
}

// ================= RENDERIZACIÓN =================
/**
 * Renderiza las tarjetas de vacantes en el contenedor principal
 * Maneja estados vacío y actualiza contador de resultados
 * @param {Array} vacantes - Array de objetos vacantes
 */
function renderizarVacantes(vacantes) {
    const listVacantes = document.getElementById('lista-vacantes');
    const sinResultados = document.getElementById('sin-resultados');
    const contador = document.getElementById('contador-resultados');

    if (!listVacantes || !sinResultados || !contador) return;

    listVacantes.innerHTML = '';

    if (vacantes.length === 0) {
        sinResultados.classList.remove('oculto');
        contador.textContent = 'Sin resultados';
        return;
    }

    sinResultados.classList.add('oculto');
    const sufijo = vacantes.length !== 1 ? 's' : '';
    contador.textContent = `${vacantes.length} vacante${sufijo} encontrada${sufijo}`;

    vacantes.forEach(function (vacante) {
        const tarjeta = crearTarjeta(vacante);
        listVacantes.appendChild(tarjeta);
    });
}

/**
 * Crea el elemento DOM de una tarjeta de vacante
 * @param {Object} vacante - Objeto con datos de la vacante
 * @returns {HTMLElement} - Elemento div con estructura de tarjeta
 */
function crearTarjeta(vacante) {
    const tarjeta = document.createElement('div');
    tarjeta.className = 'foro-tarjeta';

    const flyerSrc = normalizarFlyer(vacante.Flyer_Path);
    const tieneFlyer = flyerSrc !== '';
    const esFlyerPDF = esPDF(vacante.Flyer_Path);

    // Sección izquierda: flyer/icono
    const tarjetaIzq = crearSeccionIzquierda(vacante, flyerSrc, tieneFlyer, esFlyerPDF);
    tarjeta.appendChild(tarjetaIzq);

    // Sección derecha: contenido
    const tarjetaDer = crearSeccionDerecha(vacante);
    tarjeta.appendChild(tarjetaDer);

    // Botón eliminar
    if (puedeEliminar) {
        const btnEliminar = crearBotonEliminarTarjeta(vacante);
        tarjeta.appendChild(btnEliminar);
    }

    // Event listener para abrir modal
    tarjeta.addEventListener('click', function (e) {
        if (!e.target.closest('.btn-eliminar-tarjeta')) {
            abrirModal(vacante);
        }
    });

    return tarjeta;
}

/**
 * Crea la sección izquierda de la tarjeta (flyer/icono)
 * @param {Object} vacante - Objeto vacante
 * @param {string} flyerSrc - Ruta normalizada del flyer
 * @param {boolean} tieneFlyer - Si existe flyer
 * @param {boolean} esFlyerPDF - Si el flyer es PDF
 * @returns {HTMLElement} - Div con la sección izquierda
 */
function crearSeccionIzquierda(vacante, flyerSrc, tieneFlyer, esFlyerPDF) {
    const seccion = document.createElement('div');
    seccion.className = 'tarjeta-izq';

    const icono = document.createElement('div');
    icono.className = `tarjeta-icono ${tieneFlyer ? 'con-flyer' : ''}`;

    const flyerElement = crearElementoFlyer(vacante, flyerSrc, tieneFlyer, esFlyerPDF);
    icono.appendChild(flyerElement);
    seccion.appendChild(icono);

    return seccion;
}

/**
 * Crea la sección derecha de la tarjeta (contenido)
 * @param {Object} vacante - Objeto vacante
 * @returns {HTMLElement} - Div con la sección derecha
 */
function crearSeccionDerecha(vacante) {
    const seccion = document.createElement('div');
    seccion.className = 'tarjeta-der';

    seccion.appendChild(crearCabezaTarjeta(vacante));
    seccion.appendChild(crearEmpresaTarjeta(vacante));

    if (vacante.Descripcion) {
        seccion.appendChild(crearDescripcionTarjeta(vacante));
    }

    seccion.appendChild(crearFooterTarjeta(vacante));

    return seccion;
}

/**
 * Crea el elemento visual del flyer (imagen, PDF o inicial)
 * @param {Object} vacante - Objeto vacante
 * @param {string} flyerSrc - Ruta normalizada del flyer
 * @param {boolean} tieneFlyer - Si existe flyer
 * @param {boolean} esFlyerPDF - Si el flyer es PDF
 * @returns {HTMLElement} - Elemento con el flyer
 */
function crearElementoFlyer(vacante, flyerSrc, tieneFlyer, esFlyerPDF) {
    if (!tieneFlyer) {
        const span = document.createElement('span');
        span.className = 'icono-letra';
        span.textContent = (vacante.Titulo || 'V').charAt(0).toUpperCase();
        return span;
    }

    if (esFlyerPDF) {
        const div = document.createElement('div');
        div.className = 'flyer-pdf-thumb';
        div.innerHTML = '<span class="pdf-icono">📄</span><span class="pdf-label">PDF</span>';
        return div;
    }

    const img = document.createElement('img');
    img.src = flyerSrc;
    img.alt = 'Flyer de vacante';
    img.className = 'flyer-thumb';
    return img;
}

/**
 * Crea la cabeza de la tarjeta (título y servicio)
 * @param {Object} vacante - Objeto vacante
 * @returns {HTMLElement} - Div con cabeza
 */
function crearCabezaTarjeta(vacante) {
    const div = document.createElement('div');
    div.className = 'tarjeta-cabeza';

    const h2 = document.createElement('h2');
    h2.className = 'tarjeta-titulo';
    h2.textContent = vacante.Titulo || 'Sin título';

    const span = document.createElement('span');
    span.className = 'tarjeta-badge';
    span.textContent = vacante.Servicio || 'Sin servicio';

    div.appendChild(h2);
    div.appendChild(span);

    return div;
}

/**
 * Crea la sección de empresa en la tarjeta
 * @param {Object} vacante - Objeto vacante
 * @returns {HTMLElement} - Párrafo con datos de empresa
 */
function crearEmpresaTarjeta(vacante) {
    const p = document.createElement('p');
    p.className = 'tarjeta-empresa';

    const strong = document.createElement('strong');
    strong.textContent = 'Empresa: ';
    p.appendChild(strong);
    p.appendChild(document.createTextNode(vacante.Empresa || 'No especificada'));

    return p;
}

/**
 * Crea la sección de descripción en la tarjeta
 * @param {Object} vacante - Objeto vacante
 * @returns {HTMLElement} - Párrafo con descripción
 */
function crearDescripcionTarjeta(vacante) {
    const p = document.createElement('p');
    p.className = 'tarjeta-desc';
    p.textContent = vacante.Descripcion;
    return p;
}

/**
 * Crea el footer de la tarjeta con fechas
 * @param {Object} vacante - Objeto vacante
 * @returns {HTMLElement} - Div con footer
 */
function crearFooterTarjeta(vacante) {
    const div = document.createElement('div');
    div.className = 'tarjeta-footer';

    const spanPublicado = document.createElement('span');
    spanPublicado.className = 'tarjeta-fecha';
    spanPublicado.textContent = `📅 Publicado: ${formatearFecha(vacante.Fecha_publicacion)}`;

    const spanExpira = document.createElement('span');
    spanExpira.className = 'tarjeta-expira';
    spanExpira.textContent = `⏳ Expira: ${formatearFecha(vacante.Fecha_expiracion)}`;

    div.appendChild(spanPublicado);
    div.appendChild(spanExpira);

    return div;
}

/**
 * Crea el botón de eliminar tarjeta
 * @param {Object} vacante - Objeto vacante
 * @returns {HTMLElement} - Botón eliminar
 */
function crearBotonEliminarTarjeta(vacante) {
    const btn = document.createElement('button');
    btn.className = 'btn-eliminar-tarjeta';
    btn.title = 'Eliminar vacante';
    btn.textContent = '🗑️';

    btn.addEventListener('click', function (e) {
        e.stopPropagation();
        confirmarEliminar(vacante);
    });

    return btn;
}

// ================= FILTRADO Y BÚSQUEDA =================
/**
 * Maneja el evento de filtrado por servicio
 * Filtra las vacantes según el servicio seleccionado
 */
function handleFiltrar() {
    const servicioFiltro = document.getElementById('filtro-servicio').value;

    const filtradas = todasLasVacantes.filter(function (vacante) {
        return !servicioFiltro || String(vacante.Id_servicio) === String(servicioFiltro);
    });

    renderizarVacantes(filtradas);
}

// ================= OPERACIONES DE ELIMINAR =================
/**
 * Muestra confirmación y elimina una vacante
 * @param {Object} vacante - Objeto vacante a eliminar
 */
function confirmarEliminar(vacante) {
    if (!confirm('¿Seguro que deseas eliminar esta vacante? Esta acción no se puede deshacer.')) {
        return;
    }

    eliminarVacanteEnServidor(vacante, function () {
        todasLasVacantes = todasLasVacantes.filter(x => x.Id_vacante !== vacante.Id_vacante);
        renderizarVacantes(todasLasVacantes);
    });
}

/**
 * Elimina una vacante desde el modal
 * @param {Object} vacante - Objeto vacante a eliminar
 */
function confirmarEliminarDesdeModal(vacante) {
    if (!confirm('¿Seguro que deseas eliminar esta vacante? Esta acción no se puede deshacer.')) {
        return;
    }

    eliminarVacanteEnServidor(vacante, function () {
        cerrarModal();
        todasLasVacantes = todasLasVacantes.filter(x => x.Id_vacante !== vacante.Id_vacante);
        renderizarVacantes(todasLasVacantes);
    });
}

/**
 * Realiza la solicitud HTTP para eliminar la vacante
 * @param {Object} vacante - Objeto vacante
 * @param {Function} callback - Función a ejecutar si la eliminación fue exitosa
 */
function eliminarVacanteEnServidor(vacante, callback) {
    fetch('eliminar_vacante.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Id_vacante: vacante.Id_vacante })
    })
        .then(function (respuesta) {
            if (!respuesta.ok) throw new Error('Error al eliminar');
            return respuesta.json();
        })
        .then(function (data) {
            if (data.exito) {
                lanzarToast('Vacante eliminada correctamente', 'exito');
                callback();
            } else {
                lanzarToast(data.mensaje || 'No se pudo eliminar la vacante', 'error');
            }
        })
        .catch(function () {
            lanzarToast('Error de conexión al eliminar', 'error');
        });
}

// ================= MODAL =================
/**
 * Abre el modal con los detalles completos de la vacante
 * @param {Object} vacante - Objeto vacante
 */
function abrirModal(vacante) {
    const overlay = document.getElementById('modal-overlay');
    const caja = document.getElementById('modal-caja');

    if (!overlay || !caja) return;

    window.vacanteActual = vacante;

    const flyerSrc = normalizarFlyer(vacante.Flyer_Path);
    const tieneFlyer = flyerSrc !== '';
    const esFlyerPDF = esPDF(vacante.Flyer_Path);

    caja.innerHTML = '';

    // Botón cerrar
    const btnCerrar = crearBotonCerrarModal();
    caja.appendChild(btnCerrar);

    // Preview del flyer
    if (tieneFlyer) {
        const flyerDiv = crearPreviewFlyer(flyerSrc, esFlyerPDF);
        caja.appendChild(flyerDiv);
    }

    // Contenido del modal
    caja.appendChild(crearHeaderModal(vacante));
    caja.appendChild(crearContenidoModal(vacante));
    caja.appendChild(crearFooterModal(vacante, tieneFlyer));

    overlay.classList.remove('oculto');
}

/**
 * Crea el botón para cerrar el modal
 * @returns {HTMLElement} - Botón cerrar
 */
function crearBotonCerrarModal() {
    const btn = document.createElement('button');
    btn.className = 'modal-cerrar';
    btn.textContent = '✕';
    btn.addEventListener('click', cerrarModal);
    return btn;
}

/**
 * Cierra el modal
 */
function cerrarModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.add('oculto');
}

/**
 * Crea el preview del flyer en el modal
 * @param {string} flyerSrc - Ruta normalizada del flyer
 * @param {boolean} esFlyerPDF - Si el flyer es PDF
 * @returns {HTMLElement} - Div con preview
 */
function crearPreviewFlyer(flyerSrc, esFlyerPDF) {
    const div = document.createElement('div');
    div.className = 'modal-flyer';

    if (esFlyerPDF) {
        const iframe = document.createElement('iframe');
        iframe.src = `${flyerSrc}#page=1&toolbar=0&navpanes=0&scrollbar=0`;
        iframe.className = 'modal-flyer-pdf';
        iframe.title = 'Vista previa del flyer';
        iframe.loading = 'lazy';
        div.appendChild(iframe);
    } else {
        const img = document.createElement('img');
        img.src = flyerSrc;
        img.alt = 'Flyer de la vacante';
        img.className = 'modal-flyer-img';
        div.appendChild(img);
    }

    return div;
}

/**
 * Crea el header del modal con título y servicio
 * @param {Object} vacante - Objeto vacante
 * @returns {HTMLElement} - Header del modal
 */
function crearHeaderModal(vacante) {
    const header = document.createElement('div');
    header.className = 'modal-header';

    const headerTop = document.createElement('div');
    headerTop.className = 'modal-header-top';

    const h2 = document.createElement('h2');
    h2.className = 'modal-titulo';
    h2.textContent = vacante.Titulo || 'Sin título';
    headerTop.appendChild(h2);

    const badge = document.createElement('span');
    badge.className = 'tarjeta-badge';
    badge.textContent = `📋 ${vacante.Servicio || 'Sin servicio'}`;

    header.appendChild(headerTop);
    header.appendChild(badge);

    return header;
}

/**
 * Crea el contenido principal del modal
 * @param {Object} vacante - Objeto vacante
 * @returns {HTMLElement} - Contenido del modal
 */
function crearContenidoModal(vacante) {
    const contenido = document.createElement('div');
    contenido.className = 'modal-contenido';

    // Grid de información
    contenido.appendChild(crearInfoGrid(vacante));

    // Descripción
    if (vacante.Descripcion) {
        contenido.appendChild(crearSeccionModal('Descripción', vacante.Descripcion));
    }

    // Requisitos
    if (vacante.Requisitos) {
        contenido.appendChild(crearSeccionModal('Requisitos', vacante.Requisitos));
    }

    // Contacto
    if (vacante.Contacto_nombre || vacante.Contacto_email || vacante.Contacto_telefono) {
        contenido.appendChild(crearSeccionContacto(vacante));
    }

    // Fechas
    contenido.appendChild(crearFechasModal(vacante));

    return contenido;
}

/**
 * Crea el grid de información (empresa y servicio)
 * @param {Object} vacante - Objeto vacante
 * @returns {HTMLElement} - Grid de info
 */
function crearInfoGrid(vacante) {
    const grid = document.createElement('div');
    grid.className = 'modal-info-grid';

    const cardEmpresa = document.createElement('div');
    cardEmpresa.className = 'modal-info-card';
    cardEmpresa.innerHTML = `
        <div class="label">Empresa</div>
        <div class="valor">${vacante.Empresa || 'No especificada'}</div>
    `;

    const cardServicio = document.createElement('div');
    cardServicio.className = 'modal-info-card';
    cardServicio.innerHTML = `
        <div class="label">Servicio</div>
        <div class="valor">${vacante.Servicio || 'Sin servicio'}</div>
    `;

    grid.appendChild(cardEmpresa);
    grid.appendChild(cardServicio);

    return grid;
}

/**
 * Crea una sección genérica del modal
 * @param {string} titulo - Título de la sección
 * @param {string} contenido - Contenido HTML
 * @returns {HTMLElement} - Sección
 */
function crearSeccionModal(titulo, contenido) {
    const seccion = document.createElement('div');
    seccion.className = 'modal-seccion';
    seccion.innerHTML = `<h3>${titulo}</h3><p>${contenido}</p>`;
    return seccion;
}

/**
 * Crea la sección de contacto en el modal
 * @param {Object} vacante - Objeto vacante
 * @returns {HTMLElement} - Sección de contacto
 */
function crearSeccionContacto(vacante) {
    const seccion = document.createElement('div');
    seccion.className = 'modal-seccion';

    const h3 = document.createElement('h3');
    h3.textContent = 'Contacto';
    seccion.appendChild(h3);

    if (vacante.Contacto_nombre) {
        seccion.appendChild(crearFilaContacto('👤', vacante.Contacto_nombre));
    }

    if (vacante.Contacto_email) {
        const div = document.createElement('div');
        div.className = 'contacto-fila';
        div.innerHTML = `
            <div class="contacto-icon">✉️</div>
            <a href="mailto:${vacante.Contacto_email}">${vacante.Contacto_email}</a>
        `;
        seccion.appendChild(div);
    }

    if (vacante.Contacto_telefono) {
        seccion.appendChild(crearFilaContacto('📞', vacante.Contacto_telefono));
    }

    return seccion;
}

/**
 * Crea una fila de contacto
 * @param {string} icono - Emoji del icono
 * @param {string} texto - Texto a mostrar
 * @returns {HTMLElement} - Fila de contacto
 */
function crearFilaContacto(icono, texto) {
    const fila = document.createElement('div');
    fila.className = 'contacto-fila';
    fila.innerHTML = `<div class="contacto-icon">${icono}</div><span>${texto}</span>`;
    return fila;
}

/**
 * Crea la sección de fechas en el modal
 * @param {Object} vacante - Objeto vacante
 * @returns {HTMLElement} - Div con fechas
 */
function crearFechasModal(vacante) {
    const fechas = document.createElement('div');
    fechas.className = 'modal-fechas';
    const spanPublicado = document.createElement('span');
    spanPublicado.className = 'fecha-chip';
    spanPublicado.textContent = `📅 Publicado: ${formatearFecha(vacante.Fecha_publicacion)}`;
    const spanExpira = document.createElement('span');
    spanExpira.className = 'fecha-chip';
    spanExpira.textContent = `⏳ Expira: ${formatearFecha(vacante.Fecha_expiracion)}`;
    fechas.appendChild(spanPublicado);
    fechas.appendChild(spanExpira);
    return fechas;
}

/**
 * Crea el footer del modal con botones de acción
 * @param {Object} vacante - Objeto vacante
 * @param {boolean} tieneFlyer - Si la vacante tiene flyer
 * @returns {HTMLElement} - Footer del modal
 */
function crearFooterModal(vacante, tieneFlyer) {
    const footer = document.createElement('div');
    footer.className = 'modal-footer';

    // Botón descargar
    const btnDescargar = document.createElement('button');
    if (tieneFlyer) {
        btnDescargar.className = 'btn-descargar-flyer';
        btnDescargar.textContent = 'Descargar flyer';
        btnDescargar.addEventListener('click', () => descargarFlyer(window.vacanteActual));
    } else {
        btnDescargar.className = 'btn-descargar-pdf';
        btnDescargar.textContent = 'Descargar vacante en PDF';
        btnDescargar.addEventListener('click', () => descargarVacantePDF(window.vacanteActual));
    }
    footer.appendChild(btnDescargar);

    // Botón eliminar
    if (puedeEliminar) {
        const btnEliminar = document.createElement('button');
        btnEliminar.className = 'btn-eliminar-modal';
        btnEliminar.textContent = 'Eliminar vacante';
        btnEliminar.addEventListener('click', () => confirmarEliminarDesdeModal(window.vacanteActual));
        footer.appendChild(btnEliminar);
    }

    return footer;
}

// ================= DESCARGAS =================
/**
 * Descarga el archivo original del flyer
 * @param {Object} vacante - Objeto vacante
 */
function descargarFlyer(vacante) {
    const flyerSrc = normalizarFlyer(vacante.Flyer_Path);
    if (!flyerSrc) {
        lanzarToast("Esta vacante no tiene flyer", "error");
        return;
    }

    const nombreOriginal = vacante.Flyer_Path.trim().split('/').pop();
    const prefijo = (vacante.Titulo || 'vacante').replace(/[^a-z0-9]/gi, '_');
    const extension = nombreOriginal.includes('.') ? nombreOriginal.split('.').pop() : '';
    const nombreDescarga = extension ? `${prefijo}.${extension}` : nombreOriginal;

    const enlace = document.createElement('a');
    enlace.href = flyerSrc;
    enlace.download = nombreDescarga;
    enlace.target = '_blank';
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
}

/**
 * Genera y descarga la vacante en formato PDF
 * @param {Object} vacante - Objeto vacante
 */
function descargarVacantePDF(vacante) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const margenIzq = 15;
    const anchoTexto = 180;
    let y = 20;

    // Título
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(vacante.Titulo || 'Sin título', margenIzq, y);
    y += 10;

    // Servicio
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(139, 0, 0);
    doc.text(`Servicio: ${vacante.Servicio || 'Sin servicio'}`, margenIzq, y);
    doc.setTextColor(0, 0, 0);
    y += 12;

    // Empresa
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Empresa:', margenIzq, y);
    doc.setFont('helvetica', 'normal');
    doc.text(vacante.Empresa || 'No especificada', margenIzq + 25, y);
    y += 12;

    // Descripción
    if (vacante.Descripcion) {
        doc.setFont('helvetica', 'bold');
        doc.text('Descripción:', margenIzq, y);
        y += 7;
        doc.setFont('helvetica', 'normal');
        const lineas = doc.splitTextToSize(vacante.Descripcion, anchoTexto);
        doc.text(lineas, margenIzq, y);
        y += lineas.length * 7 + 5;
    }

    // Requisitos
    if (vacante.Requisitos) {
        doc.setFont('helvetica', 'bold');
        doc.text('Requisitos:', margenIzq, y);
        y += 7;
        doc.setFont('helvetica', 'normal');
        const lineas = doc.splitTextToSize(vacante.Requisitos, anchoTexto);
        doc.text(lineas, margenIzq, y);
        y += lineas.length * 7 + 5;
    }

    // Contacto
    if (vacante.Contacto_nombre || vacante.Contacto_email || vacante.Contacto_telefono) {
        doc.setFont('helvetica', 'bold');
        doc.text('Contacto:', margenIzq, y);
        y += 7;
        doc.setFont('helvetica', 'normal');
        if (vacante.Contacto_nombre) { doc.text(`Nombre: ${vacante.Contacto_nombre}`, margenIzq, y); y += 7; }
        if (vacante.Contacto_email) { doc.text(`Email: ${vacante.Contacto_email}`, margenIzq, y); y += 7; }
        if (vacante.Contacto_telefono) { doc.text(`Teléfono: ${vacante.Contacto_telefono}`, margenIzq, y); y += 7; }
        y += 5;
    }

    // Fechas
    doc.setFont('helvetica', 'bold');
    doc.text('Fechas:', margenIzq, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`Publicado: ${formatearFecha(vacante.Fecha_publicacion)}`, margenIzq, y);
    y += 7;
    doc.text(`Expira: ${formatearFecha(vacante.Fecha_expiracion)}`, margenIzq, y);

    // Guardar
    const nombreArchivo = (vacante.Titulo || 'vacante').replace(/[^a-z0-9]/gi, '_');
    doc.save(`${nombreArchivo}.pdf`);
}

// ================= UTILIDADES =================
/**
 * Normaliza la ruta del flyer desde la BD a URL accesible
 * Convierte /home/uploads/archivo.jpg → /uploads/archivo.jpg
 * @param {string} path - Ruta del servidor
 * @returns {string} - Ruta normalizada
 */
function normalizarFlyer(path) {
    if (!path || path.trim() === '') return '';
    if (path.startsWith('http')) return path;
    return path.replace('/home/uploads/', '/uploads/');
}

/**
 * Detecta si una ruta corresponde a un archivo PDF
 * @param {string} path - Ruta del archivo
 * @returns {boolean} - True si es PDF
 */
function esPDF(path) {
    if (!path) return false;
    return path.trim().toLowerCase().endsWith('.pdf');
}

/**
 * Formatea una fecha del formato YYYY-MM-DD a DD/MM/YYYY
 * @param {string} fechaStr - Fecha en formato YYYY-MM-DD
 * @returns {string} - Fecha formateada
 */
function formatearFecha(fechaStr) {
    if (!fechaStr) return '—';
    const [anio, mes, dia] = fechaStr.split('-');
    return `${dia}/${mes}/${anio}`;
}

// ================= EXPOSICIÓN GLOBAL =================
// Funciones llamadas desde HTML
window.handleFiltrar = handleFiltrar;
window.cerrarModal = cerrarModal;
window.abrirModal = abrirModal;
window.descargarVacantePDF = descargarVacantePDF;
window.descargarFlyer = descargarFlyer;
window.confirmarEliminar = confirmarEliminar;
window.confirmarEliminarDesdeModal = confirmarEliminarDesdeModal;