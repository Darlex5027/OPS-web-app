<?php
/**
 * Archivo     : obtener_alumnos_pendientes.php
 * Módulo      : CU_05_ResponderEncuestas
 * Autor       : Francisco Angel Membrila Alarcón
 * Fecha       : 22/04/2026
 * Descripción : Servicio encargado de obtener alumnos con encuestas
 * pendientes para usuarios con rol COORDINADOR o ADMINISTRADOR
 * dentro del sistema OPS.
 *
 * Funcionalidades:
 * - Validar la recepción del Id de carrera.
 * - Obtener alumnos activos pertenecientes a una carrera.
 * - Consultar encuestas pendientes asignadas a cada alumno.
 * - Relacionar encuestas con actividades, periodos y empresas.
 * - Excluir encuestas previamente respondidas.
 * - Obtener información académica y empresarial asociada.
 * - Retornar resultados en formato JSON.
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
    
    // Agregamos la extracción de No_Expediente de la tabla Alumnos
    $sqlAlumnos = "SELECT Id_alumno, 
                          No_Expediente,
                          CONCAT(Nombre, ' ', Apellido_P, ' ', IFNULL(Apellido_M, '')) AS NombreCompleto 
                   FROM Alumnos 
                   WHERE Id_carrera = :id_carrera 
                     AND Activo = 1";
    
    $stmtAlumnos = $pdo->prepare($sqlAlumnos);
    $stmtAlumnos->execute(['id_carrera' => $id_carrera]);
    $alumnos = $stmtAlumnos->fetchAll(PDO::FETCH_ASSOC);
    
    $resultado = [];
    
    foreach ($alumnos as $alumno) {
        // Conectamos la tabla Actividades_Alumnos con Empresas para extraer el Nombre de la organización
        $sqlEncuestas = "SELECT DISTINCT 
                            e.Id_encuesta AS Id_encuesta, 
                            e.Nombre AS Nombre, 
                            e.Descripcion AS Descripcion,
                            e.Id_servicio AS Id_servicio,
                            s.Servicio AS NombreServicio,
                            IFNULL(emp.Nombre, 'Sin Empresa Asignada') AS NombreEmpresa
                        FROM Encuestas e
                        INNER JOIN Periodo_Encuesta pe ON e.Id_encuesta = pe.Id_encuesta
                        INNER JOIN Actividades_Alumnos aa ON aa.Id_alumno = :id_alumno 
                                                          AND aa.Id_servicio = e.Id_servicio
                                                          AND aa.periodo_tipo = pe.Periodo_tipo 
                                                          AND aa.periodo_año = pe.Periodo_año
                        INNER JOIN Actividades s ON e.Id_servicio = s.Id_servicio
                        LEFT JOIN Empresas emp ON aa.Id_empresa = emp.Id_empresa
                        WHERE e.Contestador = 1 
                          AND e.Activo = 1
                          AND aa.Estado IN ('EN_CURSO', 'COMPLETADO')
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
        
        // Mostrar únicamente a los alumnos que tengan al menos una encuesta pendiente
        if ($totalPendientes > 0) {
            $resultado[] = [
                "Id_alumno" => (int)$alumno['Id_alumno'],
                "No_Expediente" => $alumno['No_Expediente'] ?? 'S/N',
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