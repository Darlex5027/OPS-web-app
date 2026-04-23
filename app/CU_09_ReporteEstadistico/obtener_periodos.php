<?php

require_once '../php/db.php';

try{
	$pdo = new PDO($dsn, $user, $pass, $options);
} catch(Exception $error_pdo) {
	http_response_code(500);
	echo json_encode(['error' => 'Hubo un error creando el $PDO']);
	exit();
}

try{
	$catalogo_periodo_tipo = $pdo -> query("SELECT DISTINCT Periodo_Encuesta.Periodo_tipo FROM Periodo_Encuesta");
	$catalogo_periodo_ano = $pdo -> query("SELECT DISTINCT Periodo_Encuesta.Periodo_año FROM Periodo_Encuesta");

	if(empty($catalogo_periodo_tipo)||empty($catalogo_periodo_tipo)){
		echo json_encode(['error' => 'No hay encuestas disponibles.']);
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
