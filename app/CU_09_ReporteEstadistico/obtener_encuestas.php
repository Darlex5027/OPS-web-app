<?php
/*
  Archivo     : obtener_encuestas.php
  Módulo      : CU_09_ReporteEstadistico
  Autor       : Alejandro Resendiz Reyes
  Fecha       : 23/04/2026		
  Descripción : Este archivo se encarga de obtener el catálogo
  				de encuestas disponibles en la base de datos.
				Se conecta a la base de datos utilizando PDO,
				ejecuta una consulta para obtener los nombres e 
				IDs de las encuestas, y devuelve los resultados
				en formato JSON. Si ocurre algún error durante
				la conexión o la consulta, se devuelve un mensaje
				de error adecuado.

*/
require_once '../php/db.php';

// Se intenta establecer una conexión a la base de datos utilizando PDO. Si ocurre un error, se devuelve un mensaje de error y se detiene la ejecución.
try{
	// Se establece la conexión a la base de datos utilizando PDO
	$pdo = new PDO($dsn, $user, $pass, $options);
} catch(Exception $error_pdo) {
	// Si ocurre un error al conectar a la base de datos, se devuelve un mensaje de error y se detiene la ejecución
	http_response_code(500);
	echo json_encode(['error' => 'Hubo un error conectando al servidor']);
	exit();
}


// Se intenta ejecutar la consulta para obtener los nombres e IDs de las encuestas disponibles en la base de datos. Si ocurre un error, se devuelve un mensaje de error.
try{
	// Se define la consulta SQL para obtener los nombres e IDs de las encuestas disponibles en la base de datos
	$stmt = $pdo -> query("SELECT DISTINCT Encuestas.Id_encuesta, Encuestas.Nombre From Encuestas");
	// Se obtiene el resultado de la consulta y se almacena en una variable
	$catalogo_encuestas = $stmt -> fetchAll();

	// Se verifica si el resultado de la consulta está vacío. Si es así, se devuelve un mensaje de error indicando que no hay encuestas disponibles. De lo contrario, se devuelve el catálogo de encuestas en formato JSON.
	if(empty($catalogo_encuestas)){
		// Si no se obtienen resultados para las encuestas, se devuelve un mensaje de error indicando que no hay encuestas disponibles
		echo json_encode(['error' => 'No hay encuestas disponibles.']);
	}else{
		// Si se obtienen resultados para las encuestas, se devuelve el catálogo de encuestas en formato JSON
		echo json_encode($catalogo_encuestas);
	}
}catch(Exception $error_consulta){
	// Si ocurre un error al ejecutar la consulta, se devuelve un mensaje de error con el detalle del error
	echo json_encode(['error' => $error_consulta]);
}
