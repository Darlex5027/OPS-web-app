<?php
/**
 * ================================
 * Archivo : guardar_foto.php
 * Autor   : Viridiana Tonix Zarate
 * Fecha   : 2026-05-24
 * Desc.   : Procesa la carga y
 *           guardado de fotos de
 *           perfil del usuario.
 *
 * Cambios:
 *  - Antes se borraban las fotos anteriores ANTES de actualizar la BD;
 *    si la BD fallaba, el usuario se quedaba sin foto. Ahora se sube a un
 *    archivo temporal, se actualiza la BD y solo entonces se reemplaza.
 *  - La URL devuelta lleva ?v=timestamp para que el navegador no muestre
 *    la foto vieja en caché (el nombre del archivo no cambia).
 *  - Se limpia el buffer de salida antes de responder.
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

$id_usuario   = trim($_COOKIE['Id_usuario']);
$tipo_usuario = trim($_COOKIE['Id_tipo_usuario']);

if (!esEntero($id_usuario) || !esEntero($tipo_usuario)) {
    responder(400, ['success' => false, 'error' => 'Sesión inválida']);
}

if (!isset($_FILES['foto_perfil']) || $_FILES['foto_perfil']['error'] !== UPLOAD_ERR_OK) {
    responder(400, ['success' => false, 'error' => 'No se recibió ningún archivo']);
}

$archivo = $_FILES['foto_perfil'];

if ($archivo['size'] > 2 * 1024 * 1024) {
    responder(422, ['success' => false, 'error' => 'La imagen no debe superar los 2MB']);
}

// fileinfo puede no estar instalado; en ese caso se usa getimagesize()
if (function_exists('finfo_open')) {
    $finfo    = finfo_open(FILEINFO_MIME_TYPE);
    $mimeReal = finfo_file($finfo, $archivo['tmp_name']);
    finfo_close($finfo);
} else {
    $info     = @getimagesize($archivo['tmp_name']);
    $mimeReal = $info ? $info['mime'] : '';
}

$extensiones = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
if (!isset($extensiones[$mimeReal])) {
    responder(422, ['success' => false, 'error' => 'Solo se permiten imágenes JPG, PNG o WEBP']);
}

// =========================
// RUTAS
// ⚠ Verifica que '/home/uploads/Perfil/' sea la carpeta que el servidor web
//   publica como '../uploads/Perfil/'. Si no, la foto se guarda pero no se ve.
// =========================
$ruta_carpeta = '/home/uploads/Perfil/';
$url_base     = '../uploads/Perfil/';

if (!is_dir($ruta_carpeta) && !mkdir($ruta_carpeta, 0755, true)) {
    responder(500, ['success' => false, 'error' => 'No se pudo preparar la carpeta de fotos']);
}

$base          = $tipo_usuario . '-' . $id_usuario;
$nombreArchivo = $base . '.' . $extensiones[$mimeReal];
$rutaCompleta  = $ruta_carpeta . $nombreArchivo;
$rutaTemporal  = $rutaCompleta . '.subiendo';

if (!move_uploaded_file($archivo['tmp_name'], $rutaTemporal)) {
    responder(500, ['success' => false, 'error' => 'Error al guardar el archivo en el servidor']);
}

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    $urlFoto = $url_base . $nombreArchivo;

    $stmt = $pdo->prepare('UPDATE Usuarios SET Profile_picture_path = :ruta WHERE Id_usuario = :id');
    $stmt->execute([':ruta' => $urlFoto, ':id' => $id_usuario]);

} catch (Throwable $e) {
    @unlink($rutaTemporal);
    responderExcepcion($e, 'guardar_foto.php');
}

// La BD ya apunta al nuevo archivo: ahora sí se reemplaza y se limpian las otras extensiones
rename($rutaTemporal, $rutaCompleta);
foreach ($extensiones as $ext) {
    $anterior = $ruta_carpeta . $base . '.' . $ext;
    if ($anterior !== $rutaCompleta && file_exists($anterior)) {
        @unlink($anterior);
    }
}

responder(200, ['success' => true, 'url' => $urlFoto . '?v=' . time()]);