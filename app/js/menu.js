/*
 * Archivo     : menu.js
 * Autor       : Daniela Hernandez Hernandez
 * Descripción : Renderiza el menú de navegación según el tipo de usuario obtenido de la 
 *               cookie.
 */
import { obtenerCookie } from './cookie.js';

export function renderMenu() {
    const tipoUsuario = obtenerCookie('Id_tipo_usuario');
    const elMenu = document.querySelector('.menu');
    if (!elMenu) return;

    if (tipoUsuario == '1' || tipoUsuario == '3') {
        elMenu.innerHTML = `
            <a href="../CU_03_PerfilGestionable/perfil.html"><button>Perfil</button></a>
            <a href="../CU_06_PublicarVacantes/admin_vacantes.html"><button>Publicar vacantes</button></a>
            <a href="../CU_07_AdministrarAlumnos/admin_usuarios.html"><button>Administrar usuarios</button></a>
            <a href="../CU_08_Reporte_Alumnado/reporte_alumnos.html"><button>Generar reporte de alumnos</button></a>
            <a href="../CU_09_ReporteEstadistico/reporte_estadistico.html"><button>Generar reporte estadistico</button></a>
            <a href="../CU_12_CrearFormularios/encuestas_lista.html"><button>Ver formularios</button></a>
        `;
    } else if (tipoUsuario == '2') {
        elMenu.innerHTML = `
            <a href="admin_encuestas.html"><button>Responder formularios</button></a>
            <a href="admin_encuestas.html"><button>Vacantes</button></a>
            <a href="../CU_03_PerfilGestionable/perfil.html"><button>Perfil</button></a>
        `;
    }
}
