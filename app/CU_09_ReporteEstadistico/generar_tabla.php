<?php
require_once '../php/db.php';

try {
	$pdo = new PDO($dsn, $user, $pass, $options);
} catch (Exception $error_pdo) {
	http_response_code(500);
	echo json_encode(['error' => 'Hubo un error creando el PDO']);
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
	echo json_encode(['error' => 'Hubo un error pasando los datos de filtrado.']);
	exit();
}

try {
	$query = "
	SELECT
	    Preguntas.Seccion,
	    Preguntas.Pregunta,
	    SUM(Respuestas.Respuesta = '1') AS Deficiente, 
	    SUM(Respuestas.Respuesta = '2') AS Suficiente,
	    SUM(Respuestas.Respuesta = '3') AS Bien,
	    SUM(Respuestas.Respuesta = '4') AS 'Muy bien',
	    SUM(Respuestas.Respuesta = '5') AS Excelente
	FROM Preguntas
	JOIN Respuestas
	    ON Preguntas.Id_pregunta = Respuestas.Id_pregunta
	JOIN Alumnos
	    ON Respuestas.Id_alumno = Alumnos.Id_alumno
	JOIN Actividades_Alumnos
	    ON  Alumnos.Id_alumno   = Actividades_Alumnos.Id_alumno
	    AND Respuestas.Id_servicio = Actividades_Alumnos.Id_servicio
	WHERE Preguntas.Id_encuesta = ?
	  AND Preguntas.Tipo_respuesta IN ('ESCALA_1_5', 'ESCALA_1_10')
	  AND Alumnos.Id_carrera = ?
	  AND Actividades_Alumnos.periodo_tipo = ?
	  AND Actividades_Alumnos.periodo_año = ?
	GROUP BY Preguntas.Id_pregunta, Preguntas.Pregunta
	ORDER BY Preguntas.Orden ASC
    ";
	$stmt = $pdo->prepare($query);
	$stmt->execute([$id_encuesta, $id_carrera, $periodo_tipo, $periodo_anio]);

	$tabla_resultado = $stmt->fetchAll(PDO::FETCH_ASSOC);
	if (empty($tabla_resultado)) {                       
		http_response_code(404);
		echo json_encode(['error' => 'No hay resultados para disponibles.']);
	} else {
		echo json_encode($tabla_resultado);
	}

} catch (Exception $error_consulta) {
	http_response_code(500);
	echo json_encode(['error' => $error_consulta->getMessage()]);
}
