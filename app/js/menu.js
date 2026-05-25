/*
 * Archivo     : menu.js
 * Autor       : Daniela Hernandez Hernandez
 * Descripción : Renderiza el menú de navegación según el tipo de usuario obtenido de la 
 *               cookie, y carga la foto de perfil del usuario.
 */
import { obtenerCookie } from './cookie.js';
import { lanzarToast } from './lanzar_toast.js';
export function renderMenu() {
    const tipoUsuario = obtenerCookie('Id_tipo_usuario');
    const idUsuario = obtenerCookie('Id_usuario');
    const elMenu = document.querySelector('.menu');
    if (!elMenu) return;

    // Agrega la imagen al inicio del menú
    let fotoHTML = `<img class="menu-foto-perfil" src="" />`;

    if (tipoUsuario == '1' || tipoUsuario == '3') {
        elMenu.innerHTML = fotoHTML + `
            <a href="../CU_03_PerfilGestionable/perfil.html"><button>Perfil</button></a>
            <a href="../CU_04_Visualizar_Vacantes/visualizar_vacantes.html"><button>Vacantes</button></a>
            <a href="../CU_06_PublicarVacantes/admin_vacantes.html"><button>Publicar vacantes</button></a>
            <a href="../CU_05_Encuestas/encuestas.html"><button>Responder formularios</button></a>
            <a href="../CU_07_AdministrarAlumnos/admin_usuarios.html"><button>Administrar usuarios</button></a>
            <a href="../CU_08_Reporte_Alumnado/reporte_alumnos.html"><button>Generar reporte de alumnos</button></a>
            <a href="../CU_09_ReporteEstadistico/reporte_estadistico.html"><button>Generar reporte estadistico</button></a>
            <a href="../CU_12_CrearFormularios/encuestas_lista.html"><button>Ver formularios</button></a>
        `;
    } else if (tipoUsuario == '2') {
        elMenu.innerHTML = fotoHTML + `
            <a href="../CU_04_Visualizar_Vacantes/visualizar_vacantes.html"><button>Vacantes</button></a>
            <a href="../CU_05_Encuestas/encuestas.html"><button>Responder formularios</button></a>
            <a href="../CU_03_PerfilGestionable/perfil.html"><button>Perfil</button></a>
        `;
    }

    if (idUsuario) {
        cargarFotoPerfil(idUsuario);
    }
}

async function cargarFotoPerfil(idUsuario) {
    try {
        const response = await fetch(`../php/get_foto_perfil.php?id=${idUsuario}`);
        const datos = await response.json();
        const rutaFoto = datos.Profile_picture_path;
        const imgPerfil = document.getElementById('foto_perfil_preview');
        if (imgPerfil && rutaFoto) {
            imgPerfil.src = rutaFoto;
        }
    } catch (error) {
        lanzarToast("No se pudo cargar la imagen", "error")
    }
}