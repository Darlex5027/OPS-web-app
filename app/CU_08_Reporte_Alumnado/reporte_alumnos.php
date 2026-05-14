<?php

/**
 * Archivo:     reporte_alumnos.php
 * Autor:     	Alejandro Resendiz Reyes
 * Fecha:       15-03-2026
 * Descripción: Endpoint PHP del modulo CU08 - Reporte de Alumnado.
 *              Recibe por POST un objeto JSON con los filtros seleccionados
 *              (actividad, estado, periodo_tipo, periodo_anio) y retorna en JSON
 *              el listado de alumnos con sus actividades, filtrado por la carrera
 *              del administrador autenticado segun la cookie Id_usuario.
 *              Tablas consultadas: Alumnos, Carreras, Administradores,
 *              Actividades_Alumnos, Empresas, Actividades.
 */

require_once '../php/db.php';

try {
	// Se establece la conexión a la base de datos usando PDO
	$pdo = new PDO($dsn, $user, $pass, $options);

} catch (\PDOException $e){
    http_response_code(500);
        echo json_encode(['error' => "Hubo un error conectando a la base de datos"]);
}


try{
	// Se decodifica el JSON recibido en el cuerpo de la solicitud POST para obtener los filtros seleccionados
	$data_filtros = json_decode(file_get_contents("php://input"), true);
	$actividad = $data_filtros['actividad'];
	$estado = $data_filtros['estado'];
	$periodo_tipo = $data_filtros['periodo_tipo'];
	$periodo_anio = $data_filtros['periodo_anio'];

} catch (\PDOException $e){
    http_response_code(500);
        echo json_encode(['error' => "Hubo un error procesando los filtros de búsqueda"]);
}

try{
	// Se construye la consulta SQL para obtener el listado de alumnos con sus actividades, aplicando los filtros seleccionados y limitando por la carrera del administrador autenticado
	$query = "SELECT 
		Actividades.Servicio,
		Alumnos.No_expediente,
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
		JOIN Usuarios ON Alumnos.Id_usuario=Usuarios.Id_usuario 
		JOIN Carreras ON Alumnos.Id_Carrera=Carreras.Id_carrera 
		JOIN Administradores ON Administradores.Id_Carrera=Carreras.Id_carrera 
		JOIN Actividades_Alumnos on Actividades_Alumnos.Id_alumno=Alumnos.Id_alumno 
		LEFT JOIN Empresas ON Actividades_Alumnos.Id_empresa=Empresas.Id_empresa 
		JOIN Actividades ON Actividades_Alumnos.Id_servicio=Actividades.Id_servicio 
		WHERE Administradores.Id_usuario=:Id_usuario
		AND Usuarios.Activo=1";
} catch (\PDOException $e){
    http_response_code(500);
        echo json_encode(['error' => "Hubo un error construyendo la consulta SQL"]);
}

try{
	// Se prepara un arreglo de parámetros para la consulta, iniciando con el Id_usuario obtenido de la cookie de sesión
	$filtros_consulta = ['Id_usuario' => $_COOKIE['Id_usuario']];
} catch (\PDOException $e){
    http_response_code(500);
        echo json_encode(['error' => "Hubo un error obteniendo el Id_usuario de la cookie de sesión"]);
}

try{
	// Filtrar por estado de la actividad
	if ($estado !== null && $estado !== 'TODOS') {
		// Si el filtro de estado no es nulo ni "TODOS", se agrega una condición a la consulta para filtrar por el estado seleccionado
		$query .= " AND Actividades_Alumnos.Estado = :estado";
		$filtros_consulta['estado'] = $estado;
	}
} catch (\PDOException $e){
    http_response_code(500);
        echo json_encode(['error' => "Hubo un error procesando el filtro de estado de la actividad"]);
}

try{
	// Filtrar por actividad
	if ($actividad !== null && $actividad !== 'TODOS') {
		// Si el filtro de actividad no es nulo ni "TODOS", se agrega una condición a la consulta para filtrar por el Id_servicio seleccionado
		$query .= " AND Actividades.Id_servicio = :actividad";
		$filtros_consulta['actividad'] = $actividad;
	}
} catch (\PDOException $e){
	http_response_code(500);
		echo json_encode(['error' => "Hubo un error procesando el filtro de actividad"]);
}

try{
	// Filtrar por tipo de periodo
	if ($periodo_tipo !== null && $periodo_tipo !== 'TODOS') {
		// Si el filtro de tipo de periodo no es nulo ni "TODOS", se agrega una condición a la consulta para filtrar por el tipo de periodo seleccionado
		$query .= " AND Actividades_Alumnos.periodo_tipo = :periodo_tipo";
		$filtros_consulta['periodo_tipo'] = $periodo_tipo;
	}
} catch (\PDOException $e){
    http_response_code(500);
        echo json_encode(['error' => "Hubo un error procesando el filtro de tipo de periodo"]);
}

try{
	// Filtrar por año de periodo
	if ($periodo_anio !== null && $periodo_anio !== 'TODOS') {
		// Si el filtro de año de periodo no es nulo ni "TODOS", se agrega una condición a la consulta para filtrar por el año de periodo seleccionado
		$query .= " AND Actividades_Alumnos.periodo_año = :periodo_anio";
		$filtros_consulta['periodo_anio'] = $periodo_anio;
	}
} catch (\PDOException $e){
    http_response_code(500);
        echo json_encode(['error' => "Hubo un error procesando el filtro de año de periodo"]);
}

try{
	// Se prepara y ejecuta la consulta con los parámetros correspondientes, y se retorna el resultado como JSON al frontend
	$stmt = $pdo->prepare($query);
	$stmt->execute($filtros_consulta);
	echo json_encode($stmt->fetchAll());

} catch (\PDOException $e) {
	http_response_code(500);
	echo json_encode(['error' => "Hubo un error ejecutando la consulta"]);
}
