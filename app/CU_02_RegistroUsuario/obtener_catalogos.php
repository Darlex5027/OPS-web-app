<?php
/**
 * Archivo      : obtener_catalogos.php
 * Módulo       : CU_02_RegistroUsuario
 * Autor        : Francisco Angel Membrilla Alarcon
 * Fecha        : 21/04/2026
 * Descripción  : Endpoint que procesa la obtención de catálogos. Valida los datos
 * y los almacena en la base de datos MariaDB.
 * de usuario y retorna la información en formato JSON.
 */
require_once("../php/db.php");
header("Content-Type: application/json");

try {

    if (!isset($pdo)) {
        $pdo = new PDO($dsn, $user, $pass, $options);
    }

    // Facultades activas
    $stmt = $pdo->prepare("
        SELECT Id_facultad, Nombre
        FROM Facultades

        ORDER BY Nombre
    ");
    $stmt->execute();
    $facultades = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Carreras activas
    $stmt = $pdo->prepare("
        SELECT Id_carrera, Nombre, Id_Facultad
        FROM Carreras
        WHERE Activo = 1
        ORDER BY Nombre
    ");
    $stmt->execute();
    $carreras = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "facultades" => $facultades,
        "carreras" => $carreras
    ]);

} catch (Exception $e) {

    http_response_code(500);

    echo json_encode([
        "error" => "Error al obtener catalogos",
        "detalle" => $e->getMessage()
    ]);

}