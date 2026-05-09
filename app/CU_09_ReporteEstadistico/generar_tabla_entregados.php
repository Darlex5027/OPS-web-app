<?php
/*
  Archivo     : generar_tabla.php
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


try {
	$query = "SELECT Encuestas.Id_servicio FROM Encuestas WHERE Encuestas.Id_Encuesta=?";
	$stmt = $pdo->prepare($query);

	// Se ejecuta la consulta SQL utilizando los filtros seleccionados como parámetros
	$stmt->execute([$id_encuesta]);

	// Se obtiene el resultado de la consulta en formato de arreglo asociativo
	$id_servicio_encuesta = $stmt->fetchColumn();


}catch (Exception $error_json){
	http_response_code(500);
	echo json_encode(['error' => 'Hubo un error obteniendo datos sobre la encuesta']);
	exit();
}

// Se intenta ejecutar la consulta para obtener los resultados agrupados por pregunta según los filtros seleccionados.
try {
	// Se define la consulta SQL para obtener los resultados agrupados por pregunta según los filtros seleccionados
	$query = "
	-- Consulta SQL para obtener los resultados agrupados por pregunta según los filtros seleccionados
	-- DISTINCT se utiliza para evitar resultados duplicados ya que el alumno debe entregar varias respuestas.
SELECT DISTINCT
U.Matricula as Matricula,
CONCAT(
AL.Nombre,
' ',
AL.Apellido_P,
' ',
AL.Apellido_M
) AS 'Nombre del Alumno',
E.Nombre AS 'Nombre encuesta',
CONCAT(
PE.Periodo_tipo,
' ',
PE.Periodo_año
) AS 'Periodo',
A.Servicio AS 'Servicio'
FROM
Encuestas E
JOIN Periodo_Encuesta PE ON
E.Id_encuesta = PE.Id_encuesta
JOIN Actividades_Alumnos AA ON
AA.periodo_tipo = PE.Periodo_tipo AND AA.periodo_año = PE.Periodo_año AND AA.Id_servicio = E.Id_servicio
JOIN Actividades A ON
A.Id_servicio = AA.Id_servicio
JOIN Alumnos AL ON
AL.Id_alumno = AA.Id_alumno
JOIN Usuarios U ON
U.Id_usuario = AL.Id_usuario
-- Se utiliza LEFT JOIN para incluir a los alumnos que no han entregado la encuesta
LEFT JOIN Respuestas R ON
R.Id_encuesta = E.Id_encuesta AND R.Id_alumno = AL.Id_alumno
WHERE
R.Id_encuesta IS NOT NULL AND E.Id_encuesta = ? AND AL.Id_carrera = ? AND AA.Id_servicio = ? AND PE.Periodo_tipo = ? AND PE.Periodo_año = ?";

	// Se prepara y ejecuta la consulta SQL utilizando los filtros seleccionados como parámetros
	$stmt = $pdo->prepare($query);

	// Se ejecuta la consulta SQL utilizando los filtros seleccionados como parámetros
	$stmt->execute([$id_encuesta, $id_carrera, $id_servicio_encuesta, $periodo_tipo, $periodo_anio]);

	// Se obtiene el resultado de la consulta en formato de arreglo asociativo
	$tabla_resultado = $stmt->fetchAll(PDO::FETCH_ASSOC);

	if (empty($tabla_resultado)) {                       
		// Si no se obtienen resultados para la consulta, se devuelve un mensaje de error indicando que no hay resultados disponibles
		http_response_code(404);
		echo json_encode(['error' => 'No hay resultados disponibles.']);
	} else {
		// Si se obtienen resultados para la consulta, se devuelve el resultado en formato JSON
		echo json_encode($tabla_resultado);
	}

} catch (Exception $error_consulta) {
	// Si ocurre un error al ejecutar la consulta, se devuelve un mensaje de error con el detalle del error
	http_response_code(500);
	echo json_encode(['error' => $error_consulta->getMessage()]);
}
