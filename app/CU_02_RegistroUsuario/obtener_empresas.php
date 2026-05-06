<?php
/**
 * Archivo      : obtener_empresas.php
 * Módulo       : CU_02_RegistroUsuario
 * Autor        : Francisco Angel Membrilla Alarcon
 * Fecha        : 21/04/2026
 * Descripción  : Endpoint que procesa la obtención de empresas. Valida los datos
 * y los almacena en la base de datos MariaDB.
 * de usuario y retorna la información en formato JSON.
 */

require_once("../php/db.php"); 
header("Content-Type: application/json");

try {
    // Aseguramos la conexión (usando las variables de db.php)
    if (!isset($pdo)) {
        $pdo = new PDO($dsn, $user, $pass, $options);
    }

    // Consulta corregida: Se usa 'Nombre' en lugar de 'Nombre_comercial'
    $stmt = $pdo->prepare("
        SELECT Id_empresa, Nombre
        FROM Empresas
        WHERE Activo = 1
        ORDER BY Nombre
    ");
    
    $stmt->execute();
    $empresas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Respuesta en formato JSON
    echo json_encode(["empresas" => $empresas]);

} catch(Exception $e) {
    http_response_code(500);
    echo json_encode([
        "error" => "Error al cargar empresas",
        "detalle" => $e->getMessage()
    ]);
}