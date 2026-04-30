const	Id_tipo_usuario=document.cookie.split('; ').find( r => r.startsWith('Id_tipo_usuario=')).split('=')[1];
if (Id_tipo_usuario == 2) {
	window.location.href = "../CU_03_PerfilGestionable/perfil.html";
}

