<?php
require_once '../php/db.php';

header('Content-Type: application/json');

if (!isset($_COOKIE['Id_usuario'])) {
    http_response_code(401);
    echo json_encode(['error' => 'No hay sesión activa']);
    exit;
}

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    $consulta = $pdo->prepare("
        SELECT Id_empresa, Nombre
        FROM Empresas
        WHERE Activo = 1
        ORDER BY Nombre ASC
    ");
    $consulta->execute();

    $datos = $consulta->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>