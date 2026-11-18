<?php
/**
 * Archivo      : PerfilGestionableTest.php
 * Módulo       : CU_03_PerfilGestionable (Pruebas unitarias)
 * Archivos bajo prueba :
 *   app/CU_03_PerfilGestionable/obtener_datos.php
 *   app/CU_03_PerfilGestionable/crear.php
 *   app/CU_03_PerfilGestionable/guardar_datos.php
 * Herramienta  : PHPUnit
 *
 * Cómo correrlo (desde OPS-web-app, con el Docker del proyecto prendido):
 *   vendor/bin/phpunit --testdox Pruebas_Unitarias/CU_03/PerfilGestionableTest.php
 *
 * Descripción  : Pruebas de los PHP del perfil. El código original NO se modifica.
 *   - Usan una base de datos APARTE llamada "ops_pruebas_cu03" que se crea sola
 *     dentro del MariaDB de Docker. Tu base de datos real no se toca.
 *   - Cada PHP se ejecuta en un proceso aparte. La prueba le simula la sesión
 *     (cookies Id_tipo_usuario e Id_usuario), el cuerpo JSON, los campos POST
 *     (FormData) y la foto subida, y revisa el código HTTP y el JSON que responde.
 *
 * Cada prueba indica:
 *   - Función   : archivo PHP › función o bloque que se prueba.
 *   - Comprueba : qué comportamiento se verifica.
 */

namespace CU_03;

use PDO;
use PDOException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\TestDox;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class PerfilGestionableTest extends TestCase
{
    // =========================
    // CONFIGURACIÓN DE LA BD DE PRUEBAS
    // =========================
    // Si la BD está en Docker, se conecta sola a este contenedor.
    // Si no usas Docker, pon aquí '' y escribe la dirección en DB_HOST.
    private const CONTENEDOR_DOCKER_BD = 'ops-web-app-database-1';
    private const DB_HOST = '127.0.0.1';
    private const DB_PORT = '3306';
    private const DB_USER = 'root';
    private const DB_PASS = ''; // si se deja vacía, se lee DB_ROOT_PASS del archivo .env del proyecto
    private const DB_NAME = 'ops_pruebas_cu03'; // debe contener "prueba"

    private const CARPETA_APP = __DIR__ . '/../../app/CU_03_PerfilGestionable';

    private const PUENTE_DOCKER = 'ops-pruebas-puente-bd';
    private const PUERTO_PUENTE = '33061';

    private static ?PDO $pdo = null;
    private static ?array $destino = null;
    private static string $carpetaTemporal = '';

    public static function setUpBeforeClass(): void
    {
        self::prepararArchivosTemporales();
        self::conexion();
    }

    /** Antes de cada prueba se vuelven a crear las tablas vacías. */
    protected function setUp(): void
    {
        self::crearEsquema();
    }

    // =====================================================================
    // FUNCIONES DE APOYO (no son pruebas)
    // =====================================================================

    /**
     * Crea en la carpeta temporal del sistema dos archivos que necesita la prueba:
     *  - php/db.php: conexión a la BD de pruebas. los PHP del módulo hacen
     *    require_once("../php/db.php"); al ejecutarlo desde <temporal>/CU_03_PerfilGestionable,
     *    PHP carga este db.php en lugar del real.
     *  - simular_input.php: hace que php://input devuelva el JSON enviado por la prueba
     *    (en la terminal no existe el cuerpo de una petición HTTP) y simula las
     *    cookies de sesión, los campos POST y los archivos subidos.
     */
    private static function prepararArchivosTemporales(): void
    {
        $base = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'ops_pruebas_cu03';
        @mkdir($base . DIRECTORY_SEPARATOR . 'php', 0777, true);
        @mkdir($base . DIRECTORY_SEPARATOR . 'CU_03_PerfilGestionable', 0777, true);

        file_put_contents($base . DIRECTORY_SEPARATOR . 'php' . DIRECTORY_SEPARATOR . 'db.php', <<<'PHP'
<?php
$dsn  = 'mysql:host=' . getenv('OPS_DB_HOST') . ';port=' . getenv('OPS_DB_PORT')
      . ';dbname=' . getenv('OPS_DB_NAME') . ';charset=utf8mb4';
$user = getenv('OPS_DB_USER');
$pass = (string) getenv('OPS_DB_PASS');
if (getenv('OPS_FORZAR_ERROR_DB') === '1') {
    $user = 'usuario_inexistente_ops';
    $pass = 'clave_incorrecta_ops';
}
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];
PHP);

        file_put_contents($base . DIRECTORY_SEPARATOR . 'simular_input.php', <<<'PHP'
<?php
$GLOBALS['__CUERPO'] = stream_get_contents(STDIN);
final class SimuladorPhpInput
{
    public $context;
    private string $datos = '';
    private int $pos = 0;
    public function stream_open($ruta, $modo, $opciones, &$abierta): bool
    {
        if (strtolower($ruta) !== 'php://input') return false;
        $this->datos = (string) $GLOBALS['__CUERPO'];
        return true;
    }
    public function stream_read($n): string
    {
        $parte = substr($this->datos, $this->pos, $n);
        $this->pos += strlen($parte);
        return $parte;
    }
    public function stream_eof(): bool { return $this->pos >= strlen($this->datos); }
    public function stream_stat(): array { return ['size' => strlen($this->datos)]; }
}
stream_wrapper_unregister('php');
stream_wrapper_register('php', SimuladorPhpInput::class);

// Cookies de sesión, campos POST (FormData) y archivos subidos simulados
$_COOKIE = json_decode((string) getenv('OPS_COOKIES'), true) ?: [];
$_POST   = json_decode((string) getenv('OPS_POST'), true) ?: [];
$_FILES  = json_decode((string) getenv('OPS_FILES'), true) ?: [];

// Al terminar, se guarda el código HTTP para que la prueba lo revise
if ($archivoCodigo = getenv('OPS_ARCHIVO_CODIGO')) {
    register_shutdown_function(function () use ($archivoCodigo) {
        file_put_contents($archivoCodigo, (string) http_response_code());
    });
}
PHP);

        self::$carpetaTemporal = $base;
    }

    /**
     * Ejecuta un PHP del módulo (ej. 'registro.php') en un proceso aparte, le manda
     * $cuerpo como petición POST y regresa su respuesta.
     */
    private static function ejecutarPhp(string $archivo, ?string $cuerpo = null, array $entornoExtra = []): array
    {
        $comando = [
            PHP_BINARY,
            '-d', 'auto_prepend_file=' . self::$carpetaTemporal . DIRECTORY_SEPARATOR . 'simular_input.php',
            '-d', 'display_errors=stderr',
            self::CARPETA_APP . '/' . $archivo,
        ];
        $entorno = array_merge(getenv(), [
            'OPS_DB_HOST' => self::destino()[0],
            'OPS_DB_PORT' => self::destino()[1],
            'OPS_DB_USER' => self::DB_USER,
            'OPS_DB_PASS' => self::pass(),
            'OPS_DB_NAME' => self::DB_NAME,
        ], $entornoExtra);

        $proceso = proc_open(
            $comando,
            [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
            $tuberias,
            self::$carpetaTemporal . DIRECTORY_SEPARATOR . 'CU_03_PerfilGestionable',
            $entorno
        );
        fwrite($tuberias[0], (string) $cuerpo);
        fclose($tuberias[0]);
        $salida  = stream_get_contents($tuberias[1]);
        $errores = stream_get_contents($tuberias[2]);
        fclose($tuberias[1]);
        fclose($tuberias[2]);
        proc_close($proceso);

        return ['salida' => $salida, 'errores' => trim($errores), 'json' => json_decode($salida, true)];
    }

    /**
     * Devuelve [host, puerto] para conectarse a la BD.
     * Si existe el contenedor de Docker de la BD, crea un "puente" temporal
     * (contenedor alpine/socat) que publica la BD en 127.0.0.1:33061, porque el
     * puerto 3306 del contenedor no está publicado hacia la computadora.
     * El puente se borra solo al terminar las pruebas.
     */
    private static function destino(): array
    {
        if (self::$destino !== null) {
            return self::$destino;
        }
        self::$destino = [self::DB_HOST, self::DB_PORT];

        if (self::CONTENEDOR_DOCKER_BD === '' || !function_exists('shell_exec')) {
            return self::$destino;
        }

        $redes = trim((string) @shell_exec(
            'docker inspect -f ' . escapeshellarg('{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}')
            . ' ' . escapeshellarg(self::CONTENEDOR_DOCKER_BD) . ' 2>/dev/null'
        ));
        if ($redes === '') {
            return self::$destino; // no hay contenedor: se usa DB_HOST y DB_PORT
        }
        $red = explode(' ', $redes)[0];

        self::borrarPuente();
        $salida = (string) @shell_exec(
            'docker run -d --rm --name ' . escapeshellarg(self::PUENTE_DOCKER)
            . ' --network ' . escapeshellarg($red)
            . ' -p ' . escapeshellarg('127.0.0.1:' . self::PUERTO_PUENTE . ':3306')
            . ' alpine/socat tcp-listen:3306,fork,reuseaddr '
            . escapeshellarg('tcp-connect:' . self::CONTENEDOR_DOCKER_BD . ':3306') . ' 2>&1'
        );
        $id = trim((string) @shell_exec(
            'docker ps -q -f ' . escapeshellarg('name=^' . self::PUENTE_DOCKER . '$')
        ));
        if ($id === '') {
            throw new RuntimeException("No se pudo crear el puente de Docker hacia la BD. Docker respondió:\n" . $salida);
        }
        register_shutdown_function([self::class, 'borrarPuente']);

        return self::$destino = ['127.0.0.1', self::PUERTO_PUENTE];
    }

    public static function borrarPuente(): void
    {
        if (self::CONTENEDOR_DOCKER_BD !== '' && function_exists('shell_exec')) {
            @shell_exec('docker rm -f ' . escapeshellarg(self::PUENTE_DOCKER) . ' >/dev/null 2>&1');
        }
    }

    public static function tearDownAfterClass(): void
    {
        self::borrarPuente();
    }

    /** Contraseña de la BD: DB_PASS, o si está vacía, DB_ROOT_PASS del archivo .env del proyecto. */
    private static function pass(): string
    {
        if (self::DB_PASS !== '') {
            return self::DB_PASS;
        }
        $archivoEnv = __DIR__ . '/../../.env';
        if (is_readable($archivoEnv)) {
            foreach (file($archivoEnv, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $linea) {
                if (preg_match('/^\s*(?:export\s+)?DB_ROOT_PASS\s*=\s*(.*)$/', $linea, $m)) {
                    return trim(trim($m[1]), "\"'");
                }
            }
        }
        return '';
    }

    private static function conexion(): PDO
    {
        if (self::$pdo === null) {
            if (stripos(self::DB_NAME, 'prueba') === false) {
                throw new RuntimeException('Por seguridad, DB_NAME debe contener la palabra "prueba".');
            }
            [$host, $puerto] = self::destino();
            for ($intento = 1; ; $intento++) {
                try {
                    self::$pdo = new PDO(
                        'mysql:host=' . $host . ';port=' . $puerto . ';charset=utf8mb4',
                        self::DB_USER,
                        self::pass(),
                        [
                            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                            PDO::ATTR_TIMEOUT            => 5,
                        ]
                    );
                    break;
                } catch (PDOException $e) {
                    // El puente de Docker puede tardar unos segundos en estar listo
                    if ($intento >= 10 || stripos($e->getMessage(), 'Access denied') !== false) {
                        throw new RuntimeException(
                            "No se pudo conectar a MariaDB en {$host}:{$puerto}. ¿Está prendido Docker? "
                            . '¿La contraseña (DB_PASS o DB_ROOT_PASS del .env) es correcta? ' . $e->getMessage()
                        );
                    }
                    sleep(1);
                }
            }
            self::$pdo->exec('CREATE DATABASE IF NOT EXISTS `' . self::DB_NAME . '` CHARACTER SET utf8mb4');
            self::$pdo->exec('USE `' . self::DB_NAME . '`');
        }
        return self::$pdo;
    }

    /** Crea las tablas que usan los PHP del perfil (versión mínima para pruebas). */
    private static function crearEsquema(): void
    {
        $pdo = self::conexion();
        foreach (['Actividades_Alumnos', 'Alumnos', 'Administradores', 'Usuarios', 'Empresas', 'Actividades', 'Carreras'] as $t) {
            $pdo->exec("DROP TABLE IF EXISTS `{$t}`");
        }
        $pdo->exec('CREATE TABLE Carreras (
            Id_carrera INT AUTO_INCREMENT PRIMARY KEY, Nombre VARCHAR(150) NOT NULL, Id_facultad INT NULL)');
        $pdo->exec('CREATE TABLE Usuarios (
            Id_usuario INT AUTO_INCREMENT PRIMARY KEY, Matricula VARCHAR(8) NOT NULL UNIQUE,
            Contrasena VARCHAR(255) NOT NULL DEFAULT "", Id_tipo_usuario INT NOT NULL,
            Activo TINYINT(1) NOT NULL DEFAULT 1, Fecha_registro DATETIME NULL,
            Profile_picture_path VARCHAR(255) NULL)');
        $pdo->exec('CREATE TABLE Administradores (
            Id_administrador INT AUTO_INCREMENT PRIMARY KEY, Id_usuario INT NOT NULL,
            Nombre VARCHAR(100) NOT NULL, Apellido_P VARCHAR(100) NULL, Apellido_M VARCHAR(100) NULL,
            Id_carrera INT NOT NULL, Telefono VARCHAR(20) NULL, Correo VARCHAR(150) NULL,
            Activo TINYINT(1) NOT NULL DEFAULT 1, Fecha_registro DATETIME NULL)');
        $pdo->exec('CREATE TABLE Alumnos (
            Id_alumno INT AUTO_INCREMENT PRIMARY KEY, Id_usuario INT NOT NULL,
            Nombre VARCHAR(100) NOT NULL, Apellido_P VARCHAR(100) NULL, Apellido_M VARCHAR(100) NULL,
            Id_carrera INT NOT NULL, Grupo VARCHAR(2) NULL, Horario VARCHAR(50) NULL,
            Activo TINYINT(1) NOT NULL DEFAULT 1, Fecha_registro DATETIME NULL)');
        $pdo->exec('CREATE TABLE Actividades (
            Id_servicio INT AUTO_INCREMENT PRIMARY KEY, Servicio VARCHAR(150) NOT NULL,
            Activo TINYINT(1) NOT NULL DEFAULT 1)');
        $pdo->exec('CREATE TABLE Empresas (
            Id_empresa INT AUTO_INCREMENT PRIMARY KEY, Nombre VARCHAR(200) NOT NULL,
            Descripcion TEXT NULL, Razon_social VARCHAR(200) NULL, RFC VARCHAR(13) NULL,
            Direccion TEXT NULL, Sitio_web VARCHAR(255) NULL,
            Activo TINYINT(1) NOT NULL DEFAULT 1, Fecha_registro DATETIME NULL)');
        $pdo->exec("CREATE TABLE Actividades_Alumnos (
            Id_alumno_servicio INT AUTO_INCREMENT PRIMARY KEY,
            No_expediente VARCHAR(15) NULL UNIQUE,
            Id_alumno INT NOT NULL, Id_servicio INT NOT NULL, Id_empresa INT NULL,
            Area VARCHAR(300) NULL, Programa VARCHAR(300) NULL,
            Estado ENUM('PENDIENTE','EN_CURSO','COMPLETADO','CANCELADO') NOT NULL DEFAULT 'PENDIENTE',
            periodo_tipo ENUM('primavera','otoño') NULL, `periodo_año` YEAR NULL,
            Fecha_inicio DATE NULL, Fecha_fin DATE NULL,
            Fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            Fecha_modificacion DATETIME NULL ON UPDATE CURRENT_TIMESTAMP)");
    }

    // ---------- Datos de prueba ----------

    private static function insertar(string $tabla, array $fila): int
    {
        $columnas = implode(', ', array_map(fn ($c) => "`$c`", array_keys($fila)));
        $marcas   = implode(', ', array_fill(0, count($fila), '?'));
        self::conexion()->prepare("INSERT INTO `$tabla` ($columnas) VALUES ($marcas)")->execute(array_values($fila));
        return (int) self::conexion()->lastInsertId();
    }

    private static function filas(string $sql, array $valores = []): array
    {
        $stmt = self::conexion()->prepare($sql);
        $stmt->execute($valores);
        return $stmt->fetchAll();
    }

    /** Crea un alumno (usuario tipo 2). Regresa [Id_usuario, Id_alumno]. */
    private static function crearAlumno(array $cambios = []): array
    {
        static $n = 0;
        $carrera = self::insertar('Carreras', ['Nombre' => 'Ing. en Computación']);
        $idUsuario = self::insertar('Usuarios', [
            'Matricula' => sprintf('2023%04d', ++$n), 'Id_tipo_usuario' => 2,
            'Fecha_registro' => '2026-01-15 10:30:00', 'Profile_picture_path' => null,
        ]);
        $idAlumno = self::insertar('Alumnos', array_merge([
            'Id_usuario' => $idUsuario, 'Nombre' => 'Ana', 'Apellido_P' => 'López', 'Apellido_M' => 'Ruiz',
            'Id_carrera' => $carrera, 'Grupo' => '7A', 'Horario' => '08:00 - 14:00',
            'Fecha_registro' => '2026-01-15 10:30:00',
        ], $cambios));
        return [$idUsuario, $idAlumno];
    }

    /** Crea un administrador (tipo 1) o coordinador (tipo 3). Regresa Id_usuario. */
    private static function crearAdmin(int $tipo = 3, array $cambios = []): int
    {
        $carrera = self::insertar('Carreras', ['Nombre' => 'Ing. Química']);
        $idUsuario = self::insertar('Usuarios', [
            'Matricula' => (string) random_int(1000, 9999), 'Id_tipo_usuario' => $tipo,
            'Profile_picture_path' => '../uploads/Perfil/3-1.jpg',
        ]);
        self::insertar('Administradores', array_merge([
            'Id_usuario' => $idUsuario, 'Nombre' => 'Luis', 'Apellido_P' => 'Pérez', 'Apellido_M' => 'Gómez',
            'Id_carrera' => $carrera, 'Telefono' => '246-5444-885', 'Correo' => 'luis@uatx.mx',
            'Fecha_registro' => '2025-08-01 09:00:00',
        ], $cambios));
        return $idUsuario;
    }

    private static function crearServicio(string $nombre = 'Servicio social'): int
    {
        return self::insertar('Actividades', ['Servicio' => $nombre]);
    }

    private static function crearEmpresa(string $nombre = 'Acme', int $activo = 1): int
    {
        return self::insertar('Empresas', ['Nombre' => $nombre, 'Activo' => $activo]);
    }

    /** Crea una actividad del alumno. Por defecto: PENDIENTE, con área, programa y fechas. */
    private static function crearActividad(int $idAlumno, array $cambios = []): int
    {
        static $n = 0;
        return self::insertar('Actividades_Alumnos', array_merge([
            'No_expediente' => 'EXP-' . (++$n), 'Id_alumno' => $idAlumno, 'Id_servicio' => self::crearServicio(),
            'Id_empresa' => null, 'Area' => 'Sistemas', 'Programa' => 'Apoyo TI', 'Estado' => 'PENDIENTE',
            'periodo_tipo' => 'primavera', 'periodo_año' => 2026,
            'Fecha_inicio' => '2026-02-01', 'Fecha_fin' => '2026-06-30',
        ], $cambios));
    }

    private static function actividad(int $id): array
    {
        return self::filas('SELECT * FROM Actividades_Alumnos WHERE Id_alumno_servicio = ?', [$id])[0];
    }

    // ---------- Llamar a los PHP ----------

    /**
     * Ejecuta un PHP del perfil y regresa [código HTTP, JSON].
     * Opciones: datos (arreglo que se manda como JSON), cuerpo (texto crudo),
     *           sesion ([tipo, id] o null), post, files, sinBD (simula BD caída).
     */
    private function llamar(string $archivo, array $op = []): array
    {
        $archivoCodigo = tempnam(sys_get_temp_dir(), 'ops_codigo_');
        $cuerpo = $op['cuerpo'] ?? (isset($op['datos']) ? json_encode($op['datos']) : '');
        $sesion = array_key_exists('sesion', $op) ? $op['sesion'] : null;
        $cookies = $sesion ? ['Id_tipo_usuario' => (string) $sesion[0], 'Id_usuario' => (string) $sesion[1]] : [];

        $entorno = [
            'OPS_COOKIES' => json_encode($cookies),
            'OPS_POST' => json_encode($op['post'] ?? []),
            'OPS_FILES' => json_encode($op['files'] ?? []),
            'OPS_ARCHIVO_CODIGO' => $archivoCodigo,
        ];
        if (!empty($op['sinBD'])) {
            $entorno['OPS_FORZAR_ERROR_DB'] = '1';
        }

        $resultado = self::ejecutarPhp($archivo, $cuerpo, $entorno);
        $codigo = (int) file_get_contents($archivoCodigo);
        @unlink($archivoCodigo);

        $this->assertIsArray($resultado['json'], "{$archivo} no respondió JSON válido. Respondió:\n"
            . $resultado['salida'] . "\n" . $resultado['errores']);
        return [$codigo, $resultado['json']];
    }

    private function assertError(int $codigo, string $mensaje, array $resultado): void
    {
        $this->assertSame([$codigo, ['success' => false, 'error' => $mensaje]], $resultado);
    }

    // =====================================================================
    // obtener_datos.php
    // =====================================================================

    /**
     * Función   : obtener_datos.php › sesion().
     * Comprueba : que sin cookies de sesión responde 401 "No hay sesión activa".
     *
     * @testdox [obtener_datos.php › sesion] Comprueba que sin sesión responde 401
     */
    #[TestDox('[obtener_datos.php › sesion] Comprueba que sin sesión responde 401')]
    public function test_obtener_datos_sin_sesion(): void
    {
        $this->assertError(401, 'No hay sesión activa', $this->llamar('obtener_datos.php'));
    }

    /**
     * Función   : obtener_datos.php › bloque principal (tipo de usuario).
     * Comprueba : que un tipo de usuario desconocido responde 403.
     *
     * @testdox [obtener_datos.php] Comprueba que un tipo de usuario desconocido responde 403
     */
    #[TestDox('[obtener_datos.php] Comprueba que un tipo de usuario desconocido responde 403')]
    public function test_obtener_datos_tipo_no_valido(): void
    {
        $this->assertError(403, 'Tipo de usuario no válido', $this->llamar('obtener_datos.php', ['sesion' => [9, 1]]));
    }

    /**
     * Función   : obtener_datos.php › consulta del administrador/coordinador.
     * Comprueba : que regresa sus datos con el nombre de su carrera, la fecha
     *             recortada a AAAA-MM-DD y sin catálogos.
     *
     * @testdox [obtener_datos.php] Comprueba que regresa los datos del coordinador
     */
    #[TestDox('[obtener_datos.php] Comprueba que regresa los datos del coordinador')]
    public function test_obtener_datos_coordinador(): void
    {
        $id = self::crearAdmin(3);

        [$codigo, $r] = $this->llamar('obtener_datos.php', ['sesion' => [3, $id]]);

        $this->assertSame(200, $codigo);
        $this->assertTrue($r['success']);
        $this->assertSame([
            'Nombre' => 'Luis', 'Apellido_P' => 'Pérez', 'Apellido_M' => 'Gómez', 'Telefono' => '246-5444-885',
            'Correo' => 'luis@uatx.mx', 'Fecha_registro' => '2025-08-01',
            'Profile_picture_path' => '../uploads/Perfil/3-1.jpg', 'Nombre_Carrera' => 'Ing. Química',
        ], $r['datos']);
        $this->assertNull($r['catalogos']);
    }

    /**
     * Función   : obtener_datos.php › if (!$fila).
     * Comprueba : que si el usuario no tiene perfil responde 404.
     *
     * @testdox [obtener_datos.php] Comprueba que sin perfil responde 404
     */
    #[TestDox('[obtener_datos.php] Comprueba que sin perfil responde 404')]
    public function test_obtener_datos_sin_perfil(): void
    {
        $this->assertError(404, 'No se encontró el perfil', $this->llamar('obtener_datos.php', ['sesion' => [1, 999]]));
        $this->assertError(404, 'No se encontró el perfil', $this->llamar('obtener_datos.php', ['sesion' => [2, 999]]));
    }

    /**
     * Función   : obtener_datos.php › consulta del alumno y obtenerCatalogos().
     * Comprueba : que un alumno sin actividad recibe Tiene_actividad = false,
     *             no recibe su Id_alumno, y recibe los catálogos (solo empresas
     *             activas, servicios y periodos) ordenados.
     *
     * @testdox [obtener_datos.php › obtenerCatalogos] Comprueba los datos y catálogos de un alumno sin actividad
     */
    #[TestDox('[obtener_datos.php › obtenerCatalogos] Comprueba los datos y catálogos de un alumno sin actividad')]
    public function test_obtener_datos_alumno_sin_actividad(): void
    {
        [$idUsuario] = self::crearAlumno();
        $beta = self::crearEmpresa('Beta');
        $acme = self::crearEmpresa('Acme');
        self::crearEmpresa('Cerrada', 0);
        $social = self::crearServicio('Servicio social');
        $practicas = self::crearServicio('Prácticas profesionales');

        [$codigo, $r] = $this->llamar('obtener_datos.php', ['sesion' => [2, $idUsuario]]);

        $this->assertSame(200, $codigo);
        $this->assertSame('Ana', $r['datos']['Nombre']);
        $this->assertSame('Ing. en Computación', $r['datos']['Nombre_Carrera']);
        $this->assertSame('2026-01-15', $r['datos']['Fecha_registro']);
        $this->assertFalse($r['datos']['Tiene_actividad']);
        $this->assertArrayNotHasKey('Id_alumno', $r['datos']);
        $this->assertSame([['Id_empresa' => $acme, 'Nombre' => 'Acme'], ['Id_empresa' => $beta, 'Nombre' => 'Beta']], $r['catalogos']['empresas']);
        $this->assertSame([
            ['Id_servicio' => $practicas, 'Servicio' => 'Prácticas profesionales'],
            ['Id_servicio' => $social, 'Servicio' => 'Servicio social'],
        ], $r['catalogos']['servicios']);
        $this->assertSame(['primavera', 'otoño'], $r['catalogos']['periodos']);
    }

    /**
     * Función   : obtener_datos.php › consulta de la actividad vigente.
     * Comprueba : que si hay una actividad abierta se muestra esa (aunque haya
     *             otra cerrada más reciente), con su servicio, empresa y fechas.
     *
     * @testdox [obtener_datos.php] Comprueba que muestra la actividad abierta antes que una cerrada
     */
    #[TestDox('[obtener_datos.php] Comprueba que muestra la actividad abierta antes que una cerrada')]
    public function test_obtener_datos_prefiere_actividad_abierta(): void
    {
        [$idUsuario, $idAlumno] = self::crearAlumno();
        $empresa = self::crearEmpresa('Acme');
        self::crearActividad($idAlumno, ['No_expediente' => 'ABIERTA', 'Estado' => 'EN_CURSO', 'Id_empresa' => $empresa,
            'Fecha_registro' => '2026-01-01 08:00:00']);
        self::crearActividad($idAlumno, ['No_expediente' => 'CERRADA', 'Estado' => 'COMPLETADO',
            'Fecha_registro' => '2026-03-01 08:00:00']);

        [, $r] = $this->llamar('obtener_datos.php', ['sesion' => [2, $idUsuario]]);

        $this->assertTrue($r['datos']['Tiene_actividad']);
        $this->assertSame('ABIERTA', $r['datos']['No_expediente']);
        $this->assertSame('EN_CURSO', $r['datos']['Estado']);
        $this->assertSame('Servicio social', $r['datos']['Nombre_servicio']);
        $this->assertSame('Acme', $r['datos']['Nombre_empresa']);
        $this->assertSame('2026-01-01', $r['datos']['Fecha_registro_act']);
        $this->assertSame('2026-02-01', $r['datos']['Fecha_inicio']);
    }

    /**
     * Función   : obtener_datos.php › consulta de la actividad vigente (sin abiertas).
     * Comprueba : que si todas están cerradas se muestra la más reciente.
     *
     * @testdox [obtener_datos.php] Comprueba que sin actividades abiertas muestra la más reciente
     */
    #[TestDox('[obtener_datos.php] Comprueba que sin actividades abiertas muestra la más reciente')]
    public function test_obtener_datos_muestra_la_mas_reciente(): void
    {
        [$idUsuario, $idAlumno] = self::crearAlumno();
        self::crearActividad($idAlumno, ['No_expediente' => 'VIEJA', 'Estado' => 'COMPLETADO', 'Fecha_registro' => '2025-01-01']);
        self::crearActividad($idAlumno, ['No_expediente' => 'NUEVA', 'Estado' => 'CANCELADO', 'Fecha_registro' => '2026-01-01']);

        [, $r] = $this->llamar('obtener_datos.php', ['sesion' => [2, $idUsuario]]);

        $this->assertSame('NUEVA', $r['datos']['No_expediente']);
    }

    /**
     * Función   : obtener_datos.php › responderExcepcion().
     * Comprueba : que si no se puede conectar a la BD responde 500 con el error.
     *
     * @testdox [obtener_datos.php › responderExcepcion] Comprueba que sin conexión a la BD responde 500
     */
    #[TestDox('[obtener_datos.php › responderExcepcion] Comprueba que sin conexión a la BD responde 500')]
    public function test_obtener_datos_sin_bd(): void
    {
        [$codigo, $r] = $this->llamar('obtener_datos.php', ['sesion' => [2, 1], 'sinBD' => true]);

        $this->assertSame(500, $codigo);
        $this->assertFalse($r['success']);
        $this->assertStringStartsWith('Error en obtener_datos.php: ', $r['error']);
    }

    // =====================================================================
    // crear.php
    // =====================================================================

    /**
     * Función   : crear.php › sesion() y leerDatos().
     * Comprueba : que sin sesión responde 401 y con datos que no son JSON responde 400.
     *
     * @testdox [crear.php › sesion / leerDatos] Comprueba que exige sesión y datos JSON
     */
    #[TestDox('[crear.php › sesion / leerDatos] Comprueba que exige sesión y datos JSON')]
    public function test_crear_exige_sesion_y_datos(): void
    {
        $this->assertError(401, 'No hay sesión activa', $this->llamar('crear.php', ['datos' => ['accion' => 'empresa']]));
        $this->assertError(400, 'Datos inválidos', $this->llamar('crear.php', ['sesion' => [2, 1], 'cuerpo' => 'hola']));
    }

    /**
     * Función   : crear.php › switch (accion).
     * Comprueba : que una acción distinta de "actividad" o "empresa" responde 400.
     *
     * @testdox [crear.php] Comprueba que una acción desconocida responde 400
     */
    #[TestDox('[crear.php] Comprueba que una acción desconocida responde 400')]
    public function test_crear_accion_no_valida(): void
    {
        $this->assertError(400, 'Acción no válida', $this->llamar('crear.php', ['sesion' => [2, 1], 'datos' => ['accion' => 'borrar']]));
    }

    /** Datos válidos para crear una actividad. */
    private static function nuevaActividad(int $idServicio, array $cambios = []): array
    {
        return array_merge(['accion' => 'actividad', 'no_expediente' => 'exp-2026/01', 'id_servicio' => (string) $idServicio,
            'periodo_tipo' => 'Otoño', 'periodo_anio' => '2026'], $cambios);
    }

    /**
     * Función   : crear.php › crearActividad() (permiso).
     * Comprueba : que solo un alumno puede crear actividades (403 para coordinador).
     *
     * @testdox [crear.php › crearActividad] Comprueba que solo los alumnos pueden crear actividades
     */
    #[TestDox('[crear.php › crearActividad] Comprueba que solo los alumnos pueden crear actividades')]
    public function test_crear_actividad_solo_alumnos(): void
    {
        $r = $this->llamar('crear.php', ['sesion' => [3, 1], 'datos' => self::nuevaActividad(1)]);

        $this->assertError(403, 'Solo los alumnos pueden crear actividades', $r);
    }

    public static function actividadesInvalidas(): array
    {
        return [
            'expediente vacío'          => [['no_expediente' => ''], 'No. de expediente inválido (máx. 15: letras, números, - o /)'],
            'expediente con espacios'   => [['no_expediente' => 'EXP 01'], 'No. de expediente inválido (máx. 15: letras, números, - o /)'],
            'expediente de 16'          => [['no_expediente' => str_repeat('A', 16)], 'No. de expediente inválido (máx. 15: letras, números, - o /)'],
            'servicio no numérico'      => [['id_servicio' => 'abc'], 'Selecciona un servicio'],
            'periodo inválido'          => [['periodo_tipo' => 'verano'], 'Selecciona el periodo (primavera u otoño)'],
            'año 1999'                  => [['periodo_anio' => '1999'], 'Año del periodo inválido'],
            'año 2156'                  => [['periodo_anio' => '2156'], 'Año del periodo inválido'],
            'año con letras'            => [['periodo_anio' => '20a6'], 'Año del periodo inválido'],
        ];
    }

    /**
     * Función   : crear.php › crearActividad() (validaciones).
     * Comprueba : que los datos inválidos responden 422 con su mensaje y no se guarda nada.
     *
     * @testdox [crear.php › crearActividad] Comprueba que rechaza datos inválidos con 422
     * @dataProvider actividadesInvalidas
     */
    #[TestDox('[crear.php › crearActividad] Comprueba que rechaza datos inválidos con 422')]
    #[DataProvider('actividadesInvalidas')]
    public function test_crear_actividad_valida_datos(array $cambios, string $mensaje): void
    {
        [$idUsuario] = self::crearAlumno();
        $servicio = self::crearServicio();

        $r = $this->llamar('crear.php', ['sesion' => [2, $idUsuario], 'datos' => self::nuevaActividad($servicio, $cambios)]);

        $this->assertError(422, $mensaje, $r);
        $this->assertSame([], self::filas('SELECT * FROM Actividades_Alumnos'));
    }

    /**
     * Función   : crear.php › crearActividad() (alumno inexistente).
     * Comprueba : que si el usuario no tiene registro de alumno responde 404.
     *
     * @testdox [crear.php › crearActividad] Comprueba que sin registro de alumno responde 404
     */
    #[TestDox('[crear.php › crearActividad] Comprueba que sin registro de alumno responde 404')]
    public function test_crear_actividad_alumno_inexistente(): void
    {
        $r = $this->llamar('crear.php', ['sesion' => [2, 999], 'datos' => self::nuevaActividad(self::crearServicio())]);

        $this->assertError(404, 'No se encontró el alumno', $r);
    }

    public static function estadosAbiertos(): array
    {
        return ['PENDIENTE' => ['PENDIENTE'], 'EN_CURSO' => ['EN_CURSO']];
    }

    /**
     * Función   : crear.php › crearActividad() (actividad abierta).
     * Comprueba : que si el alumno ya tiene una actividad PENDIENTE o EN_CURSO
     *             responde 409 y no crea otra.
     *
     * @testdox [crear.php › crearActividad] Comprueba que no deja crear otra actividad si hay una abierta
     * @dataProvider estadosAbiertos
     */
    #[TestDox('[crear.php › crearActividad] Comprueba que no deja crear otra actividad si hay una abierta')]
    #[DataProvider('estadosAbiertos')]
    public function test_crear_actividad_con_actividad_abierta(string $estado): void
    {
        [$idUsuario, $idAlumno] = self::crearAlumno();
        self::crearActividad($idAlumno, ['Estado' => $estado]);

        $r = $this->llamar('crear.php', ['sesion' => [2, $idUsuario], 'datos' => self::nuevaActividad(self::crearServicio())]);

        $this->assertError(409, 'Ya tienes una actividad abierta. Debes completarla antes de iniciar otra.', $r);
        $this->assertCount(1, self::filas('SELECT * FROM Actividades_Alumnos'));
    }

    /**
     * Función   : crear.php › crearActividad() (servicio).
     * Comprueba : que si el servicio no existe responde 422.
     *
     * @testdox [crear.php › crearActividad] Comprueba que un servicio inexistente responde 422
     */
    #[TestDox('[crear.php › crearActividad] Comprueba que un servicio inexistente responde 422')]
    public function test_crear_actividad_servicio_inexistente(): void
    {
        [$idUsuario] = self::crearAlumno();

        $r = $this->llamar('crear.php', ['sesion' => [2, $idUsuario], 'datos' => self::nuevaActividad(999)]);

        $this->assertError(422, 'El servicio seleccionado no existe', $r);
    }

    /**
     * Función   : crear.php › crearActividad() (expediente único).
     * Comprueba : que si el No. de expediente ya existe (aunque sea de otro
     *             alumno) responde 409.
     *
     * @testdox [crear.php › crearActividad] Comprueba que el No. de expediente no se puede repetir
     */
    #[TestDox('[crear.php › crearActividad] Comprueba que el No. de expediente no se puede repetir')]
    public function test_crear_actividad_expediente_repetido(): void
    {
        [, $otroAlumno] = self::crearAlumno();
        self::crearActividad($otroAlumno, ['No_expediente' => 'EXP-2026/01', 'Estado' => 'COMPLETADO']);
        [$idUsuario] = self::crearAlumno();

        $r = $this->llamar('crear.php', ['sesion' => [2, $idUsuario], 'datos' => self::nuevaActividad(self::crearServicio())]);

        $this->assertError(409, 'Ese número de expediente ya está registrado', $r);
    }

    /**
     * Función   : crear.php › crearActividad() (alta).
     * Comprueba : que crea la actividad PENDIENTE con el expediente en
     *             mayúsculas y el periodo en minúsculas, aunque el alumno tenga
     *             actividades anteriores ya completadas.
     *
     * @testdox [crear.php › crearActividad] Comprueba que crea la nueva actividad como PENDIENTE
     */
    #[TestDox('[crear.php › crearActividad] Comprueba que crea la nueva actividad como PENDIENTE')]
    public function test_crear_actividad_exito(): void
    {
        [$idUsuario, $idAlumno] = self::crearAlumno();
        self::crearActividad($idAlumno, ['Estado' => 'COMPLETADO']);
        $servicio = self::crearServicio('Prácticas profesionales');

        $r = $this->llamar('crear.php', ['sesion' => [2, $idUsuario], 'datos' => self::nuevaActividad($servicio)]);

        $this->assertSame([200, ['success' => true]], $r);
        $nueva = self::filas("SELECT * FROM Actividades_Alumnos WHERE Estado = 'PENDIENTE'")[0];
        $this->assertSame('EXP-2026/01', $nueva['No_expediente']);
        $this->assertSame($idAlumno, (int) $nueva['Id_alumno']);
        $this->assertSame($servicio, (int) $nueva['Id_servicio']);
        $this->assertSame('otoño', $nueva['periodo_tipo']);
        $this->assertSame(2026, (int) $nueva['periodo_año']);
    }

    /** Datos válidos para crear una empresa. */
    private static function nuevaEmpresa(array $cambios = []): array
    {
        return array_merge(['accion' => 'empresa', 'nombre' => 'Nueva SA', 'descripcion' => 'Software',
            'razon_social' => 'Nueva Sociedad Anónima', 'rfc' => 'nue123456ab1', 'direccion' => 'Calle 1, Tlaxcala',
            'sitio_web' => 'nueva.mx'], $cambios);
    }

    public static function empresasInvalidas(): array
    {
        return [
            'nombre de 1 letra'          => [['nombre' => 'A'], 'El nombre debe tener entre 2 y 100 caracteres'],
            'nombre de 101 letras'       => [['nombre' => str_repeat('a', 101)], 'El nombre debe tener entre 2 y 100 caracteres'],
            'descripción de 501'         => [['descripcion' => str_repeat('a', 501)], 'Algún campo excede la longitud permitida'],
            'razón social de 151'        => [['razon_social' => str_repeat('a', 151)], 'Algún campo excede la longitud permitida'],
            'dirección de 201'           => [['direccion' => str_repeat('a', 201)], 'Algún campo excede la longitud permitida'],
            'RFC inválido'               => [['rfc' => '123'], 'RFC inválido'],
            'sitio web inválido'         => [['sitio_web' => 'no es web'], 'Sitio web inválido'],
        ];
    }

    /**
     * Función   : crear.php › crearEmpresa() (validaciones).
     * Comprueba : que los datos inválidos de la empresa responden 422 y no se guarda.
     *
     * @testdox [crear.php › crearEmpresa] Comprueba que rechaza datos inválidos con 422
     * @dataProvider empresasInvalidas
     */
    #[TestDox('[crear.php › crearEmpresa] Comprueba que rechaza datos inválidos con 422')]
    #[DataProvider('empresasInvalidas')]
    public function test_crear_empresa_valida_datos(array $cambios, string $mensaje): void
    {
        $r = $this->llamar('crear.php', ['sesion' => [2, 1], 'datos' => self::nuevaEmpresa($cambios)]);

        $this->assertError(422, $mensaje, $r);
        $this->assertSame([], self::filas('SELECT * FROM Empresas'));
    }

    /**
     * Función   : crear.php › crearEmpresa() (alta).
     * Comprueba : que guarda la empresa activa, con el RFC en mayúsculas y el
     *             sitio web con https://, y regresa su Id y nombre.
     *
     * @testdox [crear.php › crearEmpresa] Comprueba que crea la empresa y regresa su Id
     */
    #[TestDox('[crear.php › crearEmpresa] Comprueba que crea la empresa y regresa su Id')]
    public function test_crear_empresa_exito(): void
    {
        [$codigo, $r] = $this->llamar('crear.php', ['sesion' => [2, 1], 'datos' => self::nuevaEmpresa()]);

        $this->assertSame(200, $codigo);
        $this->assertTrue($r['success']);
        $this->assertSame('Nueva SA', $r['nombre']);
        $empresa = self::filas('SELECT * FROM Empresas')[0];
        $this->assertSame((int) $empresa['Id_empresa'], (int) $r['id_empresa']);
        $this->assertSame('NUE123456AB1', $empresa['RFC']);
        $this->assertSame('https://nueva.mx', $empresa['Sitio_web']);
        $this->assertSame('Nueva Sociedad Anónima', $empresa['Razon_social']);
        $this->assertSame(1, (int) $empresa['Activo']);
    }

    /**
     * Función   : crear.php › crearEmpresa() (empresa repetida).
     * Comprueba : que si ya existe una empresa con el mismo nombre (sin importar
     *             mayúsculas) responde 409: si está activa regresa su Id para
     *             seleccionarla; si está inactiva regresa Id null. No se duplica.
     *
     * @testdox [crear.php › crearEmpresa] Comprueba que no duplica empresas con el mismo nombre
     */
    #[TestDox('[crear.php › crearEmpresa] Comprueba que no duplica empresas con el mismo nombre')]
    public function test_crear_empresa_repetida(): void
    {
        $activa = self::crearEmpresa('Nueva SA');
        self::crearEmpresa('Vieja SA', 0);

        $r1 = $this->llamar('crear.php', ['sesion' => [2, 1], 'datos' => self::nuevaEmpresa(['nombre' => 'NUEVA sa'])]);
        $r2 = $this->llamar('crear.php', ['sesion' => [2, 1], 'datos' => self::nuevaEmpresa(['nombre' => 'Vieja SA'])]);

        $this->assertSame([409, ['success' => false, 'error' => 'Ya existe una empresa con ese nombre; se seleccionó en la lista.',
            'id_empresa' => $activa, 'nombre' => 'Nueva SA']], $r1);
        $this->assertSame([409, ['success' => false, 'error' => 'Ya existe una empresa con ese nombre pero está inactiva.',
            'id_empresa' => null, 'nombre' => 'Vieja SA']], $r2);
        $this->assertCount(2, self::filas('SELECT * FROM Empresas'));
    }

    /**
     * Función   : crear.php › responderExcepcion().
     * Comprueba : que si no se puede conectar a la BD responde 500.
     *
     * @testdox [crear.php › responderExcepcion] Comprueba que sin conexión a la BD responde 500
     */
    #[TestDox('[crear.php › responderExcepcion] Comprueba que sin conexión a la BD responde 500')]
    public function test_crear_sin_bd(): void
    {
        [$codigo, $r] = $this->llamar('crear.php', ['sesion' => [2, 1], 'datos' => self::nuevaEmpresa(), 'sinBD' => true]);

        $this->assertSame(500, $codigo);
        $this->assertStringStartsWith('Error en crear.php: ', $r['error']);
    }

    // =====================================================================
    // guardar_datos.php
    // =====================================================================

    /**
     * Función   : guardar_datos.php › sesion(), esEntero() y leerDatos().
     * Comprueba : sin sesión → 401; sesión con valores no numéricos → 400;
     *             datos que no son JSON → 400.
     *
     * @testdox [guardar_datos.php › sesion / leerDatos] Comprueba que exige sesión válida y datos JSON
     */
    #[TestDox('[guardar_datos.php › sesion / leerDatos] Comprueba que exige sesión válida y datos JSON')]
    public function test_guardar_exige_sesion_y_datos(): void
    {
        $this->assertError(401, 'No hay sesión activa', $this->llamar('guardar_datos.php', ['datos' => []]));
        $this->assertError(400, 'Sesión inválida', $this->llamar('guardar_datos.php', ['sesion' => ['2', 'abc'], 'datos' => []]));
        $this->assertError(400, 'Datos inválidos', $this->llamar('guardar_datos.php', ['sesion' => [2, 1], 'cuerpo' => 'hola']));
    }

    /**
     * Función   : guardar_datos.php › bloque principal (tipo de usuario).
     * Comprueba : que un tipo de usuario desconocido responde 403.
     *
     * @testdox [guardar_datos.php] Comprueba que un tipo de usuario desconocido responde 403
     */
    #[TestDox('[guardar_datos.php] Comprueba que un tipo de usuario desconocido responde 403')]
    public function test_guardar_tipo_no_valido(): void
    {
        $this->assertError(403, 'Tipo de usuario no válido', $this->llamar('guardar_datos.php', ['sesion' => [9, 1], 'datos' => []]));
    }

    /**
     * Función   : guardar_datos.php › guardarAdmin() y leerDatos() (FormData).
     * Comprueba : que guarda teléfono y correo del coordinador cuando llegan en
     *             el campo "datos" de un FormData, como los manda el navegador.
     *
     * @testdox [guardar_datos.php › guardarAdmin] Comprueba que guarda teléfono y correo (FormData)
     */
    #[TestDox('[guardar_datos.php › guardarAdmin] Comprueba que guarda teléfono y correo (FormData)')]
    public function test_guardar_admin_exito(): void
    {
        $id = self::crearAdmin(3);

        $r = $this->llamar('guardar_datos.php', ['sesion' => [3, $id], 'post' => [
            'datos' => json_encode(['telefono_administrador' => '246-1111-222', 'correo_administrador' => 'nuevo@uatx.mx']),
        ]]);

        $this->assertSame([200, ['success' => true, 'url' => null]], $r);
        $admin = self::filas('SELECT Telefono, Correo FROM Administradores WHERE Id_usuario = ?', [$id])[0];
        $this->assertSame(['Telefono' => '246-1111-222', 'Correo' => 'nuevo@uatx.mx'], $admin);
    }

    public static function adminInvalidos(): array
    {
        return [
            'teléfono sin guiones' => [['telefono_administrador' => '2461111222'], 'Formato de teléfono: 246-5444-885'],
            'teléfono vacío'       => [['telefono_administrador' => ''], 'Formato de teléfono: 246-5444-885'],
            'correo sin @'         => [['correo_administrador' => 'nuevo.uatx.mx'], 'Correo inválido'],
        ];
    }

    /**
     * Función   : guardar_datos.php › guardarAdmin() (validaciones).
     * Comprueba : que teléfono o correo inválidos responden 422 y no se guarda nada.
     *
     * @testdox [guardar_datos.php › guardarAdmin] Comprueba que rechaza teléfono o correo inválidos
     * @dataProvider adminInvalidos
     */
    #[TestDox('[guardar_datos.php › guardarAdmin] Comprueba que rechaza teléfono o correo inválidos')]
    #[DataProvider('adminInvalidos')]
    public function test_guardar_admin_invalido(array $cambios, string $mensaje): void
    {
        $id = self::crearAdmin(1);
        $datos = array_merge(['telefono_administrador' => '246-1111-222', 'correo_administrador' => 'nuevo@uatx.mx'], $cambios);

        $r = $this->llamar('guardar_datos.php', ['sesion' => [1, $id], 'datos' => $datos]);

        $this->assertError(422, $mensaje, $r);
        $this->assertSame('luis@uatx.mx', self::filas('SELECT Correo FROM Administradores')[0]['Correo']);
    }

    /**
     * Función   : guardar_datos.php › guardarAdmin() (if (!$datos) return).
     * Comprueba : que si solo cambió la foto (datos vacíos) no se toca la BD.
     *
     * @testdox [guardar_datos.php › guardarAdmin] Comprueba que con datos vacíos no cambia nada
     */
    #[TestDox('[guardar_datos.php › guardarAdmin] Comprueba que con datos vacíos no cambia nada')]
    public function test_guardar_admin_sin_datos(): void
    {
        $id = self::crearAdmin(3);

        $r = $this->llamar('guardar_datos.php', ['sesion' => [3, $id], 'datos' => []]);

        $this->assertSame([200, ['success' => true, 'url' => null]], $r);
        $this->assertSame('246-5444-885', self::filas('SELECT Telefono FROM Administradores')[0]['Telefono']);
    }

    /**
     * Función   : guardar_datos.php › guardarAlumno() (alumno inexistente).
     * Comprueba : que si el usuario no tiene registro de alumno responde 404.
     *
     * @testdox [guardar_datos.php › guardarAlumno] Comprueba que sin registro de alumno responde 404
     */
    #[TestDox('[guardar_datos.php › guardarAlumno] Comprueba que sin registro de alumno responde 404')]
    public function test_guardar_alumno_inexistente(): void
    {
        $this->assertError(404, 'No se encontró el alumno', $this->llamar('guardar_datos.php', ['sesion' => [2, 999], 'datos' => ['grupo' => '1A']]));
    }

    public static function datosPersonalesInvalidos(): array
    {
        return [
            'grupo 0A'               => [['grupo' => '0A'], 'El semestre y grupo debe ser un número (1-9) y una letra. Ejemplo: 1A'],
            'grupo de 3 caracteres'  => [['grupo' => '10A'], 'El semestre y grupo debe ser un número (1-9) y una letra. Ejemplo: 1A'],
            'horario sin guion'      => [['horario' => '08:00 14:00'], 'Formato de horario inválido'],
            'hora 25:00'             => [['horario' => '08:00 - 25:00'], 'Formato de horario inválido'],
            'salida antes de entrada'=> [['horario' => '14:00 - 08:00'], 'La hora de salida debe ser posterior a la de entrada'],
        ];
    }

    /**
     * Función   : guardar_datos.php › guardarAlumno() (datos personales).
     * Comprueba : que grupo u horario inválidos responden 422 y no se guardan.
     *
     * @testdox [guardar_datos.php › guardarAlumno] Comprueba que rechaza grupo u horario inválidos
     * @dataProvider datosPersonalesInvalidos
     */
    #[TestDox('[guardar_datos.php › guardarAlumno] Comprueba que rechaza grupo u horario inválidos')]
    #[DataProvider('datosPersonalesInvalidos')]
    public function test_guardar_alumno_datos_personales_invalidos(array $datos, string $mensaje): void
    {
        [$idUsuario] = self::crearAlumno();

        $r = $this->llamar('guardar_datos.php', ['sesion' => [2, $idUsuario], 'datos' => $datos]);

        $this->assertError(422, $mensaje, $r);
        $this->assertSame(['Grupo' => '7A', 'Horario' => '08:00 - 14:00'], self::filas('SELECT Grupo, Horario FROM Alumnos')[0]);
    }

    /**
     * Función   : guardar_datos.php › guardarAlumno() (datos personales).
     * Comprueba : que guarda grupo (en mayúsculas) y horario, y que si solo se
     *             manda uno de los dos el otro se conserva.
     *
     * @testdox [guardar_datos.php › guardarAlumno] Comprueba que guarda grupo y horario
     */
    #[TestDox('[guardar_datos.php › guardarAlumno] Comprueba que guarda grupo y horario')]
    public function test_guardar_alumno_datos_personales(): void
    {
        [$idUsuario] = self::crearAlumno();

        $this->assertSame([200, ['success' => true, 'url' => null]],
            $this->llamar('guardar_datos.php', ['sesion' => [2, $idUsuario], 'datos' => ['grupo' => '8b', 'horario' => '09:00 - 13:30']]));
        $this->assertSame(['Grupo' => '8B', 'Horario' => '09:00 - 13:30'], self::filas('SELECT Grupo, Horario FROM Alumnos')[0]);

        $this->llamar('guardar_datos.php', ['sesion' => [2, $idUsuario], 'datos' => ['grupo' => '9C']]);
        $this->assertSame(['Grupo' => '9C', 'Horario' => '09:00 - 13:30'], self::filas('SELECT Grupo, Horario FROM Alumnos')[0]);
    }

    /**
     * Función   : guardar_datos.php › guardarAlumno() (actividad abierta).
     * Comprueba : que si se mandan datos de actividad pero no hay una abierta
     *             responde 409 y no modifica las actividades cerradas.
     *
     * @testdox [guardar_datos.php › guardarAlumno] Comprueba que sin actividad abierta responde 409
     */
    #[TestDox('[guardar_datos.php › guardarAlumno] Comprueba que sin actividad abierta responde 409')]
    public function test_guardar_sin_actividad_abierta(): void
    {
        [$idUsuario, $idAlumno] = self::crearAlumno();
        $id = self::crearActividad($idAlumno, ['Estado' => 'COMPLETADO']);

        $r = $this->llamar('guardar_datos.php', ['sesion' => [2, $idUsuario], 'datos' => ['area' => 'Otra']]);

        $this->assertError(409, 'No tienes una actividad abierta. Crea una nueva actividad.', $r);
        $this->assertSame('Sistemas', self::actividad($id)['Area']);
    }

    public static function actividadesInvalidasAlGuardar(): array
    {
        return [
            'estado inexistente'        => ['EN_CURSO', ['estado' => 'TERMINADO'], 'Estado inválido'],
            'estado CANCELADO'          => ['EN_CURSO', ['estado' => 'CANCELADO'], 'Estado inválido'],
            'regresar a PENDIENTE'      => ['EN_CURSO', ['estado' => 'PENDIENTE'], 'No puedes regresar la actividad a un estado anterior'],
            'área de 301 caracteres'    => ['EN_CURSO', ['area' => str_repeat('a', 301)], 'El campo Area es demasiado largo (máx. 300)'],
            'programa de 301'           => ['EN_CURSO', ['programa' => str_repeat('a', 301)], 'El campo Programa es demasiado largo (máx. 300)'],
            'fecha inexistente'         => ['EN_CURSO', ['fecha_inicio' => '2026-02-30'], 'Fecha inválida'],
            'fecha con otro formato'    => ['EN_CURSO', ['fecha_fin' => '30/06/2026'], 'Fecha inválida'],
            'fin antes del inicio'      => ['EN_CURSO', ['fecha_fin' => '2026-01-15'], 'La fecha fin debe ser posterior a la fecha inicio'],
            'inicio después del fin'    => ['EN_CURSO', ['fecha_inicio' => '2026-07-01'], 'La fecha fin debe ser posterior a la fecha inicio'],
        ];
    }

    /**
     * Función   : guardar_datos.php › guardarAlumno() (validaciones de la actividad).
     * Comprueba : estado inválido o hacia atrás, textos largos, fechas inválidas
     *             o invertidas (también contra las fechas ya guardadas) → 422.
     *
     * @testdox [guardar_datos.php › guardarAlumno] Comprueba que rechaza cambios inválidos en la actividad
     * @dataProvider actividadesInvalidasAlGuardar
     */
    #[TestDox('[guardar_datos.php › guardarAlumno] Comprueba que rechaza cambios inválidos en la actividad')]
    #[DataProvider('actividadesInvalidasAlGuardar')]
    public function test_guardar_actividad_invalida(string $estado, array $datos, string $mensaje): void
    {
        [$idUsuario, $idAlumno] = self::crearAlumno();
        $id = self::crearActividad($idAlumno, ['Estado' => $estado]);
        $antes = self::actividad($id);

        $r = $this->llamar('guardar_datos.php', ['sesion' => [2, $idUsuario], 'datos' => $datos]);

        $this->assertError(422, $mensaje, $r);
        $this->assertSame($antes, self::actividad($id));
    }

    /**
     * Función   : guardar_datos.php › guardarAlumno() (actualización de la actividad).
     * Comprueba : que guarda estado, área, programa y fechas de la actividad abierta.
     *
     * @testdox [guardar_datos.php › guardarAlumno] Comprueba que guarda los cambios de la actividad abierta
     */
    #[TestDox('[guardar_datos.php › guardarAlumno] Comprueba que guarda los cambios de la actividad abierta')]
    public function test_guardar_actividad_exito(): void
    {
        [$idUsuario, $idAlumno] = self::crearAlumno();
        $id = self::crearActividad($idAlumno, ['Estado' => 'PENDIENTE']);

        $r = $this->llamar('guardar_datos.php', ['sesion' => [2, $idUsuario], 'datos' => [
            'estado' => 'en_curso', 'area' => 'Redes', 'programa' => 'Soporte', 'fecha_inicio' => '2026-03-01', 'fecha_fin' => '2026-08-15',
        ]]);

        $this->assertSame([200, ['success' => true, 'url' => null]], $r);
        $a = self::actividad($id);
        $this->assertSame(['EN_CURSO', 'Redes', 'Soporte', '2026-03-01', '2026-08-15'],
            [$a['Estado'], $a['Area'], $a['Programa'], $a['Fecha_inicio'], $a['Fecha_fin']]);
    }

    /**
     * Función   : guardar_datos.php › guardarAlumno() (empresa).
     * Comprueba : que la empresa solo puede cambiarse en PENDIENTE (409 en
     *             EN_CURSO), que mandar la misma empresa no es un cambio, y que
     *             una empresa inexistente o inactiva responde 422.
     *
     * @testdox [guardar_datos.php › guardarAlumno] Comprueba las reglas para cambiar la empresa
     */
    #[TestDox('[guardar_datos.php › guardarAlumno] Comprueba las reglas para cambiar la empresa')]
    public function test_guardar_reglas_de_empresa(): void
    {
        $acme = self::crearEmpresa('Acme');
        $beta = self::crearEmpresa('Beta');
        $cerrada = self::crearEmpresa('Cerrada', 0);

        [$u1, $al1] = self::crearAlumno();
        self::crearActividad($al1, ['Estado' => 'EN_CURSO', 'Id_empresa' => $acme]);
        $this->assertError(409, 'La empresa solo puede cambiarse mientras la actividad está PENDIENTE',
            $this->llamar('guardar_datos.php', ['sesion' => [2, $u1], 'datos' => ['id_empresa' => (string) $beta]]));
        $this->assertSame(200, $this->llamar('guardar_datos.php', ['sesion' => [2, $u1], 'datos' => ['id_empresa' => (string) $acme]])[0]);

        [$u2, $al2] = self::crearAlumno();
        $act2 = self::crearActividad($al2, ['Estado' => 'PENDIENTE']);
        $this->assertError(422, 'La empresa seleccionada no existe o no está activa',
            $this->llamar('guardar_datos.php', ['sesion' => [2, $u2], 'datos' => ['id_empresa' => (string) $cerrada]]));
        $this->assertError(422, 'La empresa seleccionada no existe o no está activa',
            $this->llamar('guardar_datos.php', ['sesion' => [2, $u2], 'datos' => ['id_empresa' => '999']]));
        $this->assertError(422, 'Empresa inválida',
            $this->llamar('guardar_datos.php', ['sesion' => [2, $u2], 'datos' => ['id_empresa' => 'abc']]));

        $this->assertSame(200, $this->llamar('guardar_datos.php', ['sesion' => [2, $u2], 'datos' => ['id_empresa' => (string) $beta]])[0]);
        $this->assertSame($beta, (int) self::actividad($act2)['Id_empresa']);
    }

    /**
     * Función   : guardar_datos.php › guardarAlumno() (marcar COMPLETADO).
     * Comprueba : que para completar la actividad deben estar llenos área,
     *             programa, fechas, empresa, grupo y horario; si no, responde 422
     *             diciendo cuáles faltan.
     *
     * @testdox [guardar_datos.php › guardarAlumno] Comprueba que no deja completar si faltan datos
     */
    #[TestDox('[guardar_datos.php › guardarAlumno] Comprueba que no deja completar si faltan datos')]
    public function test_guardar_completar_con_datos_faltantes(): void
    {
        [$idUsuario, $idAlumno] = self::crearAlumno(['Horario' => null]);
        $id = self::crearActividad($idAlumno, ['Estado' => 'EN_CURSO', 'Area' => '', 'Fecha_fin' => null, 'Id_empresa' => null]);

        $r = $this->llamar('guardar_datos.php', ['sesion' => [2, $idUsuario], 'datos' => ['estado' => 'COMPLETADO']]);

        $this->assertError(422, 'Para completar la actividad faltan: Área, Fecha de fin, Empresa, Horario', $r);
        $this->assertSame('EN_CURSO', self::actividad($id)['Estado']);
    }

    /**
     * Función   : guardar_datos.php › guardarAlumno() (marcar COMPLETADO).
     * Comprueba : que con todos los datos completos la actividad pasa a COMPLETADO.
     *
     * @testdox [guardar_datos.php › guardarAlumno] Comprueba que con todo completo marca COMPLETADO
     */
    #[TestDox('[guardar_datos.php › guardarAlumno] Comprueba que con todo completo marca COMPLETADO')]
    public function test_guardar_completar_exito(): void
    {
        [$idUsuario, $idAlumno] = self::crearAlumno();
        $id = self::crearActividad($idAlumno, ['Estado' => 'EN_CURSO', 'Id_empresa' => self::crearEmpresa()]);

        $r = $this->llamar('guardar_datos.php', ['sesion' => [2, $idUsuario], 'datos' => ['estado' => 'COMPLETADO']]);

        $this->assertSame(200, $r[0]);
        $this->assertSame('COMPLETADO', self::actividad($id)['Estado']);
    }

    /**
     * Función   : guardar_datos.php › transacción (rollBack).
     * Comprueba : que si los datos personales son válidos pero la actividad
     *             tiene un error, NO se guarda nada (tampoco el grupo).
     *
     * @testdox [guardar_datos.php] Comprueba que si algo falla no se guarda nada (rollback)
     */
    #[TestDox('[guardar_datos.php] Comprueba que si algo falla no se guarda nada (rollback)')]
    public function test_guardar_rollback(): void
    {
        [$idUsuario, $idAlumno] = self::crearAlumno();
        self::crearActividad($idAlumno, ['Estado' => 'EN_CURSO']);

        $r = $this->llamar('guardar_datos.php', ['sesion' => [2, $idUsuario], 'datos' => ['grupo' => '9Z', 'estado' => 'PENDIENTE']]);

        $this->assertSame(422, $r[0]);
        $this->assertSame('7A', self::filas('SELECT Grupo FROM Alumnos')[0]['Grupo']);
    }

    /** Crea un archivo temporal y lo describe como lo haría $_FILES. */
    private static function archivoSubido(string $contenido, int $error = 0, ?int $tamano = null): array
    {
        $ruta = tempnam(sys_get_temp_dir(), 'ops_foto_');
        file_put_contents($ruta, $contenido);
        return ['foto_perfil' => ['name' => 'foto.jpg', 'type' => 'image/jpeg', 'tmp_name' => $ruta,
            'error' => $error, 'size' => $tamano ?? strlen($contenido)]];
    }

    public static function fotosInvalidas(): array
    {
        return [
            'error al subir'           => ['x', 4, null, 400, 'No se pudo recibir la foto'],
            'más de 2 MB'              => ['x', 0, 2 * 1024 * 1024 + 1, 422, 'La imagen no debe superar los 2MB'],
            'texto con extensión .jpg' => ['esto no es una imagen', 0, null, 422, 'Solo se permiten imágenes JPG, PNG o WEBP'],
        ];
    }

    /**
     * Función   : guardar_datos.php › validarFoto().
     * Comprueba : que una foto con error de subida, de más de 2 MB o que en
     *             realidad no es imagen se rechaza ANTES de tocar la BD.
     *
     * @testdox [guardar_datos.php › validarFoto] Comprueba que rechaza fotos inválidas sin tocar la BD
     * @dataProvider fotosInvalidas
     */
    #[TestDox('[guardar_datos.php › validarFoto] Comprueba que rechaza fotos inválidas sin tocar la BD')]
    #[DataProvider('fotosInvalidas')]
    public function test_guardar_foto_invalida(string $contenido, int $error, ?int $tamano, int $codigo, string $mensaje): void
    {
        $id = self::crearAdmin(3);

        $r = $this->llamar('guardar_datos.php', [
            'sesion' => [3, $id],
            'post' => ['datos' => json_encode(['telefono_administrador' => '246-1111-222', 'correo_administrador' => 'otro@uatx.mx'])],
            'files' => self::archivoSubido($contenido, $error, $tamano),
        ]);

        $this->assertError($codigo, $mensaje, $r);
        $this->assertSame('246-5444-885', self::filas('SELECT Telefono FROM Administradores')[0]['Telefono']);
    }

    /**
     * Función   : guardar_datos.php › responderExcepcion().
     * Comprueba : que si no se puede conectar a la BD responde 500.
     *
     * @testdox [guardar_datos.php › responderExcepcion] Comprueba que sin conexión a la BD responde 500
     */
    #[TestDox('[guardar_datos.php › responderExcepcion] Comprueba que sin conexión a la BD responde 500')]
    public function test_guardar_sin_bd(): void
    {
        [$codigo, $r] = $this->llamar('guardar_datos.php', ['sesion' => [3, 1], 'datos' => [], 'sinBD' => true]);

        $this->assertSame(500, $codigo);
        $this->assertStringStartsWith('Error en guardar_datos.php: ', $r['error']);
    }
}