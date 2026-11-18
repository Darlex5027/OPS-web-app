<?php
/**
 * Archivo      : CrearFormulariosTest.php
 * Módulo       : CU_12 Crear formularios (Pruebas unitarias)
 * Archivos bajo prueba (en la carpeta de app/ que empieza con "CU_12"):
 *   encuestas_lista.php, obtener_servicios.php, encuesta_guardar.php,
 *   encuesta_editar.php, periodo_eliminar.php, preguntas_lista.php,
 *   pregunta_form.php, pregunta_editar.php, eliminar.php
 * Herramienta  : PHPUnit
 *
 * Cómo correrlo (desde OPS-web-app, con el Docker del proyecto prendido):
 *   vendor/bin/phpunit --testdox Pruebas_Unitarias/CU_12/CrearFormulariosTest.php
 *
 * Descripción  : Pruebas de los PHP para crear encuestas y preguntas. El código original NO se modifica.
 *   - Usan una base de datos APARTE llamada "ops_pruebas_cu12" que se crea sola
 *     dentro del MariaDB de Docker. Tu base de datos real no se toca.
 *   - Cada PHP se ejecuta en un proceso aparte. La prueba le simula la
 *     sesión (cookies) y el cuerpo JSON, y revisa el código HTTP y lo que responde.
 *
 * Cada prueba indica:
 *   - Función   : archivo PHP › bloque que se prueba.
 *   - Comprueba : qué comportamiento se verifica.
 */

namespace CU_12;

use PDO;
use PDOException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\TestDox;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class CrearFormulariosTest extends TestCase
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
    private const DB_NAME = 'ops_pruebas_cu12'; // debe contener "prueba"

    private const PUENTE_DOCKER = 'ops-pruebas-puente-bd';
    private const PUERTO_PUENTE = '33061';

    private static ?PDO $pdo = null;
    private static ?array $destino = null;
    private static string $carpetaTemporal = '';

    /** Carpeta del módulo: la primera de app/ que empieza con "CU_12". */
    private static function carpetaApp(): string
    {
        $carpetas = glob(__DIR__ . '/../../app/CU_12*', GLOB_ONLYDIR);
        if (!$carpetas) {
            throw new RuntimeException('No se encontró ninguna carpeta que empiece con "CU_12" dentro de app/.');
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
        $base = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'ops_pruebas_cu12';
        @mkdir($base . DIRECTORY_SEPARATOR . 'php', 0777, true);
        @mkdir($base . DIRECTORY_SEPARATOR . 'CU_12', 0777, true);

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
            self::$carpetaTemporal . DIRECTORY_SEPARATOR . 'CU_12',
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
        foreach (['Respuestas', 'Preguntas', 'Periodo_Encuesta', 'Encuestas', 'Actividades'] as $t) {
            $pdo->exec("DROP TABLE IF EXISTS `{$t}`");
        }
        $pdo->exec('CREATE TABLE Actividades (Id_servicio INT AUTO_INCREMENT PRIMARY KEY, Servicio VARCHAR(150) NOT NULL)');
        $pdo->exec('CREATE TABLE Encuestas (
            Id_encuesta INT AUTO_INCREMENT PRIMARY KEY, Codigo VARCHAR(50) NULL, Revision VARCHAR(50) NULL,
            Fecha VARCHAR(50) NULL, Version VARCHAR(10) NULL, Nombre VARCHAR(200) NOT NULL, Descripcion VARCHAR(500) NULL,
            Id_servicio INT NULL, Activo TINYINT(1) NOT NULL DEFAULT 1, Contestador TINYINT(1) NOT NULL DEFAULT 0,
            Fecha_fin DATE NULL, Fecha_registro DATETIME NULL, Fecha_modificacion DATETIME NULL)');
        $pdo->exec("CREATE TABLE Periodo_Encuesta (
            Id_periodo_encuesta INT AUTO_INCREMENT PRIMARY KEY, Id_encuesta INT NOT NULL,
            Periodo_tipo ENUM('primavera','otoño') NOT NULL, `Periodo_año` YEAR NOT NULL)");
        $pdo->exec('CREATE TABLE Preguntas (
            Id_pregunta INT AUTO_INCREMENT PRIMARY KEY, Id_encuesta INT NOT NULL, Pregunta VARCHAR(300) NOT NULL,
            Tipo_respuesta VARCHAR(20) NOT NULL, Seccion CHAR(1) NULL, Orden INT NOT NULL,
            Obligatoria TINYINT(1) NOT NULL DEFAULT 1, Activo TINYINT(1) NOT NULL DEFAULT 1)');
        $pdo->exec('CREATE TABLE Respuestas (
            Id_respuesta INT AUTO_INCREMENT PRIMARY KEY, Id_encuesta INT NOT NULL, Id_pregunta INT NOT NULL,
            Id_alumno INT NOT NULL DEFAULT 1, Respuesta TEXT NOT NULL)');
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
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private static int $social = 0;
    private static int $practicas = 0;

    /** Servicios "Servicio social" y "Prácticas profesionales". */
    private static function servicios(): void
    {
        self::$social = self::insertar('Actividades', ['Servicio' => 'Servicio social']);
        self::$practicas = self::insertar('Actividades', ['Servicio' => 'Prácticas profesionales']);
    }

    /** Crea una encuesta (todo se puede cambiar) con los periodos indicados. Regresa su Id. */
    private static function crearEncuesta(array $datos = [], array $periodos = [['primavera', 2026]]): int
    {
        $id = self::insertar('Encuestas', array_merge(['Codigo' => '108g-RG-14', 'Revision' => '9001:2015', 'Fecha' => 'Noviembre 2025',
            'Version' => '03', 'Nombre' => 'Satisfacción', 'Descripcion' => 'Encuesta final', 'Id_servicio' => self::$social,
            'Activo' => 1, 'Contestador' => 0, 'Fecha_fin' => '2026-12-01'], $datos));
        foreach ($periodos as [$tipo, $anio]) {
            self::insertar('Periodo_Encuesta', ['Id_encuesta' => $id, 'Periodo_tipo' => $tipo, 'Periodo_año' => $anio]);
        }
        return $id;
    }

    /** Crea una pregunta en la encuesta. Regresa su Id. */
    private static function crearPregunta(int $encuesta, int $orden, array $datos = []): int
    {
        return self::insertar('Preguntas', array_merge(['Id_encuesta' => $encuesta, 'Pregunta' => "Pregunta $orden",
            'Tipo_respuesta' => 'ESCALA_1_5', 'Seccion' => 'A', 'Orden' => $orden, 'Obligatoria' => 1, 'Activo' => 1], $datos));
    }

    private static function responder(int $encuesta, int $pregunta, int $veces = 1): void
    {
        for ($i = 0; $i < $veces; $i++) {
            self::insertar('Respuestas', ['Id_encuesta' => $encuesta, 'Id_pregunta' => $pregunta, 'Respuesta' => '5']);
        }
    }

    private static function contar(string $tabla, string $where = '1=1', array $valores = []): int
    {
        return (int) self::filas("SELECT COUNT(*) AS n FROM `$tabla` WHERE $where", $valores)[0]['n'];
    }

    // ---------- Llamar a los PHP ----------

    /** Ejecuta un PHP del módulo y regresa [código HTTP, JSON]. Opciones: datos (JSON), get, sinBD. */
    private function llamar(string $archivo, array $op = []): array
    {
        $archivoCodigo = tempnam(sys_get_temp_dir(), 'ops_codigo_');
        $entorno = ['OPS_COOKIES' => '[]', 'OPS_GET' => json_encode($op['get'] ?? []), 'OPS_ARCHIVO_CODIGO' => $archivoCodigo];
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

    /** Datos de una encuesta nueva como los manda encuesta_form.js. */
    private static function encuestaNueva(array $cambios = []): array
    {
        return array_merge(['codigo' => 'C-1', 'revision' => 'R-2', 'fecha' => 'Junio 2026', 'version' => '01', 'nombre' => 'Egreso',
            'descripcion' => 'Encuesta de egreso', 'servicio' => (string) self::$practicas, 'activo' => '1', 'contestador' => '1',
            'periodo_tipo' => 'otoño', 'periodo_anio' => '2026', 'fecha_fin' => '2026-12-15'], $cambios);
    }

    /** Archivos con su mensaje cuando falla la conexión y los datos mínimos que necesitan. */
    public static function archivosSinBD(): array
    {
        $encuesta = ['Id_encuesta' => '1'];
        return [
            'encuestas_lista.php'   => ['encuestas_lista.php', 'Error al mostrar las encuestas', [], []],
            'obtener_servicios.php' => ['obtener_servicios.php', 'Error al mostrar los servicios', [], []],
            'encuesta_guardar.php'  => ['encuesta_guardar.php', 'Error al guardar la encuesta', ['codigo' => 'C', 'revision' => 'R',
                'fecha' => 'F', 'version' => 'V', 'nombre' => 'N', 'descripcion' => 'D', 'servicio' => '1', 'activo' => '1',
                'contestador' => '0', 'periodo_tipo' => 'otoño', 'periodo_anio' => '2026', 'fecha_fin' => '2026-12-01'], []],
            'encuesta_editar.php'   => ['encuesta_editar.php', 'Error al editar la encuesta', $encuesta, []],
            'periodo_eliminar.php'  => ['periodo_eliminar.php', 'Error al eliminar el periodo', ['Id_periodo_encuesta' => 1], []],
            'preguntas_lista.php'   => ['preguntas_lista.php', 'Error al mostrar las preguntas', $encuesta, []],
            'pregunta_form.php'     => ['pregunta_form.php', 'Error al guardar la pregunta', ['Id_encuesta' => '1', 'pregunta' => 'P',
                'tipo_respuesta' => 'TEXTO', 'seccion' => 'A', 'obligatoria' => '1', 'activo' => '1'], []],
            'pregunta_editar.php'   => ['pregunta_editar.php', 'Error al editar la pregunta', ['Id_pregunta' => '1'], []],
            'eliminar.php'          => ['eliminar.php', 'Error al eliminar la encuesta en la Base de datos', [], $encuesta],
        ];
    }

    // =====================================================================
    // Todos los PHP: error de conexión
    // =====================================================================

    /**
     * Función   : todos los PHP › catch (PDOException).
     * Comprueba : que si no hay conexión a la BD cada archivo responde 500 con su mensaje de error.
     *
     * @testdox [catch PDOException] Comprueba que $archivo responde 500 sin conexión a la BD
     * @dataProvider archivosSinBD
     */
    #[TestDox('[catch PDOException] Comprueba que $archivo responde 500 sin conexión a la BD')]
    #[DataProvider('archivosSinBD')]
    public function test_sin_bd(string $archivo, string $mensaje, array $datos, array $get): void
    {
        $this->assertSame([500, ['error' => $mensaje]], $this->llamar($archivo, ['datos' => $datos, 'get' => $get, 'sinBD' => true]));
    }

    // =====================================================================
    // obtener_servicios.php y encuestas_lista.php
    // =====================================================================

    /**
     * Función   : obtener_servicios.php › consulta de Actividades.
     * Comprueba : que regresa el Id y nombre de cada servicio.
     *
     * @testdox [obtener_servicios.php] Comprueba la lista de servicios
     */
    #[TestDox('[obtener_servicios.php] Comprueba la lista de servicios')]
    public function test_servicios(): void
    {
        self::servicios();

        [$codigo, $r] = $this->llamar('obtener_servicios.php');

        $this->assertSame(200, $codigo);
        $this->assertEquals(['success' => true, 'data' => [['Id_servicio' => self::$social, 'Servicio' => 'Servicio social'],
            ['Id_servicio' => self::$practicas, 'Servicio' => 'Prácticas profesionales']]], $r);
    }

    /**
     * Función   : encuestas_lista.php › consulta y agrupación por encuesta.
     * Comprueba : que regresa cada encuesta UNA vez con su encabezado, el nombre del
     *             servicio y todos sus periodos agrupados.
     *
     * @testdox [encuestas_lista.php] Comprueba las encuestas con su servicio y periodos agrupados
     */
    #[TestDox('[encuestas_lista.php] Comprueba las encuestas con su servicio y periodos agrupados')]
    public function test_encuestas_lista(): void
    {
        self::servicios();
        $id = self::crearEncuesta([], [['primavera', 2026], ['otoño', 2025]]);

        [$codigo, $r] = $this->llamar('encuestas_lista.php');

        $this->assertSame(200, $codigo);
        $this->assertTrue($r['success']);
        $this->assertCount(1, $r['data']);
        $e = $r['data'][0];
        $this->assertEquals(['Codigo' => '108g-RG-14', 'Version' => '03', 'Revision' => '9001:2015', 'Fecha' => 'Noviembre 2025',
            'Id_encuesta' => $id, 'Nombre' => 'Satisfacción', 'Activo' => 1, 'Contestador' => 0, 'Descripcion' => 'Encuesta final',
            'Fecha_fin' => '2026-12-01', 'Servicio' => 'Servicio social'], array_diff_key($e, ['periodos' => 0]));
        $this->assertEquals([['Periodo_tipo' => 'otoño', 'Periodo_año' => 2025], ['Periodo_tipo' => 'primavera', 'Periodo_año' => 2026]], $e['periodos']);
    }

    /**
     * Función   : encuestas_lista.php › LEFT JOIN Periodo_Encuesta.
     * Comprueba : qué regresa una encuesta sin periodos: aparece con un periodo
     *             de valores null (en la tabla se vería "null null").
     *
     * @testdox [encuestas_lista.php] Comprueba que una encuesta sin periodos trae un periodo null
     */
    #[TestDox('[encuestas_lista.php] Comprueba que una encuesta sin periodos trae un periodo null')]
    public function test_encuestas_lista_sin_periodos(): void
    {
        self::servicios();
        self::crearEncuesta([], []);

        $this->assertSame([['Periodo_tipo' => null, 'Periodo_año' => null]], $this->llamar('encuestas_lista.php')[1]['data'][0]['periodos']);
    }

    // =====================================================================
    // encuesta_guardar.php
    // =====================================================================

    /**
     * Función   : encuesta_guardar.php › INSERT en Encuestas y Periodo_Encuesta.
     * Comprueba : que guarda la encuesta con todos sus datos y fechas de registro
     *             y modificación, y su primer periodo.
     *
     * @testdox [encuesta_guardar.php] Comprueba que guarda la encuesta y su periodo
     */
    #[TestDox('[encuesta_guardar.php] Comprueba que guarda la encuesta y su periodo')]
    public function test_guardar(): void
    {
        self::servicios();

        $r = $this->llamar('encuesta_guardar.php', ['datos' => self::encuestaNueva()]);

        $this->assertSame([200, ['success' => true, 'mensaje' => 'Encuesta guardada correctamente']], $r);
        $e = self::filas('SELECT * FROM Encuestas')[0];
        $this->assertEquals(['C-1', 'R-2', 'Junio 2026', '01', 'Egreso', 'Encuesta de egreso', self::$practicas, 1, 1, '2026-12-15'],
            [$e['Codigo'], $e['Revision'], $e['Fecha'], $e['Version'], $e['Nombre'], $e['Descripcion'], $e['Id_servicio'],
                $e['Activo'], $e['Contestador'], $e['Fecha_fin']]);
        $this->assertNotNull($e['Fecha_registro']);
        $this->assertNotNull($e['Fecha_modificacion']);
        $this->assertEquals([['Id_encuesta' => $e['Id_encuesta'], 'Periodo_tipo' => 'otoño', 'Periodo_año' => 2026]],
            self::filas('SELECT Id_encuesta, Periodo_tipo, `Periodo_año` FROM Periodo_Encuesta'));
    }

    /**
     * Función   : encuesta_guardar.php › segundo INSERT (sin transacción).
     * Comprueba : qué pasa si falla el periodo (por ejemplo año 9999, que pasa la
     *             validación del JS pero no cabe en la columna YEAR): responde 500
     *             pero la encuesta YA quedó guardada sin periodos, y después
     *             encuesta_editar.php no la puede cargar (regresa data vacía).
     *
     * @testdox [encuesta_guardar.php] Comprueba que si falla el periodo la encuesta queda guardada sin periodo
     */
    #[TestDox('[encuesta_guardar.php] Comprueba que si falla el periodo la encuesta queda guardada sin periodo')]
    public function test_guardar_periodo_invalido(): void
    {
        self::servicios();

        $r = $this->llamar('encuesta_guardar.php', ['datos' => self::encuestaNueva(['periodo_anio' => '9999'])]);

        $this->assertSame([500, ['error' => 'Error al guardar la encuesta']], $r);
        $this->assertSame(1, self::contar('Encuestas'));
        $this->assertSame(0, self::contar('Periodo_Encuesta'));
        $id = (string) self::filas('SELECT Id_encuesta FROM Encuestas')[0]['Id_encuesta'];
        $this->assertSame([200, ['success' => true, 'data' => []]], $this->llamar('encuesta_editar.php', ['datos' => ['Id_encuesta' => $id]]));
    }

    // =====================================================================
    // encuesta_editar.php
    // =====================================================================

    /**
     * Función   : encuesta_editar.php › Operación 3 (consulta).
     * Comprueba : que regresa los datos de la encuesta y sus periodos con su Id,
     *             ordenados por año.
     *
     * @testdox [encuesta_editar.php] Comprueba la consulta de la encuesta con sus periodos
     */
    #[TestDox('[encuesta_editar.php] Comprueba la consulta de la encuesta con sus periodos')]
    public function test_editar_consulta(): void
    {
        self::servicios();
        $id = self::crearEncuesta([], [['otoño', 2027], ['primavera', 2026]]);
        self::crearEncuesta(['Nombre' => 'Otra']);

        [$codigo, $r] = $this->llamar('encuesta_editar.php', ['datos' => ['Id_encuesta' => (string) $id]]);

        $this->assertSame(200, $codigo);
        $this->assertCount(1, $r['data']);
        $e = $r['data'][0];
        $this->assertEquals(['Satisfacción', 'Encuesta final', self::$social, 1, 0, '2026-12-01'],
            [$e['Nombre'], $e['Descripcion'], $e['Id_servicio'], $e['Activo'], $e['Contestador'], $e['Fecha_fin']]);
        $this->assertEquals([['primavera', 2026], ['otoño', 2027]], array_map(fn ($p) => [$p['Periodo_tipo'], $p['Periodo_año']], $e['periodos']));
        $this->assertCount(2, array_unique(array_column($e['periodos'], 'Id_periodo_encuesta')));
    }

    /**
     * Función   : encuesta_editar.php › Operación 1 (actualizar datos generales).
     * Comprueba : que actualiza solo la encuesta indicada, registra la fecha de
     *             modificación y no cambia el encabezado (código, revisión...).
     *
     * @testdox [encuesta_editar.php] Comprueba que actualiza los datos generales de la encuesta
     */
    #[TestDox('[encuesta_editar.php] Comprueba que actualiza los datos generales de la encuesta')]
    public function test_editar_actualizar(): void
    {
        self::servicios();
        $id = self::crearEncuesta();
        $otra = self::crearEncuesta(['Nombre' => 'Otra']);

        $r = $this->llamar('encuesta_editar.php', ['datos' => ['Id_encuesta' => (string) $id, 'nombre' => 'Satisfacción 2',
            'descripcion' => 'Nueva', 'servicio' => (string) self::$practicas, 'activo' => '0', 'contestador' => '1', 'fecha_fin' => '2027-01-31']]);

        $this->assertSame([200, ['success' => true, 'mensaje' => 'Encuesta actualizada']], $r);
        $e = self::filas('SELECT * FROM Encuestas WHERE Id_encuesta=?', [$id])[0];
        $this->assertEquals(['Satisfacción 2', 'Nueva', self::$practicas, 0, 1, '2027-01-31', '108g-RG-14'],
            [$e['Nombre'], $e['Descripcion'], $e['Id_servicio'], $e['Activo'], $e['Contestador'], $e['Fecha_fin'], $e['Codigo']]);
        $this->assertNotNull($e['Fecha_modificacion']);
        $this->assertSame('Otra', self::filas('SELECT Nombre FROM Encuestas WHERE Id_encuesta=?', [$otra])[0]['Nombre']);
    }

    /**
     * Función   : encuesta_editar.php › Operación 2 (agregar periodo).
     * Comprueba : que agrega un periodo a la encuesta indicada.
     *
     * @testdox [encuesta_editar.php] Comprueba que agrega un periodo a la encuesta
     */
    #[TestDox('[encuesta_editar.php] Comprueba que agrega un periodo a la encuesta')]
    public function test_editar_agregar_periodo(): void
    {
        self::servicios();
        $id = self::crearEncuesta();

        $r = $this->llamar('encuesta_editar.php', ['datos' => ['Id_encuesta' => (string) $id, 'periodo_tipo' => 'otoño', 'periodo_anio' => '2027']]);

        $this->assertSame([200, ['success' => true, 'mensaje' => 'Encuesta actualizada']], $r);
        $this->assertEquals([['primavera', 2026], ['otoño', 2027]],
            array_map(fn ($p) => [$p['Periodo_tipo'], $p['Periodo_año']], self::filas('SELECT * FROM Periodo_Encuesta WHERE Id_encuesta=? ORDER BY Id_periodo_encuesta', [$id])));
    }

    // =====================================================================
    // periodo_eliminar.php
    // =====================================================================

    /**
     * Función   : periodo_eliminar.php › DELETE del periodo.
     * Comprueba : que borra solo el periodo indicado (el primero; el siguiente se queda).
     *
     * @testdox [periodo_eliminar.php] Comprueba que elimina solo el periodo indicado
     */
    #[TestDox('[periodo_eliminar.php] Comprueba que elimina solo el periodo indicado')]
    public function test_periodo_eliminar(): void
    {
        self::servicios();
        $id = self::crearEncuesta([], [['primavera', 2026], ['otoño', 2026]]);
        $periodo = (int) self::filas("SELECT Id_periodo_encuesta FROM Periodo_Encuesta WHERE Periodo_tipo='primavera'")[0]['Id_periodo_encuesta'];

        $r = $this->llamar('periodo_eliminar.php', ['datos' => ['Id_periodo_encuesta' => $periodo]]);

        $this->assertSame([200, ['success' => true, 'mensaje' => 'Periodo eliminado']], $r);
        $this->assertSame(['otoño'], array_column(self::filas('SELECT Periodo_tipo FROM Periodo_Encuesta WHERE Id_encuesta=?', [$id]), 'Periodo_tipo'));
    }

    // =====================================================================
    // preguntas_lista.php
    // =====================================================================

    /**
     * Función   : preguntas_lista.php › consulta de preguntas.
     * Comprueba : que regresa solo las preguntas de la encuesta con cuántas
     *             respuestas tiene cada una (total_respuestas).
     *
     * @testdox [preguntas_lista.php] Comprueba las preguntas de la encuesta con su total de respuestas
     */
    #[TestDox('[preguntas_lista.php] Comprueba las preguntas de la encuesta con su total de respuestas')]
    public function test_preguntas_lista(): void
    {
        self::servicios();
        $id = self::crearEncuesta();
        $otra = self::crearEncuesta(['Nombre' => 'Otra']);
        $p1 = self::crearPregunta($id, 1);
        $p2 = self::crearPregunta($id, 2, ['Pregunta' => 'Comentarios', 'Tipo_respuesta' => 'TEXTO', 'Seccion' => 'B', 'Obligatoria' => 0, 'Activo' => 0]);
        self::crearPregunta($otra, 1);
        self::responder($id, $p1, 3);

        [$codigo, $r] = $this->llamar('preguntas_lista.php', ['datos' => ['Id_encuesta' => (string) $id]]);

        $this->assertSame(200, $codigo);
        $this->assertEquals(['success' => true, 'data' => [
            ['Id_pregunta' => $p1, 'Id_encuesta' => $id, 'Pregunta' => 'Pregunta 1', 'Tipo_respuesta' => 'ESCALA_1_5', 'Seccion' => 'A',
                'Orden' => 1, 'Obligatoria' => 1, 'Activo' => 1, 'total_respuestas' => 3],
            ['Id_pregunta' => $p2, 'Id_encuesta' => $id, 'Pregunta' => 'Comentarios', 'Tipo_respuesta' => 'TEXTO', 'Seccion' => 'B',
                'Orden' => 2, 'Obligatoria' => 0, 'Activo' => 0, 'total_respuestas' => 0],
        ]], $r);
    }

    // =====================================================================
    // pregunta_form.php
    // =====================================================================

    /**
     * Función   : pregunta_form.php › cálculo del orden e INSERT.
     * Comprueba : que la pregunta nueva se guarda con orden = número de preguntas
     *             de la encuesta + 1 (las de otra encuesta no cuentan).
     *
     * @testdox [pregunta_form.php] Comprueba que guarda la pregunta con el siguiente número de orden
     */
    #[TestDox('[pregunta_form.php] Comprueba que guarda la pregunta con el siguiente número de orden')]
    public function test_pregunta_form(): void
    {
        self::servicios();
        $id = self::crearEncuesta();
        $otra = self::crearEncuesta(['Nombre' => 'Otra']);
        self::crearPregunta($id, 1);
        self::crearPregunta($id, 2);
        self::crearPregunta($otra, 1);

        $r = $this->llamar('pregunta_form.php', ['datos' => ['Id_encuesta' => (string) $id, 'pregunta' => '¿Te gustó?',
            'tipo_respuesta' => 'BOOLEANO', 'seccion' => 'C', 'obligatoria' => '1', 'activo' => '0']]);

        $this->assertSame([200, ['success' => true, 'mensaje' => 'Encuesta guardada correctamente']], $r);
        $this->assertEquals([['Pregunta' => '¿Te gustó?', 'Tipo_respuesta' => 'BOOLEANO', 'Seccion' => 'C', 'Obligatoria' => 1, 'Activo' => 0, 'Orden' => 3]],
            self::filas("SELECT Pregunta, Tipo_respuesta, Seccion, Obligatoria, Activo, Orden FROM Preguntas WHERE Pregunta='¿Te gustó?'"));
    }

    /**
     * Función   : pregunta_form.php › $orden = COUNT(*) + 1.
     * Comprueba : qué pasa si antes se eliminó una pregunta de en medio: el orden
     *             se calcula contando preguntas, así que la nueva repite un número
     *             que ya existe (quedan dos preguntas con orden 3).
     *
     * @testdox [pregunta_form.php] Comprueba que después de eliminar una pregunta el orden se repite
     */
    #[TestDox('[pregunta_form.php] Comprueba que después de eliminar una pregunta el orden se repite')]
    public function test_pregunta_form_orden_repetido(): void
    {
        self::servicios();
        $id = self::crearEncuesta();
        self::crearPregunta($id, 1);
        $p2 = self::crearPregunta($id, 2);
        self::crearPregunta($id, 3);
        $this->llamar('eliminar.php', ['get' => ['Id_encuesta' => (string) $id, 'Id_pregunta' => (string) $p2]]);

        $this->llamar('pregunta_form.php', ['datos' => ['Id_encuesta' => (string) $id, 'pregunta' => 'Nueva',
            'tipo_respuesta' => 'TEXTO', 'seccion' => 'A', 'obligatoria' => '1', 'activo' => '1']]);

        $this->assertEquals([1, 3, 3], array_column(self::filas('SELECT Orden FROM Preguntas WHERE Id_encuesta=? ORDER BY Orden', [$id]), 'Orden'));
    }

    // =====================================================================
    // pregunta_editar.php
    // =====================================================================

    /**
     * Función   : pregunta_editar.php › consulta y actualización.
     * Comprueba : que sin "pregunta" regresa los datos de la pregunta, y con
     *             "pregunta" actualiza solo esa pregunta (el orden no cambia).
     *
     * @testdox [pregunta_editar.php] Comprueba la consulta y la actualización de una pregunta
     */
    #[TestDox('[pregunta_editar.php] Comprueba la consulta y la actualización de una pregunta')]
    public function test_pregunta_editar(): void
    {
        self::servicios();
        $id = self::crearEncuesta();
        $p1 = self::crearPregunta($id, 1);
        $p2 = self::crearPregunta($id, 2, ['Pregunta' => 'Comentarios', 'Tipo_respuesta' => 'TEXTO', 'Seccion' => 'B', 'Obligatoria' => 0]);

        [$codigo, $r] = $this->llamar('pregunta_editar.php', ['datos' => ['Id_pregunta' => (string) $p2]]);
        $this->assertSame(200, $codigo);
        $this->assertEquals(['success' => true, 'data' => [['Orden' => 2, 'Pregunta' => 'Comentarios', 'Tipo_respuesta' => 'TEXTO',
            'Seccion' => 'B', 'Obligatoria' => 0, 'Activo' => 1]]], $r);

        $r = $this->llamar('pregunta_editar.php', ['datos' => ['Id_pregunta' => (string) $p2, 'pregunta' => 'Comentarios finales',
            'tipo_respuesta' => 'BOOLEANO', 'seccion' => 'C', 'obligatoria' => '1', 'activo' => '0']]);
        $this->assertSame([200, ['success' => true, 'mensaje' => 'Pregunta actualizada']], $r);
        $this->assertEquals([['Pregunta' => 'Pregunta 1', 'Orden' => 1], ['Pregunta' => 'Comentarios finales', 'Orden' => 2]],
            self::filas('SELECT Pregunta, Orden FROM Preguntas ORDER BY Id_pregunta'));
        $this->assertEquals(['BOOLEANO', 'C', 1, 0], array_values(self::filas('SELECT Tipo_respuesta, Seccion, Obligatoria, Activo FROM Preguntas WHERE Id_pregunta=?', [$p2])[0]));
    }

    // =====================================================================
    // eliminar.php
    // =====================================================================

    /**
     * Función   : eliminar.php › eliminación parcial (con Id_pregunta).
     * Comprueba : que borra solo esa pregunta y sus respuestas; las demás
     *             preguntas y la encuesta se quedan.
     *
     * @testdox [eliminar.php] Comprueba que elimina una pregunta con sus respuestas
     */
    #[TestDox('[eliminar.php] Comprueba que elimina una pregunta con sus respuestas')]
    public function test_eliminar_pregunta(): void
    {
        self::servicios();
        $id = self::crearEncuesta();
        $p1 = self::crearPregunta($id, 1);
        $p2 = self::crearPregunta($id, 2);
        self::responder($id, $p1, 2);
        self::responder($id, $p2, 1);

        $r = $this->llamar('eliminar.php', ['get' => ['Id_encuesta' => (string) $id, 'Id_pregunta' => (string) $p1]]);

        $this->assertSame([200, ['success' => true]], $r);
        $this->assertEquals([$p2], array_column(self::filas('SELECT Id_pregunta FROM Preguntas'), 'Id_pregunta'));
        $this->assertSame(1, self::contar('Respuestas'));
        $this->assertSame(1, self::contar('Encuestas'));
    }

    /**
     * Función   : eliminar.php › eliminación total (sin Id_pregunta).
     * Comprueba : que borra la encuesta con sus preguntas y respuestas sin tocar
     *             otras encuestas. Sus periodos (Periodo_Encuesta) NO se borran:
     *             quedan registros sin encuesta.
     *
     * @testdox [eliminar.php] Comprueba que elimina la encuesta completa (los periodos se quedan)
     */
    #[TestDox('[eliminar.php] Comprueba que elimina la encuesta completa (los periodos se quedan)')]
    public function test_eliminar_encuesta(): void
    {
        self::servicios();
        $id = self::crearEncuesta([], [['primavera', 2026], ['otoño', 2026]]);
        $otra = self::crearEncuesta(['Nombre' => 'Otra']);
        self::responder($id, self::crearPregunta($id, 1), 2);
        self::responder($otra, self::crearPregunta($otra, 1), 1);

        $r = $this->llamar('eliminar.php', ['get' => ['Id_encuesta' => (string) $id]]);

        $this->assertSame([200, ['success' => true]], $r);
        $this->assertSame(0, self::contar('Encuestas', 'Id_encuesta=?', [$id]));
        $this->assertSame(0, self::contar('Preguntas', 'Id_encuesta=?', [$id]));
        $this->assertSame(0, self::contar('Respuestas', 'Id_encuesta=?', [$id]));
        $this->assertSame([1, 1, 1], [self::contar('Encuestas'), self::contar('Preguntas'), self::contar('Respuestas')]);
        $this->assertSame(2, self::contar('Periodo_Encuesta', 'Id_encuesta=?', [$id]));
    }
}