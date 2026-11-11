<?php
/**
 * Archivo       : obtener_empresas.php
 * Módulo        : CU_02_RegistroUsuario
 * Autor         : Francisco Angel Membrila Alarcón
 * Fecha         : 21/04/2026
 * Descripción   : Endpoint que procesa la obtención de empresas. 
 * Retorna la información en formato JSON.
 */

require_once("../php/db.php"); 
header("Content-Type: application/json");

try {
    // Aseguramos la conexión (usando las variables de db.php)
    if (!isset($pdo)) {
        $pdo = new PDO($dsn, $user, $pass, $options);
    }

    $stmtEmpresas = $pdo->prepare("
        SELECT Id_empresa, Nombre
        FROM Empresas
        WHERE Activo = 1
        ORDER BY Nombre
    ");
    
    $stmtEmpresas->execute();
    $resultado_empresas = $stmtEmpresas->fetchAll(PDO::FETCH_ASSOC);
    
    // Respuesta en formato JSON
    echo json_encode([
        "success" => true,
        "empresas" => $resultado_empresas
    ]);

} catch(PDOException $error_carga_empresas) {
    error_log("Error en obtener_empresas.php: " . $error_carga_empresas->getMessage());
    
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Error al cargar las empresas. Por favor, recargue la página."
    ]);
}
?>