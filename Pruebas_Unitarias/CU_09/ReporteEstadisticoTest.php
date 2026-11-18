<?php
/**
 * Archivo      : ReporteEstadisticoTest.php
 * Módulo       : CU_09 Reporte estadístico (Pruebas unitarias)
 * Archivos bajo prueba (en la carpeta de app/ que empieza con "CU_09"):
 *   obtener_encuestas.php, obtener_periodos.php, generar_tabla_resumen.php,
 *   generar_promedio_resumen.php, generar_tabla_entregados.php,
 *   generar_tabla_pendientes.php, obtener_respuesta_individual.php,
 *   obtener_datos_encabezado.php
 * Herramienta  : PHPUnit
 *
 * Cómo correrlo (desde OPS-web-app, con el Docker del proyecto prendido):
 *   vendor/bin/phpunit --testdox Pruebas_Unitarias/CU_09/ReporteEstadisticoTest.php
 *
 * Descripción  : Pruebas de los PHP del reporte estadístico. El código original NO se modifica.
 *   - Usan una base de datos APARTE llamada "ops_pruebas_cu09" que se crea sola
 *     dentro del MariaDB de Docker. Tu base de datos real no se toca.
 *   - Cada PHP se ejecuta en un proceso aparte. La prueba le simula la
 *     sesión (cookies) y el cuerpo JSON, y revisa el código HTTP y lo que responde.
 *
 * Cada prueba indica:
 *   - Función   : archivo PHP › bloque que se prueba.
 *   - Comprueba : qué comportamiento se verifica.
 */

namespace CU_09;

use PDO;
use PDOException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\TestDox;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class ReporteEstadisticoTest extends TestCase
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
    private const DB_NAME = 'ops_pruebas_cu09'; // debe contener "prueba"

    private const PUENTE_DOCKER = 'ops-pruebas-puente-bd';
    private const PUERTO_PUENTE = '33061';

    private static ?PDO $pdo = null;
    private static ?array $destino = null;
    private static string $carpetaTemporal = '';

    /** Carpeta del módulo: la primera de app/ que empieza con "CU_09". */
    private static function carpetaApp(): string
    {
        $carpetas = glob(__DIR__ . '/../../app/CU_09*', GLOB_ONLYDIR);
        if (!$carpetas) {
            throw new RuntimeException('No se encontró ninguna carpeta que empiece con "CU_09" dentro de app/.');
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
        $base = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'ops_pruebas_cu09';
        @mkdir($base . DIRECTORY_SEPARATOR . 'php', 0777, true);
        @mkdir($base . DIRECTORY_SEPARATOR . 'CU_09', 0777, true);

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
            self::$carpetaTemporal . DIRECTORY_SEPARATOR . 'CU_09',
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
        foreach (['Respuestas', 'Preguntas', 'Periodo_Encuesta', 'Encuestas', 'Actividades_Alumnos', 'Alumnos',
            'Administradores', 'Usuarios', 'Actividades', 'Carreras', 'Facultades'] as $t) {
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
            Apellido_P VARCHAR(100) NULL, Apellido_M VARCHAR(100) NULL, Id_carrera INT NOT NULL)');
        $pdo->exec('CREATE TABLE Actividades (Id_servicio INT AUTO_INCREMENT PRIMARY KEY, Servicio VARCHAR(150) NOT NULL)');
        $pdo->exec("CREATE TABLE Actividades_Alumnos (
            Id_alumno_servicio INT AUTO_INCREMENT PRIMARY KEY, Id_alumno INT NOT NULL, Id_servicio INT NOT NULL,
            periodo_tipo ENUM('primavera','otoño') NOT NULL, `periodo_año` YEAR NOT NULL)");
        $pdo->exec('CREATE TABLE Encuestas (
            Id_encuesta INT AUTO_INCREMENT PRIMARY KEY, Nombre VARCHAR(200) NOT NULL, Id_servicio INT NOT NULL,
            Codigo VARCHAR(50) NULL, Revision VARCHAR(50) NULL, Fecha VARCHAR(50) NULL, Version VARCHAR(10) NULL)');
        $pdo->exec("CREATE TABLE Periodo_Encuesta (
            Id_periodo INT AUTO_INCREMENT PRIMARY KEY, Id_encuesta INT NOT NULL,
            Periodo_tipo ENUM('primavera','otoño') NOT NULL, `Periodo_año` YEAR NOT NULL)");
        $pdo->exec("CREATE TABLE Preguntas (
            Id_pregunta INT AUTO_INCREMENT PRIMARY KEY, Id_encuesta INT NOT NULL, Orden INT NOT NULL,
            Seccion VARCHAR(100) NOT NULL, Pregunta VARCHAR(300) NOT NULL,
            Tipo_respuesta ENUM('ESCALA_1_5','ESCALA_1_10','ABIERTA') NOT NULL)");
        $pdo->exec('CREATE TABLE Respuestas (
            Id_respuesta INT AUTO_INCREMENT PRIMARY KEY, Id_encuesta INT NOT NULL, Id_pregunta INT NOT NULL,
            Id_alumno INT NOT NULL, Id_servicio INT NOT NULL, Respuesta TEXT NOT NULL)');
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
    private static int $idAdmin = 0;
    private static int $encuesta = 0;
    /** @var int[] Preguntas de la encuesta: [escala 1-5, escala 1-5, abierta] */
    private static array $preguntas = [];

    /**
     * Prepara un escenario: facultad, 2 carreras, 2 servicios, un administrador
     * (usuario 1) de Ing. en Computación y la encuesta "Satisfacción del alumno"
     * (servicio social, periodo primavera 2026) con 2 preguntas de escala 1-5 y
     * una abierta.
     */
    private static function escenario(): void
    {
        $fac = self::insertar('Facultades', ['Nombre' => 'FCBIyT']);
        self::$computacion = self::insertar('Carreras', ['Nombre' => 'Ing. en Computación', 'Id_facultad' => $fac]);
        self::$quimica = self::insertar('Carreras', ['Nombre' => 'Ing. Química', 'Id_facultad' => $fac]);
        self::$social = self::insertar('Actividades', ['Servicio' => 'Servicio social']);
        self::$practicas = self::insertar('Actividades', ['Servicio' => 'Prácticas profesionales']);
        self::$idAdmin = self::insertar('Usuarios', ['Matricula' => '1234']);
        self::insertar('Administradores', ['Id_usuario' => self::$idAdmin, 'Nombre' => 'María', 'Apellido_P' => 'Soto',
            'Apellido_M' => 'Ríos', 'Id_carrera' => self::$computacion]);

        self::$encuesta = self::insertar('Encuestas', ['Nombre' => 'Satisfacción del alumno', 'Id_servicio' => self::$social,
            'Codigo' => '108g-RG-14', 'Revision' => '9001:2015', 'Fecha' => 'Noviembre 2025', 'Version' => '03']);
        self::insertar('Periodo_Encuesta', ['Id_encuesta' => self::$encuesta, 'Periodo_tipo' => 'primavera', 'Periodo_año' => 2026]);
        // Se insertan en desorden para comprobar el ORDER BY Orden
        $p2 = self::insertar('Preguntas', ['Id_encuesta' => self::$encuesta, 'Orden' => 2, 'Seccion' => 'General',
            'Pregunta' => 'Instalaciones', 'Tipo_respuesta' => 'ESCALA_1_5']);
        $p1 = self::insertar('Preguntas', ['Id_encuesta' => self::$encuesta, 'Orden' => 1, 'Seccion' => 'General',
            'Pregunta' => 'Trato recibido', 'Tipo_respuesta' => 'ESCALA_1_5']);
        $p3 = self::insertar('Preguntas', ['Id_encuesta' => self::$encuesta, 'Orden' => 3, 'Seccion' => 'Comentarios',
            'Pregunta' => '¿Qué mejorarías?', 'Tipo_respuesta' => 'ABIERTA']);
        self::$preguntas = [$p1, $p2, $p3];
    }

    /** Crea un alumno inscrito al servicio social en primavera 2026. Regresa [Id_alumno, matrícula]. */
    private static function crearAlumno(array $alumno = [], array $actividad = [], ?string $matricula = null): array
    {
        static $n = 0;
        $matricula ??= sprintf('2023%04d', ++$n);
        $idUsuario = self::insertar('Usuarios', ['Matricula' => $matricula]);
        $idAlumno = self::insertar('Alumnos', array_merge(['Id_usuario' => $idUsuario, 'Nombre' => 'Ana', 'Apellido_P' => 'López',
            'Apellido_M' => 'Ruiz', 'Id_carrera' => self::$computacion], $alumno));
        self::insertar('Actividades_Alumnos', array_merge(['Id_alumno' => $idAlumno, 'Id_servicio' => self::$social,
            'periodo_tipo' => 'primavera', 'periodo_año' => 2026], $actividad));
        return [$idAlumno, $matricula];
    }

    /** Guarda las respuestas de un alumno: [respuesta pregunta 1, respuesta pregunta 2, texto pregunta 3]. */
    private static function contestar(int $idAlumno, array $respuestas): void
    {
        foreach ($respuestas as $i => $respuesta) {
            self::insertar('Respuestas', ['Id_encuesta' => self::$encuesta, 'Id_pregunta' => self::$preguntas[$i],
                'Id_alumno' => $idAlumno, 'Id_servicio' => self::$social, 'Respuesta' => (string) $respuesta]);
        }
    }

    /** Filtros como los manda el JS (encuesta, periodo y año). */
    private static function filtros(array $cambios = []): array
    {
        return array_merge(['Id_encuesta' => (string) self::$encuesta, 'Periodo_tipo' => 'primavera', 'Periodo_anio' => '2026'], $cambios);
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
        $this->assertNotNull($resultado['json'], "{$archivo} no respondió JSON válido. Respondió:\n" . $resultado['salida']);
        return [$codigo, $resultado['json']];
    }

    /** Llama un reporte como el coordinador de Ing. en Computación (cookie Id_carrera). */
    private function reporte(string $archivo, array $filtros = [], ?int $carrera = null): array
    {
        return $this->llamar($archivo, ['cookies' => ['Id_carrera' => (string) ($carrera ?? self::$computacion)],
            'datos' => self::filtros($filtros)]);
    }

    /** Archivos que se conectan a la BD con su mensaje cuando falla la conexión. */
    public static function archivosSinBD(): array
    {
        return [
            'obtener_encuestas.php'            => ['obtener_encuestas.php', 'Hubo un error conectando al servidor'],
            'obtener_periodos.php'             => ['obtener_periodos.php', 'Hubo un error conectando a la base de datos'],
            'generar_tabla_resumen.php'        => ['generar_tabla_resumen.php', 'Hubo un error creando el PDO'],
            'generar_promedio_resumen.php'     => ['generar_promedio_resumen.php', 'Hubo un error conectando al servidor'],
            'generar_tabla_entregados.php'     => ['generar_tabla_entregados.php', 'Hubo un error creando el PDO'],
            'generar_tabla_pendientes.php'     => ['generar_tabla_pendientes.php', 'Hubo un error creando el PDO'],
            'obtener_respuesta_individual.php' => ['obtener_respuesta_individual.php', 'Hubo un error conectando al servidor'],
            'obtener_datos_encabezado.php'     => ['obtener_datos_encabezado.php', 'Hubo un error obteniendo la información del administrador'],
        ];
    }

    // =====================================================================
    // Todos los PHP: error de conexión
    // =====================================================================

    /**
     * Función   : todos los PHP › try/catch de la conexión PDO.
     * Comprueba : que si no hay conexión a la BD cada archivo responde 500 con su mensaje de error.
     *
     * @testdox [conexión PDO] Comprueba que $archivo responde 500 sin conexión a la BD
     * @dataProvider archivosSinBD
     */
    #[TestDox('[conexión PDO] Comprueba que $archivo responde 500 sin conexión a la BD')]
    #[DataProvider('archivosSinBD')]
    public function test_sin_bd(string $archivo, string $mensaje): void
    {
        $r = $this->llamar($archivo, ['cookies' => ['Id_usuario' => '1', 'Id_carrera' => '1'], 'datos' => ['Id_encuesta' => '1',
            'Periodo_tipo' => 'primavera', 'Periodo_anio' => '2026', 'Matricula_alumno' => '20230001'], 'sinBD' => true]);

        $this->assertSame([500, ['error' => $mensaje]], $r);
    }

    // =====================================================================
    // obtener_encuestas.php
    // =====================================================================

    /**
     * Función   : obtener_encuestas.php › consulta del catálogo de encuestas.
     * Comprueba : que regresa el Id y el nombre de cada encuesta.
     *
     * @testdox [obtener_encuestas.php] Comprueba que regresa el catálogo de encuestas
     */
    #[TestDox('[obtener_encuestas.php] Comprueba que regresa el catálogo de encuestas')]
    public function test_encuestas(): void
    {
        self::escenario();
        $otra = self::insertar('Encuestas', ['Nombre' => 'Evaluación del coordinador', 'Id_servicio' => self::$practicas]);

        [$codigo, $r] = $this->llamar('obtener_encuestas.php');

        $this->assertSame(200, $codigo);
        $this->assertEquals([['Id_encuesta' => self::$encuesta, 'Nombre' => 'Satisfacción del alumno'],
            ['Id_encuesta' => $otra, 'Nombre' => 'Evaluación del coordinador']], $r);
    }

    /**
     * Función   : obtener_encuestas.php › if (empty($catalogo_encuestas)).
     * Comprueba : que sin encuestas responde el mensaje "No hay encuestas disponibles.".
     *
     * @testdox [obtener_encuestas.php] Comprueba el mensaje cuando no hay encuestas
     */
    #[TestDox('[obtener_encuestas.php] Comprueba el mensaje cuando no hay encuestas')]
    public function test_encuestas_vacio(): void
    {
        $this->assertSame([200, ['error' => 'No hay encuestas disponibles.']], $this->llamar('obtener_encuestas.php'));
    }

    // =====================================================================
    // obtener_periodos.php
    // =====================================================================

    /**
     * Función   : obtener_periodos.php › consultas de tipos de periodo y años.
     * Comprueba : que regresa, sin repetir, los tipos de periodo y los años
     *             registrados en Periodo_Encuesta.
     *
     * @testdox [obtener_periodos.php] Comprueba los tipos de periodo y años (sin repetidos)
     */
    #[TestDox('[obtener_periodos.php] Comprueba los tipos de periodo y años (sin repetidos)')]
    public function test_periodos(): void
    {
        self::escenario();
        self::insertar('Periodo_Encuesta', ['Id_encuesta' => self::$encuesta, 'Periodo_tipo' => 'otoño', 'Periodo_año' => 2025]);
        self::insertar('Periodo_Encuesta', ['Id_encuesta' => self::$encuesta, 'Periodo_tipo' => 'otoño', 'Periodo_año' => 2026]);

        [$codigo, $r] = $this->llamar('obtener_periodos.php');

        $this->assertSame(200, $codigo);
        $this->assertEqualsCanonicalizing(['primavera', 'otoño'], array_column($r['tipo'], 'Periodo_tipo'));
        $this->assertEqualsCanonicalizing([2026, 2025], array_map('intval', array_column($r['anio'], 'Periodo_anio')));
    }

    /**
     * Función   : obtener_periodos.php › if (empty($stmt_periodo_tipo) || empty($stmt_periodo_anio)).
     * Comprueba : qué responde cuando no hay periodos. La condición revisa las
     *             consultas ($stmt) y no los resultados, así que nunca se cumple:
     *             en lugar del mensaje de error regresa listas vacías.
     *
     * @testdox [obtener_periodos.php] Comprueba que sin periodos regresa listas vacías (no el mensaje de error)
     */
    #[TestDox('[obtener_periodos.php] Comprueba que sin periodos regresa listas vacías (no el mensaje de error)')]
    public function test_periodos_vacio(): void
    {
        $this->assertSame([200, ['tipo' => [], 'anio' => []]], $this->llamar('obtener_periodos.php'));
    }

    // =====================================================================
    // generar_tabla_resumen.php
    // =====================================================================

    /**
     * Función   : generar_tabla_resumen.php › consulta del resumen.
     * Comprueba : que cuenta cuántos alumnos eligieron cada calificación (1 a 5)
     *             por pregunta, ordenadas por "Orden", y que no incluye las
     *             preguntas abiertas.
     *
     * @testdox [generar_tabla_resumen.php] Comprueba el conteo por calificación de cada pregunta
     */
    #[TestDox('[generar_tabla_resumen.php] Comprueba el conteo por calificación de cada pregunta')]
    public function test_resumen(): void
    {
        self::escenario();
        self::contestar(self::crearAlumno()[0], [5, 1, 'Más horarios']);
        self::contestar(self::crearAlumno()[0], [5, 3, 'Nada']);
        self::contestar(self::crearAlumno()[0], [4, 3, 'Todo bien']);

        [$codigo, $r] = $this->reporte('generar_tabla_resumen.php');

        $this->assertSame(200, $codigo);
        $this->assertEquals([
            ['Seccion' => 'General', 'Pregunta' => 'Trato recibido', 'Deficiente' => 0, 'Suficiente' => 0, 'Bien' => 0, 'Muy bien' => 1, 'Excelente' => 2],
            ['Seccion' => 'General', 'Pregunta' => 'Instalaciones', 'Deficiente' => 1, 'Suficiente' => 0, 'Bien' => 2, 'Muy bien' => 0, 'Excelente' => 0],
        ], $r);
    }

    /**
     * Función   : generar_tabla_resumen.php › filtros de carrera y periodo.
     * Comprueba : que solo cuenta a los alumnos de la carrera de la sesión y del
     *             periodo elegido.
     *
     * @testdox [generar_tabla_resumen.php] Comprueba que filtra por carrera y periodo
     */
    #[TestDox('[generar_tabla_resumen.php] Comprueba que filtra por carrera y periodo')]
    public function test_resumen_filtros(): void
    {
        self::escenario();
        self::contestar(self::crearAlumno()[0], [5, 5]);
        self::contestar(self::crearAlumno(['Id_carrera' => self::$quimica])[0], [1, 1]);
        self::contestar(self::crearAlumno([], ['periodo_tipo' => 'otoño', 'periodo_año' => 2025])[0], [1, 1]);

        [, $r] = $this->reporte('generar_tabla_resumen.php');

        $this->assertEquals([1, 1], array_column($r, 'Excelente'));
        $this->assertEquals([0, 0], array_column($r, 'Deficiente'));
    }

    /**
     * Función   : generar_tabla_resumen.php › if (empty($tabla_resultado)).
     * Comprueba : que sin respuestas para los filtros responde 404.
     *
     * @testdox [generar_tabla_resumen.php] Comprueba que sin respuestas responde 404
     */
    #[TestDox('[generar_tabla_resumen.php] Comprueba que sin respuestas responde 404')]
    public function test_resumen_vacio(): void
    {
        self::escenario();
        self::contestar(self::crearAlumno()[0], [5, 5]);

        $this->assertSame([404, ['error' => 'No hay resultados disponibles para los filtros seleccionados.']],
            $this->reporte('generar_tabla_resumen.php', ['Periodo_tipo' => 'otoño']));
    }

    // =====================================================================
    // generar_promedio_resumen.php
    // =====================================================================

    /**
     * Función   : generar_promedio_resumen.php › consulta del promedio general.
     * Comprueba : que convierte cada calificación con (respuesta + 5) × 10
     *             (1 = 60 … 5 = 100, como la escala del banner) y regresa el
     *             promedio; no toma en cuenta preguntas abiertas.
     *
     * @testdox [generar_promedio_resumen.php] Comprueba el promedio general (1=60 … 5=100)
     */
    #[TestDox('[generar_promedio_resumen.php] Comprueba el promedio general (1=60 … 5=100)')]
    public function test_promedio(): void
    {
        self::escenario();
        self::contestar(self::crearAlumno()[0], [5, 4, 'texto']);   // 100 y 90
        self::contestar(self::crearAlumno()[0], [1, 3, 'texto']);   // 60 y 80

        [$codigo, $r] = $this->reporte('generar_promedio_resumen.php');

        $this->assertSame(200, $codigo);
        $this->assertEqualsWithDelta(82.5, (float) $r, 0.001);
    }

    /**
     * Función   : generar_promedio_resumen.php › if (empty($promedio_encuesta)).
     * Comprueba : que si no hay respuestas de la carrera responde 404.
     *
     * @testdox [generar_promedio_resumen.php] Comprueba que sin respuestas responde 404
     */
    #[TestDox('[generar_promedio_resumen.php] Comprueba que sin respuestas responde 404')]
    public function test_promedio_vacio(): void
    {
        self::escenario();
        self::contestar(self::crearAlumno()[0], [5, 5]);

        $this->assertSame([404, ['error' => 'No hay resultados para el promedio.']],
            $this->reporte('generar_promedio_resumen.php', [], self::$quimica));
    }

    // =====================================================================
    // generar_tabla_entregados.php y generar_tabla_pendientes.php
    // =====================================================================

    /**
     * Función   : generar_tabla_entregados.php y generar_tabla_pendientes.php › consultas.
     * Comprueba : que "entregados" lista (una sola vez) a los alumnos que
     *             contestaron con su matrícula, y "pendientes" a los que no;
     *             solo de la carrera de la sesión y del periodo elegido.
     *
     * @testdox [generar_tabla_entregados/pendientes.php] Comprueba quién contestó y quién está pendiente
     */
    #[TestDox('[generar_tabla_entregados/pendientes.php] Comprueba quién contestó y quién está pendiente')]
    public function test_entregados_y_pendientes(): void
    {
        self::escenario();
        [$ana, $matAna] = self::crearAlumno();
        self::contestar($ana, [5, 4, 'texto']);
        self::crearAlumno(['Nombre' => 'Rosa', 'Apellido_P' => 'Díaz', 'Apellido_M' => 'Mora']);
        self::crearAlumno(['Nombre' => 'Otra', 'Id_carrera' => self::$quimica]);
        self::contestar(self::crearAlumno(['Nombre' => 'Química contestó', 'Id_carrera' => self::$quimica])[0], [5, 5]);
        self::crearAlumno(['Nombre' => 'Pasado'], ['periodo_tipo' => 'otoño', 'periodo_año' => 2025]);
        self::crearAlumno(['Nombre' => 'Prácticas'], ['Id_servicio' => self::$practicas]);

        [$codigo, $entregados] = $this->reporte('generar_tabla_entregados.php');
        $this->assertSame(200, $codigo);
        $this->assertSame([['Matricula' => $matAna, 'Nombre del Alumno' => 'Ana López Ruiz', 'Nombre encuesta' => 'Satisfacción del alumno',
            'Periodo' => 'primavera 2026', 'Servicio' => 'Servicio social']], $entregados);

        [$codigo, $pendientes] = $this->reporte('generar_tabla_pendientes.php');
        $this->assertSame(200, $codigo);
        $this->assertSame([['Nombre del Alumno' => 'Rosa Díaz Mora', 'Nombre encuesta' => 'Satisfacción del alumno',
            'Periodo' => 'primavera 2026', 'Servicio' => 'Servicio social']], $pendientes);
    }

    /**
     * Función   : generar_tabla_entregados.php y generar_tabla_pendientes.php › if (empty($tabla_resultado)).
     * Comprueba : que si nadie ha contestado, "entregados" responde 404, y si todos
     *             contestaron, "pendientes" responde 404.
     *
     * @testdox [generar_tabla_entregados/pendientes.php] Comprueba la respuesta 404 cuando no hay alumnos
     */
    #[TestDox('[generar_tabla_entregados/pendientes.php] Comprueba la respuesta 404 cuando no hay alumnos')]
    public function test_entregados_y_pendientes_vacio(): void
    {
        self::escenario();
        [$ana] = self::crearAlumno();
        $vacio = [404, ['error' => 'No hay resultados disponibles.']];

        $this->assertSame($vacio, $this->reporte('generar_tabla_entregados.php'));
        self::contestar($ana, [5, 5]);
        $this->assertSame($vacio, $this->reporte('generar_tabla_pendientes.php'));
    }

    /**
     * Función   : generar_tabla_entregados.php y generar_tabla_pendientes.php › CONCAT del nombre.
     * Comprueba : qué pasa con un alumno sin apellido materno (NULL): CONCAT
     *             regresa NULL y el nombre sale vacío (null) en la tabla.
     *
     * @testdox [generar_tabla_entregados/pendientes.php] Comprueba que sin apellido materno el nombre sale null
     */
    #[TestDox('[generar_tabla_entregados/pendientes.php] Comprueba que sin apellido materno el nombre sale null')]
    public function test_nombre_sin_apellido_materno(): void
    {
        self::escenario();
        [$ana] = self::crearAlumno(['Apellido_M' => null]);
        self::crearAlumno(['Apellido_M' => null]);
        self::contestar($ana, [5, 5]);

        $this->assertNull($this->reporte('generar_tabla_entregados.php')[1][0]['Nombre del Alumno']);
        $this->assertNull($this->reporte('generar_tabla_pendientes.php')[1][0]['Nombre del Alumno']);
    }

    // =====================================================================
    // obtener_respuesta_individual.php
    // =====================================================================

    /**
     * Función   : obtener_respuesta_individual.php › consultas y transformación de respuestas.
     * Comprueba : que regresa los datos de la encuesta (código, revisión, fecha,
     *             versión), el nombre del alumno y sus respuestas ordenadas: la
     *             calificación escrita en su columna (1=Deficiente … 5=Excelente) y
     *             el texto de las preguntas abiertas en la columna "Deficiente".
     *
     * @testdox [obtener_respuesta_individual.php] Comprueba la respuesta individual de un alumno
     */
    #[TestDox('[obtener_respuesta_individual.php] Comprueba la respuesta individual de un alumno')]
    public function test_respuesta_individual(): void
    {
        self::escenario();
        [$ana, $matricula] = self::crearAlumno();
        self::contestar($ana, [4, 1, 'Más horarios']);
        self::contestar(self::crearAlumno()[0], [5, 5, 'Otro alumno']);

        [$codigo, $r] = $this->llamar('obtener_respuesta_individual.php',
            ['datos' => ['Id_encuesta' => (string) self::$encuesta, 'Matricula_alumno' => $matricula]]);

        $vacia = ['Deficiente' => '', 'Suficiente' => '', 'Bien' => '', 'Muy bien' => '', 'Excelente' => ''];
        $this->assertSame(200, $codigo);
        $this->assertSame([
            'nombre_alumno' => 'Ana López Ruiz', 'nombre_encuesta' => 'Satisfacción del alumno',
            'encuesta_codigo' => '108g-RG-14', 'encuesta_revision' => '9001:2015', 'encuesta_fecha' => 'Noviembre 2025', 'encuesta_version' => '03',
            'respuesta_individual' => [
                ['seccion' => 'General', 'pregunta' => 'Trato recibido'] + array_merge($vacia, ['Muy bien' => 'Muy bien']),
                ['seccion' => 'General', 'pregunta' => 'Instalaciones'] + array_merge($vacia, ['Deficiente' => 'Deficiente']),
                ['seccion' => 'Comentarios', 'pregunta' => '¿Qué mejorarías?'] + array_merge($vacia, ['Deficiente' => 'Más horarios']),
            ],
        ], $r);
    }

    /**
     * Función   : obtener_respuesta_individual.php › switch ($respuesta).
     * Comprueba : que cada calificación de 1 a 5 se escribe en su columna.
     *
     * @testdox [obtener_respuesta_individual.php] Comprueba la columna de cada calificación (1 a 5)
     */
    #[TestDox('[obtener_respuesta_individual.php] Comprueba la columna de cada calificación (1 a 5)')]
    public function test_respuesta_individual_columnas(): void
    {
        self::escenario();
        $columnas = [1 => 'Deficiente', 2 => 'Suficiente', 3 => 'Bien', 4 => 'Muy bien', 5 => 'Excelente'];
        foreach ($columnas as $valor => $columna) {
            [$id, $matricula] = self::crearAlumno();
            self::contestar($id, [$valor]);

            $fila = $this->llamar('obtener_respuesta_individual.php',
                ['datos' => ['Id_encuesta' => (string) self::$encuesta, 'Matricula_alumno' => $matricula]])[1]['respuesta_individual'][0];

            $this->assertSame([$columna], array_keys(array_filter($fila, fn ($v, $k) => $v !== '' && !in_array($k, ['seccion', 'pregunta']), ARRAY_FILTER_USE_BOTH)));
            $this->assertSame($columna, $fila[$columna]);
        }
    }

    /**
     * Función   : obtener_respuesta_individual.php › matrícula sin respuestas.
     * Comprueba : que con una matrícula que no existe regresa la lista vacía
     *             (el JS muestra "No se encontraron Resultados").
     *
     * @testdox [obtener_respuesta_individual.php] Comprueba que una matrícula inexistente regresa la lista vacía
     */
    #[TestDox('[obtener_respuesta_individual.php] Comprueba que una matrícula inexistente regresa la lista vacía')]
    public function test_respuesta_individual_sin_alumno(): void
    {
        self::escenario();

        [$codigo, $r] = $this->llamar('obtener_respuesta_individual.php',
            ['datos' => ['Id_encuesta' => (string) self::$encuesta, 'Matricula_alumno' => '99999999']]);

        $this->assertSame(200, $codigo);
        $this->assertSame([], $r['respuesta_individual']);
        $this->assertFalse($r['nombre_alumno']);
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
     *             administrador de la sesión (para el encabezado del PDF).
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
}