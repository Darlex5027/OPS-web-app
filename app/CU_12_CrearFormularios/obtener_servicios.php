<?php
/*
  Archivo     : obtener_servicios.php
  Módulo      : CU_12_CrearFormularios
  Autor       : Daniela Hernandez Hernandez
  Fecha       : 05/05/2026
  Descripción : Consulta y retorna la lista de servicios disponibles desde la tabla Actividades,
                utilizado para poblar los selectores de servicio en los formularios de encuesta.
*/
require_once '../php/db.php';

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    $stmt = $pdo->prepare("SELECT Id_servicio, Servicio FROM Actividades");
    $stmt->execute();
    $actividades = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'data' => $actividades]);
    //echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => "Error al mostrar los servicios"]);
}