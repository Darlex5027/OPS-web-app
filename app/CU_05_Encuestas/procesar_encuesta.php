<?php
/**
 * Archivo     : procesar_encuesta.php
 * Módulo      : CU_05_ResponderEncuestas
 * Descripción : Guarda las respuestas de una encuesta en la base de datos
 */

require_once("../php/db.php");

header('Content-Type: application/json; charset=utf-8');

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    echo json_encode(["success" => false, "message" => "Datos no válidos"]);
    exit;
}

$respuestas = $input['respuestas'] ?? [];
$id_alumno = $input['Id_alumno'] ?? null;
$id_encuesta = $input['Id_encuesta'] ?? null;

if (!$id_alumno || !$id_encuesta || empty($respuestas)) {
    echo json_encode([
        "success" => false, 
        "message" => "Faltan datos requeridos: alumno, encuesta o respuestas"
    ]);
    exit;
}

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    $pdo->beginTransaction();
    
    $sql = "INSERT INTO Respuestas (Id_encuesta, Id_alumno, Id_pregunta, Respuesta, Fecha_respuesta) 
            VALUES (:id_encuesta, :id_alumno, :id_pregunta, :respuesta, NOW())";
    
    $stmt = $pdo->prepare($sql);
    
    foreach ($respuestas as $resp) {
        $stmt->execute([
            'id_encuesta' => $id_encuesta,
            'id_alumno' => $id_alumno,
            'id_pregunta' => $resp['Id_pregunta'],
            'respuesta' => $resp['Respuesta']
        ]);
    }
    
    $pdo->commit();
    
    echo json_encode([
        "success" => true, 
        "message" => "Encuesta guardada exitosamente"
    ]);
    
} catch (PDOException $e) {
    $pdo->rollBack();
    echo json_encode([
        "success" => false, 
        "message" => "Error al guardar: " . $e->getMessage()
    ]);
}
?>