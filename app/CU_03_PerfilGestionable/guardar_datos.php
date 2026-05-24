<?php
/**
 * ================================
 * Archivo : guardar_datos.php
 * Autor   : Viridiana Tonix Zarate
 * Fecha   : 2026-05-24
 * Desc.   : Guarda cambios en los
 *           datos del perfil del
 *           usuario (admin o alumno).
 * ================================
 */

require_once '../php/db.php';

header('Content-Type: application/json');

if (!isset($_COOKIE['Id_tipo_usuario']) || !isset($_COOKIE['Id_usuario'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error'   => 'No hay sesión activa'
    ]);
    exit;
}

$tipo_usuario = trim($_COOKIE['Id_tipo_usuario']);
$id_usuario   = trim($_COOKIE['Id_usuario']);
$datos        = json_decode(file_get_contents("php://input"), true);

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    // ========================= ADMIN / COORDINADOR =========================
    if ($tipo_usuario == "1" || $tipo_usuario == "3") {

        $campos_admin = [];
        $parametros_admin = [':id_usuario' => $id_usuario];

        if (!empty($datos['telefono_administrador'])) {
            $campos_admin[]                    = "Telefono = :telefono";
            $parametros_admin[':telefono']     = $datos['telefono_administrador'];
        }

        if (!empty($datos['correo_administrador'])) {
            $campos_admin[]                   = "Correo = :correo";
            $parametros_admin[':correo']      = $datos['correo_administrador'];
        }

        if (!empty($campos_admin)) {
            $sql = "UPDATE Administradores SET " . implode(", ", $campos_admin) . " WHERE Id_usuario = :id_usuario";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($parametros_admin);
        }

    // ========================= ALUMNO =========================
    } elseif ($tipo_usuario == "2") {

        // ✅ PASO 1: Actualizar tabla ALUMNOS (grupo, horario)
        // Preparar campos dinámicos de la tabla Alumnos
        $campos_alumno = [];
        $parametros_alumno = [':id_usuario' => $id_usuario];

        if (!empty($datos['grupo'])) {
            $campos_alumno[]                 = "Grupo = :grupo";
            $parametros_alumno[':grupo']     = strtoupper($datos['grupo']);
        }

        if (!empty($datos['horario'])) {
            $campos_alumno[]                 = "Horario = :horario";
            $parametros_alumno[':horario']   = $datos['horario'];
        }

        // ✅ Ejecutar UPDATE de Alumnos SI hay campos para actualizar
        // ✅ CORRECCIÓN CRUCIAL: Usar Id_alumno en lugar de Id_usuario
        if (!empty($campos_alumno)) {
            $sqlAlumnos = "UPDATE Alumnos SET " 
                . implode(", ", $campos_alumno) 
                . " WHERE Id_alumno = (SELECT Id_alumno FROM Alumnos WHERE Id_usuario = :id_usuario)";
            $stmt = $pdo->prepare($sqlAlumnos);
            $stmt->execute($parametros_alumno);
        }

        // ✅ PASO 2: Actualizar tabla ACTIVIDADES_ALUMNOS (estado, area, programa, fechas, empresa)
        // Preparar campos dinámicos de la tabla Actividades_Alumnos
        $campos_actividades = [];
        $parametros_actividades = [':id_usuario' => $id_usuario];

        if (!empty($datos['estado'])) {
            $campos_actividades[]                 = "Estado = :estado";
            $parametros_actividades[':estado']    = $datos['estado'];
        }

        if (!empty($datos['area'])) {
            $campos_actividades[]                = "Area = :area";
            $parametros_actividades[':area']     = $datos['area'];
        }

        if (!empty($datos['programa'])) {
            $campos_actividades[]                    = "Programa = :programa";
            $parametros_actividades[':programa']    = $datos['programa'];
        }

        if (!empty($datos['fecha_inicio'])) {
            $campos_actividades[]                      = "Fecha_inicio = :fecha_inicio";
            $parametros_actividades[':fecha_inicio']  = $datos['fecha_inicio'];
        }

        if (!empty($datos['fecha_fin'])) {
            $campos_actividades[]                   = "Fecha_fin = :fecha_fin";
            $parametros_actividades[':fecha_fin']   = $datos['fecha_fin'];
        }

        if (!empty($datos['id_empresa'])) {
            $campos_actividades[]                   = "Id_empresa = :id_empresa";
            $parametros_actividades[':id_empresa']  = $datos['id_empresa'];
        }

        // ✅ Ejecutar UPDATE de Actividades_Alumnos SI hay campos para actualizar
        if (!empty($campos_actividades)) {
            $sqlActividades = "UPDATE Actividades_Alumnos SET "
                . implode(", ", $campos_actividades)
                . " WHERE Id_alumno = (SELECT Id_alumno FROM Alumnos WHERE Id_usuario = :id_usuario)";

            $stmt = $pdo->prepare($sqlActividades);
            $stmt->execute($parametros_actividades);
        }
    }

    echo json_encode(['success' => true]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage()
    ]);
}
?>