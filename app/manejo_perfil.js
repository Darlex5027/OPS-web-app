
export{dirigirPerfil}
/*
 * Al llamar a la función se revisa si el usuario es Administrador o Alumnos 
 * y se le redirecciona a la página correcta.
*/
function dirigirPerfil(){
	const usuario=document.cookie;
	if (usuario.Id_tipo_usuario == 1) {
        	window.location.href = "../CU_03_PerfilGestionable/perfil_administrador.html";
        } else if (usuario.Id_tipo_usuario == 2) {
        	window.location.href = "../CU_03_PerfilGestionable/perfil_alumno.html";
        }
}
