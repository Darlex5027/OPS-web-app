<?php
/*
 * Archivo     : guardar_vacante.php
 * Módulo      : Modulo 6 CU_06_PublicarVacantes
 * Autor       : Daniela Hernandez Hernandez
 * Fecha       : 20 de abril del 2026
 * Descripción : El archivo guardar_vacante.php recibe los datos enviados desde el formulario y los guarda 
                 en la base de datos. Dependiendo del tipo de registro, puede almacenar información de una 
                 vacante con flayer o una vacante manual. También permite registrar una nueva empresa si el 
                 usuario así lo decide y guarda la ruta del archivo subido en el servidor.
 */
// Incluye la conexión a la base de datos
require_once '../php/db.php';

// Obtiene el tipo de registro (manual o flyer)
$tipo_registro = $_POST['tipo_registro'];
// Obtiene datos del usuario desde cookies
$id_carrera = $_COOKIE['Id_carrera'];
$id_usuario = $_COOKIE['Id_usuario'];
// ================= VALIDACIÓN DE SESIÓN =================
// Si no hay sesión válida, retorna error 401
if ($id_carrera == NULL || $id_usuario == NULL) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Sesión no válida. Por favor inicia sesión nuevamente.']);
    exit();
} else {
    try {
        // Se establece la conexión con la base de datos usando PDO
        $pdo = new PDO($dsn, $user, $pass, $options);
        // ================= REGISTRO CON FLAYER =================
        if ($tipo_registro == "flayer") {
            // Variable para almacenar el ID de la empresa
            $id_empresa_final = null;
            // Verifica si se creará una nueva empresa
            if (isset($_POST['nueva_empresa']) && $_POST['nueva_empresa'] === 'true') {
                // Inserta nueva empresa en la BD
                $stmt = $pdo->prepare("INSERT INTO Empresas (
            Nombre,
            Descripcion,
            Razon_social,
            RFC,
            Direccion,
            Sitio_web,
            Activo)
            VALUES (?,?,?,?,?,?,?)");

                $stmt->execute([
                    $_POST['nombre_empresa'],
                    $_POST['descripcion_empresa'],
                    $_POST['razon_empresa'],
                    $_POST['rfc_empresa'],
                    $_POST['direccion_empresa'],
                    $_POST['web_empresa'],
                    1,
                ]);
                // Obtiene el ID generado automáticamente
                $id_empresa_final = $pdo->lastInsertId();
            } else {
                // Usa empresa existente
                $id_empresa_final = $_POST['Id_empresa'];
            }
            // ================= VALIDACIÓN DE ARCHIVO =================

            // Verifica que el archivo se haya subido correctamente
            if (!isset($_FILES['archivo_flayer']) || $_FILES['archivo_flayer']['error'] !== UPLOAD_ERR_OK) {
                echo json_encode(['success' => false, 'error' => 'No se recibió el archivo flayer o hubo un error al subirlo.']);
                exit;
            }
            // Carpeta donde se guardarán los archivos
            $ruta_carpeta = '/home/uploads/';
            // Obtiene nombre original del archivo
            $nombre_archivo = basename($_FILES['archivo_flayer']['name']);
            // Genera nombre único usando timestamp
            $ruta_destino = $ruta_carpeta . time() . '_' . $nombre_archivo;
            // Mueve archivo desde temporal a destino final
            if (!move_uploaded_file($_FILES['archivo_flayer']['tmp_name'], $ruta_destino)) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'No se pudo mover el archivo al servidor.']);
                exit;
            }
            // ================= INSERTAR VACANTE CON FLYER =================
            $stmt = $pdo->prepare("INSERT INTO Vacantes (
        Titulo, 
        Id_servicio,
        Id_empresa,
        Flyer_Path,
        Fecha_publicacion,
        Fecha_expiracion,
        Id_carrera)
        VALUES (?,?,?,?,?,?,?)");
            // Ejecuta la consulta con los datos recibidos
            $stmt->execute([
                $_POST['titulo'],
                $_POST['Id_servicio'],
                $id_empresa_final,
                $ruta_destino,
                $_POST['publicacion'],
                $_POST['expiracion'],
                $id_carrera
            ]);
            // Mensaje de confirmación
            echo json_encode(['success' => true]);

        }
        // ================= REGISTRO MANUAL =================
        else {
            // Variable para guardar el ID final de la empresa
            $id_empresa_final = null;
            // Verifica si se creará nueva empresa
            if (isset($_POST['nueva_empresa']) && $_POST['nueva_empresa'] === 'true') {
                // Inserta nueva empresa
                $stmt = $pdo->prepare("INSERT INTO Empresas (
            Nombre,
            Descripcion,
            Razon_social,
            RFC,
            Direccion,
            Sitio_web,
            Activo)
            VALUES (?,?,?,?,?,?,?)");

                $stmt->execute([
                    $_POST['nombre_empresa'],
                    $_POST['descripcion_empresa'],
                    $_POST['razon_empresa'],
                    $_POST['rfc_empresa'],
                    $_POST['direccion_empresa'],
                    $_POST['web_empresa'],
                    1,
                ]);
                // Obtiene ID generado
                $id_empresa_final = $pdo->lastInsertId();
            } else {
                // Usa empresa existente
                $id_empresa_final = $_POST['Id_empresa'];
            }
            // ================= INSERTAR VACANTE MANUAL =================
            $stmt = $pdo->prepare("INSERT INTO Vacantes (
        Titulo, 
        Id_empresa, 
        Id_servicio,
        Contacto_nombre,
        Contacto_email,
        Contacto_telefono,
        Descripcion,
        Requisitos,
        Fecha_publicacion,
        Fecha_expiracion,
        Id_carrera)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)");
            // Ejecuta la consulta con los datos del formulario
            $stmt->execute([
                $_POST['titulo'],
                $id_empresa_final,
                $_POST['Id_servicio'],
                $_POST['nombre_contacto'],
                $_POST['email'],
                $_POST['telefono'],
                $_POST['descripcion'],
                $_POST['requisitos'],
                $_POST['publicacion'],
                $_POST['expiracion'],
                $id_carrera
            ]);
            // Mensaje de confirmación
            echo json_encode(['success' => true]);
        }
    } catch (\PDOException $e) {
        // En caso de error en base de datos
        http_response_code(500);
        // Devuelve el error en formato JSON
        echo json_encode(['success' => false, 'error' => "Error de conexión: " . $e->getMessage()]);
    }

}
