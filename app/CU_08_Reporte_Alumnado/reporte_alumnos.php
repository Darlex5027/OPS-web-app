<?php
require_once '../php/db.php';

try {

	$pdo = new PDO($dsn, $user, $pass, $options);


	$valores = json_decode(file_get_contents("php://input"), true);
	$actividad = $valores['actividad'];
	$estado = $valores['estado'];
	$periodo_tipo = $valores['periodo_tipo'];
	$periodo_anio = $valores['periodo_anio'];


	$query = "SELECT 
		Actividades.Servicio,
		CONCAT(Alumnos.Nombre,' ', Alumnos.Apellido_P, ' ', Alumnos.Apellido_M ) AS Nombre,
		Carreras.Nombre as 'Nombre Carrera',
		Empresas.Nombre as Empresa,
		Actividades_Alumnos.Area,
		Actividades_Alumnos.Programa,
		Actividades_Alumnos.Estado,
		Actividades_Alumnos.periodo_tipo,
		Actividades_Alumnos.periodo_año,
		Actividades_Alumnos.Fecha_inicio,
		Actividades_Alumnos.Fecha_fin 
		FROM Alumnos 
		JOIN Carreras ON Alumnos.Id_Carrera=Carreras.Id_carrera 
		JOIN Administradores ON Administradores.Id_Carrera=Carreras.Id_carrera 
		JOIN Actividades_Alumnos on Actividades_Alumnos.Id_alumno=Alumnos.Id_alumno 
		LEFT JOIN Empresas ON Actividades_Alumnos.Id_empresa=Empresas.Id_empresa 
		JOIN Actividades ON Actividades_Alumnos.Id_servicio=Actividades.Id_servicio 
		WHERE Administradores.Id_usuario=:Id_usuario
		AND Alumnos.Activo=1";

	$params = ['Id_usuario' => $_COOKIE['Id_usuario']];

	// Filtrar por estado (usando 'TODOS' en lugar de '5486')
	if ($estado !== null && $estado !== 'TODOS') {
		$query .= " AND Actividades_Alumnos.Estado = :estado";
		$params['estado'] = $estado;
	}

	// Filtrar por actividad
	if ($actividad !== null && $actividad !== 'TODOS') {
		$query .= " AND Actividades.Id_servicio = :actividad";
		$params['actividad'] = $actividad;
	}
	// Filtrar por tipo de periodo
	if ($periodo_tipo !== null && $periodo_tipo !== 'TODOS') {
		$query .= " AND Actividades_Alumnos.periodo_tipo = :periodo_tipo";
		$params['periodo_tipo'] = $periodo_tipo;
	}
	// Filtrar por año de periodo
	if ($periodo_anio !== null && $periodo_anio !== 'TODOS') {
		$query .= " AND Actividades_Alumnos.periodo_año = :periodo_anio";
		$params['periodo_anio'] = $periodo_anio;
	}

	$consulta = $pdo->prepare($query);
	$consulta->execute($params);
	echo json_encode($consulta->fetchAll());

} catch (\PDOException $e) {
	http_response_code(500);
	echo json_encode(['error' => "Error de conexión: " . $e->getMessage()]);
}
