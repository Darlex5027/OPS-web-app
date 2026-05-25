<?php
/**
 * ================================
 * Archivo : guardar_foto.php
 * Autor   : Viridiana Tonix Zarate
 * Fecha   : 2026-05-24
 * Desc.   : Procesa la carga y
 *           guardado de fotos de
 *           perfil del usuario.
 * ================================
 */
error_reporting(0);
ini_set('display_errors', 0);
ob_start(); 
require_once '../php/db.php';

header('Content-Type: application/json');

// =========================
// VERIFICAR COOKIES (igual que el resto de PHPs)
// =========================
if (!isset($_COOKIE['Id_tipo_usuario']) || !isset($_COOKIE['Id_usuario'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'No hay sesión activa']);
    exit;
}

$id_usuario = trim($_COOKIE['Id_usuario']);

// =========================
// VERIFICAR QUE SE RECIBIÓ EL ARCHIVO
// =========================
if (!isset($_FILES['foto_perfil']) || $_FILES['foto_perfil']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'error' => 'No se recibió ningún archivo']);
    exit;
}

$archivo = $_FILES['foto_perfil'];

// =========================
// VALIDAR TIPO MIME REAL
// =========================
$tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
$finfo    = finfo_open(FILEINFO_MIME_TYPE);
$mimeReal = finfo_file($finfo, $archivo['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeReal, $tiposPermitidos)) {
    echo json_encode(['success' => false, 'error' => 'Solo se permiten imágenes JPG, PNG o WEBP']);
    exit;
}

// =========================
// VALIDAR TAMAÑO (máx 2MB)
// =========================
if ($archivo['size'] > 2 * 1024 * 1024) {
    echo json_encode(['success' => false, 'error' => 'La imagen no debe superar los 2MB']);
    exit;
}

// =========================
// RUTAS
// =========================
$ruta_carpeta = '/home/uploads/Perfil/';
$url_base     = '../uploads/Perfil/';  // relativa, igual que cargar_foto.js

// Crear carpeta si no existe
if (!is_dir($ruta_carpeta)) {
    mkdir($ruta_carpeta, 0755, true);
}

// =========================
// NOMBRE: tipo-id.ext (igual que cargar_foto.js lo busca)
// =========================
$tipo_usuario = trim($_COOKIE['Id_tipo_usuario']);

$extension = match($mimeReal) {
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
    default      => 'jpg'
};

// cargar_foto.js busca: `../uploads/${tipo}-${id}.ext`
// así que el nombre debe ser exactamente ese
$nombreArchivo = $tipo_usuario . '-' . $id_usuario . '.' . $extension;
$rutaCompleta  = $ruta_carpeta . $nombreArchivo;

// Borrar variantes anteriores de otras extensiones para no dejar huérfanos
foreach (['jpg', 'png', 'webp'] as $ext) {
    $anterior = $ruta_carpeta . $tipo_usuario . '-' . $id_usuario . '.' . $ext;
    if ($anterior !== $rutaCompleta && file_exists($anterior)) {
        unlink($anterior);
    }
}

// =========================
// MOVER ARCHIVO
// =========================
if (!move_uploaded_file($archivo['tmp_name'], $rutaCompleta)) {
    echo json_encode(['success' => false, 'error' => 'Error al guardar el archivo en el servidor']);
    exit;
}

// =========================
// ACTUALIZAR BASE DE DATOS
// =========================
try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    $urlFoto = $url_base . $nombreArchivo;

    $stmt = $pdo->prepare("UPDATE Usuarios SET Profile_picture_path = :ruta WHERE Id_usuario = :id");
    $stmt->execute([
        ':ruta' => $urlFoto,
        ':id'   => $id_usuario
    ]);

    echo json_encode([
        'success' => true,
        'url'     => $urlFoto
    ]);

} catch (PDOException $e) {
    if (file_exists($rutaCompleta)) unlink($rutaCompleta);
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>