document.addEventListener('DOMContentLoaded', redireccionar);

function redireccionar(){
	if(!document.cookie){
		window.location.href = "../CU_01_Login/login.html";
	}
}
