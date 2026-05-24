<?php
/**
 * Archivo     : procesar_encuesta.php
 * Módulo      : CU_05_ResponderEncuestas
 * Descripción : Guarda las respuestas de una encuesta en la base de datos con bloqueo de duplicados y mapeo de servicio
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
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $pdo->beginTransaction();
    
    // BLINDAJE CRÍTICO 1: Verificar si el alumno ya respondió a esta encuesta previamente
    $sqlCheck = "SELECT 1 FROM Respuestas WHERE Id_encuesta = :id_encuesta AND Id_alumno = :id_alumno LIMIT 1";
    $stmtCheck = $pdo->prepare($sqlCheck);
    $stmtCheck->execute([
        'id_encuesta' => $id_encuesta,
        'id_alumno'   => $id_alumno
    ]);
    
    if ($stmtCheck->fetch()) {
        $pdo->rollBack();
        echo json_encode([
            "success" => false,
            "message" => "Esta encuesta ya ha sido respondida previamente por el alumno."
        ]);
        exit;
    }

    // CORRECCIÓN NOTA ADICIONAL: Obtener el Id_servicio directamente de la encuesta para cumplir la regla relacional
    $sqlServicio = "SELECT Id_servicio FROM Encuestas WHERE Id_encuesta = :id_encuesta LIMIT 1";
    $stmtServicio = $pdo->prepare($sqlServicio);
    $stmtServicio->execute(['id_encuesta' => $id_encuesta]);
    $encuestaData = $stmtServicio->fetch(PDO::FETCH_ASSOC);

    if (!$encuestaData) {
        $pdo->rollBack();
        echo json_encode(["success" => false, "message" => "La encuesta especificada no existe."]);
        exit;
    }
    $id_servicio = $encuestaData['Id_servicio'];
    
    // Preparación del Insert para el bucle incluyendo el Id_servicio recuperado
    $sqlInsert = "INSERT INTO Respuestas (Id_encuesta, Id_alumno, Id_servicio, Id_pregunta, Respuesta, Fecha_respuesta) 
                  VALUES (:id_encuesta, :id_alumno, :id_servicio, :id_pregunta, :respuesta, NOW())";
    $stmtInsert = $pdo->prepare($sqlInsert);
    
    foreach ($respuestas as $resp) {
        $textoRespuesta = isset($resp['Respuesta']) ? trim($resp['Respuesta']) : "No contestó";
        if ($textoRespuesta === "") {
            $textoRespuesta = "No contestó";
        }

        $stmtInsert->execute([
            'id_encuesta' => $id_encuesta,
            'id_alumno'   => $id_alumno,
            'id_servicio' => $id_servicio,
            'id_pregunta' => $resp['Id_pregunta'],
            'respuesta'   => $textoRespuesta
        ]);
    }
    
    $pdo->commit();
    
    echo json_encode([
        "success" => true, 
        "message" => "Encuesta guardada exitosamente"
    ]);
    
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode([
        "success" => false, 
        "message" => "Error al guardar en la base de datos: " . $e->getMessage()
    ]);
}
?>