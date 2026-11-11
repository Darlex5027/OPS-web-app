<?php
/**
 * Archivo     : obtener_encuestas_alumno.php
 * Módulo      : CU_05_ResponderEncuestas
 * Descripción : Obtiene encuestas pendientes para ALUMNO (Contestador=0)
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
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    /// Consulta SQL corregida: Amarre estricto de servicio y periodo simultáneamente
    $sql = "SELECT 
                e.Id_encuesta AS Id_encuesta, 
                e.Nombre AS Nombre, 
                e.Descripcion AS Descripcion,
                e.Id_servicio AS Id_servicio,
                s.Servicio AS NombreServicio
            FROM Encuestas e
            INNER JOIN Actividades s ON e.Id_servicio = s.Id_servicio
            INNER JOIN Periodo_Encuesta pe ON e.Id_encuesta = pe.Id_encuesta
            INNER JOIN Actividades_Alumnos aa ON aa.Id_alumno = :id_alumno 
                                              AND aa.Id_servicio = e.Id_servicio
                                              AND aa.periodo_tipo = pe.Periodo_tipo
                                              AND aa.periodo_año = pe.Periodo_año
            WHERE e.Contestador = 0 
              AND e.Activo = 1
              AND aa.Estado IN ('EN_CURSO', 'COMPLETADO')
              AND NOT EXISTS (
                  SELECT 1 
                  FROM Respuestas r 
                  WHERE r.Id_encuesta = e.Id_encuesta 
                    AND r.Id_alumno = :id_alumno_repetido
              )
            ORDER BY e.Id_encuesta ASC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'id_alumno' => $id_alumno,
        'id_alumno_repetido' => $id_alumno
    ]);
    
    $lista_pendientes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        "success" => true,
        "pendientes" => $lista_pendientes,
        "total" => count($lista_pendientes)
    ], JSON_UNESCAPED_UNICODE);
    
} catch (PDOException $e) {
    echo json_encode([
        "success" => false,
        "pendientes" => [],
        "total" => 0,
        "message" => "Error en la base de datos: " . $e->getMessage()
    ]);
}
?>