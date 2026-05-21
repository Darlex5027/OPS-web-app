<?php
/**
 * Archivo     : obtener_alumnos_pendientes.php
 * Módulo      : CU_05_ResponderEncuestas
 * Descripción : Obtiene alumnos con encuestas pendientes para COORDINADOR/ADMIN (Contestador=1)
 * 
 * Según documento:
 * - Obtener todos los alumnos con Id_carrera = Id_carrera del usuario en sesión
 * - Para cada alumno, calcular encuestas pendientes con Encuesta.Contestador = 1
 * - Mostrar únicamente alumnos con al menos una encuesta pendiente
 */

require_once("../php/db.php");

header('Content-Type: application/json; charset=utf-8');

$id_carrera = $_GET['carrera'] ?? null;

if (!$id_carrera) {
    echo json_encode([
        "success" => false,
        "alumnos" => [],
        "error" => "ID de carrera no proporcionado"
    ]);
    exit;
}

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    
    // Obtener todos los alumnos de la carrera
    $sqlAlumnos = "SELECT Id_alumno, CONCAT(Nombre, ' ', Apellido_Paterno, ' ', Apellido_Materno) AS NombreCompleto 
                   FROM Alumnos 
                   WHERE Id_carrera = :id_carrera";
    
    $stmtAlumnos = $pdo->prepare($sqlAlumnos);
    $stmtAlumnos->execute(['id_carrera' => $id_carrera]);
    $alumnos = $stmtAlumnos->fetchAll(PDO::FETCH_ASSOC);
    
    $resultado = [];
    
    foreach ($alumnos as $alumno) {
        // Buscar encuestas pendientes con Contestador = 1
        $sqlEncuestas = "SELECT DISTINCT 
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
                        WHERE e.Contestador = 1 
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
        
        $stmtEncuestas = $pdo->prepare($sqlEncuestas);
        $stmtEncuestas->execute([
            'id_alumno' => $alumno['Id_alumno'],
            'id_alumno_res' => $alumno['Id_alumno']
        ]);
        
        $encuestasPendientes = $stmtEncuestas->fetchAll(PDO::FETCH_ASSOC);
        $totalPendientes = count($encuestasPendientes);
        
        // Solo alumnos con al menos una encuesta pendiente
        if ($totalPendientes > 0) {
            $resultado[] = [
                "Id_alumno" => $alumno['Id_alumno'],
                "NombreCompleto" => $alumno['NombreCompleto'],
                "total_pendientes" => $totalPendientes,
                "encuestas" => $encuestasPendientes
            ];
        }
    }
    
    echo json_encode([
        "success" => true,
        "alumnos" => $resultado,
        "total_alumnos_con_pendientes" => count($resultado)
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        "success" => false,
        "alumnos" => [],
        "message" => "Error en la base de datos: " . $e->getMessage()
    ]);
}
?>