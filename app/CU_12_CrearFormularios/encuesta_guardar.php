<?php

/*
  Archivo     : encuesta_guardar.php
  Módulo      : CU_12_CrearFormularios
  Autor       : Daniela Hernandez Hernandez
  Fecha       : 05/05/2026
  Descripción : Recibe los datos de una nueva encuesta y los inserta en las tablas
                Encuestas y Periodo_Encuesta de la base de datos.
*/
require_once '../php/db.php';

$datos_encuesta = json_decode(file_get_contents('php://input'), true);
$nombre = $datos_encuesta['nombre'];
$descripcion = $datos_encuesta['descripcion'];
$id_servicio = $datos_encuesta['servicio'];
$activo = $datos_encuesta['activo'];
$contestador = $datos_encuesta['contestador'];
$periodo_tipo = $datos_encuesta['periodo_tipo'];
$periodo_anio = $datos_encuesta['periodo_anio'];
$fecha_fin = $datos_encuesta['fecha_fin'];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    $stmt = $pdo->prepare("INSERT INTO 
    Encuestas (Nombre, Descripcion, Id_servicio, Activo, Contestador,Fecha_fin, Fecha_registro, 
    Fecha_modificacion) 
    VALUES (?,?,?,?,?,?, NOW(), NOW())");
    $stmt->execute([$nombre, $descripcion, $id_servicio, $activo, $contestador, $fecha_fin]);
    $id_encuesta = $pdo->lastInsertId();
    $stmt = $pdo->prepare("INSERT INTO Periodo_Encuesta (Id_encuesta, Periodo_tipo, Periodo_año) 
    VALUES (?,?,?)");
    $stmt->execute([$id_encuesta, $periodo_tipo, $periodo_anio]);
    echo json_encode(['success' => true, 'mensaje' => 'Encuesta guardada correctamente']);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => "Error al guardar la encuesta"]);
}