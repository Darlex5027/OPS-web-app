<?php
require_once '../php/db.php';
//pasa de Json a variable de php
$valor = json_decode(file_get_contents("php://input"), true);
$matricula = $valor['matricula'];
$identificador = $valor['identificador'];

try{
    $pdo = new PDO($dsn, $user, $pass, $options);
    if($identificador==="Aceptado"){
        $consulta = $pdo->prepare("UPDATE Usuario SET Activo=1 WHERE Matricula=?");
    }else{
        $consulta = $pdo->prepare("DELETE FROM Usuario WHERE Matricula=?");
    }
    $consulta->execute([$matricula]);   
    echo json_encode(['success' => true]);

} catch (\PDOException $e){
    http_response_code(500);
        echo json_encode(['error' => "Error de conexión: " . $e->getMessage()]);
}
