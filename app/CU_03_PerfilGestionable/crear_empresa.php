<?php
require_once '../php/db.php';

header('Content-Type: application/json');

if (!isset($_COOKIE['Id_tipo_usuario']) || !isset($_COOKIE['Id_usuario'])) {
    http_response_code(401);
    echo json_encode(['error' => 'No hay sesión activa']);
    exit;
}

$datos = json_decode(file_get_contents("php://input"), true);

if (empty($datos['nombre'])) {
    http_response_code(400);
    echo json_encode(['error' => 'El nombre de la empresa es obligatorio']);
    exit;
}

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    $consulta = $pdo->prepare("
        INSERT INTO Empresas (Nombre, Descripcion, Razon_social, RFC, Direccion, Sitio_web)
        VALUES (:nombre, :descripcion, :razon_social, :rfc, :direccion, :sitio_web)
    ");

    $consulta->execute([
        ':nombre'       => $datos['nombre']       ?? '',
        ':descripcion'  => $datos['descripcion']  ?? '',
        ':razon_social' => $datos['razon_social'] ?? '',
        ':rfc'          => $datos['rfc']          ?? '',
        ':direccion'    => $datos['direccion']    ?? '',
        ':sitio_web'    => $datos['sitio_web']    ?? '',
    ]);

    echo json_encode([
        'success'    => true,
        'id_empresa' => $pdo->lastInsertId()
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>