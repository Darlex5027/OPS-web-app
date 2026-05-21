<?php
/*
  Archivo     : obtener_periodos.php
  Módulo      : CU_09_ReporteEstadistico
  Autor       : Alejandro Resendiz Reyes
  Fecha       : 23/04/2026		
  Descripción : Este archivo se encarga de obtener los periodos disponibles en la base de datos.
				Se conecta a la base de datos utilizando PDO, ejecuta consultas para obtener
				los tipos de periodo y los años disponibles, y devuelve los resultados en formato JSON.
				Si ocurre algún error durante la conexión o las consultas, se devuelve un mensaje de error adecuado.

*/
require_once '../php/db.php';


// Se intenta establecer una conexión a la base de datos utilizando PDO. Si ocurre un error, se devuelve un mensaje de error y se detiene la ejecución.
try{
	// Se establece la conexión a la base de datos utilizando PDO
	$pdo = new PDO($dsn, $user, $pass, $options);
} catch(Exception $error_pdo) {
	// Si ocurre un error al conectar a la base de datos, se devuelve un mensaje de error y se detiene la ejecución
	http_response_code(500);
	echo json_encode(['error' => 'Hubo un error conectando a la base de datos']);
	exit();
}

try{
	// Se definen las consultas SQL para obtener los tipos de periodo y los anios disponibles en la base de datos
	$stmt_periodo_tipo = $pdo -> query("SELECT DISTINCT Periodo_Encuesta.Periodo_tipo FROM Periodo_Encuesta");
	// Se obtiene el resultado de la consulta para los tipos de periodo y se almacena en una variable
	$stmt_periodo_anio = $pdo -> query("SELECT DISTINCT Periodo_Encuesta.Periodo_año as 'Periodo_anio' FROM Periodo_Encuesta");

	$resultado_catalogo_periodos_tipos = $stmt_periodo_tipo -> fetchAll();
	$resultado_catalogo_periodos_anios = $stmt_periodo_anio -> fetchAll();
	// Se verifica si los resultados de las consultas están vacíos.
	if(empty($stmt_periodo_tipo)||empty($stmt_periodo_anio)){
		// Si no se obtienen resultados para los tipos de periodo o los anios, 
		// se devuelve un mensaje de error indicando que no se cargaron periodos
		echo json_encode(['error' => 'No se encontraron períodos disponibles en la base de datos.']);
	}else{
		// Si se obtienen resultados para los tipos de periodo y los anios,
		// se almacenan en un arreglo asociativo y se devuelve el resultado en formato JSON
		$periodos=[
			// Se obtienen los resultados para los tipos de periodo y se almacenan en el arreglo asociativo bajo la clave "tipo"
			"tipo" =>  $resultado_catalogo_periodos_tipos,
			// Se obtienen los resultados para los anios y se almacenan en el arreglo asociativo bajo la clave "anio"
			"anio" => $resultado_catalogo_periodos_anios
		];
		// Se devuelve el arreglo asociativo con los tipos de periodo y los anios en formato JSON
		echo json_encode($periodos);
	}
}catch(Exception $error_consulta){
	// Si ocurre un error al ejecutar las consultas, se devuelve un mensaje de error con el detalle del errors
	echo json_encode(['error' => $error_consulta]);
}
