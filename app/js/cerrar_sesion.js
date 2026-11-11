export const cerrarSesion = () => {
    const nombres = ['Id_usuario', 'Matricula', 'Id_tipo_usuario', 'Id_carrera', 'Id_alumno', 'Activo', 'Fecha_registro', 'Fecha_ultimo_acceso', 'Intentos_fallidos', 'Bloqueado', 'permisos'];
    for(const name of nombres){
        document.cookie = `${name}= ; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
    }
    window.location.href="../CU_01_Login/login.html"
}

window.cerrarSesion = cerrarSesion;