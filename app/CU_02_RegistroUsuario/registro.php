<?php
/**
 * Archivo       : registro.php
 * Módulo        : CU_02_RegistroUsuario
 * Autor         : Francisco Angel Membrila Alarcón
 * Fecha         : 21/04/2026
 * Descripción   : Endpoint que procesa el registro de usuarios. Valida los datos
 * y los almacena en la base de datos MariaDB.
 */

require_once("../php/db.php");
header("Content-Type: application/json");

$datos_input = json_decode(file_get_contents("php://input"), true);

if (!$datos_input) {
    echo json_encode(["success" => false, "error" => "No se recibieron datos"]);
    exit;
}

try {
    if (!isset($pdo)) {
        $pdo = new PDO($dsn, $user, $pass, $options);
    }

    $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM Usuarios WHERE Matricula = ?");
    $stmtCheck->execute([$datos_input['matricula']]);
    if ($stmtCheck->fetchColumn() > 0) {
        echo json_encode(["success" => false, "error" => "La matrícula ya está registrada."]);
        exit;
    }

    $pdo->beginTransaction();

    // 1. CREAR EL USUARIO
    $id_tipo = ($datos_input['tipo_usuario'] === 'alumno') ? 2 : 3;
    $hash_contrasena = password_hash($datos_input['password'], PASSWORD_BCRYPT);

    $stmtUser = $pdo->prepare("
        INSERT INTO Usuarios (Matricula, Contrasena, Id_tipo_usuario, Activo, Fecha_registro)
        VALUES (?, ?, ?, 0, NOW())
    ");
    $stmtUser->execute([$datos_input['matricula'], $hash_contrasena, $id_tipo]);
    $id_usuario_nuevo = $pdo->lastInsertId();

    // 2. REGISTRAR DATOS ESPECÍFICOS
    if ($datos_input['tipo_usuario'] === 'alumno') {
        $stmtAlumno = $pdo->prepare("
            INSERT INTO Alumnos (Id_usuario, Nombre, Apellido_P, Apellido_M, Id_carrera, Grupo, Horario, Activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        ");

        // Horario opcional
        $horario_alumno = isset($datos_input['horario']) && !empty($datos_input['horario']) ? $datos_input['horario'] : null;

        $stmtAlumno->execute([
            $id_usuario_nuevo,
            $datos_input['nombre'],
            $datos_input['apellido_p'],
            $datos_input['apellido_m'],
            $datos_input['id_carrera'],
            $datos_input['grupo'],
            $horario_alumno
        ]);

        $id_alumno = $pdo->lastInsertId();

        $stmtActividadAlumno = $pdo->prepare("
            INSERT INTO Actividades_Alumnos 
            (Id_alumno, Id_servicio, Id_empresa, Estado, periodo_tipo, periodo_año, Fecha_registro) 
            VALUES (?, ?, ?, 'PENDIENTE', ?, ?, NOW())
        ");

        $stmtActividadAlumno->execute([
            $id_alumno,
            $datos_input['actividad'],
            $datos_input['organizacion'] ?: null,
            $datos_input['periodo_tipo'],
            date('Y')
        ]);

    } else {
        // Registro de Coordinador
        $stmtAdmin = $pdo->prepare("
            INSERT INTO Administradores (Id_usuario, Nombre, Apellido_P, Apellido_M, Id_carrera, Telefono, Correo, Activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        ");
        $stmtAdmin->execute([
            $id_usuario_nuevo, 
            $datos_input['nombre'], 
            $datos_input['apellido_p'], 
            $datos_input['apellido_m'],
            $datos_input['id_carrera'], 
            $datos_input['telefono'], 
            $datos_input['correo']
        ]);
    }

    $pdo->commit();
    echo json_encode(["success" => true]);

} catch (PDOException $error_proceso_registro) {
    if ($pdo->inTransaction()) { 
        $pdo->rollBack(); 
    }
    
    // Registrar el error internamente para depuración
    error_log("Error en registro.php: " . $error_proceso_registro->getMessage());
    
    // Devolver mensaje amigable al usuario
    echo json_encode([
        "success" => false, 
        "error" => "Error al procesar el registro. Por favor, intente más tarde."
    ]);
}
?>