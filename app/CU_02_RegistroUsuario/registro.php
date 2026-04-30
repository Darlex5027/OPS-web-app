<?php
/**
 * ARCHIVO: registro.php
 * Ubicación: app/CU_02_RegistroUsuario/
 */

require_once("../php/db.php");
header("Content-Type: application/json");

// Obtener datos del cuerpo de la petición
$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    echo json_encode(["success" => false, "error" => "No se recibieron datos"]);
    exit;
}

try {
    if (!isset($pdo)) {
        $pdo = new PDO($dsn, $user, $pass, $options);
    }

    // 1. Verificar si la matrícula ya existe ANTES de iniciar la transacción
    $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM Usuarios WHERE Matricula = ?");
    $stmtCheck->execute([$data['matricula']]);
    if ($stmtCheck->fetchColumn() > 0) {
        echo json_encode(["success" => false, "error" => "La matrícula ya está registrada."]);
        exit;
    }

    $pdo->beginTransaction();

    // 2. CREAR EL USUARIO
    $id_tipo = ($data['tipo_usuario'] === 'alumno') ? 1 : 3;
    $pass_hash = password_hash($data['password'], PASSWORD_BCRYPT);

    $stmtUser = $pdo->prepare("
        INSERT INTO Usuarios (Matricula, Contrasena, Id_tipo_usuario, Activo, Fecha_registro)
        VALUES (?, ?, ?, 0, NOW())
    ");

    $stmtUser->execute([
        $data['matricula'],
        $pass_hash,
        $id_tipo
    ]);

    $id_usuario_nuevo = $pdo->lastInsertId();

    // 3. REGISTRAR DATOS ESPECÍFICOS
    if ($data['tipo_usuario'] === 'alumno') {
        // NOTA: He añadido No_Expediente como NULL o valor temporal porque es UNIQUE en tu SQL
        $stmtAlumno = $pdo->prepare("
        INSERT INTO Alumnos (Id_usuario, Nombre, Apellido_P, Apellido_M, Id_carrera, Id_actividad, Grupo, Horario, Organizacion, No_Expediente, Activo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ");

        $stmtAlumno->execute([
            $id_usuario_nuevo,
            $data['nombre'],
            $data['apellido_p'],
            $data['apellido_m'],
            $data['id_carrera'],
            $data['actividad'],
            $data['grupo'],
            $data['horario'],
            $data['organizacion'],
            $data['matricula'],
        ]);

        $id_alumno = $pdo->lastInsertId();

        $stmtActividadAlumno = $pdo->prepare("
        INSERT INTO Actividades_Alumnos
        (Id_alumno, Id_servicio, Id_empresa, Estado, periodo_tipo, periodo_año, Fecha_registro)
        VALUES (?, ?, ?, 'PENDIENTE', ?, ?, NOW())
        ");

        $stmtActividadAlumno->execute([
            $id_alumno,
            $data['actividad'],
            $data['organizacion'] ?: null,
            'primavera',
            date('Y')
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
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    // Si el error es de duplicidad pero pasó el primer filtro, es por otro campo UNIQUE (como Correo o No_Expediente)
    if ($e->getCode() == 23000) {
        $error = "Error: El correo o número de expediente ya está en uso.";
    } else {
        $error = "Error en el servidor: " . $e->getMessage();
    }

    echo json_encode(["success" => false, "error" => $error]);
}