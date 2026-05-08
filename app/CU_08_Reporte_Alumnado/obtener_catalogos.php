<?php
require_once '../php/db.php';

try{
	
	$pdo = new PDO($dsn, $user, $pass, $options);


	$catalog_servicio  = $pdo->query("Select Id_servicio, Actividades.Servicio From Actividades WHERE Activo=1");
	$catalog_estado = $pdo -> query("SELECT DISTINCT Estado FROM Actividades_Alumnos");
	$catalog_periodo_tipo = $pdo -> query("SELECT DISTINCT Actividades_Alumnos.periodo_tipo FROM Actividades_Alumnos");
	$catalog_periodo_anio = $pdo -> query("SELECT DISTINCT Actividades_Alumnos.periodo_año FROM Actividades_Alumnos");

	$resultado = [
		"servicios" => $catalog_servicio->fetchAll(),
		"estados" => $catalog_estado -> fetchAll(),
		"periodo_tipo" => $catalog_periodo_tipo -> fetchAll(),
		"periodo_anio" => $catalog_periodo_anio -> fetchAll()
	];

	echo json_encode($resultado);

} catch (\PDOException $e){
    http_response_code(500);
        echo json_encode(['error' => "Error de conexión: " . $e->getMessage()]);
}
