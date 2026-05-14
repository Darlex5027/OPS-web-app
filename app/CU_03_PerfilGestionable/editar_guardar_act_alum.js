import { lanzarToast } from '../js/lanzar_toast.js';

document.addEventListener("DOMContentLoaded", () => {
    // Utilidades básicas
    const getVal = (id) => document.getElementById(id)?.value ?? "";
    const getEl  = (id) => document.getElementById(id);
    const setDis = (ids, val) => ids.forEach(id => { const el = getEl(id); if (el) el.disabled = val; });
    const setVis = (id, vis) => getEl(id)?.classList.toggle("oculto", !vis);

    // Campos editables según el estado del alumno
    const COMUNES  = ["estado", "area", "programa", "fecha_inicio", "fecha_fin", "grupo_alumno", "horario_entrada", "horario_salida"];
    const PENDIENTE = [...COMUNES, "id_empresa"];
    const POR_ESTADO = { PENDIENTE, EN_CURSO: COMUNES, COMPLETADO: [] };

    // Regex para nueva empresa
    const regexEmpresa = {
        nombre:       /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\.,\-]{2,100}$/,
        razon_social: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\.,\-&]{2,150}$/,
        rfc:          /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/,
        direccion:    /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\.,\-#]{5,200}$/,
        sitio_web:    /^https?:\/\/(www\.)?[a-zA-Z0-9\-]+(\.[a-zA-Z]{2,})+([\/\w\-._~:?#[\]@!$&'()*+,;=]*)?$/
    };

    // ------------------------------------
    // Modal: crear nueva empresa
    // ------------------------------------
    const modal = getEl("modalNuevaEmpresa");
    const camposModal = [
        "nueva_empresa_nombre", "nueva_empresa_descripcion",
        "nueva_empresa_razon_social", "nueva_empresa_rfc",
        "nueva_empresa_direccion", "nueva_empresa_web"
    ];

    const abrirModal  = () => modal.style.display = "flex";
    const cerrarModal = () => {
        modal.style.display = "none";
        camposModal.forEach(id => getEl(id).value = "");
    };

    getEl("btnCrearEmpresa").addEventListener("click", abrirModal);
    getEl("cerrarModalEmpresa").addEventListener("click", cerrarModal);
    modal.addEventListener("click", e => e.target === modal && cerrarModal());

    // Enviar nueva empresa al servidor
    getEl("guardarNuevaEmpresa").addEventListener("click", () => {
        const nombre       = getVal("nueva_empresa_nombre").trim();
        const descripcion  = getVal("nueva_empresa_descripcion").trim();
        const razon_social = getVal("nueva_empresa_razon_social").trim();
        const rfc          = getVal("nueva_empresa_rfc").trim().toUpperCase();
        const direccion    = getVal("nueva_empresa_direccion").trim();
        const sitio_web    = getVal("nueva_empresa_web").trim();

        // Validaciones
        if (!nombre)
            return lanzarToast("El nombre es obligatorio", "error");
        if (!regexEmpresa.nombre.test(nombre))
            return lanzarToast("Nombre inválido. Solo letras, números y . , -", "error");

        if (!descripcion)
            return lanzarToast("La descripción es obligatoria", "error");

        if (razon_social && !regexEmpresa.razon_social.test(razon_social))
            return lanzarToast("Razón social inválida. Solo letras, números y . , - &", "error");

        if (rfc && !regexEmpresa.rfc.test(rfc))
            return lanzarToast("RFC inválido. Ej: ABC123456XYZ (moral) o ABCD123456XYZ (física)", "error");

        if (direccion && !regexEmpresa.direccion.test(direccion))
            return lanzarToast("Dirección inválida. Solo letras, números y . , - #", "error");

        if (sitio_web && !regexEmpresa.sitio_web.test(sitio_web))
            return lanzarToast("Sitio web inválido. Ej: https://empresa.com", "error");

        fetch("crear_empresa.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre, descripcion, razon_social, rfc, direccion, sitio_web })
        })
            .then(r => r.json())
            .then(r => {
                if (!r.success) return lanzarToast("Error al crear empresa", "error");
                getEl("id_empresa").appendChild(new Option(nombre, r.id_empresa, true, true));
                getEl("empresa_texto").value = nombre;
                getEl("empresa_texto").dataset.idEmpresa = r.id_empresa;
                lanzarToast("Empresa creada correctamente", "exito");
                cerrarModal();
            })
            .catch(e => console.error(e));
    });

    // ------------------------------------
    // Cargar empresas desde la BD
    // ------------------------------------
    async function cargarEmpresas() {
        try {
            const data = await fetch("obtener_empresas.php").then(r => r.json());
            if (data.error) return lanzarToast("Error al cargar empresas", "error");

            const sel = getEl("id_empresa");
            sel.innerHTML = '<option value="">-- Selecciona una empresa --</option>';
            data.forEach(e => sel.appendChild(new Option(e.Nombre, e.Id_empresa)));

            const idActual = getEl("empresa_texto").dataset.idEmpresa;
            if (idActual) sel.value = idActual;
        } catch (e) {
            lanzarToast("Error de conexión al cargar empresas", "error");
        }
    }

    // ------------------------------------
    // Habilitar o deshabilitar campos
    // ------------------------------------
    window.habilitarActividades = async (habilitar) => {
        const estado = getEl("estado").value || "";

        // COMPLETADO: bloquear siempre
        if (estado === "COMPLETADO") {
            setDis(PENDIENTE, true);
            setVis("id_empresa", false);
            setVis("btnCrearEmpresa", false);
            setVis("empresa_texto", true);
            if (habilitar)
                lanzarToast("Este registro está completado y no puede editarse.", "error");
            return;
        }

        // Resetear y habilitar solo los permitidos
        setDis(PENDIENTE, true);
        if (habilitar) setDis(POR_ESTADO[estado] ?? [], false);

        const verSelect = habilitar;
        setVis("id_empresa", verSelect);
        setVis("btnCrearEmpresa", verSelect && estado === "PENDIENTE");
        setVis("empresa_texto", !verSelect);

        // EN_CURSO: empresa visible pero no editable
        if (habilitar && estado === "EN_CURSO")
            setDis(["id_empresa", "btnCrearEmpresa"], true);

        if (habilitar) await cargarEmpresas();
    };

    // Evitar que fecha fin sea menor a fecha inicio
    getEl("fecha_inicio").addEventListener("change", e => getEl("fecha_fin").min = e.target.value);

    // ------------------------------------
    // Guardar actividades
    // ------------------------------------
    window.guardarActividades = () => {
        const estado = getVal("estado");

        const datos = {
            estado,
            area:            getVal("area"),
            programa:        getVal("programa"),
            fecha_inicio:    getVal("fecha_inicio"),
            fecha_fin:       getVal("fecha_fin"),
            grupo:           getVal("grupo_alumno"),
            horario_entrada: getVal("horario_entrada"),
            horario_salida:  getVal("horario_salida"),
        };

        // Incluir empresa solo si el estado es PENDIENTE
        if (estado === "PENDIENTE") {
            const idEmpresa = getVal("id_empresa");
            if (!idEmpresa) return lanzarToast("Debes seleccionar una empresa.", "error");

            datos.id_empresa = idEmpresa;

            const sel = getEl("id_empresa");
            const txt = getEl("empresa_texto");
            txt.value = sel.options[sel.selectedIndex]?.text || "";
            txt.dataset.idEmpresa = sel.value;
        }

        fetch("guardar_datos.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        })
            .then(r => r.json())
            .then(r => lanzarToast(
                r.success ? "Actividades guardadas" : "Error al guardar",
                r.success ? "exito" : "error"
            ))
            .catch(e => console.error(e));
    };
});