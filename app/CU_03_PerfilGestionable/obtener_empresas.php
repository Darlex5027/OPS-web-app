<?php
require_once '../php/db.php';
header('Content-Type: application/json');

$pdo = new PDO($dsn, $user, $pass, $options);

$stmt = $pdo->query("SELECT Id_empresa, Nombre FROM Empresas");

echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));