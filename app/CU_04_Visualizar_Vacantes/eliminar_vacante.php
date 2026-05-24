<?php
/*
 * Archivo     : eliminar_vacante.php
 * Módulo      : Modulo 4 CU_04_VisualizarVacantes
 * Autor       : Viridiana Tonix Zarate
 * Fecha       : 2026
 * Descripción : Elimina una vacante de la base de datos.
 *               Solo accesible para usuarios tipo 1 y 3.
 */

header('Content-Type: application/json');

require_once '../php/db.php';

// ── Verificar sesión activa ─────────────────────────────────────────────────
if (!isset($_COOKIE['Id_usuario']) || !isset($_COOKIE['Id_tipo_usuario'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'mensaje' => 'Sesión no válida']);
    exit;
}

$tipo_usuario = intval($_COOKIE['Id_tipo_usuario']);

// ── Verificar permiso (solo tipo 1 y 3) ────────────────────────────────────
if ($tipo_usuario !== 1 && $tipo_usuario !== 3) {
    http_response_code(403);
    echo json_encode(['success' => false, 'mensaje' => 'No tienes permiso para eliminar vacantes']);
    exit;
}

// ── Leer y validar el body JSON ────────────────────────────────────────────
$body = json_decode(file_get_contents('php://input'), true);

if (!$body || !isset($body['Id_vacante'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'mensaje' => 'Datos incompletos']);
    exit;
}

$id_vacante = intval($body['Id_vacante']);

if ($id_vacante <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'mensaje' => 'ID de vacante no válido']);
    exit;
}

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    // ── Obtener la ruta del flyer antes de borrar ───────────────────────────
    $stmt_flyer = $pdo->prepare("SELECT Flyer_Path FROM Vacantes WHERE Id_vacante = :id");
    $stmt_flyer->execute([':id' => $id_vacante]);
    $vacante = $stmt_flyer->fetch(PDO::FETCH_ASSOC);

    // ── Eliminar registro de la BD ──────────────────────────────────────────
    $stmt = $pdo->prepare("DELETE FROM Vacantes WHERE Id_vacante = :id");
    $stmt->execute([':id' => $id_vacante]);

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'mensaje' => 'La vacante no existe o ya fue eliminada']);
        exit;
    }

    // ── Eliminar el archivo del flyer del servidor (si existe) ──────────────
    if ($vacante && !empty($vacante['Flyer_Path'])) {
        $rutaArchivo = $vacante['Flyer_Path'];
        if (file_exists($rutaArchivo)) {
            unlink($rutaArchivo);
        }
    }

    echo json_encode(['success' => true, 'mensaje' => 'Vacante eliminada correctamente']);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'mensaje' => 'Error de base de datos: ' . $e->getMessage()]);
}