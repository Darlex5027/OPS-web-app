<?php

require_once '../php/db.php';

try{
	$pdo = new PDO($dsn, $user, $pass, $options);
} catch(Exception $error_pdo) {
	http_response_code(500);
	echo json_encode(['error' => 'Hubo un error conectando al servidor']);
	exit();
}

try{
	$catalogo_encuestas = $pdo -> query("SELECT DISTINCT Encuestas.Id_encuesta, Encuestas.Nombre From Encuestas");
	$catalogo_encuestas = $catalogo_encuestas -> fetchAll();

	if(empty($catalogo_encuestas)){
		echo json_encode(['error' => 'No hay encuestas disponibles.']);
	}else{
		echo json_encode($catalogo_encuestas);
	}
}catch(Exception $error_consulta){
	echo json_encode(['error' => $error_consulta]);
}
