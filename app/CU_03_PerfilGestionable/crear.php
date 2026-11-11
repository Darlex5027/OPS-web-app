<?php
/**
 * ================================
 * Archivo : crear.php
 * Autor   : Viridiana Tonix Zarate
 * Fecha   : 2026-05-24
 * Desc.   : Altas desde el perfil, según "accion":
 *           - "actividad": nueva actividad (PENDIENTE) del alumno, solo si
 *             no tiene otra abierta. El No. de expediente es único.
 *           - "empresa":   nueva empresa (Activo = 1). Si ya existe una con
 *             el mismo nombre, devuelve su id para seleccionarla.
 * ================================
 */
// Cambiar a false en producción para no mostrar detalles internos.
const MODO_DEBUG = true;

// Los avisos de PHP no deben mezclarse con la respuesta JSON
ini_set('display_errors', '0');
ob_start();

// Valores del ENUM Actividades_Alumnos.periodo_tipo
const PERIODOS = ['primavera', 'otoño'];

/** Error esperado (validación, permisos...): se responde con su código y mensaje. */
class ErrorPeticion extends Exception {}

require_once '../php/db.php';

[$tipo_usuario, $id_usuario] = sesion();
$datos = leerDatos();
$pdo   = null;

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    switch (texto($datos, 'accion')) {
        case 'actividad': crearActividad($pdo, $datos, $tipo_usuario, $id_usuario); break;
        case 'empresa':   crearEmpresa($pdo, $datos); break;
        default:          fallar(400, 'Acción no válida');
    }

} catch (ErrorPeticion $e) {
    if ($pdo && $pdo->inTransaction()) $pdo->rollBack();
    responder($e->getCode(), ['success' => false, 'error' => $e->getMessage()]);

} catch (Throwable $e) {
    if ($pdo && $pdo->inTransaction()) $pdo->rollBack();
    // Dato UNIQUE repetido registrado al mismo tiempo (expediente o RFC)
    if ($e instanceof PDOException && isset($e->errorInfo[1]) && (int) $e->errorInfo[1] === 1062) {
        responder(409, ['success' => false, 'error' => 'Ese dato ya está registrado (expediente o RFC repetido)']);
    }
    responderExcepcion($e, 'crear.php');
}

// =========================
// NUEVA ACTIVIDAD
// =========================
function crearActividad($pdo, $datos, $tipo_usuario, $id_usuario) {
    if ($tipo_usuario !== '2') fallar(403, 'Solo los alumnos pueden crear actividades');

    $expediente  = mayusculas(texto($datos, 'no_expediente'));
    $idServicio  = texto($datos, 'id_servicio');
    $periodoTipo = minusculas(texto($datos, 'periodo_tipo'));
    $periodoAnio = texto($datos, 'periodo_anio');

    if (!preg_match('/^[A-Z0-9\/-]{1,15}$/', $expediente)) fallar(422, 'No. de expediente inválido (máx. 15: letras, números, - o /)');
    if (!esEntero($idServicio))                         fallar(422, 'Selecciona un servicio');
    if (!in_array($periodoTipo, PERIODOS, true))         fallar(422, 'Selecciona el periodo (primavera u otoño)');
    if (!esEntero($periodoAnio) || $periodoAnio < 2000 || $periodoAnio > 2155) fallar(422, 'Año del periodo inválido');

    $pdo->beginTransaction();

    // Bloquea al alumno para evitar dos altas al mismo tiempo
    $stmt = $pdo->prepare('SELECT Id_alumno FROM Alumnos WHERE Id_usuario = ? FOR UPDATE');
    $stmt->execute([$id_usuario]);
    $idAlumno = $stmt->fetchColumn();
    if (!$idAlumno) fallar(404, 'No se encontró el alumno');

    $stmt = $pdo->prepare("SELECT 1 FROM Actividades_Alumnos WHERE Id_alumno = ? AND Estado IN ('PENDIENTE', 'EN_CURSO')");
    $stmt->execute([$idAlumno]);
    if ($stmt->fetchColumn()) fallar(409, 'Ya tienes una actividad abierta. Debes completarla antes de iniciar otra.');

    $stmt = $pdo->prepare('SELECT 1 FROM Actividades WHERE Id_servicio = ?');
    $stmt->execute([$idServicio]);
    if (!$stmt->fetchColumn()) fallar(422, 'El servicio seleccionado no existe');

    $stmt = $pdo->prepare('SELECT 1 FROM Actividades_Alumnos WHERE No_expediente = ?');
    $stmt->execute([$expediente]);
    if ($stmt->fetchColumn()) fallar(409, 'Ese número de expediente ya está registrado');

    $stmt = $pdo->prepare("
        INSERT INTO Actividades_Alumnos (No_expediente, Id_alumno, Id_servicio, Estado, periodo_tipo, `periodo_año`)
        VALUES (?, ?, ?, 'PENDIENTE', ?, ?)
    ");
    $stmt->execute([$expediente, $idAlumno, (int) $idServicio, $periodoTipo, (int) $periodoAnio]);

    $pdo->commit();
    responder(200, ['success' => true]);
}

// =========================
// NUEVA EMPRESA
// =========================
function crearEmpresa($pdo, $datos) {
    $nombre       = texto($datos, 'nombre');
    $descripcion  = texto($datos, 'descripcion');
    $razon_social = texto($datos, 'razon_social');
    $rfc          = mayusculas(texto($datos, 'rfc'));
    $direccion    = texto($datos, 'direccion');
    $sitio_web    = texto($datos, 'sitio_web');

    if (largo($nombre) < 2 || largo($nombre) > 100) fallar(422, 'El nombre debe tener entre 2 y 100 caracteres');
    if (largo($descripcion) > 500 || largo($razon_social) > 150 || largo($direccion) > 200) {
        fallar(422, 'Algún campo excede la longitud permitida');
    }
    if ($rfc !== '' && !preg_match('/^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/u', $rfc)) fallar(422, 'RFC inválido');
    if ($sitio_web !== '') {
        if (!preg_match('#^https?://#i', $sitio_web)) $sitio_web = "https://$sitio_web";
        if (!filter_var($sitio_web, FILTER_VALIDATE_URL)) fallar(422, 'Sitio web inválido');
    }

    $stmt = $pdo->prepare('SELECT Id_empresa, Nombre, Activo FROM Empresas WHERE LOWER(Nombre) = LOWER(?) LIMIT 1');
    $stmt->execute([$nombre]);
    $existente = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($existente) {
        responder(409, [
            'success'    => false,
            'error'      => $existente['Activo']
                ? 'Ya existe una empresa con ese nombre; se seleccionó en la lista.'
                : 'Ya existe una empresa con ese nombre pero está inactiva.',
            'id_empresa' => $existente['Activo'] ? $existente['Id_empresa'] : null,
            'nombre'     => $existente['Nombre'],
        ]);
    }

    $stmt = $pdo->prepare('
        INSERT INTO Empresas (Nombre, Descripcion, Razon_social, RFC, Direccion, Sitio_web, Activo)
        VALUES (?, ?, ?, ?, ?, ?, 1)
    ');
    $stmt->execute([$nombre, $descripcion, $razon_social, $rfc, $direccion, $sitio_web]);

    responder(200, ['success' => true, 'id_empresa' => $pdo->lastInsertId(), 'nombre' => $nombre]);
}

// =========================
// FUNCIONES DE APOYO
// =========================
function responder($codigo, $cuerpo) {
    while (ob_get_level() > 0) ob_end_clean();
    http_response_code($codigo);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($cuerpo, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function responderExcepcion($e, $archivo) {
    error_log("$archivo: " . $e->getMessage());
    responder(500, [
        'success' => false,
        'error'   => MODO_DEBUG ? "Error en $archivo: " . $e->getMessage() : 'Error interno del servidor',
    ]);
}

function fallar($codigo, $mensaje) {
    throw new ErrorPeticion($mensaje, $codigo);
}

/** Exige sesión; devuelve [tipo_usuario, id_usuario]. */
function sesion() {
    if (!isset($_COOKIE['Id_tipo_usuario'], $_COOKIE['Id_usuario'])) {
        responder(401, ['success' => false, 'error' => 'No hay sesión activa']);
    }
    return [trim($_COOKIE['Id_tipo_usuario']), trim($_COOKIE['Id_usuario'])];
}

/** Lee los datos JSON: del cuerpo, o del campo "datos" si viene con archivo (FormData). */
function leerDatos() {
    $datos = json_decode(isset($_POST['datos']) ? $_POST['datos'] : file_get_contents('php://input'), true);
    if (!is_array($datos)) responder(400, ['success' => false, 'error' => 'Datos inválidos']);
    return $datos;
}

function texto($datos, $clave) {
    return isset($datos[$clave]) ? trim((string) $datos[$clave]) : '';
}

function largo($t) {
    return function_exists('mb_strlen') ? mb_strlen($t, 'UTF-8') : (int) preg_match_all('/./us', $t);
}

function mayusculas($t) {
    return function_exists('mb_strtoupper') ? mb_strtoupper($t, 'UTF-8') : strtr(strtoupper($t), ['ñ' => 'Ñ']);
}

function minusculas($t) {
    return function_exists('mb_strtolower') ? mb_strtolower($t, 'UTF-8') : strtr(strtolower($t), ['Ñ' => 'ñ']);
}

function esEntero($v) {
    return is_string($v) && preg_match('/^\d+$/', $v) === 1;
}