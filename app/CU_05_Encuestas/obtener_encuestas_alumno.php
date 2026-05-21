<?php
/**
 * Archivo     : obtener_encuestas_alumno.php
 * Módulo      : CU_05_ResponderEncuestas
 * Descripción : Obtiene encuestas pendientes para ALUMNO (Contestador=0)
 * 
 * Según documento: Una encuesta aparece como pendiente si TODAS las condiciones se cumplen:
 * - Encuesta.Contestador = 0
 * - Encuesta.Activo = 1
 * - Id_encuesta existe en Periodo_Encuesta
 * - Período coincide con Actividades_Alumnos (EN_CURSO o COMPLETADO)
 * - Coincidencia de Id_servicio
 * - No existe respuesta previa en Respuestas
 */

require_once("../php/db.php");

header('Content-Type: application/json; charset=utf-8');

$id_alumno = $_GET['alumno'] ?? null;

if (!$id_alumno) {
    echo json_encode([
        "success" => false,
        "pendientes" => [],
        "error" => "ID de alumno no proporcionado"
    ]);
    exit;
}

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    
    $sql = "SELECT DISTINCT 
                e.Id_encuesta, 
                e.Nombre, 
                e.Descripcion,
                e.Id_servicio,
                s.Servicio AS NombreServicio
            FROM Encuesta e
            INNER JOIN Periodo_Encuesta pe ON e.Id_encuesta = pe.Id_encuesta
            INNER JOIN Actividades_Alumnos aa ON pe.Periodo_tipo = aa.Periodo_tipo 
                                              AND pe.Periodo_año = aa.Periodo_año
            INNER JOIN Servicios s ON e.Id_servicio = s.Id_servicio
            WHERE e.Contestador = 0 
              AND e.Activo = 1
              AND aa.Id_alumno = :id_alumno
              AND aa.Estado IN ('EN_CURSO', 'COMPLETADO')
              AND aa.Id_servicio = e.Id_servicio
              AND NOT EXISTS (
                  SELECT 1 
                  FROM Respuestas r 
                  WHERE r.Id_encuesta = e.Id_encuesta 
                    AND r.Id_alumno = :id_alumno_res
              )
            ORDER BY e.Id_encuesta";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'id_alumno' => $id_alumno,
        'id_alumno_res' => $id_alumno
    ]);
    
    $lista_pendientes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        "success" => true,
        "pendientes" => $lista_pendientes,
        "total" => count($lista_pendientes)
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        "success" => false,
        "pendientes" => [],
        "total" => 0,
        "message" => "Error en la base de datos: " . $e->getMessage()
    ]);
}
?>