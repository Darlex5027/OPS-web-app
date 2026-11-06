<?php
/**
 * ================================
 * Archivo : crear_actividad.php
 * Desc.   : Crea una NUEVA actividad para el alumno logueado.
 *           Solo se permite si no tiene otra actividad abierta
 *           (las anteriores deben estar COMPLETADAS o CANCELADAS).
 *           Nace en PENDIENTE; empresa, área, programa, fechas y
 *           No_expediente se llenan después (todas aceptan NULL).
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

if (!isset($_COOKIE['Id_tipo_usuario'], $_COOKIE['Id_usuario'])) {
    responder(401, ['success' => false, 'error' => 'No hay sesión activa']);
}

if (trim($_COOKIE['Id_tipo_usuario']) !== '2') {
    responder(403, ['success' => false, 'error' => 'Solo los alumnos pueden crear actividades']);
}

$id_usuario = trim($_COOKIE['Id_usuario']);
$datos      = json_decode(file_get_contents('php://input'), true);

if (!is_array($datos)) {
    responder(400, ['success' => false, 'error' => 'Datos inválidos']);
}

// Valores del ENUM periodo_tipo
const PERIODOS = ['primavera', 'otoño'];

$idServicio  = trim((string) ($datos['id_servicio']  ?? ''));
$periodoTipo = minusculas(trim((string) ($datos['periodo_tipo'] ?? '')));
$periodoAnio = trim((string) ($datos['periodo_anio'] ?? ''));
$expediente  = mayusculas(trim((string) ($datos['no_expediente'] ?? '')));

$pdo = null;

try {
    // No_expediente: varchar(15) UNIQUE. Letras, números, guion o diagonal.
    if ($expediente === '')                                    fallar(422, 'Escribe el número de expediente');
    if (!preg_match('/^[A-Z0-9\/-]{1,15}$/', $expediente))     fallar(422, 'No. de expediente inválido (máx. 15: letras, números, - o /)');

    if (!esEntero($idServicio))                    fallar(422, 'Selecciona un servicio');
    if (!in_array($periodoTipo, PERIODOS, true))      fallar(422, 'Selecciona el periodo (primavera u otoño)');
    if (!esEntero($periodoAnio) || $periodoAnio < 2000 || $periodoAnio > 2155) {
        fallar(422, 'Año del periodo inválido');
    }

    $pdo = new PDO($dsn, $user, $pass, $options);
    $pdo->beginTransaction();

    // Bloquea la fila del alumno para evitar dos altas simultáneas
    $stmt = $pdo->prepare('SELECT Id_alumno FROM Alumnos WHERE Id_usuario = ? FOR UPDATE');
    $stmt->execute([$id_usuario]);
    $idAlumno = $stmt->fetchColumn();
    if (!$idAlumno) fallar(404, 'No se encontró el alumno');

    $stmt = $pdo->prepare("
        SELECT COUNT(*) FROM Actividades_Alumnos
        WHERE Id_alumno = ? AND Estado IN ('PENDIENTE', 'EN_CURSO')
    ");
    $stmt->execute([$idAlumno]);
    if ((int) $stmt->fetchColumn() > 0) {
        fallar(409, 'Ya tienes una actividad abierta. Debes completarla antes de iniciar otra.');
    }

    $stmt = $pdo->prepare('SELECT 1 FROM Actividades WHERE Id_servicio = ?');
    $stmt->execute([$idServicio]);
    if (!$stmt->fetchColumn()) fallar(422, 'El servicio seleccionado no existe');

    $stmt = $pdo->prepare('SELECT 1 FROM Actividades_Alumnos WHERE No_expediente = ?');
    $stmt->execute([$expediente]);
    if ($stmt->fetchColumn()) fallar(409, 'Ese número de expediente ya está registrado');

    $stmt = $pdo->prepare("
        INSERT INTO Actividades_Alumnos
            (No_expediente, Id_alumno, Id_servicio, Estado, periodo_tipo, `periodo_año`)
        VALUES
            (:no_expediente, :id_alumno, :id_servicio, 'PENDIENTE', :periodo_tipo, :periodo_anio)
    ");
    $stmt->execute([
        ':no_expediente' => $expediente,
        ':id_alumno'    => $idAlumno,
        ':id_servicio'  => (int) $idServicio,
        ':periodo_tipo' => $periodoTipo,
        ':periodo_anio' => (int) $periodoAnio,
    ]);

    $pdo->commit();
    responder(200, ['success' => true]);

} catch (ErrorPeticion $e) {
    if ($pdo && $pdo->inTransaction()) $pdo->rollBack();
    responder($e->getCode(), ['success' => false, 'error' => $e->getMessage()]);

} catch (Throwable $e) {
    if ($pdo && $pdo->inTransaction()) $pdo->rollBack();
    // Por si otro alumno registró el mismo expediente al mismo tiempo (UNIQUE)
    if ($e instanceof PDOException && isset($e->errorInfo[1]) && (int) $e->errorInfo[1] === 1062) {
        responder(409, ['success' => false, 'error' => 'Ese número de expediente ya está registrado']);
    }
    responderExcepcion($e, 'crear_actividad.php');
}