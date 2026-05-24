<?php
require_once '../php/db.php';

header('Content-Type: application/json');

if (!isset($_COOKIE['Id_tipo_usuario']) || !isset($_COOKIE['Id_usuario'])) {
    http_response_code(401);
    echo json_encode(['error' => 'No hay sesión activa']);
    exit;
}

$tipo_usuario = trim($_COOKIE['Id_tipo_usuario']);
$id_usuario   = trim($_COOKIE['Id_usuario']);
$datos        = json_decode(file_get_contents("php://input"), true);

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    // ========================= ADMIN / COORDINADOR =========================
    if ($tipo_usuario == "1" || $tipo_usuario == "3") {

        $setCampos = [];
        $params    = [':id_usuario' => $id_usuario];

        if (!empty($datos['telefono_administrador'])) {
            $setCampos[]          = "Telefono = :telefono";
            $params[':telefono']  = $datos['telefono_administrador'];
        }

        if (!empty($datos['correo_administrador'])) {
            $setCampos[]        = "Correo = :correo";
            $params[':correo']  = $datos['correo_administrador'];
        }

        if (!empty($setCampos)) {
            $sql = "UPDATE Administradores SET " . implode(", ", $setCampos) . " WHERE Id_usuario = :id_usuario";
            $pdo->prepare($sql)->execute($params);
        }

    // ========================= ALUMNO =========================
    } elseif ($tipo_usuario == "2") {

        // ✅ PASO 1: Actualizar tabla ALUMNOS (grupo, horario)
        // Preparar campos dinámicos de la tabla Alumnos
        $setCamposAlumnos = [];
        $paramsAlumnos    = [':id_usuario' => $id_usuario];

        if (!empty($datos['grupo'])) {
            $setCamposAlumnos[]        = "Grupo = :grupo";
            $paramsAlumnos[':grupo']   = strtoupper($datos['grupo']);
        }

        if (!empty($datos['horario'])) {
            $setCamposAlumnos[]         = "Horario = :horario";
            $paramsAlumnos[':horario']  = $datos['horario'];
        }

        // ✅ Ejecutar UPDATE de Alumnos SI hay campos para actualizar
        // ✅ CORRECCIÓN CRUCIAL: Usar Id_alumno en lugar de Id_usuario
        if (!empty($setCamposAlumnos)) {
            $sqlAlumnos = "UPDATE Alumnos SET " 
                . implode(", ", $setCamposAlumnos) 
                . " WHERE Id_alumno = (SELECT Id_alumno FROM Alumnos WHERE Id_usuario = :id_usuario)";
            $pdo->prepare($sqlAlumnos)->execute($paramsAlumnos);
        }

        // ✅ PASO 2: Actualizar tabla ACTIVIDADES_ALUMNOS (estado, area, programa, fechas, empresa)
        // Preparar campos dinámicos de la tabla Actividades_Alumnos
        $setCamposActividades = [];
        $paramsActividades    = [':id_usuario' => $id_usuario];

        if (!empty($datos['estado'])) {
            $setCamposActividades[]        = "Estado = :estado";
            $paramsActividades[':estado']  = $datos['estado'];
        }

        if (!empty($datos['area'])) {
            $setCamposActividades[]      = "Area = :area";
            $paramsActividades[':area']  = $datos['area'];
        }

        if (!empty($datos['programa'])) {
            $setCamposActividades[]          = "Programa = :programa";
            $paramsActividades[':programa']  = $datos['programa'];
        }

        if (!empty($datos['fecha_inicio'])) {
            $setCamposActividades[]              = "Fecha_inicio = :fecha_inicio";
            $paramsActividades[':fecha_inicio']  = $datos['fecha_inicio'];
        }

        if (!empty($datos['fecha_fin'])) {
            $setCamposActividades[]           = "Fecha_fin = :fecha_fin";
            $paramsActividades[':fecha_fin']  = $datos['fecha_fin'];
        }

        if (!empty($datos['id_empresa'])) {
            $setCamposActividades[]              = "Id_empresa = :id_empresa";
            $paramsActividades[':id_empresa']    = $datos['id_empresa'];
        }

        // ✅ Ejecutar UPDATE de Actividades_Alumnos SI hay campos para actualizar
        if (!empty($setCamposActividades)) {
            $sqlActividades = "UPDATE Actividades_Alumnos SET "
                . implode(", ", $setCamposActividades)
                . " WHERE Id_alumno = (SELECT Id_alumno FROM Alumnos WHERE Id_usuario = :id_usuario)";

            $pdo->prepare($sqlActividades)->execute($paramsActividades);
        }
    }

    echo json_encode(['success' => true]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>