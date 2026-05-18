<?php
/*
  Archivo     : generar_tabla_resumen.php
  Módulo      : CU_09_ReporteEstadistico
  Autor       : Alejandro Resendiz Reyes
  Fecha       : 23/04/2026		
  Descripción : Este archivo se encarga de generar la tabla de resultados para el reporte estadístico.
				Se conecta a la base de datos utilizando PDO, recibe los parámetros de filtrado
				en formato JSON, ejecuta una consulta para obtener los resultados agrupados por pregunta,
				y devuelve los resultados en formato JSON. Si ocurre algún error durante la conexión,
				el procesamiento de los datos o la consulta, se devuelve un mensaje de error adecuado.

*/
require_once '../php/db.php';


// Se intenta establecer una conexión a la base de datos utilizando PDO. Si ocurre un error, 
// se devuelve un mensaje de error y se detiene la ejecución.
try {
	$pdo = new PDO($dsn, $user, $pass, $options);
} catch (Exception $error_pdo) {
	http_response_code(500);
	echo json_encode(['error' => 'Hubo un error creando el PDO']);
	exit();
}

// Se intenta decodificar los datos recibidos en formato JSON para obtener
// los filtros seleccionados. Si ocurre un error, 
// se devuelve un mensaje de error y se detiene la ejecución.
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
	echo json_encode(['error' => 'Hubo un error pasando los datos de filtrado.']);
	exit();
}


// Se intenta ejecutar la consulta para obtener los resultados agrupados por pregunta según los filtros seleccionados.
try {
	// Se define la consulta SQL para obtener los resultados agrupados por pregunta según los filtros seleccionados
	$query = "SELECT
	    Preguntas.Seccion,
	    Preguntas.Pregunta,
	    SUM(Respuestas.Respuesta = '1') AS Deficiente, 
	    SUM(Respuestas.Respuesta = '2') AS Suficiente,
	    SUM(Respuestas.Respuesta = '3') AS Bien,
	    SUM(Respuestas.Respuesta = '4') AS 'Muy bien',
	    SUM(Respuestas.Respuesta = '5') AS Excelente
	-- Se realiza uniones entre las tablas Preguntas, Respuestas, Alumnos y Actividades_Alumnos
	FROM Preguntas
	JOIN Respuestas
	-- Se unen las tablas Preguntas y Respuestas utilizando el campo Id_pregunta como clave de unión
		ON Preguntas.Id_pregunta = Respuestas.Id_pregunta
	JOIN Alumnos
	-- Se unen las tablas Respuestas y Alumnos utilizando el campo Id_alumno como clave de unión
	    ON Respuestas.Id_alumno = Alumnos.Id_alumno
	JOIN Actividades_Alumnos
	-- Se unen las tablas Alumnos y Actividades_Alumnos utilizando los campos Id_alumno e Id_servicio como claves de unión
	    ON  Alumnos.Id_alumno   = Actividades_Alumnos.Id_alumno
	-- Se unen las tablas Respuestas y Actividades_Alumnos utilizando el campo Id_servicio como clave de unión
	    AND Respuestas.Id_servicio = Actividades_Alumnos.Id_servicio
	-- Se aplican los filtros seleccionados
	-- Se filtran los resultados por el ID de la encuesta
	WHERE Preguntas.Id_encuesta = ?
	-- Se filtran los resultados por el tipo de respuesta, considerando solo las respuestas que corresponden a escalas de 1 a 5 o de 1 a 10
	  AND Preguntas.Tipo_respuesta IN ('ESCALA_1_5', 'ESCALA_1_10')
	-- Se filtran los resultados por el ID de la carrera, considerando solo las respuestas de los alumnos que pertenecen a la carrera seleccionada
	  AND Alumnos.Id_carrera = ?
	-- Se filtran los resultados por el tipo de periodo, considerando solo las respuestas de los alumnos que participaron en el periodo seleccionado
	  AND Actividades_Alumnos.periodo_tipo = ?
	  AND Actividades_Alumnos.periodo_año = ?
	-- Se agrupan los resultados por el ID de la pregunta y el texto de la pregunta para obtener un conteo de respuestas por cada pregunta
	GROUP BY Preguntas.Id_pregunta, Preguntas.Pregunta
	ORDER BY Preguntas.Orden ASC
    ";
	
	// Se prepara y ejecuta la consulta SQL utilizando los filtros seleccionados como parámetros
	$stmt = $pdo->prepare($query);
	
	// Se ejecuta la consulta SQL utilizando los filtros seleccionados como parámetros
	$stmt->execute([$id_encuesta, $id_carrera, $periodo_tipo, $periodo_anio]);

	// Se obtiene el resultado de la consulta en formato de arreglo asociativo
	$tabla_resultado = $stmt->fetchAll(PDO::FETCH_ASSOC);

	if (empty($tabla_resultado)) {                       
// Si no se obtienen resultados para la consulta, se devuelve un mensaje de error indicando que no hay resultados disponibles
		http_response_code(404);
		echo json_encode(['error' => 'No hay resultados disponibles para los filtros seleccionados.']);
	} else {
		// Si se obtienen resultados para la consulta, se devuelve el resultado en formato JSON
		echo json_encode($tabla_resultado);
	}

} catch (Exception $error_consulta) {
	// Si ocurre un error al ejecutar la consulta, se devuelve un mensaje de error con el detalle del error
	http_response_code(500);
	echo json_encode(['error' => $error_consulta->getMessage()]);
}
