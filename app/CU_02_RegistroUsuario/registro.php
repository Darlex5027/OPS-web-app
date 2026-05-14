<?php
/**
 * Archivo      : registro.php
 * Módulo       : CU_02_RegistroUsuario
 * Autor        : Francisco Angel Membrila Alarcón
 * Fecha        : 21/04/2026
 * Descripción  : Endpoint que procesa el registro de usuarios. Valida los datos
 * y los almacena en la base de datos MariaDB.
 * de usuario y retorna la información en formato JSON.
 */

require_once("../php/db.php");
header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    echo json_encode(["success" => false, "error" => "No se recibieron datos"]);
    exit;
}

try {
    if (!isset($pdo)) {
        $pdo = new PDO($dsn, $user, $pass, $options);
    }

    $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM Usuarios WHERE Matricula = ?");
    $stmtCheck->execute([$data['matricula']]);
    if ($stmtCheck->fetchColumn() > 0) {
        echo json_encode(["success" => false, "error" => "La matrícula ya está registrada."]);
        exit;
    }

    $pdo->beginTransaction();

    // 1. CREAR EL USUARIO
    $id_tipo = ($data['tipo_usuario'] === 'alumno') ? 2 : 3;
    $pass_hash = password_hash($data['password'], PASSWORD_BCRYPT);

    $stmtUser = $pdo->prepare("
        INSERT INTO Usuarios (Matricula, Contrasena, Id_tipo_usuario, Activo, Fecha_registro)
        VALUES (?, ?, ?, 0, NOW())
    ");
    $stmtUser->execute([$data['matricula'], $pass_hash, $id_tipo]);
    $id_usuario_nuevo = $pdo->lastInsertId();

    // 2. REGISTRAR DATOS ESPECÍFICOS
    if ($data['tipo_usuario'] === 'alumno') {
        // CORRECCIÓN: Eliminamos Id_actividad/Id_servicio de aquí porque no existen en la tabla Alumnos
        $stmtAlumno = $pdo->prepare("
        INSERT INTO Alumnos (Id_usuario, Nombre, Apellido_P, Apellido_M, Id_carrera, Grupo, Horario, No_Expediente, Activo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        ");

        $stmtAlumno->execute([
            $id_usuario_nuevo,
            $data['nombre'],
            $data['apellido_p'],
            $data['apellido_m'],
            $data['id_carrera'],
            $data['grupo'],
            $data['horario'],
            $data['matricula'], // Usamos matrícula como No_Expediente
        ]);

        $id_alumno = $pdo->lastInsertId();

        // 3. VINCULAR CON LA ACTIVIDAD (Aquí es donde realmente se guarda el Id_servicio)
        $stmtActividadAlumno = $pdo->prepare("
        INSERT INTO Actividades_Alumnos 
        (Id_alumno, Id_servicio, Id_empresa, No_expediente, Estado, periodo_tipo, periodo_año, Fecha_registro) 
        VALUES (?, ?, ?, NULL, 'PENDIENTE', ?, ?, NOW())
        ");

        $stmtActividadAlumno->execute([
            $id_alumno,
            $data['actividad'], // Id_servicio que viene del select
            $data['organizacion'] ?: null,
            $data['periodo_tipo'],
            date('Y')
        ]);

    } else {
        // Registro de Administrador
        $stmtAdmin = $pdo->prepare("
            INSERT INTO Administradores (Id_usuario, Nombre, Apellido_P, Apellido_M, Id_carrera, Telefono, Correo, Activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        ");
        $stmtAdmin->execute([
            $id_usuario_nuevo, $data['nombre'], $data['apellido_p'], $data['apellido_m'],
            $data['id_carrera'], $data['telefono'], $data['correo']
        ]);
    }

    $pdo->commit();
    echo json_encode(["success" => true]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) { $pdo->rollBack(); }
    echo json_encode(["success" => false, "error" => "Error en el servidor: " . $e->getMessage()]);
}