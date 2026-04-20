const form = document.getElementById("formRegistro");
const mensaje = document.getElementById("mensaje");

const radiosTipo = document.querySelectorAll("input[name='tipo_usuario']");
const grupoAlumno = document.getElementById("grupoAlumno");
const grupoAdmin = document.getElementById("grupoAdmin");

const selectCarreraAlumno = document.getElementById("carrera_alumno");
const selectCarreraAdmin = document.getElementById("carrera_admin");


document.addEventListener("DOMContentLoaded", function(){

    fetch("php/obtener_catalogos.php")

    .then(res=>{
        if(!res.ok){
            throw new Error("Error al obtener catálogo");
        }
        return res.json();
    })

    .then(data => {

        if(!data.carreras) return;

        selectCarreraAlumno.innerHTML = '<option value="">Seleccione una carrera</option>';
        selectCarreraAdmin.innerHTML = '<option value="">Seleccione una carrera</option>';

        data.carreras.forEach(carrera => {

            const optionAlumno = document.createElement("option");
            optionAlumno.value = carrera.Id_carrera;
            optionAlumno.textContent = carrera.Nombre_carrera;

            const optionAdmin = optionAlumno.cloneNode(true);

            selectCarreraAlumno.appendChild(optionAlumno);
            selectCarreraAdmin.appendChild(optionAdmin);

        });

    })

    .catch(() => {

        mensaje.style.display = "block";
        mensaje.innerText = "Error al cargar carreras";

    });

});


radiosTipo.forEach(radio => {

    radio.addEventListener("change", function(){

        if(this.value === "alumno"){
            grupoAlumno.hidden = false;
            grupoAdmin.hidden = true;
        }else{
            grupoAlumno.hidden = true;
            grupoAdmin.hidden = false;
        }

    });

});


function validarFormulario(){

    const matricula = document.getElementById("matricula").value.trim();
    const password = document.getElementById("password").value;
    const confirmar = document.getElementById("confirmar_password").value;

    const regexMatricula = /^\d{4}$|^\d{8}$/;

    if(!regexMatricula.test(matricula)){
        mostrarError("La matrícula debe tener 4 u 8 dígitos");
        return false;
    }

    if(password.length < 8){
        mostrarError("La contraseña debe tener al menos 8 caracteres");
        return false;
    }

    if(password !== confirmar){
        mostrarError("Las contraseñas no coinciden");
        return false;
    }

    const tipo = document.querySelector("input[name='tipo_usuario']:checked").value;

    if(tipo === "alumno"){

        const nombre = document.getElementById("nombre_alumno").value.trim();
        const apP = document.getElementById("apellido_p_alumno").value.trim();
        const carrera = selectCarreraAlumno.value;
        const email = document.getElementById("email_alumno").value.trim();
        const telefono = document.getElementById("telefono_alumno").value.trim();

        if(!nombre || !apP || !carrera || !email || !telefono){
            mostrarError("Complete todos los campos obligatorios del alumno");
            return false;
        }

        if(!/^\d+$/.test(telefono)){
            mostrarError("El teléfono debe contener solo números");
            return false;
        }

    }

    if(tipo === "admin"){

        const nombre = document.getElementById("nombre_admin").value.trim();
        const apP = document.getElementById("apellido_p_admin").value.trim();
        const carrera = selectCarreraAdmin.value;
        const correo = document.getElementById("correo_admin").value.trim();
        const telefono = document.getElementById("telefono_admin").value.trim();

        if(!nombre || !apP || !carrera || !correo || !telefono){
            mostrarError("Complete todos los campos obligatorios del administrador");
            return false;
        }

        if(!/^\d+$/.test(telefono)){
            mostrarError("El teléfono debe contener solo números");
            return false;
        }

    }

    return true;

}


function mostrarError(texto){

    mensaje.style.display = "block";
    mensaje.innerText = texto;

}


form.addEventListener("submit", function(e){

    e.preventDefault();

    mensaje.style.display = "none";

    if(!validarFormulario()) return;

    const tipo = document.querySelector("input[name='tipo_usuario']:checked").value;

    const datos = {

        matricula: document.getElementById("matricula").value.trim(),
        password: document.getElementById("password").value,
        tipo_usuario: tipo

    };

    if(tipo === "alumno"){

        datos.nombre = document.getElementById("nombre_alumno").value.trim();
        datos.apellido_p = document.getElementById("apellido_p_alumno").value.trim();
        datos.apellido_m = document.getElementById("apellido_m_alumno").value.trim();
        datos.id_carrera = selectCarreraAlumno.value;
        datos.expediente = document.getElementById("expediente").value.trim();
        datos.horario = document.getElementById("horario").value.trim();
        datos.email = document.getElementById("email_alumno").value.trim();
        datos.telefono = document.getElementById("telefono_alumno").value.trim();
        datos.organizacion = document.getElementById("organizacion").value.trim();

    }

    if(tipo === "admin"){

        datos.nombre = document.getElementById("nombre_admin").value.trim();
        datos.apellido_p = document.getElementById("apellido_p_admin").value.trim();
        datos.apellido_m = document.getElementById("apellido_m_admin").value.trim();
        datos.id_carrera = selectCarreraAdmin.value;
        datos.telefono = document.getElementById("telefono_admin").value.trim();
        datos.correo = document.getElementById("correo_admin").value.trim();

    }

    fetch("php/registro.php",{

        method:"POST",

        headers:{
            "Content-Type":"application/json"
        },

        body:JSON.stringify(datos)

    })

    .then(res=>{
        if(!res.ok){
            throw new Error("Error del servidor");
        }
        return res.json();
    })

    .then(data => {

        if(data.success){

            mensaje.style.display = "block";
            mensaje.innerText = "¡Registro exitoso! Tu cuenta está pendiente de aprobación";

            setTimeout(()=>{
                window.location.href = "login.html";
            },3000);

        }else{

            mostrarError(data.error);

        }

    })

    .catch(() => {

        mostrarError("Error de conexión con el servidor");

    });

});