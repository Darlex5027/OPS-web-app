<?php

/*
  Archivo     : encuestas_lista.php
  Módulo      : CU_12_CrearFormularios
  Autor       : Daniela Hernandez Hernandez
  Fecha       : 05/05/2026
  Descripción : Consulta y retorna todas las encuestas con sus periodos y servicio asociado,
                agrupando los periodos por encuesta.
*/
require_once '../php/db.php';

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    $stmt = $pdo->prepare("SELECT 
    Periodo_Encuesta.Periodo_tipo,
    Periodo_Encuesta.Periodo_año,
    Encuestas.Id_encuesta, 
    Encuestas.Nombre, 
    Encuestas.Activo, 
    Encuestas.Descripcion, 
    Encuestas.Fecha_fin, 
    Actividades.Servicio
    FROM Encuestas 
    LEFT JOIN Actividades 
    ON Encuestas.Id_servicio = Actividades.Id_servicio 
    LEFT JOIN Periodo_Encuesta 
    ON Encuestas.Id_encuesta = Periodo_Encuesta.Id_encuesta 
    ORDER BY Periodo_año ASC
    ");
    $stmt->execute();
    $encuestas = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $fila) {
        $id_encuesta = $fila['Id_encuesta'];
        if (!isset($encuestas[$id_encuesta])) {
            $encuestas[$id_encuesta] = [
                'Id_encuesta' => $fila['Id_encuesta'],
                'Nombre' => $fila['Nombre'],
                'Activo' => $fila['Activo'],
                'Descripcion' => $fila['Descripcion'],
                'Fecha_fin' => $fila['Fecha_fin'],
                'Servicio' => $fila['Servicio'],
                'periodos' => []
            ];
        }
        $encuestas[$id_encuesta]['periodos'][] = [
            'Periodo_tipo' => $fila['Periodo_tipo'],
            'Periodo_año' => $fila['Periodo_año']
        ];
    }
    echo json_encode(['success' => true, 'data' => array_values($encuestas)]);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => "Error al mostrar las encuestas"]);
}