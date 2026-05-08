<?php

/**
 * Archivo:     obtener_catalogos.php
 * Autor:      	Alejandro Resendiz 
 * Fecha:       15-03-2026
 * Descripción: Endpoint PHP del modulo CU08 - Reporte de Alumnado.
 *              Retorna en JSON los catalogos necesarios para poblar los filtros
 *              del formulario: servicios activos, estados de actividad,
 *              tipos de periodo y anios de periodo disponibles.
 *              Tablas consultadas: Actividades, Actividades_Alumnos.
 */

require_once '../php/db.php';

try{
	// Se establece la conexión a la base de datos usando PDO
	$pdo = new PDO($dsn, $user, $pass, $options);

	// Se realizan las consultas para obtener los catálogos necesarios para los filtros
	$catalog_servicio  = $pdo->query("Select Id_servicio, Actividades.Servicio From Actividades WHERE Activo=1");
	$catalog_estado = $pdo->query("SELECT DISTINCT Estado FROM Actividades_Alumnos");
	$catalog_periodo_tipo = $pdo->query("SELECT DISTINCT Actividades_Alumnos.periodo_tipo FROM Actividades_Alumnos");
	$catalog_periodo_anio = $pdo->query("SELECT DISTINCT Actividades_Alumnos.periodo_año FROM Actividades_Alumnos");

	// Se construye un arreglo con los resultados de las consultas para enviarlo como JSON al frontend
	$resultado = [
		"servicios" => $catalog_servicio->fetchAll(),
		"estados" => $catalog_estado->fetchAll(),
		"periodo_tipo" => $catalog_periodo_tipo->fetchAll(),
		"periodo_anio" => $catalog_periodo_anio->fetchAll()
	];
	
	// Se envía el resultado como JSON al frontend
	echo json_encode($resultado);

} catch (\PDOException $e){
    http_response_code(500);
        echo json_encode(['error' => "Error de conexión: " . $e->getMessage()]);
}
