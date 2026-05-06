<?php
require_once '../php/db.php';

header('Content-Type: application/json');

// =========================
// VALIDAR COOKIES
// =========================
if (!isset($_COOKIE['Id_tipo_usuario']) || !isset($_COOKIE['Id_usuario'])) {
    echo json_encode(['success' => false, 'error' => 'No hay sesión activa']);
    exit;
}

$tipo_usuario = $_COOKIE['Id_tipo_usuario'];
$id_usuario = $_COOKIE['Id_usuario'];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    // =========================
    // ADMIN
    // =========================
    if ($tipo_usuario == "1" || $tipo_usuario == "3") {

        $telefono = $_POST['telefono'] ?? null;
        $correo = $_POST['correo'] ?? null;

        $stmt = $pdo->prepare("
            UPDATE Administradores 
            SET Telefono = ?, Correo = ?
            WHERE Id_usuario = ?
        ");

        $stmt->execute([$telefono, $correo, $id_usuario]);

        echo json_encode(['success' => true]);
        exit;
    }

    // =========================
    // ALUMNO
    // =========================
    if ($tipo_usuario == "2") {

        // =========================
        // DATOS
        // =========================
        $grupo = $_POST['grupo'] ?? null;
        $horario = $_POST['horario'] ?? null;
        $area = $_POST['area'] ?? null;
        $programa = $_POST['programa'] ?? null;
        $estado = $_POST['estado'] ?? null;
        $periodo_año = $_POST['periodo_año'] ?? null;
        $fecha_inicio = $_POST['fecha_inicio'] ?? null;
        $fecha_fin = $_POST['fecha_fin'] ?? null;

        // =========================
        // EMPRESA (NUEVA O EXISTENTE)
        // =========================
        if (!empty($_POST['nueva_empresa'])) {

            $nombreEmpresa = trim($_POST['nueva_empresa']);

            // Evitar duplicados
            $buscar = $pdo->prepare("SELECT Id_empresa FROM Empresas WHERE Nombre = ?");
            $buscar->execute([$nombreEmpresa]);
            $empresaExistente = $buscar->fetch();

            if ($empresaExistente) {
                $id_empresa = $empresaExistente['Id_empresa'];
            } else {
                $insert = $pdo->prepare("INSERT INTO Empresas (Nombre) VALUES (?)");
                $insert->execute([$nombreEmpresa]);
                $id_empresa = $pdo->lastInsertId();
            }

        } else {
            $id_empresa = $_POST['id_empresa'] ?? null;
        }

        // =========================
        // OBTENER ID ALUMNO
        // =========================
        $stmtAlumno = $pdo->prepare("SELECT Id_alumno FROM Alumnos WHERE Id_usuario = ?");
        $stmtAlumno->execute([$id_usuario]);
        $alumno = $stmtAlumno->fetch();

        if (!$alumno) {
            echo json_encode(['success' => false, 'error' => 'Alumno no encontrado']);
            exit;
        }

        $id_alumno = $alumno['Id_alumno'];

        // =========================
        // ACTUALIZAR TABLA ALUMNOS
        // =========================
        $updateAlumno = $pdo->prepare("
            UPDATE Alumnos 
            SET Grupo = ?, Horario = ?
            WHERE Id_alumno = ?
        ");

        $updateAlumno->execute([$grupo, $horario, $id_alumno]);

        // =========================
        // ACTUALIZAR ACTIVIDADES
        // =========================
        $updateActividad = $pdo->prepare("
            UPDATE Actividades_Alumnos 
            SET 
                Id_empresa = ?,
                Area = ?,
                Programa = ?,
                Estado = ?,
                periodo_año = ?,
                Fecha_inicio = ?,
                Fecha_fin = ?,
                Fecha_modificacion = NOW()
            WHERE Id_alumno = ?
        ");

        $updateActividad->execute([
            $id_empresa,
            $area,
            $programa,
            $estado,
            $periodo_año,
            $fecha_inicio,
            $fecha_fin,
            $id_alumno
        ]);

        echo json_encode(['success' => true]);
        exit;
    }

    // =========================
    // OTRO CASO
    // =========================
    echo json_encode(['success' => false, 'error' => 'Tipo de usuario inválido']);

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Error: ' . $e->getMessage()
    ]);
}
?>