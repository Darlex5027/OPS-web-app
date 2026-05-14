<?php
/*
  Archivo     : encuesta_editar.php
  Módulo      : CU_12_CrearFormularios
  Autor       : Daniela Hernandez Hernandez
  Fecha       : 05/05/2026
  Descripción : Maneja la consulta, actualización e inserción de periodos de una encuesta,
                agrupando los periodos por encuesta en la respuesta JSON.
*/
require_once '../php/db.php';

$datos_encuesta = json_decode(file_get_contents('php://input'), true);
$id_encuesta = $datos_encuesta['Id_encuesta'];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    if (isset($datos_encuesta['nombre'])) {
        $nombre = $datos_encuesta['nombre'];
        $descripcion = $datos_encuesta['descripcion'];
        $id_servicio = $datos_encuesta['servicio'];
        $activo = $datos_encuesta['activo'];
        $fecha_fin = $datos_encuesta['fecha_fin'];

        $stmt = $pdo->prepare("UPDATE Encuestas 
        SET Nombre=?, 
        Descripcion=?, 
        Id_servicio=?, 
        Activo=?, 
        Fecha_fin=?,
        Fecha_modificacion=NOW()
        WHERE Id_encuesta=?");
        $stmt->execute([$nombre, $descripcion, $id_servicio, $activo, $fecha_fin, $id_encuesta]);

        echo json_encode(['success' => true, 'mensaje' => 'Encuesta actualizada']);
    } else if (isset($datos_encuesta['periodo_tipo']) && isset($datos_encuesta['periodo_anio'])) {
        $periodo_tipo = $datos_encuesta['periodo_tipo'];
        $periodo_anio = $datos_encuesta['periodo_anio'];

        $stmt = $pdo->prepare('INSERT INTO 
        Periodo_Encuesta(Id_encuesta, Periodo_tipo, Periodo_año) 
        VALUES (?,?,?)');
        $stmt->execute([$id_encuesta, $periodo_tipo, $periodo_anio]);
        echo json_encode(['success' => true, 'mensaje' => 'Encuesta actualizada']);
    } else {
        $stmt = $pdo->prepare("SELECT 
        Id_periodo_encuesta,
        Encuestas.Id_encuesta,
        Nombre, 
        Descripcion, 
        Id_servicio, 
        Activo, 
        Fecha_fin, 
        Fecha_registro, 
        Fecha_modificacion,
        Periodo_tipo, Periodo_año 
        FROM Encuestas JOIN Periodo_Encuesta 
        ON Encuestas.Id_encuesta = Periodo_Encuesta.Id_encuesta 
        WHERE Encuestas.Id_encuesta=? order by Periodo_año ASC");
        $stmt->execute([$id_encuesta]);
        $encuestas = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $fila) {
            $id_encuesta = $fila['Id_encuesta'];
            if (!isset($encuestas[$id_encuesta])) {
                $encuestas[$id_encuesta] = [
                    'Nombre' => $fila['Nombre'],
                    'Descripcion' => $fila['Descripcion'],
                    'Id_servicio' => $fila['Id_servicio'],
                    'Activo' => $fila['Activo'],
                    'Fecha_fin' => $fila['Fecha_fin'],
                    'periodos' => []
                ];
            }
            $encuestas[$id_encuesta]['periodos'][] = [
                'Id_periodo_encuesta' => $fila['Id_periodo_encuesta'],
                'Periodo_tipo' => $fila['Periodo_tipo'],
                'Periodo_año' => $fila['Periodo_año']
            ];
        }
        echo json_encode(['success' => true, 'data' => array_values($encuestas)]);
    }
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => "encuesta_editar.php | Error: " . $e->getMessage()]);
}