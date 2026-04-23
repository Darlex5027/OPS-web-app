<?php
/**
 * ARCHIVO: registro.php
 * Ubicación: app/CU_02_RegistroUsuario/
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

    $pdo->beginTransaction(); // Iniciamos transacción para asegurar que se creen ambos registros o ninguno

    // 1. CREAR EL USUARIO (Tabla base de acceso)
    // El Id_tipo_usuario debería ser 1 para Alumno y 2 para Admin (verifica tu tabla Tipos_Usuario)
    $id_tipo = ($data['tipo_usuario'] === 'alumno') ? 1 : 2;
    $pass_hash = password_hash($data['password'], PASSWORD_BCRYPT);

    $stmtUser = $pdo->prepare("
        INSERT INTO Usuarios (Matricula, Contrasena, Id_tipo_usuario, Activo, Fecha_registro)
        VALUES (?, ?, ?, 1, NOW())
    ");
    $stmtUser->execute([$data['matricula'], $pass_hash, $id_tipo]);
    $id_usuario_nuevo = $pdo->lastInsertId();

    // 2. REGISTRAR DATOS ESPECÍFICOS
    if ($data['tipo_usuario'] === 'alumno') {
        // Registro de Alumno
        $stmtAlumno = $pdo->prepare("
    INSERT INTO Alumnos (Id_usuario, Nombre, Apellido_P, Apellido_M, Id_carrera, Grupo, Horario, Organizacion, Activo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
");

// 2. El execute DEBE tener exactamente 8 elementos en el arreglo
$stmtAlumno->execute([
    $id_usuario_nuevo,    // 1
    $data['nombre'],      // 2
    $data['apellido_p'],  // 3
    $data['apellido_m'],  // 4
    $data['id_carrera'],  // 5
    $data['grupo'],       // 6 <- ESTE ES EL NUEVO
    $data['horario'],     // 7
    $data['organizacion'] // 8
]);
    } else {
        // Registro de Administrador
        $stmtAdmin = $pdo->prepare("
            INSERT INTO Administradores (Id_usuario, Nombre, Apellido_P, Apellido_M, Id_carrera, Telefono, Correo, Activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        ");
        $stmtAdmin->execute([
            $id_usuario_nuevo,
            $data['nombre'],
            $data['apellido_p'],
            $data['apellido_m'],
            $data['id_carrera'],
            $data['telefono'],
            $data['correo']
        ]);
    }

    $pdo->commit();
    echo json_encode(["success" => true]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    
    // Manejo de error por matrícula duplicada
    if ($e->getCode() == 23000) {
        $error = "La matrícula ya está registrada.";
    } else {
        $error = "Error en el servidor: " . $e->getMessage();
    }
    
    echo json_encode(["success" => false, "error" => $error]);
}