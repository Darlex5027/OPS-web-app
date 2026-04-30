// actividades.js
import { lanzarToast } from '../js/lanzar_toast.js';

export const readonlyActividades = ["id_alumno_servicio_actividad", "id_alumno_actividad", "periodo_tipo_actividad", "periodo_año_actividad", "servicio_actividad"];

export function cargarEmpresas() {
    return fetch("obtener_empresas.php")
        .then((r) => r.json())
        .then((empresas) => {
            const select = document.getElementById("id_empresa_actividad");
            select.innerHTML = '<option value="">-- Selecciona una empresa --</option>';
            empresas.forEach((empresa) => {
                const opcion = document.createElement("option");
                opcion.value       = String(empresa.Id_empresa);
                opcion.textContent = empresa.Nombre;
                select.appendChild(opcion);
            });
        })
        .catch(() => lanzarToast("No se pudo cargar el catálogo de empresas", "error"));
}

let estadoActividad = null;

export function getEstadoActividad() {
    return estadoActividad;
}

export function cargarActividades() {
    return fetch("obtener_datos_actividades.php")
        .then((r) => {
            if (!r.ok) throw new Error("Error servidor actividades");
            return r.json();
        })
        .then((data) => {
            if (!data || data.error || !data.length) return;

            const act = data[0];
            estadoActividad = act.Estado;

            document.getElementById("id_alumno_servicio_actividad").value = act.Id_alumno_servicio || "";
            document.getElementById("id_alumno_actividad").value          = act.Id_alumno          || "";
            document.getElementById("servicio_actividad").value           = act.Servicio            || "";
            document.getElementById("area_actividad").value               = act.Area               || "";
            document.getElementById("programa_actividad").value           = act.Programa           || "";
            document.getElementById("fecha_inicio_actividad").value       = act.Fecha_inicio       || "";
            document.getElementById("fecha_fin_actividad").value          = act.Fecha_fin          || "";
            document.getElementById("periodo_año_actividad").value        = act["periodo_a\u00f1o"]        || "";

            document.getElementById("id_empresa_actividad").value    = String(act.Id_empresa ?? "");
            document.getElementById("estado_actividad").value         = act.Estado        ?? "";
            document.getElementById("periodo_tipo_actividad").value   = act.periodo_tipo  ?? "";
        })
        .catch((error) => console.error("Error al obtener actividades:", error));
}

export function guardarActividades() {
    const datos = {
        id_empresa:   document.getElementById("id_empresa_actividad").value,
        area:         document.getElementById("area_actividad").value,
        programa:     document.getElementById("programa_actividad").value,
        estado:       document.getElementById("estado_actividad").value,
        periodo_tipo: document.getElementById("periodo_tipo_actividad").value,
        periodo_año:  document.getElementById("periodo_año_actividad").value,
        fecha_inicio: document.getElementById("fecha_inicio_actividad").value,
        fecha_fin:    document.getElementById("fecha_fin_actividad").value
    };

    return fetch("guardar_datos_actividades.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos)
    }).then((r) => r.json());
}
export function cargarCatalogos() {
    return fetch("obtener_catalogos.php")
        .then((r) => r.json())
        .then(({ estados, periodos }) => {
            const selectEstado = document.getElementById("estado_actividad");
            selectEstado.innerHTML = '<option value="">-- Selecciona un estado --</option>';
            estados.forEach((e) => {
                const op = document.createElement("option");
                op.value = e;
                op.textContent = e.charAt(0) + e.slice(1).toLowerCase().replace("_", " ");
                selectEstado.appendChild(op);
            });

            const selectPeriodo = document.getElementById("periodo_tipo_actividad");
            selectPeriodo.innerHTML = '<option value="">-- Selecciona un periodo --</option>';
            periodos.forEach((p) => {
                const op = document.createElement("option");
                op.value = p;
                op.textContent = p.charAt(0).toUpperCase() + p.slice(1);
                selectPeriodo.appendChild(op);
            });
        })
        .catch(() => lanzarToast("No se pudo cargar los catálogos", "error"));
}