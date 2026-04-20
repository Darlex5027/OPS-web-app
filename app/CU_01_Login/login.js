const formLogin = document.getElementById("formLogin");
const mensaje = document.getElementById("mensaje");
const boton = formLogin.querySelector("button");

formLogin.addEventListener("submit", function(e){

    e.preventDefault();

    mensaje.style.display = "none";

    const matricula = document.getElementById("matricula").value.trim();
    const contrasena = document.getElementById("password").value;

    const regex = /^\d{4}$|^\d{8}$/;

    if(!regex.test(matricula)){
        mensaje.style.display = "block";
        mensaje.innerText = "La matrícula debe ser de 4 u 8 dígitos";
        return;
    }

    if(!contrasena){
        mensaje.style.display = "block";
        mensaje.innerText = "Ingrese su contraseña";
        return;
    }

    boton.disabled = true;

    fetch("php/login.php",{
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify({
            matricula:matricula,
            contrasena:contrasena
        })
    })

    .then(res=>{
        if(!res.ok){
            throw new Error("Error del servidor");
        }
        return res.json();
    })

    .then(data=>{

        boton.disabled = false;

        if(data.success){

            const usuario = data.usuario;
            const permisos = data.permisos;

            const tiempo = 3600;

            document.cookie = "Id_usuario=" + usuario.Id_usuario + "; max-age="+tiempo+"; path=/";
            document.cookie = "Matricula=" + usuario.Matricula + "; max-age="+tiempo+"; path=/";
            document.cookie = "Id_tipo_usuario=" + usuario.Id_tipo_usuario + "; max-age="+tiempo+"; path=/";
            document.cookie = "permisos=" + JSON.stringify(permisos) + "; max-age="+tiempo+"; path=/";
            document.cookie = "perfil=" + JSON.stringify(usuario) + "; max-age="+tiempo+"; path=/";

            window.location.href = "index.html";

        }else{

            mensaje.style.display = "block";
            mensaje.innerText = data.error || "Error al iniciar sesión";

        }

    })

    .catch(error=>{

        boton.disabled=false;

        mensaje.style.display="block";
        mensaje.innerText="Error de conexión con el servidor";

        console.error(error);

    });

});