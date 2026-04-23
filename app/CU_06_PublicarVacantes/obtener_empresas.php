<?php
require_once '../php/db.php';

try{
    $pdo = new PDO($dsn, $user, $pass, $options);
    $consulta = $pdo->prepare("SELECT Id_empresa, Nombre FROM Empresas");
    $consulta->execute();   
    echo json_encode($consulta->fetchAll(PDO::FETCH_ASSOC));
} catch (\PDOException $e){
    http_response_code(500);
        echo json_encode(['error' => "Error de conexión: " . $e->getMessage()]);
}
