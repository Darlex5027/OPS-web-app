<?php
require_once '../php/db.php';

try {
	$pdo = new PDO($dsn, $user, $pass, $options);
} catch (Exception $error_pdo) {
	http_response_code(500);
	echo json_encode(['error' => 'Hubo un error conectando al servidor']);
	exit();
}

try {
	$valores = json_decode(file_get_contents("php://input"), true);
	$id_encuesta   = $valores['Id_encuesta'];
	$id_carrera    = $_COOKIE["Id_carrera"];
	$periodo_tipo  = $valores['Periodo_tipo'];
	$periodo_anio  = $valores['Periodo_año'];  // Renombrada para evitar tilde
} catch (Exception $error_json) {
	http_response_code(500);
	echo json_encode(['error' => 'Hubo un error al leer los filtros']);
	exit();
}

try {

	$query ="SELECT
		ROUND(AVG(Respuestas.Respuesta + 0), 2)*20 AS Promedio_general
		FROM Preguntas
		JOIN Respuestas
		ON Preguntas.Id_pregunta = Respuestas.Id_pregunta
		JOIN Alumnos
		ON Respuestas.Id_alumno = Alumnos.Id_alumno
		JOIN Actividades_Alumnos
		ON  Alumnos.Id_alumno      = Actividades_Alumnos.Id_alumno
		AND Respuestas.Id_servicio = Actividades_Alumnos.Id_servicio
		WHERE Preguntas.Id_encuesta            = ?
		AND Preguntas.Tipo_respuesta        IN ('ESCALA_1_5', 'ESCALA_1_10')
		AND Alumnos.Id_carrera               = ?
		AND Actividades_Alumnos.periodo_tipo = ?
		AND Actividades_Alumnos.periodo_año  = ?";
	$stmt = $pdo->prepare($query);
	$stmt->execute([$id_encuesta, $id_carrera, $periodo_tipo, $periodo_anio]);

	$promedio_encuesta = $stmt->fetchColumn();
	if (empty($promedio_encuesta)) {                       
		http_response_code(404);
		echo json_encode(['error' => 'No hay resultados para el promedio.']);
	} else {
		echo json_encode($promedio_encuesta);
	}
} catch (Exception $error_consulta) {
	http_response_code(500);
	echo json_encode(['error' => $error_consulta->getMessage()]);
}
