<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

// =========================
// CONEXIÓN
// =========================
require_once '../php/db.php';

try {

    $pdo = new PDO(
        $dsn,
        $user,
        $pass,
        $options
    );

} catch (PDOException $e) {

    echo json_encode([
        'success' => false,
        'error' => 'Error de conexión: ' . $e->getMessage()
    ]);

    exit;
}

// =========================
// VALIDAR COOKIES
// =========================
$tipo_usuario =
    $_COOKIE['Id_tipo_usuario'] ?? null;

$id_usuario =
    $_COOKIE['Id_usuario'] ?? null;

if (!$tipo_usuario || !$id_usuario) {

    echo json_encode([
        'success' => false,
        'error' => 'Sesión no válida'
    ]);

    exit;
}

try {

    // =====================================================
    // VALIDAR CORREO
    // =====================================================
    if (isset($_POST['correo'])) {

        $correo =
            trim($_POST['correo']);

        $regexCorreo =
            '/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/';

        if (!preg_match($regexCorreo, $correo)) {

            echo json_encode([
                'success' => false,
                'error' => 'Correo inválido'
            ]);

            exit;
        }
    }

    // =====================================================
    // VALIDAR TELÉFONO
    // =====================================================
    if (isset($_POST['telefono'])) {

        $telefono =
            trim($_POST['telefono']);

        $regexTelefono =
            '/^\d{3}-\d{3}-\d{2}-\d{2}$/';

        if (!preg_match($regexTelefono, $telefono)) {

            echo json_encode([
                'success' => false,
                'error' => 'Formato teléfono inválido'
            ]);

            exit;
        }
    }

    // =====================================================
    // VALIDAR GRUPO
    // =====================================================
    if (isset($_POST['grupo'])) {

        $grupo =
            strtoupper(
                trim($_POST['grupo'])
            );

        $regexGrupo =
            '/^[1-9][A-Z]$/';

        if (!preg_match($regexGrupo, $grupo)) {

            echo json_encode([
                'success' => false,
                'error' => 'Grupo inválido. Ejemplo: 1A'
            ]);

            exit;
        }

        $_POST['grupo'] = $grupo;
    }

    // =====================================================
    // SUBIR FOTO PERFIL
    // =====================================================
    if (
        isset($_FILES['foto_perfil']) &&
        $_FILES['foto_perfil']['error'] === 0
    ) {

        $archivo =
            $_FILES['foto_perfil'];

        $tiposPermitidos = [
            'image/jpeg' => 'jpg',
            'image/jpg'  => 'jpg',
            'image/png'  => 'png',
            'image/webp' => 'webp'
        ];

        // VALIDAR TIPO
        if (
            !array_key_exists(
                $archivo['type'],
                $tiposPermitidos
            )
        ) {

            echo json_encode([
                'success' => false,
                'error' => 'Formato de imagen no permitido'
            ]);

            exit;
        }

        // VALIDAR TAMAÑO
        if (
            $archivo['size'] >
            5 * 1024 * 1024
        ) {

            echo json_encode([
                'success' => false,
                'error' => 'La imagen supera 5MB'
            ]);

            exit;
        }

        // CREAR CARPETA
        $carpeta =
            "uploads/perfiles/";

        if (!file_exists($carpeta)) {

            mkdir(
                $carpeta,
                0777,
                true
            );
        }

        // GENERAR NOMBRE
        $extension =
            $tiposPermitidos[
                $archivo['type']
            ];

        $nombreArchivo =
            "perfil_" .
            time() .
            "_" .
            uniqid() .
            "." .
            $extension;

        $rutaFoto =
            $carpeta .
            $nombreArchivo;

        // GUARDAR IMAGEN
        if (
            !move_uploaded_file(
                $archivo['tmp_name'],
                $rutaFoto
            )
        ) {

            echo json_encode([
                'success' => false,
                'error' => 'Error al guardar imagen'
            ]);

            exit;
        }

        // ACTUALIZAR FOTO
        $sqlFoto = "
            UPDATE Usuarios
            SET Profile_picture_path = :foto
            WHERE Id_usuario = :id_usuario
        ";

        $stmtFoto =
            $pdo->prepare($sqlFoto);

        $stmtFoto->execute([
            ':foto'       => $rutaFoto,
            ':id_usuario' => $id_usuario
        ]);
    }

    // =====================================================
    // ADMINISTRADOR
    // =====================================================
    if (
        $tipo_usuario == 1 ||
        $tipo_usuario == 3
    ) {

        $telefono =
            trim($_POST['telefono'] ?? '');

        $correo =
            trim($_POST['correo'] ?? '');

        $sql = "
            UPDATE Administradores
            SET
                Telefono = :telefono,
                Correo = :correo,
                Fecha_modificacion = NOW()
            WHERE Id_usuario = :id_usuario
        ";

        $stmt =
            $pdo->prepare($sql);

        $stmt->execute([
            ':telefono'   => $telefono,
            ':correo'     => $correo,
            ':id_usuario' => $id_usuario
        ]);

        echo json_encode([
            'success' => true,
            'mensaje' => 'Administrador actualizado'
        ]);

        exit;
    }

    // =====================================================
    // ALUMNO
    // =====================================================
    if ($tipo_usuario == 2) {

        $grupo =
            trim($_POST['grupo'] ?? '');

        $horario =
            trim($_POST['horario'] ?? '');

        $area =
            trim($_POST['area'] ?? '');

        $programa =
            trim($_POST['programa'] ?? '');

        $estado =
            strtoupper(
                trim($_POST['estado'] ?? '')
            );

        // CORREGIR ESPACIOS
        $estado =
            str_replace(
                " ",
                "_",
                $estado
            );

        $fecha_inicio =
            $_POST['fecha_inicio'] ?? null;

        $fecha_fin =
            $_POST['fecha_fin'] ?? null;

        // =================================================
        // VALIDAR ESTADO
        // =================================================
        $estadosValidos = [
            'PENDIENTE',
            'EN_CURSO',
            'COMPLETADO',
            'CANCELADO'
        ];

        if (
            !in_array(
                $estado,
                $estadosValidos
            )
        ) {

            echo json_encode([
                'success' => false,
                'error' => 'Estado inválido'
            ]);

            exit;
        }

        // =================================================
        // OBTENER ID ALUMNO
        // =================================================
        $stmtAlumno = $pdo->prepare("
            SELECT Id_alumno
            FROM Alumnos
            WHERE Id_usuario = :id_usuario
        ");

        $stmtAlumno->execute([
            ':id_usuario' => $id_usuario
        ]);

        $alumno =
            $stmtAlumno->fetch(
                PDO::FETCH_ASSOC
            );

        if (!$alumno) {

            echo json_encode([
                'success' => false,
                'error' => 'Alumno no encontrado'
            ]);

            exit;
        }

        $id_alumno =
            $alumno['Id_alumno'];

        // =================================================
        // OBTENER PERIODO_AÑO DESDE LA BD
        // =================================================
        $stmtPeriodo = $pdo->prepare("
            SELECT periodo_año
            FROM Actividades_Alumnos
            WHERE Id_alumno = :id_alumno
        ");

        $stmtPeriodo->execute([
            ':id_alumno' => $id_alumno
        ]);

        $rowPeriodo =
            $stmtPeriodo->fetch(
                PDO::FETCH_ASSOC
            );

        $periodo_ano =
            $rowPeriodo['periodo_año'] ?? null;

        // =================================================
        // EMPRESA
        // =================================================
        $id_empresa = null;

        // NUEVA EMPRESA
        if (
            isset($_POST['nombre_empresa']) &&
            trim($_POST['nombre_empresa']) !== ''
        ) {

            $nombreEmpresa =
                trim($_POST['nombre_empresa']);

            $descripcion =
                trim($_POST['descripcion_empresa'] ?? '');

            $razonSocial =
                trim($_POST['razon_social_empresa'] ?? '');

            $rfc =
                strtoupper(
                    trim($_POST['rfc_empresa'] ?? '')
                );

            $direccion =
                trim($_POST['direccion_empresa'] ?? '');

            $sitioWeb =
                trim($_POST['sitio_web_empresa'] ?? '');

            // BUSCAR SI EXISTE
            $buscarEmpresa = $pdo->prepare("
                SELECT Id_empresa
                FROM Empresas
                WHERE Nombre = :nombre
            ");

            $buscarEmpresa->execute([
                ':nombre' => $nombreEmpresa
            ]);

            $empresaExistente =
                $buscarEmpresa->fetch(
                    PDO::FETCH_ASSOC
                );

            // SI YA EXISTE
            if ($empresaExistente) {

                $id_empresa =
                    intval(
                        $empresaExistente['Id_empresa']
                    );

            } else {

                // INSERTAR NUEVA EMPRESA
                $insertEmpresa = $pdo->prepare("
                    INSERT INTO Empresas (
                        Nombre,
                        Descripcion,
                        Razon_social,
                        RFC,
                        Direccion,
                        Sitio_web
                    )
                    VALUES (
                        :nombre,
                        :descripcion,
                        :razon_social,
                        :rfc,
                        :direccion,
                        :sitio_web
                    )
                ");

                $insertEmpresa->execute([
                    ':nombre'       => $nombreEmpresa,
                    ':descripcion'  => $descripcion,
                    ':razon_social' => $razonSocial,
                    ':rfc'          => $rfc,
                    ':direccion'    => $direccion,
                    ':sitio_web'    => $sitioWeb
                ]);

                $id_empresa =
                    intval(
                        $pdo->lastInsertId()
                    );
            }

        } else {

            // EMPRESA EXISTENTE
            $id_empresa =
                (
                    isset($_POST['id_empresa']) &&
                    $_POST['id_empresa'] !== ''
                )
                ? intval($_POST['id_empresa'])
                : null;
        }

        // =================================================
        // VALIDAR EMPRESA
        // =================================================
        if ($id_empresa === null) {

            echo json_encode([
                'success' => false,
                'error' => 'Debes seleccionar o crear una empresa'
            ]);

            exit;
        }

        // =================================================
        // SI COMPLETADO
        // =================================================
        if ($estado === 'COMPLETADO') {

            $fecha_fin =
                date('Y-m-d');
        }

        // =================================================
        // ACTUALIZAR ALUMNO
        // =================================================
        $sqlAlumno = "
            UPDATE Alumnos
            SET
                Grupo = :grupo,
                Horario = :horario,
                Fecha_modificacion = NOW()
            WHERE Id_alumno = :id_alumno
        ";

        $stmtAlumnoUpdate =
            $pdo->prepare($sqlAlumno);

        $stmtAlumnoUpdate->execute([
            ':grupo'     => $grupo,
            ':horario'   => $horario,
            ':id_alumno' => $id_alumno
        ]);

        // =================================================
        // ACTUALIZAR ACTIVIDADES
        // =================================================
        $sqlActividad = "
            UPDATE Actividades_Alumnos
            SET
                Id_empresa = :id_empresa,
                Area = :area,
                Programa = :programa,
                Estado = :estado,
                `periodo_año` = :periodo_ano,
                Fecha_inicio = :fecha_inicio,
                Fecha_fin = :fecha_fin,
                Fecha_modificacion = NOW()
            WHERE Id_alumno = :id_alumno
        ";

        $stmtActividad =
            $pdo->prepare($sqlActividad);

        $stmtActividad->bindValue(
            ':id_empresa',
            $id_empresa,
            PDO::PARAM_INT
        );

        $stmtActividad->bindValue(
            ':area',
            $area
        );

        $stmtActividad->bindValue(
            ':programa',
            $programa
        );

        $stmtActividad->bindValue(
            ':estado',
            $estado
        );

        $stmtActividad->bindValue(
            ':periodo_ano',
            $periodo_ano,
            $periodo_ano === null ? PDO::PARAM_NULL : PDO::PARAM_STR
        );

        $stmtActividad->bindValue(
            ':fecha_inicio',
            $fecha_inicio
        );

        $stmtActividad->bindValue(
            ':fecha_fin',
            $fecha_fin
        );

        $stmtActividad->bindValue(
            ':id_alumno',
            $id_alumno,
            PDO::PARAM_INT
        );

        $stmtActividad->execute();

        echo json_encode([
            'success' => true,
            'mensaje' => 'Alumno actualizado correctamente'
        ]);

        exit;
    }

    // =====================================================
    // TIPO INVÁLIDO
    // =====================================================
    echo json_encode([
        'success' => false,
        'error' => 'Tipo de usuario inválido'
    ]);

} catch (PDOException $e) {

    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>