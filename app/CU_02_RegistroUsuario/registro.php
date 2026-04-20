<?php
// Ajusta la ruta según tu estructura: subir dos niveles para llegar a php/db.php
require_once("../../php/db.php");
header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    echo json_encode(["success" => false, "error" => "Datos inválidos"]);
    exit;
}

$matricula = trim($data['matricula'] ?? '');
$password  = $data['password'] ?? '';
$tipo      = $data['tipo_usuario'] ?? '';

// Validaciones básicas
if (!$matricula || !$password || !$tipo) {
    echo json_encode(["success" => false, "error" => "Datos incompletos"]);
    exit;
}

try {
    // 1. Verificar si la matrícula ya existe
    $stmt = $pdo->prepare("SELECT Id_usuario FROM usuarios WHERE Matricula = ?");
    $stmt->execute([$matricula]);
    if ($stmt->fetch()) {
        echo json_encode(["success" => false, "error" => "La matrícula ya está registrada"]);
        exit;
    }

    $pdo->beginTransaction();

    $hash = password_hash($password, PASSWORD_DEFAULT);

    // Determinar estado inicial
    $id_tipo_usuario = ($tipo === "admin") ? 1 : 2;
    $activo_usuario = ($tipo === "admin") ? 1 : 0; // Alumnos inactivos hasta aprobación

    // 2. Insertar en tabla USUARIOS
    $stmt = $pdo->prepare("
        INSERT INTO usuarios (Matricula, Contraseña, Id_tipo_usuario, Activo, Intentos_fallidos, Bloqueado, Fecha_registro)
        VALUES (?, ?, ?, ?, 0, 0, NOW())
    ");
    $stmt->execute([$matricula, $hash, $id_tipo_usuario, $activo_usuario]);
    
    $id_usuario_nuevo = $pdo->lastInsertId();

    // 3. Insertar según tipo de perfil
    if ($tipo === "admin") {
        $stmt = $pdo->prepare("
            INSERT INTO administradores (Id_usuario, Nombre, Apellido_P, Apellido_M, Id_carrera, Telefono, Correo, Activo, Fecha_registro)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())
        ");
        $stmt->execute([
            $id_usuario_nuevo,
            $data['nombre'],
            $data['apellido_p'],
            $data['apellido_m'],
            $data['id_carrera'],
            $data['telefono'],
            $data['correo']
        ]);
    } 
    else if ($tipo === "alumno") {
        // Insertar en ALUMNOS
        $stmt = $pdo->prepare("
            INSERT INTO alumnos (Id_usuario, Nombre, Apellido_P, Apellido_M, Id_carrera, Horario, Organizacion, Activo, Fecha_registro)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())
        ");
        $stmt->execute([
            $id_usuario_nuevo,
            $data['nombre'],
            $data['apellido_p'],
            $data['apellido_m'],
            $data['id_carrera'],
            $data['horario'],
            $data['organizacion']
        ]);

        // IMPORTANTE: Obtener el ID autoincremental de la tabla ALUMNOS
        $id_alumno_real = $pdo->lastInsertId();

        // 4. Insertar CONTACTOS (usando $id_alumno_real)
        $stmt_cont = $pdo->prepare("
            INSERT INTO contactos_alumnos (Id_alumno, Tipo, Valor, Principal, Verificado, Fecha_registro)
            VALUES (?, ?, ?, 1, 0, NOW())
        ");
        
        // Email
        $stmt_cont->execute([$id_alumno_real, 'email', $data['email']]);
        // Teléfono
        $stmt_cont->execute([$id_alumno_real, 'telefono', $data['telefono']]);

        // 5. Insertar ACTIVIDAD INICIAL (usando $id_alumno_real)
        $stmt_act = $pdo->prepare("
            INSERT INTO actividades_alumnos (Id_alumno, Estado, Fecha_registro)
            VALUES (?, 'PENDIENTE', NOW())
        ");
        $stmt_act->execute([$id_alumno_real]);
    }

    $pdo->commit();
    echo json_encode(["success" => true]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    // Opcional: registrar el error real para depuración en logs de Docker
    error_log("Error en registro: " . $e->getMessage());
    echo json_encode(["success" => false, "error" => "Error interno al procesar el registro"]);
}