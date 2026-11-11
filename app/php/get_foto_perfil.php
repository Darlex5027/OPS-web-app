<?php
/*
 * Archivo     : get_foto_perfil.php
 * Módulo      : Para todos los modulos
 * Autor       : Daniela Hernandez Hernandez
 * Fecha       : 23/05/2026
 * Descripción : Retorna el Profile_picture_path del usuario según su Id_usuario
 */
require_once 'db.php';

header('Content-Type: application/json');

$id_usuario = $_GET['id'] ?? null;

if (!$id_usuario) {
    http_response_code(400);
    echo json_encode(['error' => 'Id_usuario requerido']);
    exit;
}

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    $stmt = $pdo->prepare('SELECT Profile_picture_path FROM Usuarios WHERE Id_usuario = ?');
    $stmt->execute([$id_usuario]);
    $resultado = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$resultado) {
        http_response_code(404);
        echo json_encode(['error' => 'Usuario no encontrado']);
        exit;
    }

    // Convierte la ruta del servidor a ruta web accesible
    $resultado['Profile_picture_path'] = str_replace('/home', '', $resultado['Profile_picture_path']);

    echo json_encode($resultado);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de conexión: ' . $e->getMessage()]);
}