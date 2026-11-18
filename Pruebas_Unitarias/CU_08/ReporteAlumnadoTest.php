<?php
/**
 * Archivo      : ReporteAlumnadoTest.php
 * Módulo       : CU_08 Reporte de alumnado (Pruebas unitarias)
 * Archivos bajo prueba (en la carpeta de app/ que empieza con "CU_08"):
 *   obtener_catalogos.php
 *   obtener_datos_encabezado.php
 *   reporte_alumnos.php
 * Herramienta  : PHPUnit
 *
 * Cómo correrlo (desde OPS-web-app, con el Docker del proyecto prendido):
 *   vendor/bin/phpunit --testdox Pruebas_Unitarias/CU_08/ReporteAlumnadoTest.php
 *
 * Descripción  : Pruebas de los PHP del reporte de alumnado. El código original NO se modifica.
 *   - Usan una base de datos APARTE llamada "ops_pruebas_cu08" que se crea sola
 *     dentro del MariaDB de Docker. Tu base de datos real no se toca.
 *   - Cada PHP se ejecuta en un proceso aparte. La prueba le simula la
 *     sesión (cookies) y el cuerpo JSON, y revisa el código HTTP y lo que responde.
 *
 * Cada prueba indica:
 *   - Función   : archivo PHP › bloque que se prueba.
 *   - Comprueba : qué comportamiento se verifica.
 */

namespace CU_08;

use PDO;
use PDOException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\TestDox;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class ReporteAlumnadoTest extends TestCase
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
    private const DB_NAME = 'ops_pruebas_cu08'; // debe contener "prueba"

    private const PUENTE_DOCKER = 'ops-pruebas-puente-bd';
    private const PUERTO_PUENTE = '33061';

    private static ?PDO $pdo = null;
    private static ?array $destino = null;
    private static string $carpetaTemporal = '';

    /** Carpeta del módulo: la primera de app/ que empieza con "CU_08". */
    private static function carpetaApp(): string
    {
        $carpetas = glob(__DIR__ . '/../../app/CU_08*', GLOB_ONLYDIR);
        if (!$carpetas) {
            throw new RuntimeException('No se encontró ninguna carpeta que empiece con "CU_08" dentro de app/.');
        }
        return $carpetas[0];
    }

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
     *    require_once("../php/db.php"); al ejecutarlo desde <temporal>/CU_05,
     *    PHP carga este db.php en lugar del real.
     *  - simular_input.php: hace que php://input devuelva el JSON enviado por la prueba
     *    (en la terminal no existe el cuerpo de una petición HTTP) y simula las
     *    cookies de sesión, los parámetros GET, los campos POST y los archivos subidos.
     */
    private static function prepararArchivosTemporales(): void
    {
        $base = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'ops_pruebas_cu08';
        @mkdir($base . DIRECTORY_SEPARATOR . 'php', 0777, true);
        @mkdir($base . DIRECTORY_SEPARATOR . 'CU_08', 0777, true);

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
$_GET    = json_decode((string) getenv('OPS_GET'), true) ?: [];

// Al terminar, se guarda el código HTTP para que la prueba lo revise
if ($archivoCodigo = getenv('OPS_ARCHIVO_CODIGO')) {
    register_shutdown_function(function () use ($archivoCodigo) {
        // Si el PHP no fija un código, el servidor web responde 200
        file_put_contents($archivoCodigo, (string) (http_response_code() ?: 200));
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
            self::carpetaApp() . '/' . $archivo,
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
            self::$carpetaTemporal . DIRECTORY_SEPARATOR . 'CU_08',
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

    /** Crea las tablas que usan los PHP de este módulo (versión mínima para pruebas). */
    private static function crearEsquema(): void
    {
        $pdo = self::conexion();
        foreach (['Actividades_Alumnos', 'Alumnos', 'Administradores', 'Usuarios', 'Empresas', 'Actividades', 'Carreras', 'Facultades'] as $t) {
            $pdo->exec("DROP TABLE IF EXISTS `{$t}`");
        }
        $pdo->exec('CREATE TABLE Facultades (Id_facultad INT AUTO_INCREMENT PRIMARY KEY, Nombre VARCHAR(150) NOT NULL)');
        $pdo->exec('CREATE TABLE Carreras (Id_carrera INT AUTO_INCREMENT PRIMARY KEY, Nombre VARCHAR(150) NOT NULL, Id_facultad INT NOT NULL)');
        $pdo->exec('CREATE TABLE Usuarios (Id_usuario INT AUTO_INCREMENT PRIMARY KEY, Matricula VARCHAR(8) NOT NULL, Activo TINYINT(1) NOT NULL DEFAULT 1)');
        $pdo->exec('CREATE TABLE Administradores (
            Id_administrador INT AUTO_INCREMENT PRIMARY KEY, Id_usuario INT NOT NULL, Nombre VARCHAR(100) NOT NULL,
            Apellido_P VARCHAR(100) NULL, Apellido_M VARCHAR(100) NULL, Id_carrera INT NOT NULL, Activo TINYINT(1) NOT NULL DEFAULT 1)');
        $pdo->exec('CREATE TABLE Alumnos (
            Id_alumno INT AUTO_INCREMENT PRIMARY KEY, Id_usuario INT NOT NULL, Nombre VARCHAR(100) NOT NULL,
            Apellido_P VARCHAR(100) NULL, Apellido_M VARCHAR(100) NULL, Id_carrera INT NOT NULL, grupo VARCHAR(2) NULL)');
        $pdo->exec('CREATE TABLE Empresas (Id_empresa INT AUTO_INCREMENT PRIMARY KEY, Nombre VARCHAR(200) NOT NULL)');
        $pdo->exec('CREATE TABLE Actividades (Id_servicio INT AUTO_INCREMENT PRIMARY KEY, Servicio VARCHAR(150) NOT NULL, Activo TINYINT(1) NOT NULL DEFAULT 1)');
        $pdo->exec("CREATE TABLE Actividades_Alumnos (
            Id_alumno_servicio INT AUTO_INCREMENT PRIMARY KEY, No_expediente VARCHAR(15) NULL, Id_alumno INT NOT NULL,
            Id_servicio INT NOT NULL, Id_empresa INT NULL, Area VARCHAR(300) NULL, Programa VARCHAR(300) NULL,
            Estado ENUM('PENDIENTE','EN_CURSO','COMPLETADO','CANCELADO') NOT NULL DEFAULT 'PENDIENTE',
            periodo_tipo ENUM('primavera','otoño') NOT NULL, `periodo_año` YEAR NOT NULL,
            Fecha_inicio DATE NULL, Fecha_fin DATE NULL)");
    }

    // ---------- Datos de prueba ----------

    private static function insertar(string $tabla, array $fila): int
    {
        $columnas = implode(', ', array_map(fn ($c) => "`$c`", array_keys($fila)));
        $marcas   = implode(', ', array_fill(0, count($fila), '?'));
        self::conexion()->prepare("INSERT INTO `$tabla` ($columnas) VALUES ($marcas)")->execute(array_values($fila));
        return (int) self::conexion()->lastInsertId();
    }

    private static int $computacion = 0;
    private static int $quimica = 0;
    private static int $social = 0;
    private static int $practicas = 0;
    private static int $acme = 0;
    private static int $idAdmin = 0;

    /**
     * Prepara un escenario: facultad, 2 carreras, 2 servicios, una empresa y un
     * administrador (usuario 1) de Ing. en Computación.
     */
    private static function escenario(): void
    {
        $fac = self::insertar('Facultades', ['Nombre' => 'FCBIyT']);
        self::$computacion = self::insertar('Carreras', ['Nombre' => 'Ing. en Computación', 'Id_facultad' => $fac]);
        self::$quimica = self::insertar('Carreras', ['Nombre' => 'Ing. Química', 'Id_facultad' => $fac]);
        self::$social = self::insertar('Actividades', ['Servicio' => 'Servicio social']);
        self::$practicas = self::insertar('Actividades', ['Servicio' => 'Prácticas profesionales']);
        self::$acme = self::insertar('Empresas', ['Nombre' => 'Acme']);
        self::$idAdmin = self::insertar('Usuarios', ['Matricula' => '1234', 'Activo' => 1]);
        self::insertar('Administradores', ['Id_usuario' => self::$idAdmin, 'Nombre' => 'María', 'Apellido_P' => 'Soto',
            'Apellido_M' => 'Ríos', 'Id_carrera' => self::$computacion]);
    }

    /** Crea un alumno activo con una actividad (todo se puede cambiar). */
    private static function crearAlumnoConActividad(array $alumno = [], array $actividad = [], int $activo = 1): void
    {
        static $n = 0;
        $idUsuario = self::insertar('Usuarios', ['Matricula' => sprintf('2023%04d', ++$n), 'Activo' => $activo]);
        $idAlumno = self::insertar('Alumnos', array_merge(['Id_usuario' => $idUsuario, 'Nombre' => 'Ana', 'Apellido_P' => 'López',
            'Apellido_M' => 'Ruiz', 'Id_carrera' => self::$computacion, 'grupo' => '7A'], $alumno));
        self::insertar('Actividades_Alumnos', array_merge(['No_expediente' => 'EXP-' . $n, 'Id_alumno' => $idAlumno,
            'Id_servicio' => self::$social, 'Id_empresa' => self::$acme, 'Area' => 'Sistemas', 'Programa' => 'Apoyo TI',
            'Estado' => 'EN_CURSO', 'periodo_tipo' => 'primavera', 'periodo_año' => 2026,
            'Fecha_inicio' => '2026-02-01', 'Fecha_fin' => '2026-06-30'], $actividad));
    }

    /** Filtros como los manda reporte_alumnos.js (todos en "TODOS" por defecto). */
    private static function filtros(array $cambios = []): array
    {
        return array_merge(['actividad' => 'TODOS', 'estado' => 'TODOS', 'periodo_tipo' => 'TODOS',
            'periodo_anio' => 'TODOS', 'grupo' => 'TODOS'], $cambios);
    }

    // ---------- Llamar a los PHP ----------

    /** Ejecuta un PHP del módulo y regresa [código HTTP, JSON]. Opciones: cookies, datos (JSON), sinBD. */
    private function llamar(string $archivo, array $op = []): array
    {
        $archivoCodigo = tempnam(sys_get_temp_dir(), 'ops_codigo_');
        $entorno = ['OPS_COOKIES' => json_encode($op['cookies'] ?? []), 'OPS_ARCHIVO_CODIGO' => $archivoCodigo];
        if (!empty($op['sinBD'])) {
            $entorno['OPS_FORZAR_ERROR_DB'] = '1';
        }

        $resultado = self::ejecutarPhp($archivo, isset($op['datos']) ? json_encode($op['datos']) : '', $entorno);
        $codigo = (int) file_get_contents($archivoCodigo);
        @unlink($archivoCodigo);

        $this->assertSame('', $resultado['errores'], "{$archivo} mostró errores de PHP:\n" . $resultado['errores']);
        $this->assertIsArray($resultado['json'], "{$archivo} no respondió JSON válido. Respondió:\n" . $resultado['salida']);
        return [$codigo, $resultado['json']];
    }

    /** Pide el reporte como el administrador del escenario y regresa las filas. */
    private function reporte(array $filtros = []): array
    {
        [$codigo, $r] = $this->llamar('reporte_alumnos.php',
            ['cookies' => ['Id_usuario' => (string) self::$idAdmin], 'datos' => self::filtros($filtros)]);
        $this->assertSame(200, $codigo);
        return $r;
    }

    // =====================================================================
    // obtener_catalogos.php
    // =====================================================================

    /**
     * Función   : obtener_catalogos.php › consultas de catálogos.
     * Comprueba : que regresa los servicios activos y, sin repetir, los estados,
     *             tipos de periodo, años y letras de grupo que existen.
     *
     * @testdox [obtener_catalogos.php] Comprueba los catálogos de los filtros (sin repetidos)
     */
    #[TestDox('[obtener_catalogos.php] Comprueba los catálogos de los filtros (sin repetidos)')]
    public function test_catalogos(): void
    {
        self::escenario();
        self::insertar('Actividades', ['Servicio' => 'Servicio cerrado', 'Activo' => 0]);
        self::crearAlumnoConActividad(['grupo' => '7A'], ['Estado' => 'EN_CURSO', 'periodo_tipo' => 'primavera', 'periodo_año' => 2026]);
        self::crearAlumnoConActividad(['grupo' => '6A'], ['Estado' => 'EN_CURSO', 'periodo_tipo' => 'otoño', 'periodo_año' => 2025]);
        self::crearAlumnoConActividad(['grupo' => '7B'], ['Estado' => 'COMPLETADO', 'periodo_tipo' => 'primavera', 'periodo_año' => 2026]);

        [$codigo, $r] = $this->llamar('obtener_catalogos.php');

        $this->assertSame(200, $codigo);
        $this->assertSame([['Id_servicio' => self::$social, 'Servicio' => 'Servicio social'],
            ['Id_servicio' => self::$practicas, 'Servicio' => 'Prácticas profesionales']], $r['servicios']);
        $this->assertEqualsCanonicalizing(['EN_CURSO', 'COMPLETADO'], array_column($r['estados'], 'Estado'));
        $this->assertEqualsCanonicalizing(['primavera', 'otoño'], array_column($r['periodo_tipo'], 'periodo_tipo'));
        $this->assertEqualsCanonicalizing([2026, 2025], array_column($r['periodo_anio'], 'periodo_año'));
        $this->assertEqualsCanonicalizing(['A', 'B'], array_column($r['grupos'], 'grupo'));
    }

    /**
     * Función   : obtener_catalogos.php › catch (PDOException).
     * Comprueba : que sin conexión a la BD responde 500 con el error.
     *
     * @testdox [obtener_catalogos.php] Comprueba que sin conexión a la BD responde 500
     */
    #[TestDox('[obtener_catalogos.php] Comprueba que sin conexión a la BD responde 500')]
    public function test_catalogos_sin_bd(): void
    {
        $this->assertSame([500, ['error' => 'Hubo un error consultando los catálogos']], $this->llamar('obtener_catalogos.php', ['sinBD' => true]));
    }

    // =====================================================================
    // obtener_datos_encabezado.php
    // =====================================================================

    /**
     * Función   : obtener_datos_encabezado.php › validación de la cookie.
     * Comprueba : que sin cookie Id_usuario responde 401 "No autenticado".
     *
     * @testdox [obtener_datos_encabezado.php] Comprueba que sin sesión responde 401
     */
    #[TestDox('[obtener_datos_encabezado.php] Comprueba que sin sesión responde 401')]
    public function test_encabezado_sin_sesion(): void
    {
        $this->assertSame([401, ['error' => 'No autenticado']], $this->llamar('obtener_datos_encabezado.php'));
    }

    /**
     * Función   : obtener_datos_encabezado.php › consulta del administrador.
     * Comprueba : que regresa el nombre completo, la carrera y la facultad del
     *             administrador de la sesión.
     *
     * @testdox [obtener_datos_encabezado.php] Comprueba que regresa nombre, carrera y facultad del administrador
     */
    #[TestDox('[obtener_datos_encabezado.php] Comprueba que regresa nombre, carrera y facultad del administrador')]
    public function test_encabezado_datos(): void
    {
        self::escenario();

        $r = $this->llamar('obtener_datos_encabezado.php', ['cookies' => ['Id_usuario' => (string) self::$idAdmin]]);

        $this->assertSame([200, ['nombre_completo' => 'María Soto Ríos', 'carrera' => 'Ing. en Computación', 'facultad' => 'FCBIyT']], $r);
    }

    /**
     * Función   : obtener_datos_encabezado.php › if (!$resultado).
     * Comprueba : que un usuario que no es administrador, o uno inactivo, responde 404.
     *
     * @testdox [obtener_datos_encabezado.php] Comprueba que un no-administrador o inactivo responde 404
     */
    #[TestDox('[obtener_datos_encabezado.php] Comprueba que un no-administrador o inactivo responde 404')]
    public function test_encabezado_no_encontrado(): void
    {
        self::escenario();
        $inactivo = self::insertar('Usuarios', ['Matricula' => '9999']);
        self::insertar('Administradores', ['Id_usuario' => $inactivo, 'Nombre' => 'X', 'Id_carrera' => self::$computacion, 'Activo' => 0]);

        $esperado = [404, ['error' => 'Administrador no encontrado']];
        $this->assertSame($esperado, $this->llamar('obtener_datos_encabezado.php', ['cookies' => ['Id_usuario' => '999']]));
        $this->assertSame($esperado, $this->llamar('obtener_datos_encabezado.php', ['cookies' => ['Id_usuario' => (string) $inactivo]]));
    }

    /**
     * Función   : obtener_datos_encabezado.php › catch (PDOException).
     * Comprueba : que sin conexión a la BD responde 500 con el error.
     *
     * @testdox [obtener_datos_encabezado.php] Comprueba que sin conexión a la BD responde 500
     */
    #[TestDox('[obtener_datos_encabezado.php] Comprueba que sin conexión a la BD responde 500')]
    public function test_encabezado_sin_bd(): void
    {
        $this->assertSame([500, ['error' => 'Hubo un error obteniendo la información del administrador']],
            $this->llamar('obtener_datos_encabezado.php', ['cookies' => ['Id_usuario' => '1'], 'sinBD' => true]));
    }

    // =====================================================================
    // reporte_alumnos.php
    // =====================================================================

    /**
     * Función   : reporte_alumnos.php › consulta base.
     * Comprueba : que regresa las columnas del reporte con los datos del alumno,
     *             su actividad, empresa y servicio.
     *
     * @testdox [reporte_alumnos.php] Comprueba las columnas y datos del reporte
     */
    #[TestDox('[reporte_alumnos.php] Comprueba las columnas y datos del reporte')]
    public function test_reporte_columnas(): void
    {
        self::escenario();
        self::crearAlumnoConActividad([], ['No_expediente' => 'EXP-1']);

        $r = $this->reporte();
        $r[0]['periodo_año'] = (int) $r[0]['periodo_año']; // según el driver puede llegar como texto

        $this->assertSame([[
            'Servicio' => 'Servicio social', 'No_expediente' => 'EXP-1', 'grupo' => '7A', 'Nombre' => 'Ana López Ruiz',
            'Nombre Carrera' => 'Ing. en Computación', 'Empresa' => 'Acme', 'Area' => 'Sistemas', 'Programa' => 'Apoyo TI',
            'Estado' => 'EN_CURSO', 'periodo_tipo' => 'primavera', 'periodo_año' => 2026,
            'Fecha_inicio' => '2026-02-01', 'Fecha_fin' => '2026-06-30',
        ]], $r);
    }

    /**
     * Función   : reporte_alumnos.php › WHERE Administradores.Id_usuario y Usuarios.Activo.
     * Comprueba : que solo aparecen alumnos ACTIVOS de la carrera del
     *             administrador de la sesión; sin empresa, "Empresa" viene null.
     *
     * @testdox [reporte_alumnos.php] Comprueba que solo aparecen alumnos activos de la carrera del administrador
     */
    #[TestDox('[reporte_alumnos.php] Comprueba que solo aparecen alumnos activos de la carrera del administrador')]
    public function test_reporte_carrera_y_activos(): void
    {
        self::escenario();
        self::crearAlumnoConActividad(['Nombre' => 'Incluido'], ['Id_empresa' => null]);
        self::crearAlumnoConActividad(['Nombre' => 'Inactivo'], [], 0);
        self::crearAlumnoConActividad(['Nombre' => 'Otra carrera', 'Id_carrera' => self::$quimica]);

        $r = $this->reporte();

        $this->assertSame(['Incluido López Ruiz'], array_column($r, 'Nombre'));
        $this->assertNull($r[0]['Empresa']);
    }

    public static function filtrosDelReporte(): array
    {
        return [
            'actividad'     => [['actividad' => 'PRACTICAS'], ['Practicas']],
            'estado'        => [['estado' => 'COMPLETADO'], ['Completado']],
            'tipo periodo'  => [['periodo_tipo' => 'otoño'], ['Otono']],
            'año periodo'   => [['periodo_anio' => '2025'], ['Anio2025']],
            'grupo (letra)' => [['grupo' => 'B'], ['GrupoB']],
            'todo en TODOS' => [[], ['Base', 'Practicas', 'Completado', 'Otono', 'Anio2025', 'GrupoB']],
        ];
    }

    /**
     * Función   : reporte_alumnos.php › filtros (actividad, estado, periodo, año y grupo).
     * Comprueba : que cada filtro deja solo los alumnos que lo cumplen, que el
     *             grupo se compara por su letra (6B es del grupo "B") y que
     *             "TODOS" no filtra.
     *
     * @testdox [reporte_alumnos.php] Comprueba cada filtro del reporte
     * @dataProvider filtrosDelReporte
     */
    #[TestDox('[reporte_alumnos.php] Comprueba cada filtro del reporte')]
    #[DataProvider('filtrosDelReporte')]
    public function test_reporte_filtros(array $filtro, array $esperados): void
    {
        self::escenario();
        if (($filtro['actividad'] ?? null) === 'PRACTICAS') {
            $filtro['actividad'] = (string) self::$practicas; // el Id real del servicio
        }
        // Cada alumno cumple UN filtro distinto; su Nombre dice cuál
        self::crearAlumnoConActividad(['Nombre' => 'Base']);
        self::crearAlumnoConActividad(['Nombre' => 'Practicas'], ['Id_servicio' => self::$practicas]);
        self::crearAlumnoConActividad(['Nombre' => 'Completado'], ['Estado' => 'COMPLETADO']);
        self::crearAlumnoConActividad(['Nombre' => 'Otono'], ['periodo_tipo' => 'otoño']);
        self::crearAlumnoConActividad(['Nombre' => 'Anio2025'], ['periodo_año' => 2025]);
        self::crearAlumnoConActividad(['Nombre' => 'GrupoB', 'grupo' => '6B']);

        $nombres = array_map(fn ($n) => explode(' ', $n)[0], array_column($this->reporte($filtro), 'Nombre'));

        $this->assertEqualsCanonicalizing($esperados, $nombres);
    }

    /**
     * Función   : reporte_alumnos.php › combinación de filtros.
     * Comprueba : que varios filtros juntos se aplican a la vez (AND).
     *
     * @testdox [reporte_alumnos.php] Comprueba que varios filtros juntos se aplican a la vez
     */
    #[TestDox('[reporte_alumnos.php] Comprueba que varios filtros juntos se aplican a la vez')]
    public function test_reporte_filtros_combinados(): void
    {
        self::escenario();
        self::crearAlumnoConActividad(['Nombre' => 'Sí'], ['Estado' => 'COMPLETADO', 'periodo_tipo' => 'otoño']);
        self::crearAlumnoConActividad(['Nombre' => 'Solo estado'], ['Estado' => 'COMPLETADO', 'periodo_tipo' => 'primavera']);
        self::crearAlumnoConActividad(['Nombre' => 'Solo periodo'], ['Estado' => 'EN_CURSO', 'periodo_tipo' => 'otoño']);

        $r = $this->reporte(['estado' => 'COMPLETADO', 'periodo_tipo' => 'otoño']);

        $this->assertSame(['Sí López Ruiz'], array_column($r, 'Nombre'));
    }

    /**
     * Función   : reporte_alumnos.php › consulta.
     * Comprueba : que si ningún alumno cumple los filtros regresa una lista vacía.
     *
     * @testdox [reporte_alumnos.php] Comprueba que sin coincidencias regresa una lista vacía
     */
    #[TestDox('[reporte_alumnos.php] Comprueba que sin coincidencias regresa una lista vacía')]
    public function test_reporte_sin_resultados(): void
    {
        self::escenario();
        self::crearAlumnoConActividad();

        $this->assertSame([], $this->reporte(['estado' => 'CANCELADO']));
    }
}