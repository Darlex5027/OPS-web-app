/*
  Archivo     : render_pdf_con_encabezado.js
  Módulo      : CU_09_ReporteEstadistico
  Autor       : Alejandro Resendiz Reyes
  Fecha       : 29/04/2026
  Descripción : Genera el PDF del reporte estadístico con encabezado institucional
                idéntico al formato 108g-RG-14 de la UAT.
*/

import { lanzarToast } from '../js/lanzar_toast.js';


// ─── Configuración de encabezados institucionales ──────────────────────────────
// Agrega o modifica entradas según el módulo que necesites.
// Los argumentos de handleImprimirPDF sobreescriben estos valores si se pasan.
const CONFIG_ENCABEZADO = [{
    // 0 - Informe de Actividades / Control de Expediente de Servicio Social
    logoUrl: './logo.png',
    institucion: 'Universidad Autónoma de Tlaxcala',
    titulo: 'INFORME DE ACTIVIDADES REALIZADAS DE SERVICIO SOCIAL\n CONTROL DE EXPEDIENTE DE SERVICIO SOCIAL',
    codigo: '108g-RG-08',
    revision: '9001-2015',
    fecha: 'Noviembre 2024',
    version: '02',
}];
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Convierte una URL de imagen a base64 usando canvas.
 * Si falla (logo no disponible), resuelve null para no romper el PDF.
 */
function cargarImagenBase64(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d').drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

/**
 * Dibuja el encabezado institucional completo (réplica del formato 108g-RG-14):
 *
 *  ┌──────────┬───────────────────────────────────┬───────────┬──────────────┐
 *  │          │   Universidad Autónoma de Tlaxcala │ Código:   │ 108g-RG-14   │
 *  │  [logo]  │   ENCUESTA DE SATISFACCIÓN...      ├───────────┼──────────────┤
 *  │          │                                    │ Revisión: │ 9001-2015    │
 *  │          │                                    ├───────────┼──────────────┤
 *  │          │                                    │ Fecha:    │ Nov 2025/03  │
 *  └──────────┴───────────────────────────────────┴───────────┴──────────────┘
 *  Facultad o U.A.M.: _________________________________
 *  Licenciatura: _______________________________________
 *  TU OPINIÓN ES IMPORTANTE Y NOS PERMITE MEJORAR
 *
 * @param {jsPDF}  doc
 * @param {object} cfg - entrada de CONFIG_ENCABEZADO ya mezclada con overrides
 * @returns {number}   - coordenada Y donde debe comenzar el autoTable
 */
// ─── Función dibujarEncabezado actualizada ─────────────────────────────────────

async function dibujarEncabezado(doc, cfg) {
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 10;
    const top = 6;

    const logoW = 22;
    const metaW = 48;
    const centroX = margin + logoW + 1;
    const centroW = pageW - margin * 2 - logoW - 1 - metaW;
    const metaX = centroX + centroW;
    const hTotal = 28;

    // ── Borde exterior ──────────────────────────────────────────────────────────
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.4);
    doc.rect(margin, top, pageW - margin * 2, hTotal);

    // ── Logo ────────────────────────────────────────────────────────────────────
    const logoData = await cargarImagenBase64(cfg.logoUrl);
    if (logoData) {
        doc.addImage(logoData, 'PNG', margin + 1, top + 1, logoW - 1, hTotal - 2);
    }
    doc.line(margin + logoW, top, margin + logoW, top + hTotal);

    // ── Centro ──────────────────────────────────────────────────────────────────
    const cx = centroX + centroW / 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(cfg.institucion, cx, top + 9, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    cfg.titulo.split('\n').forEach((linea, i) => {
        doc.text(linea.trim(), cx, top + 15 + i * 5, { align: 'center' });
    });

    // ── Metadatos ───────────────────────────────────────────────────────────────
    doc.line(metaX, top, metaX, top + hTotal);
    const subLabelW = 18;
    const subValX = metaX + subLabelW;
    doc.line(subValX, top, subValX, top + hTotal);

    const filas = [
        { label: 'Código:', valor: cfg.codigo },
        { label: 'Revisión:', valor: cfg.revision },
        { label: 'Fecha:', valor: `${cfg.fecha}\nRev. ${cfg.version}` },
    ];

    const filaH = hTotal / 5;
    let fY = top;
    filas.forEach(({ label, valor }, i) => {
        if (i > 0) doc.line(metaX, fY, pageW - margin, fY);
        const midY = fY + filaH / 2 + 1;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.text(label, metaX + 1.5, midY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        valor.split('\n').forEach((v, vi) => {
            doc.text(v, subValX + 1.5, midY + vi * 4);
        });
        fY += filaH;
    });

    // ── Fila 1: Facultad | Licenciatura ─────────────────────────────────────────
    let y = top + hTotal + 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0);

    const colMitad = (pageW - margin * 2) / 2;

    doc.text('Facultad o U.A.M.: ', margin, y);
    const labelFacW = doc.getTextWidth('Facultad o U.A.M.: ');
    if (cfg.facultad) doc.text(cfg.facultad, margin + labelFacW, y);
    doc.line(margin + labelFacW, y + 0.5, margin + colMitad - 2, y + 0.5);
    
    y += 7;
    
    doc.text('Licenciatura: ', margin , y);
    const labelLicW = doc.getTextWidth('Licenciatura: ');
    if (cfg.carrera) doc.text(cfg.carrera, margin + labelLicW, y);
    doc.line(margin + colMitad + labelLicW, y + 0.5, pageW - margin, y + 0.5);

    // ── Fila 2: Periodo | Docente ───────────────────────────────────────
    y += 7;
    const colTercio = (pageW - margin * 2) / 3;

    // Periodo
    doc.text('Periodo: ', margin, y);
    const labelPerW = doc.getTextWidth('Periodo: ');
    if (cfg.periodo) doc.text(cfg.periodo, margin + labelPerW, y);
    doc.line(margin + labelPerW, y + 0.5, margin + colTercio - 2, y + 0.5);


    // Docente
    const docenteX = margin + colTercio * 2;
    doc.text('Docente: ', docenteX, y);
    const labelDocW = doc.getTextWidth('Docente: ');
    if (cfg.docente) doc.text(cfg.docente, docenteX + labelDocW, y);
    doc.line(docenteX + labelDocW, y + 0.5, pageW - margin, y + 0.5);

    // ── TU OPINIÓN... ───────────────────────────────────────────────────────────
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('\n', cx, y, { align: 'center' });

    // ── Insertar imagen de la tabla (si se proporciona) ────────────────────────

    var imagenTablaUrl = './banner.png'; // ← ruta de la imagen de la tabla (puede ser un argumento cfg.tablaImagenUrl)
    const imagenData = await cargarImagenBase64(imagenTablaUrl);
    if (imagenData) {
        // Obtener dimensiones originales de la imagen
        const img = new Image();
        await new Promise((resolve) => {
            img.onload = resolve;
            img.src = imagenData;
        });

        // Calcular dimensiones manteniendo la relación de aspecto
        const maxWidth = pageW - (margin * 2);
        const maxHeight = 150; // Altura máxima para la imagen (ajústala según necesites)

        let imgWidth = maxWidth;
        let imgHeight = (img.height * imgWidth) / img.width;

        // Si la altura excede la máxima permitida, ajustar por altura
        if (imgHeight > maxHeight) {
            imgHeight = maxHeight;
            imgWidth = (img.width * imgHeight) / img.height;
        }

        // Agregar la imagen al PDF
        doc.addImage(imagenData, 'PNG', margin, y, imgWidth, imgHeight);
        y += imgHeight + 8;
    }

    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0);

    return y + 8;
}

// ─── Función principal ─────────────────────────────────────────────────────────
/**
 * Genera y descarga el PDF del reporte.
 *
 * @param {string} elTabla    - id del <table> a exportar
 * @param {number} cfgIndex   - índice en CONFIG_ENCABEZADO (default: 0)
 * @param {string} [titulo]   - sobreescribe cfg.titulo
 * @param {string} [codigo]   - sobreescribe cfg.codigo
 * @param {string} [revision] - sobreescribe cfg.revision
 * @param {string} [fecha]    - sobreescribe cfg.fecha
 * @param {string} [version]  - sobreescribe cfg.version
 * @param {string} [facultad] - nombre de la facultad o U.A.M.
 * @param {string} [carrera]  - nombre de la licenciatura / carrera
 *
 * @example
 * // Usando config base sin datos de alumno
 * handleImprimirPDF('tabla-resultados', 1);
 *
 * // Sobreescribiendo con datos de la BD
 * handleImprimirPDF('tabla-resultados', 1,
 *   row.Titulo, row.Codigo, row.Revision, row.Fecha, row.Version,
 *   row.Facultad, row.Carrera
 * );
 */
export const handleImprimirPDF = async function (elTabla, cfgIndex = 0, titulo, codigo, revision, fecha, version, facultad, carrera, periodo, docente) {


    if (!CONFIG_ENCABEZADO[cfgIndex]) {
        lanzarToast(`Encabezado con índice ${cfgIndex} no existe`, 'error');
        return;
    }

    // Mezclar config base con overrides opcionales
    const cfg = {
        ...CONFIG_ENCABEZADO[cfgIndex],
        ...(titulo && { titulo }),
        ...(codigo && { codigo }),
        ...(revision && { revision }),
        ...(fecha && { fecha }),
        ...(version && { version }),
        ...(facultad && { facultad }),
        ...(carrera && { carrera }),
        ...(periodo && { periodo }),
        ...(docente && { docente }),
    };

    // Clonar tabla
    const tablaOriginal = document.getElementById(elTabla);
    const tablaClonada = tablaOriginal.cloneNode(true);

    // Extraer encabezados desde #titulos-tabla
    const headers = [...tablaClonada.querySelector('#Titulos-respuesta-individual').querySelectorAll('th')]
        .map(th => th.textContent.trim())
        .filter(t => t !== '');

    // Extraer filas desde #Tabla
    const data = [...tablaClonada.querySelector('#Cuerpo-respuesta-individual').querySelectorAll('tr')].map(row =>
        [...row.querySelectorAll('td')].map(td => td.textContent.trim())
    );

    // Crear PDF landscape A4
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    doc.setDrawColor(255, 255, 255);

    const startY = await dibujarEncabezado(doc, cfg);
    // ← añade esta línea antes del autoTable

    doc.autoTable({
        head: [headers],
        body: data,
        theme: 'plain',          // ← plain, NO grid
        startY,
        styles: {
            fontSize: 8,
            cellPadding: 2,
            overflow: 'linebreak',
            lineWidth: 0,
            lineColor: [255, 255, 255],
            halign: 'left',
        },
        headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold',
            lineWidth: 0,
            lineColor: [255, 255, 255],
        },
        bodyStyles: {
            lineWidth: 0,
            lineColor: [255, 255, 255],
        },
        alternateRowStyles: {
            fillColor: [240, 240, 240],
            lineWidth: 0,
            lineColor: [255, 255, 255],
        },
        tableLineWidth: 0,
        tableLineColor: [255, 255, 255],
        margin: { top: 20, left: 10, right: 10 },

        didParseCell: (data) => {
            data.cell.styles.lineWidth = 0;
            data.cell.styles.lineColor = [255, 255, 255];
        },
        willDrawCell: (data) => {
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0);
        },
    });

    doc.save(titulo+'_'+periodo+'.pdf');
    lanzarToast('PDF generado correctamente', 'exito');
};