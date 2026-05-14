<?php
/*
  Archivo     : periodo_eliminar.php
  Módulo      : CU_12_CrearFormularios
  Autor       : Daniela Hernandez Hernandez
  Fecha       : 05/05/2026
  Descripción : Recibe el identificador de un periodo y elimina el registro correspondiente
                de la tabla Periodo_Encuesta en la base de datos.
*/
require_once '../php/db.php';

$datos = json_decode(file_get_contents('php://input'), true);
$id_periodo_encuesta = $datos['Id_periodo_encuesta'];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    $stmt = $pdo->prepare("DELETE FROM Periodo_Encuesta WHERE Id_periodo_encuesta = ?");
    $stmt->execute([$id_periodo_encuesta]);
    echo json_encode(['success' => true, 'mensaje' => 'Periodo eliminado']);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => "Error al eliminar el periodo"]);
}