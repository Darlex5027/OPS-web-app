<?php
/**
 * Archivo     : obtener_encuestas.php
 * Módulo      : CU_05_ResponderEncuestas
 * Descripción : Obtiene encuestas pendientes para un alumno específico, 
 *               filtrando por vigencia y excluyendo las ya respondidas.
 */
header('Content-Type: application/json');
require_once 'conexion.php'; 

$id_alumno = $_GET['alumno'] ?? null;

if (!$id_alumno) {
    echo json_encode(["error" => "ID de alumno no proporcionado"]);
    exit;
}

try {
    // 1. Obtener los Id_encuesta ya respondidos por el alumno
    $sql_respondidas = "SELECT DISTINCT Id_encuesta FROM Respuesta WHERE Id_alumno = :id";
    $stmt_res = $pdo->prepare($sql_respondidas);
    $stmt_res->execute(['id' => $id_alumno]);
    $respondidas = $stmt_res->fetchAll(PDO::FETCH_COLUMN);

    // 2. Construir la consulta de encuestas activas y vigentes
    $query = "SELECT Id_encuesta, Nombre, Descripcion 
              FROM Encuesta 
              WHERE Activo = TRUE 
              AND CURDATE() BETWEEN Fecha_inicio AND Fecha_fin";

    // Filtrar para que no aparezcan las ya respondidas
    if (!empty($respondidas)) {
        // Usamos placeholders para evitar inyección si los IDs no fueran enteros, 
        // aunque siendo internos, implode es rápido.
        $in_clause = implode(',', array_map('intval', $respondidas));
        $query .= " AND Id_encuesta NOT IN ($in_clause)";
    }

    $stmt = $pdo->query($query);
    $lista_pendientes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // REQUERIMIENTO: Retorna JSON {pendientes:[{Id_encuesta, Nombre, Descripcion}]}
    echo json_encode([
        "pendientes" => $lista_pendientes
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error en la base de datos: " . $e->getMessage()]);
}