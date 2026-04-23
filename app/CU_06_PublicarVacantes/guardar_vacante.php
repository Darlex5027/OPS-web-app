<?php
require_once '../php/db.php';
$tipo = $_POST['tipo_registro'];
try{
    $pdo = new PDO($dsn, $user, $pass, $options);
    if($tipo=="flayer"){

        if (!isset($_FILES['archivo_flayer']) || $_FILES['archivo_flayer']['error'] !== UPLOAD_ERR_OK){
            echo json_encode(['error' => 'No se recibió el archivo flayer o hubo un error al subirlo.']);
            exit;
        }

        $carpetaDestino = '/home/uploads/';//donde se guandan los achivos
        $nombreArchivo  = basename($_FILES['archivo_flayer']['name']);//extrae el nombre del archivo 
        $rutaDestino    = $carpetaDestino . time() . '_' . $nombreArchivo;//Coloca la fecha/hora en la que se subio el archivo antes del nombre
        
        if (!move_uploaded_file($_FILES['archivo_flayer']['tmp_name'], $rutaDestino)) {
            http_response_code(500);
            echo json_encode(['error' => 'No se pudo mover el archivo al servidor.']);
            exit;
        }

        $id_carrera = $_COOKIE['Id_carrera'];

        $consulta = $pdo->prepare("INSERT INTO Vacantes (
        Titulo, 
        Id_servicio,
        Id_empresa,
        Flyer_Path,
        Fecha_publicacion,
        Fecha_expiracion,
        Id_carrera)
        VALUES (?,?,?,?,?,?,?)");

        
        $consulta->execute([
            $_POST['titulo'],
            $_POST['Id_servicio'],
            $_POST['Id_empresa'],
            $rutaDestino,
            $_POST['publicacion'],
            $_POST['expiracion'],
            $id_carrera
        ]);   
        echo "Vacante guardada vinculada a la empresa ID: " . $_POST['Id_empresa'];

    }
    else{
        $idEmpresaFinal = null;
        if (isset($_POST['nueva_empresa']) && $_POST['nueva_empresa'] === 'true') {
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

        $idEmpresaFinal = $pdo->lastInsertId();
        }else{
            $idEmpresaFinal = $_POST['Id_empresa'];
        }

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
        echo "Vacante guardada vinculada a la empresa ID: " . $idEmpresaFinal;
    }
} catch (\PDOException $e){
    http_response_code(500);
        echo json_encode(['error' => "Error de conexión: " . $e->getMessage()]);
}
