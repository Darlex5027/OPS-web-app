<?php
/**
 * Archivo     : obtener_alumnos_pendientes.php
 * Módulo      : CU_05_ResponderEncuestas
 * Descripción : Obtiene alumnos con encuestas pendientes para COORDINADOR/ADMIN (Contestador=1)
 * * Según documento:
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
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // CORRECCIÓN 1: Ajuste de nombres de columnas según estructura real (Apellido_P, Apellido_M)
    $sqlAlumnos = "SELECT Id_alumno, CONCAT(Nombre, ' ', Apellido_P, ' ', IFNULL(Apellido_M, '')) AS NombreCompleto 
                   FROM Alumnos 
                   WHERE Id_carrera = :id_carrera 
                     AND Activo = 1";
    
    $stmtAlumnos = $pdo->prepare($sqlAlumnos);
    $stmtAlumnos->execute(['id_carrera' => $id_carrera]);
    $alumnos = $stmtAlumnos->fetchAll(PDO::FETCH_ASSOC);
    
    $resultado = [];
    
    foreach ($alumnos as $alumno) {
        // CORRECCIÓN 2, 3 y 4: Encuestas (plural), Actividades (tabla servicios), periodo_tipo/año (minúsculas)
        $sqlEncuestas = "SELECT DISTINCT 
                            e.Id_encuesta AS Id_encuesta, 
                            e.Nombre AS Nombre, 
                            e.Descripcion AS Descripcion,
                            e.Id_servicio AS Id_servicio,
                            s.Servicio AS NombreServicio
                        FROM Encuestas e
                        INNER JOIN Periodo_Encuesta pe ON e.Id_encuesta = pe.Id_encuesta
                        INNER JOIN Actividades_Alumnos aa ON pe.Periodo_tipo = aa.periodo_tipo 
                                                          AND pe.Periodo_año = aa.periodo_año
                        INNER JOIN Actividades s ON e.Id_servicio = s.Id_servicio
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
        
        // Se cumple la regla de negocio: "Mostrar únicamente a los alumnos que tengan al menos una encuesta pendiente"
        if ($totalPendientes > 0) {
            $resultado[] = [
                "Id_alumno" => (int)$alumno['Id_alumno'],
                "NombreCompleto" => trim($alumno['NombreCompleto']),
                "total_pendientes" => $totalPendientes,
                "encuestas" => $encuestasPendientes
            ];
        }
    }
    
    echo json_encode([
        "success" => true,
        "alumnos" => $resultado,
        "total_alumnos_con_pendientes" => count($resultado)
    ], JSON_UNESCAPED_UNICODE);
    
} catch (PDOException $e) {
    echo json_encode([
        "success" => false,
        "alumnos" => [],
        "message" => "Error en la base de datos: " . $e->getMessage()
    ]);
}
?>