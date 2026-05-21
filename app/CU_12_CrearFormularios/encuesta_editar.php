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
// ─────────────────────────────────────────────
// Entrada: cuerpo de la petición en formato JSON
// Campos esperados:
//   Id_encuesta   (requerido) : Identificador de la encuesta.
//   nombre        (opcional)  : Si está presente, se actualizan los datos generales.
//   descripcion   (opcional)  : Descripción de la encuesta.
//   servicio      (opcional)  : Identificador del servicio asociado.
//   activo        (opcional)  : Estado activo/inactivo de la encuesta.
//   contestador   (opcional)  : Tipo de contestador asignado.
//   fecha_fin     (opcional)  : Fecha de cierre de la encuesta.
//   periodo_tipo  (opcional)  : Si está presente junto a periodo_anio, inserta un periodo.
//   periodo_anio  (opcional)  : Año del periodo a insertar.
// ─────────────────────────────────────────────
$datos_encuesta = json_decode(file_get_contents('php://input'), true);
$id_encuesta = $datos_encuesta['Id_encuesta'];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    if (isset($datos_encuesta['nombre'])) {
        // ── Operación 1: Actualizar datos generales de la encuesta ──

        // Extraer campos del cuerpo de la petición
        $nombre = $datos_encuesta['nombre'];
        $descripcion = $datos_encuesta['descripcion'];
        $id_servicio = $datos_encuesta['servicio'];
        $activo = $datos_encuesta['activo'];
        $contestador = $datos_encuesta['contestador'];
        $fecha_fin = $datos_encuesta['fecha_fin'];
        // Actualizar el registro en la tabla Encuestas y registrar fecha de modificación
        $stmt = $pdo->prepare("UPDATE Encuestas 
        SET Nombre=?, 
        Descripcion=?, 
        Id_servicio=?, 
        Activo=?, 
        Contestador=?,
        Fecha_fin=?,
        Fecha_modificacion=NOW()
        WHERE Id_encuesta=?");
        $stmt->execute([$nombre, $descripcion, $id_servicio, $activo, $contestador, $fecha_fin, $id_encuesta]);

        echo json_encode(['success' => true, 'mensaje' => 'Encuesta actualizada']);
    } else if (isset($datos_encuesta['periodo_tipo']) && isset($datos_encuesta['periodo_anio'])) {
        // ── Operación 2: Insertar un nuevo periodo para la encuesta ──
        $periodo_tipo = $datos_encuesta['periodo_tipo'];
        $periodo_anio = $datos_encuesta['periodo_anio'];
        // Insertar el periodo en la tabla Periodo_Encuesta
        $stmt = $pdo->prepare('INSERT INTO 
        Periodo_Encuesta(Id_encuesta, Periodo_tipo, Periodo_año) 
        VALUES (?,?,?)');
        $stmt->execute([$id_encuesta, $periodo_tipo, $periodo_anio]);
        echo json_encode(['success' => true, 'mensaje' => 'Encuesta actualizada']);
    } else {
        // ── Operación 3: Consultar datos de la encuesta con sus periodos ──

        // Obtener todos los campos de la encuesta junto con sus periodos,
        // ordenados por año de periodo de forma ascendente
        $stmt = $pdo->prepare("SELECT 
        Id_periodo_encuesta,
        Encuestas.Id_encuesta,
        Nombre, 
        Descripcion, 
        Id_servicio, 
        Activo, 
        Contestador,
        Fecha_fin, 
        Fecha_registro, 
        Fecha_modificacion,
        Periodo_tipo, Periodo_año 
        FROM Encuestas JOIN Periodo_Encuesta 
        ON Encuestas.Id_encuesta = Periodo_Encuesta.Id_encuesta 
        WHERE Encuestas.Id_encuesta=? order by Periodo_año ASC");
        $stmt->execute([$id_encuesta]);
        // Agrupar los resultados por encuesta para evitar datos duplicados,
        // anidando los periodos dentro de cada encuesta
        $encuestas = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $fila) {
            $id_encuesta = $fila['Id_encuesta'];
            // Inicializar la encuesta en el arreglo si aún no existe
            if (!isset($encuestas[$id_encuesta])) {
                $encuestas[$id_encuesta] = [
                    'Nombre' => $fila['Nombre'],
                    'Descripcion' => $fila['Descripcion'],
                    'Id_servicio' => $fila['Id_servicio'],
                    'Activo' => $fila['Activo'],
                    'Contestador' => $fila['Contestador'],
                    'Fecha_fin' => $fila['Fecha_fin'],
                    'periodos' => []
                ];
            }
            // Agregar cada periodo al arreglo de periodos de la encuesta
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
    echo json_encode(['error' => "Error al editar la encuesta"]);
}