<?php
/*
  Archivo     : generar_promedio.php
  Módulo      : CU_09_ReporteEstadistico
  Autor       : Alejandro Resendiz Reyes
  Fecha       : 29/04/2026		
  Descripción : Este archivo se encarga de generar el promedio de resultados para el reporte estadístico.
				Se conecta a la base de datos utilizando PDO, recibe los parámetros de filtrado
				en formato JSON, ejecuta una consulta para obtener los resultados agrupados por pregunta,
				y devuelve los resultados en formato JSON. Si ocurre algún error durante la conexión,
				el procesamiento de los datos o la consulta, se devuelve un mensaje de error adecuado.

*/
require_once '../php/db.php';


// Se intenta establecer una conexión a la base de datos utilizando PDO. Si ocurre un error,
try {
	$pdo = new PDO($dsn, $user, $pass, $options);
} catch (Exception $error_pdo) {
	// Si ocurre un error al conectar a la base de datos, se devuelve un mensaje de error y se detiene la ejecución
	http_response_code(500);
	echo json_encode(['error' => 'Hubo un error conectando al servidor']);
	exit();
}


// Se intenta decodificar los datos recibidos en formato JSON para obtener los filtros seleccionados. Si ocurre un error,
try {
	// Se decodifican los datos recibidos en formato JSON para obtener los filtros seleccionados
	$valores = json_decode(file_get_contents("php://input"), true);
	// Se asignan los valores de los filtros a variables para su uso posterior
	$id_encuesta   = $valores['Id_encuesta'];
	$id_carrera    = $_COOKIE["Id_carrera"];
	$periodo_tipo  = $valores['Periodo_tipo'];
	$periodo_anio  = $valores['Periodo_anio'];  // Renombrada para evitar tilde
} catch (Exception $error_json) {
	// Si ocurre un error al decodificar los datos JSON, se devuelve un mensaje de error y se detiene la ejecución
	http_response_code(500);
	echo json_encode(['error' => 'Hubo un error al leer los filtros']);
	exit();
}


// Se intenta ejecutar la consulta para obtener el promedio general según los filtros seleccionados.
try {
	// Se define la consulta SQL para obtener el promedio general según los filtros seleccionados
	$query ="SELECT
	-- Consulta SQL para obtener el promedio general según los filtros seleccionados
	-- Se multiplica el promedio por 20 para convertirlo de una escaala 0-5 que es la manejada por las encuestas
	-- a una escala de 0 a 100
		ROUND(AVG(Respuestas.Respuesta + 0), 2)*20 AS Promedio_general
	-- Se realiza uniones entre las tablas Preguntas, Respuestas, Alumnos y Actividades_Alumnos	
		FROM Preguntas
		JOIN Respuestas
		-- Se unen las tablas Preguntas y Respuestas utilizando el campo Id_pregunta como clave de unión
			ON Preguntas.Id_pregunta = Respuestas.Id_pregunta
		-- Se unen las tablas Respuestas y Alumnos utilizando el campo Id_alumno como clave de unión
		JOIN Alumnos
		ON Respuestas.Id_alumno = Alumnos.Id_alumno
		-- Se unen las tablas Alumnos y Actividades_Alumnos utilizando los campos Id_alumno e Id_servicio como claves de unión
		JOIN Actividades_Alumnos
		ON  Alumnos.Id_alumno      = Actividades_Alumnos.Id_alumno
		AND Respuestas.Id_servicio = Actividades_Alumnos.Id_servicio
		-- Se filtran los resultados por el ID de la encuesta, el ID de la carrera, el tipo de periodo y el anio del periodo
		WHERE Preguntas.Id_encuesta            = ?
		AND Preguntas.Tipo_respuesta        IN ('ESCALA_1_5')
		AND Alumnos.Id_carrera               = ?
		AND Actividades_Alumnos.periodo_tipo = ?
		AND Actividades_Alumnos.periodo_año  = ?";
	// Se prepara la consulta utilizando los filtros seleccionados
	$stmt = $pdo->prepare($query);
	// Se ejecuta la consulta con los parámetros de filtrado
	$stmt->execute([$id_encuesta, $id_carrera, $periodo_tipo, $periodo_anio]);

	// Se obtiene el resultado del promedio general
	$promedio_encuesta = $stmt->fetchColumn();

	if (empty($promedio_encuesta)) {               
		// Si no se obtiene un resultado para el promedio, se devuelve un mensaje de error indicando que no hay resultados disponibles        
		http_response_code(404);
		echo json_encode(['error' => 'No hay resultados para el promedio.']);
	} else {
		// Si se obtiene un resultado para el promedio, se devuelve el resultado en formato JSON
		echo json_encode($promedio_encuesta);
	}
} catch (Exception $error_consulta) {
	// Si ocurre un error al ejecutar la consulta, se devuelve un mensaje de error con el detalle del error
	http_response_code(500);
	echo json_encode(['error' => $error_consulta->getMessage()]);
}
