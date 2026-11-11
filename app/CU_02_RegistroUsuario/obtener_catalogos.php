<?php
/**
 * Archivo       : obtener_catalogos.php
 * Módulo        : CU_02_RegistroUsuario
 * Autor         : Francisco Angel Membrila Alarcón
 * Fecha         : 21/04/2026
 */
require_once("../php/db.php");
header("Content-Type: application/json");

try {
    // Al incluir db.php, las variables $dsn, $user, $pass y $options ya existen.
    // Creamos la conexión aquí mismo.
    $pdo = new PDO($dsn, $user, $pass, $options);

    // 1. Obtener Facultades activas
    $stmt = $pdo->prepare("
        SELECT Id_facultad, Nombre 
        FROM Facultades 
        WHERE Activo = 1 
        ORDER BY Nombre
    ");
    $stmt->execute();
    $facultades = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. Obtener Carreras
    // IMPORTANTE: Verifica que en tu DB la columna sea 'Id_facultad' y no 'Id_Facultad'
    $stmt = $pdo->prepare("
        SELECT Id_carrera, Nombre, Id_facultad 
        FROM Carreras 
        ORDER BY Nombre
    ");
    $stmt->execute();
    $carreras = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "facultades" => $facultades,
        "carreras" => $carreras
    ]);

} catch (PDOException $e) {
    // Error específico de base de datos (conexión, tablas inexistentes, etc.)
    http_response_code(500);
    echo json_encode([
        "error" => "Error de base de datos",
        "detalle" => $e->getMessage()
    ]);
} catch (Exception $e) {
    // Cualquier otro error
    http_response_code(500);
    echo json_encode([
        "error" => "Error general en el servidor",
        "detalle" => $e->getMessage()
    ]);
}