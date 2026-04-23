<?php
/* 
Daniela Hernandez Hernandez
Fecha de creacion: 20 de abril del 2026
El archivo guardar_vacante.php recibe los datos enviados desde el formulario y los guarda 
en la base de datos. Dependiendo del tipo de registro, puede almacenar información de una 
vacante con flayer o una vacante manual. También permite registrar una nueva empresa si el 
usuario así lo decide y guarda la ruta del archivo subido en el servidor.
*/
// Incluye la conexión a la base de datos
require_once '../php/db.php';
// Obtiene el tipo de registro enviado desde el formulario (manual o flayer)
$tipo = $_POST['tipo_registro'];
try {
    // Se establece la conexión con la base de datos usando PDO
    $pdo = new PDO($dsn, $user, $pass, $options);
    // ================= REGISTRO CON FLAYER =================
    if ($tipo == "flayer") {
        // Verifica que el archivo fue enviado correctamente
        if (!isset($_FILES['archivo_flayer']) || $_FILES['archivo_flayer']['error'] !== UPLOAD_ERR_OK) {
            echo json_encode(['error' => 'No se recibió el archivo flayer o hubo un error al subirlo.']);
            exit;
        }
        // Ruta donde se guardarán los archivos en el servidor
        $carpetaDestino = '/home/uploads/';
        // Obtiene el nombre original del archivo
        $nombreArchivo = basename($_FILES['archivo_flayer']['name']);
        // Genera una ruta única agregando la fecha/hora al nombre
        $rutaDestino = $carpetaDestino . time() . '_' . $nombreArchivo;
        // Mueve el archivo temporal a la carpeta destino
        if (!move_uploaded_file($_FILES['archivo_flayer']['tmp_name'], $rutaDestino)) {
            http_response_code(500);
            echo json_encode(['error' => 'No se pudo mover el archivo al servidor.']);
            exit;
        }
        // Obtiene el id de la carrera desde una cookie
        $id_carrera = $_COOKIE['Id_carrera'];
        // Prepara la consulta para insertar la vacante con flayer
        $consulta = $pdo->prepare("INSERT INTO Vacantes (
        Titulo, 
        Id_servicio,
        Id_empresa,
        Flyer_Path,
        Fecha_publicacion,
        Fecha_expiracion,
        Id_carrera)
        VALUES (?,?,?,?,?,?,?)");
        // Ejecuta la consulta con los datos recibidos
        $consulta->execute([
            $_POST['titulo'],
            $_POST['Id_servicio'],
            $_POST['Id_empresa'],
            $rutaDestino,
            $_POST['publicacion'],
            $_POST['expiracion'],
            $id_carrera
        ]);
        // Mensaje de confirmación
        echo "Vacante guardada vinculada a la empresa ID: " . $_POST['Id_empresa'];

    }
    // ================= REGISTRO MANUAL =================
    else {
        // Variable para guardar el ID final de la empresa
        $idEmpresaFinal = null;
        // Verifica si se está registrando una nueva empresa
        if (isset($_POST['nueva_empresa']) && $_POST['nueva_empresa'] === 'true') {
            // Inserta la nueva empresa en la base de datos
            $empresa = $pdo->prepare("INSERT INTO Empresas (
            Nombre,
            Descripcion,
            Razon_social,
            RFC,
            Direccion,
            Sitio_web,
            Activo)
            VALUES (?,?,?,?,?,?,?)");

            $empresa->execute([
                $_POST['nombre_empresa'],
                $_POST['descripcion_empresa'],
                $_POST['razon_empresa'],
                $_POST['rfc_empresa'],
                $_POST['direccion_empresa'],
                $_POST['web_empresa'],
                1,
            ]);
            // Obtiene el ID de la empresa recién creada
            $idEmpresaFinal = $pdo->lastInsertId();
        } else {
            // Si no es nueva, usa la empresa seleccionada
            $idEmpresaFinal = $_POST['Id_empresa'];
        }
        // Prepara la consulta para insertar la vacante manual
        $consulta = $pdo->prepare("INSERT INTO Vacantes (
        Titulo, 
        Id_empresa, 
        Id_servicio,
        Contacto_nombre,
        Contacto_email,
        Contacto_telefono,
        Descripcion,
        Requisitos,
        Fecha_publicacion,
        Fecha_expiracion)
        VALUES (?,?,?,?,?,?,?,?,?,?)");
        // Ejecuta la consulta con los datos del formulario
        $consulta->execute([
            $_POST['titulo'],
            $idEmpresaFinal, // <--- Aquí va el ID numérico
            $_POST['Id_servicio'],
            $_POST['nombre_contacto'],
            $_POST['email'],
            $_POST['telefono'],
            $_POST['descripcion'],
            $_POST['requisitos'],
            $_POST['publicacion'],
            $_POST['expiracion']
        ]);
        // Mensaje de confirmación
        echo "Vacante guardada vinculada a la empresa ID: " . $idEmpresaFinal;
    }
} catch (\PDOException $e) {
    // En caso de error en base de datos
    http_response_code(500);
    // Devuelve el error en formato JSON
    echo json_encode(['error' => "Error de conexión: " . $e->getMessage()]);
}
