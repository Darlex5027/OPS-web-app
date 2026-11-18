<?php
/**
 * Archivo      : EncuestasTest.php
 * Módulo       : CU_05 Encuestas (Pruebas unitarias)
 * Archivos bajo prueba (en la carpeta de app/ que empieza con "CU_05"):
 *   obtener_encuestas_alumno.php
 *   obtener_alumnos_pendientes.php
 *   obtener_preguntas.php
 *   procesar_encuesta.php
 * Herramienta  : PHPUnit
 *
 * Cómo correrlo (desde OPS-web-app, con el Docker del proyecto prendido):
 *   vendor/bin/phpunit --testdox Pruebas_Unitarias/CU_05/EncuestasTest.php
 *
 * Descripción  : Pruebas de los PHP de encuestas. El código original NO se modifica.
 *   - Usan una base de datos APARTE llamada "ops_pruebas_cu05" que se crea sola
 *     dentro del MariaDB de Docker. Tu base de datos real no se toca.
 *   - Cada PHP se ejecuta en un proceso aparte. La prueba le simula los
 *     parámetros de la URL ($_GET) y el cuerpo JSON, y revisa lo que responde.
 *
 * Cada prueba indica:
 *   - Función   : archivo PHP › bloque que se prueba.
 *   - Comprueba : qué comportamiento se verifica.
 */

namespace CU_05;

use PDO;
use PDOException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\TestDox;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class EncuestasTest extends TestCase
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
    private const DB_NAME = 'ops_pruebas_cu05'; // debe contener "prueba"

    private const PUENTE_DOCKER = 'ops-pruebas-puente-bd';
    private const PUERTO_PUENTE = '33061';

    private static ?PDO $pdo = null;
    private static ?array $destino = null;
    private static string $carpetaTemporal = '';

    /** Carpeta del módulo: la primera de app/ que empieza con "CU_05". */
    private static function carpetaApp(): string
    {
        $carpetas = glob(__DIR__ . '/../../app/CU_05*', GLOB_ONLYDIR);
        if (!$carpetas) {
            throw new RuntimeException('No se encontró ninguna carpeta que empiece con "CU_05" dentro de app/.');
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
        $base = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'ops_pruebas_cu05';
        @mkdir($base . DIRECTORY_SEPARATOR . 'php', 0777, true);
        @mkdir($base . DIRECTORY_SEPARATOR . 'CU_05', 0777, true);

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
            self::$carpetaTemporal . DIRECTORY_SEPARATOR . 'CU_05',
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

    /** Crea las tablas que usan los PHP de encuestas (versión mínima para pruebas). */
    private static function crearEsquema(): void
    {
        $pdo = self::conexion();
        foreach (['Respuestas', 'Preguntas', 'Periodo_Encuesta', 'Encuestas', 'Actividades_Alumnos',
                  'Alumnos', 'Empresas', 'Actividades'] as $t) {
            $pdo->exec("DROP TABLE IF EXISTS `{$t}`");
        }
        $pdo->exec('CREATE TABLE Actividades (Id_servicio INT AUTO_INCREMENT PRIMARY KEY, Servicio VARCHAR(150) NOT NULL)');
        $pdo->exec('CREATE TABLE Empresas (Id_empresa INT AUTO_INCREMENT PRIMARY KEY, Nombre VARCHAR(200) NOT NULL)');
        $pdo->exec('CREATE TABLE Alumnos (
            Id_alumno INT AUTO_INCREMENT PRIMARY KEY, No_Expediente VARCHAR(15) NULL,
            Nombre VARCHAR(100) NOT NULL, Apellido_P VARCHAR(100) NOT NULL, Apellido_M VARCHAR(100) NULL,
            Id_carrera INT NOT NULL, Activo TINYINT(1) NOT NULL DEFAULT 1)');
        $pdo->exec("CREATE TABLE Actividades_Alumnos (
            Id_alumno_servicio INT AUTO_INCREMENT PRIMARY KEY, Id_alumno INT NOT NULL, Id_servicio INT NOT NULL,
            Id_empresa INT NULL,
            Estado ENUM('PENDIENTE','EN_CURSO','COMPLETADO','CANCELADO') NOT NULL DEFAULT 'PENDIENTE',
            periodo_tipo ENUM('primavera','otoño') NOT NULL, `periodo_año` YEAR NOT NULL)");
        $pdo->exec('CREATE TABLE Encuestas (
            Id_encuesta INT AUTO_INCREMENT PRIMARY KEY, Nombre VARCHAR(200) NOT NULL, Descripcion TEXT NULL,
            Id_servicio INT NOT NULL, Contestador TINYINT(1) NOT NULL DEFAULT 0, Activo TINYINT(1) NOT NULL DEFAULT 1)');
        $pdo->exec("CREATE TABLE Periodo_Encuesta (
            Id_encuesta INT NOT NULL, Periodo_tipo ENUM('primavera','otoño') NOT NULL, `Periodo_año` YEAR NOT NULL)");
        $pdo->exec('CREATE TABLE Preguntas (
            Id_pregunta INT AUTO_INCREMENT PRIMARY KEY, Id_encuesta INT NOT NULL, Pregunta TEXT NOT NULL,
            Tipo_respuesta VARCHAR(20) NOT NULL, Obligatoria TINYINT(1) NOT NULL DEFAULT 0,
            Orden INT NOT NULL DEFAULT 0, Seccion VARCHAR(100) NULL, Activo TINYINT(1) NOT NULL DEFAULT 1)');
        $pdo->exec('CREATE TABLE Respuestas (
            Id_respuesta INT AUTO_INCREMENT PRIMARY KEY, Id_encuesta INT NOT NULL, Id_alumno INT NOT NULL,
            Id_servicio INT NOT NULL, Id_pregunta INT NOT NULL, Respuesta TEXT NOT NULL, Fecha_respuesta DATETIME NOT NULL)');
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

    private static function crearAlumno(array $cambios = []): int
    {
        return self::insertar('Alumnos', array_merge([
            'No_Expediente' => 'EXP-1', 'Nombre' => 'Ana', 'Apellido_P' => 'López', 'Apellido_M' => 'Ruiz',
            'Id_carrera' => 10, 'Activo' => 1,
        ], $cambios));
    }

    private static function crearActividad(int $idAlumno, int $idServicio, array $cambios = []): int
    {
        return self::insertar('Actividades_Alumnos', array_merge([
            'Id_alumno' => $idAlumno, 'Id_servicio' => $idServicio, 'Id_empresa' => null,
            'Estado' => 'EN_CURSO', 'periodo_tipo' => 'primavera', 'periodo_año' => 2026,
        ], $cambios));
    }

    /** Crea una encuesta activa del servicio, abierta para primavera 2026. */
    private static function crearEncuesta(int $idServicio, array $cambios = [], array $periodo = ['primavera', 2026]): int
    {
        $id = self::insertar('Encuestas', array_merge([
            'Nombre' => 'Encuesta', 'Descripcion' => 'Descripción', 'Id_servicio' => $idServicio,
            'Contestador' => 0, 'Activo' => 1,
        ], $cambios));
        self::insertar('Periodo_Encuesta', ['Id_encuesta' => $id, 'Periodo_tipo' => $periodo[0], 'Periodo_año' => $periodo[1]]);
        return $id;
    }

    private static function crearRespuesta(int $idEncuesta, int $idAlumno, int $idServicio): void
    {
        self::insertar('Respuestas', ['Id_encuesta' => $idEncuesta, 'Id_alumno' => $idAlumno, 'Id_servicio' => $idServicio,
            'Id_pregunta' => 1, 'Respuesta' => 'x', 'Fecha_respuesta' => '2026-05-01 10:00:00']);
    }

    // ---------- Llamar a los PHP ----------

    /** Ejecuta un PHP de encuestas. Opciones: get (parámetros URL), datos (JSON), cuerpo (texto), sinBD. */
    private function llamar(string $archivo, array $op = []): array
    {
        $cuerpo = $op['cuerpo'] ?? (isset($op['datos']) ? json_encode($op['datos']) : '');
        $entorno = ['OPS_GET' => json_encode($op['get'] ?? [])];
        if (!empty($op['sinBD'])) {
            $entorno['OPS_FORZAR_ERROR_DB'] = '1';
        }

        $resultado = self::ejecutarPhp($archivo, $cuerpo, $entorno);

        $this->assertSame('', $resultado['errores'], "{$archivo} mostró errores de PHP:\n" . $resultado['errores']);
        $this->assertIsArray($resultado['json'], "{$archivo} no respondió JSON válido. Respondió:\n" . $resultado['salida']);
        return $resultado['json'];
    }

    // =====================================================================
    // obtener_encuestas_alumno.php  (encuestas que contesta el ALUMNO, Contestador = 0)
    // =====================================================================

    /**
     * Función   : obtener_encuestas_alumno.php › validación de ?alumno=.
     * Comprueba : que sin el Id del alumno responde el error y una lista vacía.
     *
     * @testdox [obtener_encuestas_alumno.php] Comprueba que sin ?alumno= responde error
     */
    #[TestDox('[obtener_encuestas_alumno.php] Comprueba que sin ?alumno= responde error')]
    public function test_encuestas_alumno_sin_id(): void
    {
        $this->assertSame(['success' => false, 'pendientes' => [], 'error' => 'ID de alumno no proporcionado'],
            $this->llamar('obtener_encuestas_alumno.php'));
    }

    /**
     * Función   : obtener_encuestas_alumno.php › consulta (amarre de servicio y periodo).
     * Comprueba : que regresa las encuestas del alumno (Contestador = 0) de su
     *             mismo servicio y periodo, con el nombre del servicio.
     *
     * @testdox [obtener_encuestas_alumno.php] Comprueba que regresa las encuestas del servicio y periodo del alumno
     */
    #[TestDox('[obtener_encuestas_alumno.php] Comprueba que regresa las encuestas del servicio y periodo del alumno')]
    public function test_encuestas_alumno_pendientes(): void
    {
        $social = self::insertar('Actividades', ['Servicio' => 'Servicio social']);
        $alumno = self::crearAlumno();
        self::crearActividad($alumno, $social);
        $e1 = self::crearEncuesta($social, ['Nombre' => 'Satisfacción', 'Descripcion' => 'Evalúa']);
        $e2 = self::crearEncuesta($social, ['Nombre' => 'Cierre']);

        $r = $this->llamar('obtener_encuestas_alumno.php', ['get' => ['alumno' => (string) $alumno]]);

        $this->assertTrue($r['success']);
        $this->assertSame(2, $r['total']);
        $this->assertSame([
            ['Id_encuesta' => $e1, 'Nombre' => 'Satisfacción', 'Descripcion' => 'Evalúa', 'Id_servicio' => $social, 'NombreServicio' => 'Servicio social'],
            ['Id_encuesta' => $e2, 'Nombre' => 'Cierre', 'Descripcion' => 'Descripción', 'Id_servicio' => $social, 'NombreServicio' => 'Servicio social'],
        ], $r['pendientes']);
    }

    /**
     * Función   : obtener_encuestas_alumno.php › consulta (filtros WHERE y JOIN).
     * Comprueba : que NO aparecen encuestas: del coordinador (Contestador = 1),
     *             inactivas, de otro servicio, de otro periodo, ni ya respondidas.
     *
     * @testdox [obtener_encuestas_alumno.php] Comprueba que excluye encuestas que no le corresponden o ya respondió
     */
    #[TestDox('[obtener_encuestas_alumno.php] Comprueba que excluye encuestas que no le corresponden o ya respondió')]
    public function test_encuestas_alumno_exclusiones(): void
    {
        $social = self::insertar('Actividades', ['Servicio' => 'Servicio social']);
        $practicas = self::insertar('Actividades', ['Servicio' => 'Prácticas']);
        $alumno = self::crearAlumno();
        self::crearActividad($alumno, $social);
        $valida = self::crearEncuesta($social, ['Nombre' => 'Válida']);
        self::crearEncuesta($social, ['Nombre' => 'Del coordinador', 'Contestador' => 1]);
        self::crearEncuesta($social, ['Nombre' => 'Inactiva', 'Activo' => 0]);
        self::crearEncuesta($practicas, ['Nombre' => 'Otro servicio']);
        self::crearEncuesta($social, ['Nombre' => 'Otro periodo'], ['otoño', 2026]);
        self::crearEncuesta($social, ['Nombre' => 'Otro año'], ['primavera', 2025]);
        $respondida = self::crearEncuesta($social, ['Nombre' => 'Respondida']);
        self::crearRespuesta($respondida, $alumno, $social);

        $r = $this->llamar('obtener_encuestas_alumno.php', ['get' => ['alumno' => (string) $alumno]]);

        $this->assertSame(['Válida'], array_column($r['pendientes'], 'Nombre'));
        $this->assertSame($valida, $r['pendientes'][0]['Id_encuesta']);
    }

    public static function estadosActividad(): array
    {
        return [
            'PENDIENTE'  => ['PENDIENTE', 0],
            'EN_CURSO'   => ['EN_CURSO', 1],
            'COMPLETADO' => ['COMPLETADO', 1],
            'CANCELADO'  => ['CANCELADO', 0],
        ];
    }

    /**
     * Función   : obtener_encuestas_alumno.php › aa.Estado IN ('EN_CURSO', 'COMPLETADO').
     * Comprueba : que las encuestas solo aparecen si la actividad está EN_CURSO
     *             o COMPLETADO (no si está PENDIENTE o CANCELADO).
     *
     * @testdox [obtener_encuestas_alumno.php] Comprueba que solo muestra encuestas de actividades EN_CURSO o COMPLETADO
     * @dataProvider estadosActividad
     */
    #[TestDox('[obtener_encuestas_alumno.php] Comprueba que solo muestra encuestas de actividades EN_CURSO o COMPLETADO')]
    #[DataProvider('estadosActividad')]
    public function test_encuestas_alumno_segun_estado(string $estado, int $esperadas): void
    {
        $social = self::insertar('Actividades', ['Servicio' => 'Servicio social']);
        $alumno = self::crearAlumno();
        self::crearActividad($alumno, $social, ['Estado' => $estado]);
        self::crearEncuesta($social);

        $r = $this->llamar('obtener_encuestas_alumno.php', ['get' => ['alumno' => (string) $alumno]]);

        $this->assertSame($esperadas, $r['total']);
    }

    /**
     * Función   : obtener_encuestas_alumno.php › catch (PDOException).
     * Comprueba : que sin conexión a la BD responde success = false y el error.
     *
     * @testdox [obtener_encuestas_alumno.php] Comprueba que sin conexión a la BD responde error
     */
    #[TestDox('[obtener_encuestas_alumno.php] Comprueba que sin conexión a la BD responde error')]
    public function test_encuestas_alumno_sin_bd(): void
    {
        $r = $this->llamar('obtener_encuestas_alumno.php', ['get' => ['alumno' => '1'], 'sinBD' => true]);

        $this->assertFalse($r['success']);
        $this->assertSame([], $r['pendientes']);
        $this->assertStringStartsWith('Error en la base de datos: ', $r['message']);
    }

    // =====================================================================
    // obtener_alumnos_pendientes.php  (encuestas que contesta el COORDINADOR, Contestador = 1)
    // =====================================================================

    /**
     * Función   : obtener_alumnos_pendientes.php › validación de ?carrera=.
     * Comprueba : que sin el Id de carrera responde el error y una lista vacía.
     *
     * @testdox [obtener_alumnos_pendientes.php] Comprueba que sin ?carrera= responde error
     */
    #[TestDox('[obtener_alumnos_pendientes.php] Comprueba que sin ?carrera= responde error')]
    public function test_alumnos_pendientes_sin_carrera(): void
    {
        $this->assertSame(['success' => false, 'alumnos' => [], 'error' => 'ID de carrera no proporcionado'],
            $this->llamar('obtener_alumnos_pendientes.php'));
    }

    /**
     * Función   : obtener_alumnos_pendientes.php › consulta de alumnos y de encuestas.
     * Comprueba : que regresa a cada alumno de la carrera con sus encuestas
     *             pendientes del coordinador (Contestador = 1), su total, su
     *             expediente, su nombre completo y la empresa de su actividad.
     *
     * @testdox [obtener_alumnos_pendientes.php] Comprueba los alumnos con sus encuestas pendientes
     */
    #[TestDox('[obtener_alumnos_pendientes.php] Comprueba los alumnos con sus encuestas pendientes')]
    public function test_alumnos_pendientes_estructura(): void
    {
        $social = self::insertar('Actividades', ['Servicio' => 'Servicio social']);
        $acme = self::insertar('Empresas', ['Nombre' => 'Acme']);
        $ana = self::crearAlumno(['No_Expediente' => 'EXP-15']);
        self::crearActividad($ana, $social, ['Id_empresa' => $acme]);
        $e1 = self::crearEncuesta($social, ['Nombre' => 'Evaluación', 'Descripcion' => 'Del coordinador', 'Contestador' => 1]);
        $e2 = self::crearEncuesta($social, ['Nombre' => 'Seguimiento', 'Contestador' => 1]);
        self::crearEncuesta($social, ['Nombre' => 'Del alumno', 'Contestador' => 0]);

        $r = $this->llamar('obtener_alumnos_pendientes.php', ['get' => ['carrera' => '10']]);

        $this->assertTrue($r['success']);
        $this->assertSame(1, $r['total_alumnos_con_pendientes']);
        $alumno = $r['alumnos'][0];
        $this->assertSame([$ana, 'EXP-15', 'Ana López Ruiz', 2],
            [$alumno['Id_alumno'], $alumno['No_Expediente'], $alumno['NombreCompleto'], $alumno['total_pendientes']]);
        $this->assertSame([
            'Id_encuesta' => $e1, 'Nombre' => 'Evaluación', 'Descripcion' => 'Del coordinador', 'Id_servicio' => $social,
            'NombreServicio' => 'Servicio social', 'NombreEmpresa' => 'Acme',
        ], $alumno['encuestas'][0]);
        $this->assertSame($e2, $alumno['encuestas'][1]['Id_encuesta']);
    }

    /**
     * Función   : obtener_alumnos_pendientes.php › valores por defecto.
     * Comprueba : que sin empresa se muestra "Sin Empresa Asignada", sin
     *             expediente "S/N" y sin apellido materno el nombre queda sin espacios de más.
     *
     * @testdox [obtener_alumnos_pendientes.php] Comprueba los textos por defecto (empresa, expediente, nombre)
     */
    #[TestDox('[obtener_alumnos_pendientes.php] Comprueba los textos por defecto (empresa, expediente, nombre)')]
    public function test_alumnos_pendientes_valores_por_defecto(): void
    {
        $social = self::insertar('Actividades', ['Servicio' => 'Servicio social']);
        $luis = self::crearAlumno(['No_Expediente' => null, 'Nombre' => 'Luis', 'Apellido_P' => 'Pérez', 'Apellido_M' => null]);
        self::crearActividad($luis, $social);
        self::crearEncuesta($social, ['Contestador' => 1]);

        $alumno = $this->llamar('obtener_alumnos_pendientes.php', ['get' => ['carrera' => '10']])['alumnos'][0];

        $this->assertSame('S/N', $alumno['No_Expediente']);
        $this->assertSame('Luis Pérez', $alumno['NombreCompleto']);
        $this->assertSame('Sin Empresa Asignada', $alumno['encuestas'][0]['NombreEmpresa']);
    }

    /**
     * Función   : obtener_alumnos_pendientes.php › filtros de alumnos y encuestas.
     * Comprueba : que NO aparecen: alumnos de otra carrera, alumnos inactivos,
     *             alumnos sin encuestas pendientes, ni encuestas ya respondidas.
     *
     * @testdox [obtener_alumnos_pendientes.php] Comprueba que solo aparecen alumnos activos de la carrera con pendientes
     */
    #[TestDox('[obtener_alumnos_pendientes.php] Comprueba que solo aparecen alumnos activos de la carrera con pendientes')]
    public function test_alumnos_pendientes_filtros(): void
    {
        $social = self::insertar('Actividades', ['Servicio' => 'Servicio social']);
        $encuesta = self::crearEncuesta($social, ['Contestador' => 1]);
        $conPendiente = self::crearAlumno(['Nombre' => 'Con pendiente']);
        $otraCarrera  = self::crearAlumno(['Nombre' => 'Otra carrera', 'Id_carrera' => 20]);
        $inactivo     = self::crearAlumno(['Nombre' => 'Inactivo', 'Activo' => 0]);
        $yaRespondio  = self::crearAlumno(['Nombre' => 'Ya respondió']);
        $pendiente    = self::crearAlumno(['Nombre' => 'Actividad pendiente']);
        foreach ([$conPendiente, $otraCarrera, $inactivo, $yaRespondio] as $a) {
            self::crearActividad($a, $social);
        }
        self::crearActividad($pendiente, $social, ['Estado' => 'PENDIENTE']);
        self::crearRespuesta($encuesta, $yaRespondio, $social);

        $r = $this->llamar('obtener_alumnos_pendientes.php', ['get' => ['carrera' => '10']]);

        $this->assertSame([$conPendiente], array_column($r['alumnos'], 'Id_alumno'));
    }

    /**
     * Función   : obtener_alumnos_pendientes.php › SELECT DISTINCT.
     * Comprueba : que si el alumno tiene dos actividades del mismo servicio y
     *             periodo, la encuesta no se cuenta dos veces.
     *
     * @testdox [obtener_alumnos_pendientes.php] Comprueba que no cuenta dos veces la misma encuesta
     */
    #[TestDox('[obtener_alumnos_pendientes.php] Comprueba que no cuenta dos veces la misma encuesta')]
    public function test_alumnos_pendientes_sin_duplicados(): void
    {
        $social = self::insertar('Actividades', ['Servicio' => 'Servicio social']);
        $alumno = self::crearAlumno();
        self::crearActividad($alumno, $social, ['Estado' => 'COMPLETADO']);
        self::crearActividad($alumno, $social, ['Estado' => 'EN_CURSO']);
        self::crearEncuesta($social, ['Contestador' => 1]);

        $r = $this->llamar('obtener_alumnos_pendientes.php', ['get' => ['carrera' => '10']]);

        $this->assertSame(1, $r['alumnos'][0]['total_pendientes']);
    }

    /**
     * Función   : obtener_alumnos_pendientes.php › catch (PDOException).
     * Comprueba : que sin conexión a la BD responde success = false y el error.
     *
     * @testdox [obtener_alumnos_pendientes.php] Comprueba que sin conexión a la BD responde error
     */
    #[TestDox('[obtener_alumnos_pendientes.php] Comprueba que sin conexión a la BD responde error')]
    public function test_alumnos_pendientes_sin_bd(): void
    {
        $r = $this->llamar('obtener_alumnos_pendientes.php', ['get' => ['carrera' => '10'], 'sinBD' => true]);

        $this->assertFalse($r['success']);
        $this->assertStringStartsWith('Error en la base de datos: ', $r['message']);
    }

    // =====================================================================
    // obtener_preguntas.php
    // =====================================================================

    /**
     * Función   : obtener_preguntas.php › validación de ?encuesta=.
     * Comprueba : que sin el Id de la encuesta responde el error.
     *
     * @testdox [obtener_preguntas.php] Comprueba que sin ?encuesta= responde error
     */
    #[TestDox('[obtener_preguntas.php] Comprueba que sin ?encuesta= responde error')]
    public function test_preguntas_sin_encuesta(): void
    {
        $this->assertSame(['success' => false, 'preguntas' => [], 'error' => 'ID de encuesta no proporcionado'],
            $this->llamar('obtener_preguntas.php'));
    }

    /**
     * Función   : obtener_preguntas.php › consulta de preguntas.
     * Comprueba : que regresa solo las preguntas activas de esa encuesta,
     *             ordenadas por "Orden", con todos sus campos.
     *
     * @testdox [obtener_preguntas.php] Comprueba que regresa las preguntas activas ordenadas
     */
    #[TestDox('[obtener_preguntas.php] Comprueba que regresa las preguntas activas ordenadas')]
    public function test_preguntas_de_la_encuesta(): void
    {
        $p2 = self::insertar('Preguntas', ['Id_encuesta' => 1, 'Pregunta' => 'Segunda', 'Tipo_respuesta' => 'TEXTO', 'Obligatoria' => 0, 'Orden' => 2]);
        $p1 = self::insertar('Preguntas', ['Id_encuesta' => 1, 'Pregunta' => 'Primera', 'Tipo_respuesta' => 'ESCALA_1_5', 'Obligatoria' => 1, 'Orden' => 1, 'Seccion' => 'General']);
        self::insertar('Preguntas', ['Id_encuesta' => 1, 'Pregunta' => 'Inactiva', 'Tipo_respuesta' => 'TEXTO', 'Orden' => 3, 'Activo' => 0]);
        self::insertar('Preguntas', ['Id_encuesta' => 2, 'Pregunta' => 'De otra encuesta', 'Tipo_respuesta' => 'TEXTO', 'Orden' => 0]);

        $r = $this->llamar('obtener_preguntas.php', ['get' => ['encuesta' => '1']]);

        $this->assertTrue($r['success']);
        $this->assertSame(2, $r['total']);
        $this->assertSame([
            ['Id_pregunta' => $p1, 'Pregunta' => 'Primera', 'Tipo_respuesta' => 'ESCALA_1_5', 'Obligatoria' => 1, 'Orden' => 1, 'Seccion' => 'General'],
            ['Id_pregunta' => $p2, 'Pregunta' => 'Segunda', 'Tipo_respuesta' => 'TEXTO', 'Obligatoria' => 0, 'Orden' => 2, 'Seccion' => null],
        ], $r['preguntas']);
    }

    /**
     * Función   : obtener_preguntas.php › catch (PDOException).
     * Comprueba : que sin conexión a la BD responde success = false y el error.
     *
     * @testdox [obtener_preguntas.php] Comprueba que sin conexión a la BD responde error
     */
    #[TestDox('[obtener_preguntas.php] Comprueba que sin conexión a la BD responde error')]
    public function test_preguntas_sin_bd(): void
    {
        $r = $this->llamar('obtener_preguntas.php', ['get' => ['encuesta' => '1'], 'sinBD' => true]);

        $this->assertFalse($r['success']);
        $this->assertStringStartsWith('Error en la base de datos: ', $r['message']);
    }

    // =====================================================================
    // procesar_encuesta.php
    // =====================================================================

    /**
     * Función   : procesar_encuesta.php › lectura del JSON.
     * Comprueba : que si el cuerpo no es JSON responde "Datos no válidos".
     *
     * @testdox [procesar_encuesta.php] Comprueba que sin JSON válido responde "Datos no válidos"
     */
    #[TestDox('[procesar_encuesta.php] Comprueba que sin JSON válido responde "Datos no válidos"')]
    public function test_procesar_sin_json(): void
    {
        $this->assertSame(['success' => false, 'message' => 'Datos no válidos'], $this->llamar('procesar_encuesta.php', ['cuerpo' => 'hola']));
    }

    public static function datosFaltantes(): array
    {
        $respuestas = [['Id_pregunta' => 1, 'Respuesta' => 'Si']];
        return [
            'sin alumno'        => [['Id_encuesta' => 1, 'respuestas' => $respuestas]],
            'sin encuesta'      => [['Id_alumno' => 1, 'respuestas' => $respuestas]],
            'sin respuestas'    => [['Id_alumno' => 1, 'Id_encuesta' => 1, 'respuestas' => []]],
        ];
    }

    /**
     * Función   : procesar_encuesta.php › validación de datos requeridos.
     * Comprueba : que si falta alumno, encuesta o respuestas no se guarda nada.
     *
     * @testdox [procesar_encuesta.php] Comprueba que exige alumno, encuesta y respuestas
     * @dataProvider datosFaltantes
     */
    #[TestDox('[procesar_encuesta.php] Comprueba que exige alumno, encuesta y respuestas')]
    #[DataProvider('datosFaltantes')]
    public function test_procesar_datos_faltantes(array $datos): void
    {
        $this->assertSame(['success' => false, 'message' => 'Faltan datos requeridos: alumno, encuesta o respuestas'],
            $this->llamar('procesar_encuesta.php', ['datos' => $datos]));
    }

    /**
     * Función   : procesar_encuesta.php › BLINDAJE CRÍTICO 1 (ya respondida).
     * Comprueba : que un alumno no puede responder dos veces la misma encuesta.
     *
     * @testdox [procesar_encuesta.php] Comprueba que no deja responder dos veces la misma encuesta
     */
    #[TestDox('[procesar_encuesta.php] Comprueba que no deja responder dos veces la misma encuesta')]
    public function test_procesar_ya_respondida(): void
    {
        $social = self::insertar('Actividades', ['Servicio' => 'Servicio social']);
        $encuesta = self::crearEncuesta($social);
        self::crearRespuesta($encuesta, 15, $social);

        $r = $this->llamar('procesar_encuesta.php', ['datos' => [
            'Id_alumno' => 15, 'Id_encuesta' => $encuesta, 'respuestas' => [['Id_pregunta' => 1, 'Respuesta' => 'Otra']],
        ]]);

        $this->assertSame(['success' => false, 'message' => 'Esta encuesta ya ha sido respondida previamente por el alumno.'], $r);
        $this->assertCount(1, self::filas('SELECT * FROM Respuestas'));
    }

    /**
     * Función   : procesar_encuesta.php › consulta del Id_servicio de la encuesta.
     * Comprueba : que si la encuesta no existe responde el error y no guarda nada.
     *
     * @testdox [procesar_encuesta.php] Comprueba que una encuesta inexistente no se guarda
     */
    #[TestDox('[procesar_encuesta.php] Comprueba que una encuesta inexistente no se guarda')]
    public function test_procesar_encuesta_inexistente(): void
    {
        $r = $this->llamar('procesar_encuesta.php', ['datos' => [
            'Id_alumno' => 15, 'Id_encuesta' => 999, 'respuestas' => [['Id_pregunta' => 1, 'Respuesta' => 'Si']],
        ]]);

        $this->assertSame(['success' => false, 'message' => 'La encuesta especificada no existe.'], $r);
        $this->assertSame([], self::filas('SELECT * FROM Respuestas'));
    }

    /**
     * Función   : procesar_encuesta.php › inserción de respuestas.
     * Comprueba : que guarda una fila por respuesta con el Id_servicio de la
     *             encuesta y la fecha; las respuestas vacías o sin texto se
     *             guardan como "No contestó" y se quitan espacios sobrantes.
     *
     * @testdox [procesar_encuesta.php] Comprueba que guarda todas las respuestas
     */
    #[TestDox('[procesar_encuesta.php] Comprueba que guarda todas las respuestas')]
    public function test_procesar_guarda_respuestas(): void
    {
        $social = self::insertar('Actividades', ['Servicio' => 'Servicio social']);
        $encuesta = self::crearEncuesta($social);

        $r = $this->llamar('procesar_encuesta.php', ['datos' => [
            'Id_alumno' => 15, 'Id_encuesta' => $encuesta, 'respuestas' => [
                ['Id_pregunta' => 101, 'Respuesta' => '4'],
                ['Id_pregunta' => 102, 'Respuesta' => '  Muy buena  '],
                ['Id_pregunta' => 103, 'Respuesta' => '   '],
                ['Id_pregunta' => 104],
            ],
        ]]);

        $this->assertSame(['success' => true, 'message' => 'Encuesta guardada exitosamente'], $r);
        $filas = self::filas('SELECT Id_encuesta, Id_alumno, Id_servicio, Id_pregunta, Respuesta FROM Respuestas ORDER BY Id_pregunta');
        $this->assertSame([
            [$encuesta, 15, $social, 101, '4'],
            [$encuesta, 15, $social, 102, 'Muy buena'],
            [$encuesta, 15, $social, 103, 'No contestó'],
            [$encuesta, 15, $social, 104, 'No contestó'],
        ], array_map('array_values', $filas));
        $this->assertCount(0, self::filas('SELECT * FROM Respuestas WHERE Fecha_respuesta IS NULL'));
    }

    /**
     * Función   : procesar_encuesta.php › transacción (rollBack en catch).
     * Comprueba : que si una respuesta no se puede guardar (falta su
     *             Id_pregunta) no se guarda NINGUNA de las respuestas.
     *
     * @testdox [procesar_encuesta.php] Comprueba que si una respuesta falla no se guarda ninguna
     */
    #[TestDox('[procesar_encuesta.php] Comprueba que si una respuesta falla no se guarda ninguna')]
    public function test_procesar_rollback(): void
    {
        $social = self::insertar('Actividades', ['Servicio' => 'Servicio social']);
        $encuesta = self::crearEncuesta($social);

        $r = $this->llamar('procesar_encuesta.php', ['datos' => [
            'Id_alumno' => 15, 'Id_encuesta' => $encuesta, 'respuestas' => [
                ['Id_pregunta' => 101, 'Respuesta' => '4'],
                ['Id_pregunta' => null, 'Respuesta' => 'Sin pregunta'],
            ],
        ]]);

        $this->assertFalse($r['success']);
        $this->assertStringStartsWith('Error al guardar en la base de datos: ', $r['message']);
        $this->assertSame([], self::filas('SELECT * FROM Respuestas'));
    }
}