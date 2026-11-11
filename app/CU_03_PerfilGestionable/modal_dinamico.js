// ================================
// Archivo : modal_dinamico.js
// Desc.   : Modales creados con JS (#modal-confirmacion / #modal-contenido).
//           Su aspecto está en styleCaso_3.css ("MODAL DINÁMICO").
//
// Funciones públicas:
//   confirmarModal(mensaje, opciones) → Promise<boolean>
//   formularioModal(config)           → Promise<valores | null>
//
// Contenido:
//   1. Utilidades
//   2. Estructura del modal
//   3. Campos del formulario
//   4. Modal de confirmación
//   5. Modal de formulario
// ================================


// =====================================================
// 1. UTILIDADES
// =====================================================
/** Crea un elemento y le asigna propiedades: crear("p", { textContent: "Hola" }). */
function crear(etiqueta, propiedades = {}) {
    return Object.assign(document.createElement(etiqueta), propiedades);
}

function crearBoton(texto) {
    return crear("button", { type: "button", textContent: texto });
}


// =====================================================
// 2. ESTRUCTURA DEL MODAL
// =====================================================
/**
 * Arma el modal base (título, mensaje y contenedor de botones).
 * Devuelve sus partes y una función cerrar(resultado) que lo quita
 * y resuelve la promesa. La tecla Esc lo cierra con null.
 */
function crearModal(titulo, mensaje, resolver) {
    document.getElementById("modal-confirmacion")?.remove();

    const fondo     = crear("div", { id: "modal-confirmacion" });
    const contenido = crear("div", { id: "modal-contenido" });
    const botones   = crear("div", { className: "botones" });

    if (titulo)  contenido.append(crear("h2", { textContent: titulo }));
    if (mensaje) contenido.append(crear("p",  { textContent: mensaje }));
    fondo.append(contenido);

    const cerrarConEsc = (e) => { if (e.key === "Escape") cerrar(null); };
    const cerrar = (resultado) => {
        document.removeEventListener("keydown", cerrarConEsc);
        fondo.remove();
        resolver(resultado);
    };
    document.addEventListener("keydown", cerrarConEsc);

    return { fondo, contenido, botones, cerrar };
}

function mostrarModal(fondo) {
    document.body.append(fondo);
}


// =====================================================
// 3. CAMPOS DEL FORMULARIO
// =====================================================
/** Crea un campo (input o select) con su etiqueta, dentro de un div.modal-campo. */
function crearGrupoCampo(campo, alPresionarEnter) {
    const elemento = campo.tipo === "select" ? crearSelect(campo) : crearInput(campo, alPresionarEnter);
    elemento.id = `modal_campo_${campo.id}`;
    if (campo.valor != null) elemento.value = campo.valor;
    if (campo.tipo === "select") marcarSelectVacio(elemento);

    const grupo = crear("div", { className: "modal-campo" });
    grupo.append(crear("label", { htmlFor: elemento.id, textContent: campo.label }), elemento);
    return { grupo, elemento };
}

function crearSelect(campo) {
    const select = crear("select");
    campo.opciones.forEach(op => select.add(new Option(op.texto, op.valor)));
    select.addEventListener("change", () => marcarSelectVacio(select));
    return select;
}

/** "-- Selecciona --" se ve en gris hasta que se elija algo (clase sin-valor). */
function marcarSelectVacio(select) {
    select.classList.toggle("sin-valor", !select.value);
}

function crearInput(campo, alPresionarEnter) {
    const input = crear("input", { type: campo.tipo || "text" });
    if (campo.placeholder) input.placeholder = campo.placeholder;
    if (campo.maxLength)   input.maxLength   = campo.maxLength;
    if (campo.min != null) input.min = campo.min;
    if (campo.max != null) input.max = campo.max;

    if (campo.mayusculas) {
        input.addEventListener("input", () => { input.value = input.value.toUpperCase(); });
    }
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") alPresionarEnter(); });
    return input;
}

function leerValores(elementos) {
    const valores = {};
    for (const [id, elemento] of Object.entries(elementos)) valores[id] = elemento.value.trim();
    return valores;
}


// =====================================================
// 4. MODAL DE CONFIRMACIÓN
// =====================================================
/** Pide confirmación. Resuelve true si se confirmó. */
export function confirmarModal(mensaje, { titulo = "Confirmar", textoConfirmar = "Confirmar" } = {}) {
    return new Promise((resolve) => {
        const { fondo, contenido, botones, cerrar } = crearModal(titulo, mensaje, (r) => resolve(r === true));

        const btnCancelar  = crearBoton("Cancelar");
        const btnConfirmar = crearBoton(textoConfirmar);
        btnCancelar.onclick  = () => cerrar(false);
        btnConfirmar.onclick = () => cerrar(true);

        botones.append(btnCancelar, btnConfirmar);
        contenido.append(botones);
        mostrarModal(fondo);
        btnConfirmar.focus();
    });
}


// =====================================================
// 5. MODAL DE FORMULARIO
// =====================================================
/**
 * @param {object}   config
 * @param {string}   config.titulo
 * @param {string}   [config.mensaje]
 * @param {Array}    config.campos      [{ id, label, tipo: "text"|"number"|"select", opciones: [{valor, texto}],
 *                                         valor, placeholder, maxLength, min, max, mayusculas }]
 * @param {string}   [config.textoEnviar]
 * @param {Function} config.onEnviar    async (valores) => texto de error, o nada si salió bien
 * @returns {Promise<object|null>} valores enviados, o null si se canceló
 */
export function formularioModal({ titulo, mensaje, campos, textoEnviar = "Enviar", onEnviar }) {
    return new Promise((resolve) => {
        const { fondo, contenido, botones, cerrar } = crearModal(titulo, mensaje, resolve);

        const btnCancelar = crearBoton("Cancelar");
        const btnEnviar   = crearBoton(textoEnviar);
        const lista       = crear("div", { className: "modal-campos" });
        const elError     = crear("p",   { className: "modal-error" });
        const elementos   = {};

        for (const campo of campos) {
            const { grupo, elemento } = crearGrupoCampo(campo, () => btnEnviar.click());
            lista.append(grupo);
            elementos[campo.id] = elemento;
        }

        const enviar = async () => {
            const valores = leerValores(elementos);

            btnEnviar.disabled = btnCancelar.disabled = true;
            elError.textContent = "";
            const error = await onEnviar(valores);
            btnEnviar.disabled = btnCancelar.disabled = false;

            if (error) elError.textContent = error;
            else cerrar(valores);
        };

        btnCancelar.onclick = () => cerrar(null);
        btnEnviar.onclick   = enviar;

        botones.append(btnCancelar, btnEnviar);
        contenido.append(lista, elError, botones);
        mostrarModal(fondo);
        Object.values(elementos)[0]?.focus();
    });
}