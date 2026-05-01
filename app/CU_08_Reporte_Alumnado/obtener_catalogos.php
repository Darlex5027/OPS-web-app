<?php
/*
  Archivo     : obtener_catalogos.php
  Módulo      : CU_08_Reporte_Alumnado
  Autor       : Alejandro Resendiz Reyes
  Fecha       : 15/03/2026		
  Descripción : Este archivo se encarga de 
  				obtener los catálogos necesarios 
				para el reporte de alumnado, 
				específicamente los servicios 
				disponibles y los estados de 
				los alumnos. Se conecta a la 
				base de datos, ejecuta las consultas
				necesarias y devuelve los resultados
				en formato JSON para ser utilizados
				en el frontend del módulo.

*/

require_once '../php/db.php';

try{
	
	$pdo = new PDO($dsn, $user, $pass, $options);


	$catalog_servicio  = $pdo->query("Select Id_servicio, Actividades.Servicio From Actividades WHERE Activo=1");
	$catalog_estado = $pdo -> query("SELECT DISTINCT Estado FROM Actividades_Alumnos");

	$resultado = [
		"servicios" => $catalog_servicio->fetchAll(),
		"estados" => $catalog_estado -> fetchAll()
	];

	echo json_encode($resultado);

} catch (\PDOException $e){
    http_response_code(500);
        echo json_encode(['error' => "Error de conexión: " . $e->getMessage()]);
}
