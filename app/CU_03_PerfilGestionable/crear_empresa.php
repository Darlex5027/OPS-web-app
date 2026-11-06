<?php
/**
 * ================================
 * Archivo : crear_empresa.php
 * Autor   : Viridiana Tonix Zarate
 * Fecha   : 2026-05-24
 * Desc.   : Procesa la creación
 *           de nuevas empresas en
 *           la base de datos.
 *
 * Cambios:
 *  - Se inserta Activo = 1 (obtener_empresas.php filtra por Activo = 1).
 *  - Mismo INSERT que guardar_vacante.php (CU_06), que ya funciona.
 *  - Validación en servidor (nombre, RFC, URL) y control de duplicados.
 *  - SIEMPRE responde JSON, incluso ante un error fatal de PHP, y en modo
 *    depuración incluye la causa exacta para verla en el toast/consola.
 *  - Compatible con PHP 7.2+ (sin match, str_contains ni mbstring obligatorio).
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

$datos = json_decode(file_get_contents('php://input'), true);
if (!is_array($datos)) {
    responder(400, ['success' => false, 'error' => 'Datos inválidos']);
}

$campo = function ($clave) use ($datos) {
    return trim((string) (isset($datos[$clave]) ? $datos[$clave] : ''));
};

$nombre       = $campo('nombre');
$descripcion  = $campo('descripcion');
$razon_social = $campo('razon_social');
$rfc          = mayusculas($campo('rfc'));
$direccion    = $campo('direccion');
$sitio_web    = $campo('sitio_web');

if (largo($nombre) < 2 || largo($nombre) > 100) {
    responder(422, ['success' => false, 'error' => 'El nombre debe tener entre 2 y 100 caracteres']);
}
if (largo($descripcion) > 500 || largo($razon_social) > 150 || largo($direccion) > 200) {
    responder(422, ['success' => false, 'error' => 'Algún campo excede la longitud permitida']);
}
if ($rfc !== '' && !preg_match('/^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/u', $rfc)) {
    responder(422, ['success' => false, 'error' => 'RFC inválido']);
}
if ($sitio_web !== '') {
    if (!preg_match('#^https?://#i', $sitio_web)) $sitio_web = 'https://' . $sitio_web;
    if (!filter_var($sitio_web, FILTER_VALIDATE_URL)) {
        responder(422, ['success' => false, 'error' => 'Sitio web inválido']);
    }
}

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $pdo->prepare('SELECT Id_empresa, Nombre, Activo FROM Empresas WHERE LOWER(Nombre) = LOWER(?) LIMIT 1');
    $stmt->execute([$nombre]);
    $existente = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($existente) {
        responder(409, [
            'success'    => false,
            'error'      => $existente['Activo']
                ? 'Ya existe una empresa con ese nombre; se seleccionó en la lista.'
                : 'Ya existe una empresa con ese nombre pero está inactiva. Pide a un administrador que la active.',
            'id_empresa' => $existente['Activo'] ? $existente['Id_empresa'] : null,
            'nombre'     => $existente['Nombre'],
        ]);
    }

    $stmt = $pdo->prepare('
        INSERT INTO Empresas (Nombre, Descripcion, Razon_social, RFC, Direccion, Sitio_web, Activo)
        VALUES (:nombre, :descripcion, :razon_social, :rfc, :direccion, :sitio_web, 1)
    ');
    // Igual que guardar_vacante.php (CU_06), que ya funciona contra esta tabla:
    // los campos vacíos se guardan como '' (no NULL).
    $stmt->execute([
        ':nombre'       => $nombre,
        ':descripcion'  => $descripcion,
        ':razon_social' => $razon_social,
        ':rfc'          => $rfc,
        ':direccion'    => $direccion,
        ':sitio_web'    => $sitio_web,
    ]);

    responder(200, [
        'success'    => true,
        'id_empresa' => $pdo->lastInsertId(),
        'nombre'     => $nombre,
    ]);

} catch (PDOException $e) {
    error_log('crear_empresa.php: ' . $e->getMessage());

    $codigo = isset($e->errorInfo[1]) ? (int) $e->errorInfo[1] : 0;
    switch ($codigo) {
        case 1062: $mensaje = stripos($e->getMessage(), 'RFC') !== false
                       ? 'Ya existe una empresa registrada con ese RFC'
                       : 'Ya existe una empresa con esos datos (dato duplicado)'; break;
        case 1048: $mensaje = 'Falta un dato obligatorio de la empresa (la columna no acepta NULL)'; break;
        case 1364: $mensaje = 'La tabla Empresas tiene una columna obligatoria que este formulario no llena'; break;
        case 1406: $mensaje = 'Algún campo es más largo de lo que permite la base de datos'; break;
        case 1054: $mensaje = 'El nombre de una columna no coincide con la tabla Empresas'; break;
        default:   $mensaje = 'No se pudo crear la empresa';
    }

    $respuesta = ['success' => false, 'error' => $mensaje, 'codigo' => $codigo];
    if (MODO_DEBUG) $respuesta['detalle'] = $e->getMessage();
    responder(500, $respuesta);

} catch (Throwable $e) {
    responderExcepcion($e, 'crear_empresa.php');
}