<?php
header('Content-Type: application/json');
require_once 'conexion.php';

// Leer el JSON del cuerpo de la petición
$data = json_decode(file_get_contents("php://input"), true);

$respuestas = $data['respuestas'] ?? [];
$id_alumno = $data['Id_alumno'] ?? null;
$id_encuesta = $data['Id_encuesta'] ?? null;

if (!$id_alumno || !$id_encuesta || empty($respuestas)) {
    echo json_encode(["success" => false, "message" => "Datos incompletos"]);
    exit;
}

try {
    $pdo->beginTransaction();

    // 1. Obtener el Id_servicio del alumno (asumiendo que está en la tabla Alumno o similar)
    // Este valor es necesario según tu requerimiento de INSERT
    $stmt_serv = $pdo->prepare("SELECT Id_servicio FROM Alumno WHERE Id_alumno = :id LIMIT 1");
    $stmt_serv->execute(['id' => $id_alumno]);
    $id_servicio = $stmt_serv->fetchColumn();

    if (!$id_servicio) {
    throw new Exception("El alumno no tiene un servicio social o práctica profesional vinculada.");
    }
    
    // 2. Insertar cada respuesta
    $sql_insert = "INSERT INTO Respuesta (Id_pregunta, Id_alumno, Id_encuesta, Respuesta, Id_servicio) 
                   VALUES (:id_p, :id_a, :id_e, :resp, :id_s)";
    $stmt_ins = $pdo->prepare($sql_insert);

    foreach ($respuestas as $item) {
        $stmt_ins->execute([
            'id_p' => $item['Id_pregunta'],
            'id_a' => $id_alumno,
            'id_e' => $id_encuesta,
            'resp' => $item['Respuesta'],
            'id_s' => $id_servicio
        ]);
    }

    $pdo->commit();
    echo json_encode(["success" => true]);

} catch (Exception $e) {
    // Si algo falla en cualquier punto del proceso, se deshacen todos los inserts
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}