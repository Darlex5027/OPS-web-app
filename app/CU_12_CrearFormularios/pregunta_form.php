<?php
/*
  Archivo     : pregunta_form.php
  Módulo      : CU_12_CrearFormularios
  Autor       : Daniela Hernandez Hernandez
  Fecha       : 05/05/2026
  Descripción : Recibe los datos de una nueva pregunta, calcula su orden automáticamente
                e inserta el registro en la tabla Preguntas de la base de datos.
*/
require_once '../php/db.php';

$datos_pregunta = json_decode(file_get_contents('php://input'), true);
$id_encuesta = $datos_pregunta['Id_encuesta'];
$pregunta = $datos_pregunta['pregunta'];
$tipo_respuesta = $datos_pregunta['tipo_respuesta'];
$seccion = $datos_pregunta['seccion'];
$obligatoria = $datos_pregunta['obligatoria'];
$activo = $datos_pregunta['activo'];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM Preguntas WHERE Id_encuesta = ?");
    $stmt->execute([$id_encuesta]);
    $resultado_pregunta = $stmt->fetch(PDO::FETCH_ASSOC);
    $orden = $resultado_pregunta['total'] + 1;

    $stmt = $pdo->prepare("INSERT INTO 
    Preguntas (Id_encuesta, Pregunta, Tipo_respuesta, Seccion, Obligatoria, Activo, Orden) 
    VALUES (?,?,?,?,?,?,?)");
    $stmt->execute([$id_encuesta, $pregunta, $tipo_respuesta, $seccion, $obligatoria, $activo, $orden]);

    echo json_encode(['success' => true, 'mensaje' => 'Encuesta guardada correctamente']);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => "Error al guardar la pregunta"]);
}