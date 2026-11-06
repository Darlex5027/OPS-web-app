<?php
/**
 * ================================
 * Archivo : obtener_servicios.php
 * Desc.   : Catálogos para el modal "Nueva actividad":
 *           - servicios (tabla Actividades)
 *           - tipos de periodo (valores del ENUM periodo_tipo, o los
 *             valores ya usados en la tabla si no es ENUM)
 * ================================
 */

// Primero: garantiza respuesta JSON. Si no se puede cargar, se avisa en JSON.
if (!is_readable(__DIR__ . '/utilidades_json.php')) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => file_exists(__DIR__ . '/utilidades_json.php')
        ? 'El servidor no tiene permiso de leer utilidades_json.php (chmod 644)'
        : 'No se encontró utilidades_json.php en ' . __DIR__]);
    exit;
}
require_once __DIR__ . '/utilidades_json.php';
require_once '../php/db.php';


if (!isset($_COOKIE['Id_usuario'])) {
    responder(401, ['success' => false, 'error' => 'No hay sesión activa']);
}

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    $servicios = $pdo->query('SELECT Id_servicio, Servicio FROM Actividades ORDER BY Servicio')
                     ->fetchAll(PDO::FETCH_ASSOC);

    // Si periodo_tipo es ENUM, se leen sus valores permitidos
    $tipoColumna = $pdo->query("
        SELECT COLUMN_TYPE FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = 'Actividades_Alumnos'
          AND COLUMN_NAME  = 'periodo_tipo'
    ")->fetchColumn();

    $periodos = [];
    if ($tipoColumna && stripos($tipoColumna, 'enum(') === 0) {
        preg_match_all("/'([^']*)'/", $tipoColumna, $m);
        $periodos = $m[1];
    } else {
        $periodos = $pdo->query("
            SELECT DISTINCT periodo_tipo FROM Actividades_Alumnos
            WHERE periodo_tipo IS NOT NULL AND periodo_tipo <> ''
            ORDER BY periodo_tipo
        ")->fetchAll(PDO::FETCH_COLUMN);
    }

    responder(200, [
        'success'   => true,
        'servicios' => $servicios,
        'periodos'  => $periodos,
    ]);

} catch (Throwable $e) {
    responderExcepcion($e, 'obtener_servicios.php');
}