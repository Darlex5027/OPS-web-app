<?php

require_once '../php/db.php';

try{
	$pdo = new PDO($dsn, $user, $pass, $options);
} catch(Exception $error_pdo) {
	http_response_code(500);
	echo json_encode(['error' => 'Hubo un error conectando a la base de datos']);
	exit();
}

try{
	$catalogo_periodo_tipo = $pdo -> query("SELECT DISTINCT Periodo_Encuesta.Periodo_tipo FROM Periodo_Encuesta");
	$catalogo_periodo_ano = $pdo -> query("SELECT DISTINCT Actividades_Alumnos.Periodo_año FROM Actividades_Alumnos ORDER BY Actividades_Alumnos.periodo_año ASC");

	if(empty($catalogo_periodo_tipo)||empty($catalogo_periodo_tipo)){
		echo json_encode(['error' => 'No se cargaron periodos.']);
	}else{
		$periodos=[
			"tipo" =>  $catalogo_periodo_tipo -> fetchAll(),
			"año" => $catalogo_periodo_ano -> fetchAll()
		];
		echo json_encode($periodos);
	}
}catch(Exception $error_consulta){
	echo json_encode(['error' => $error_consulta]);
}
