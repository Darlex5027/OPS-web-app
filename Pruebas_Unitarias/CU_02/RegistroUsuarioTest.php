<?php
/**
 * Archivo      : RegistroUsuarioTest.php
 * Módulo       : CU_02_RegistroUsuario (Pruebas unitarias)
 * Archivos bajo prueba :
 *   app/CU_02_RegistroUsuario/obtener_catalogos.php
 *   app/CU_02_RegistroUsuario/obtener_actividades.php
 *   app/CU_02_RegistroUsuario/obtener_empresas.php
 *   app/CU_02_RegistroUsuario/registrar_empresa.php
 *   app/CU_02_RegistroUsuario/registro.php
 * Herramienta  : PHPUnit
 *
 * Cómo correrlo (dentro de OPS-web-app, con el Docker del proyecto prendido):
 *   vendor/bin/phpunit --testdox Pruebas_Unitarias/CU_02/RegistroUsuarioTest.php
 *
 * Descripción  : Pruebas de los PHP del registro de usuario. El código original
 *                NO se modifica.
 *   - Usan una base de datos APARTE llamada "ops_pruebas_cu02" que se crea
 *     sola dentro del MariaDB de Docker. Tu base de datos real no se toca.
 *   - Como los PHP leen php://input y algunos terminan con exit, cada uno se
 *     ejecuta en un proceso aparte y se le manda el JSON como si fuera un POST.
 *
 * Estos PHP no tienen funciones declaradas: son scripts que se ejecutan de
 * arriba a abajo. Por eso cada prueba indica el ARCHIVO y el BLOQUE que prueba.
 *
 * Cada prueba indica:
 *   - Función   : archivo PHP › bloque que se prueba.
 *   - Comprueba : qué comportamiento se verifica.
 */

namespace CU_02;

use PDO;
use PDOException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\TestDox;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class RegistroUsuarioTest extends TestCase
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
    private const DB_NAME = 'ops_pruebas_cu02'; // debe contener "prueba"

    private const CARPETA_APP = __DIR__ . '/../../app/CU_02_RegistroUsuario';

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
     *    require_once("../php/db.php"); al ejecutarlo desde <temporal>/CU_02_RegistroUsuario,
     *    PHP carga este db.php en lugar del real.
     *  - simular_input.php: hace que php://input devuelva el JSON enviado por la prueba
     *    (en la terminal no existe el cuerpo de una petición HTTP).
     */
    private static function prepararArchivosTemporales(): void
    {
        $base = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'ops_pruebas_cu02';
        @mkdir($base . DIRECTORY_SEPARATOR . 'php', 0777, true);
        @mkdir($base . DIRECTORY_SEPARATOR . 'CU_02_RegistroUsuario', 0777, true);

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
            self::$carpetaTemporal . DIRECTORY_SEPARATOR . 'CU_02_RegistroUsuario',
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

    /** Crea las tablas que usan los PHP del registro (versión mínima para pruebas). */
    private static function crearEsquema(): void
    {
        $pdo = self::conexion();
        $tablas = ['Actividades_Alumnos', 'Alumnos', 'Administradores', 'Usuarios',
                   'Empresas', 'Actividades', 'Carreras', 'Facultades'];
        foreach ($tablas as $tabla) {
            $pdo->exec("DROP TABLE IF EXISTS `{$tabla}`");
        }
        $pdo->exec('CREATE TABLE Facultades (
            Id_facultad INT AUTO_INCREMENT PRIMARY KEY,
            Nombre VARCHAR(150) NOT NULL,
            Activo TINYINT(1) NOT NULL DEFAULT 1)');
        $pdo->exec('CREATE TABLE Carreras (
            Id_carrera INT AUTO_INCREMENT PRIMARY KEY,
            Nombre VARCHAR(150) NOT NULL,
            Id_facultad INT NOT NULL)');
        $pdo->exec('CREATE TABLE Actividades (
            Id_servicio INT AUTO_INCREMENT PRIMARY KEY,
            Servicio VARCHAR(150) NOT NULL,
            Activo TINYINT(1) NOT NULL DEFAULT 1)');
        $pdo->exec('CREATE TABLE Empresas (
            Id_empresa INT AUTO_INCREMENT PRIMARY KEY,
            Nombre VARCHAR(200) NOT NULL UNIQUE,
            Razon_social VARCHAR(200) NOT NULL,
            RFC VARCHAR(13) NOT NULL UNIQUE,
            Direccion TEXT NOT NULL,
            Sitio_web VARCHAR(255) NULL,
            Descripcion TEXT NULL,
            Activo TINYINT(1) NOT NULL DEFAULT 1,
            Fecha_registro DATETIME NULL)');
        $pdo->exec('CREATE TABLE Usuarios (
            Id_usuario INT AUTO_INCREMENT PRIMARY KEY,
            Matricula VARCHAR(8) NOT NULL UNIQUE,
            Contrasena VARCHAR(255) NOT NULL,
            Id_tipo_usuario INT NOT NULL,
            Activo TINYINT(1) NOT NULL DEFAULT 1,
            Bloqueado TINYINT(1) NOT NULL DEFAULT 0,
            Intentos_fallidos INT NOT NULL DEFAULT 0,
            Fecha_registro DATETIME NULL,
            Fecha_ultimo_acceso DATETIME NULL)');
        $pdo->exec('CREATE TABLE Alumnos (
            Id_alumno INT AUTO_INCREMENT PRIMARY KEY,
            Id_usuario INT NOT NULL,
            Nombre VARCHAR(100) NOT NULL,
            Apellido_P VARCHAR(100) NULL,
            Apellido_M VARCHAR(100) NULL,
            Id_carrera INT NOT NULL,
            Grupo VARCHAR(2) NULL,
            Horario VARCHAR(50) NULL,
            Activo TINYINT(1) NOT NULL DEFAULT 1)');
        $pdo->exec('CREATE TABLE Actividades_Alumnos (
            Id_actividad_alumno INT AUTO_INCREMENT PRIMARY KEY,
            Id_alumno INT NOT NULL,
            Id_servicio INT NOT NULL,
            Id_empresa INT NULL,
            Estado VARCHAR(20) NOT NULL,
            periodo_tipo VARCHAR(20) NOT NULL,
            `periodo_año` INT NOT NULL,
            Fecha_registro DATETIME NULL)');
        $pdo->exec('CREATE TABLE Administradores (
            Id_administrador INT AUTO_INCREMENT PRIMARY KEY,
            Id_usuario INT NOT NULL,
            Nombre VARCHAR(100) NOT NULL,
            Apellido_P VARCHAR(100) NULL,
            Apellido_M VARCHAR(100) NULL,
            Id_carrera INT NOT NULL,
            Telefono VARCHAR(20) NULL,
            Correo VARCHAR(150) NULL,
            Activo TINYINT(1) NOT NULL DEFAULT 1)');
    }

    /** Ejecuta una consulta de inserción con parámetros. */
    private static function insertar(string $sql, array $valores = []): int
    {
        self::conexion()->prepare($sql)->execute($valores);
        return (int) self::conexion()->lastInsertId();
    }

    /** Regresa todas las filas de una consulta. */
    private static function filas(string $sql, array $valores = []): array
    {
        $stmt = self::conexion()->prepare($sql);
        $stmt->execute($valores);
        return $stmt->fetchAll();
    }

    /** Ejecuta un PHP y revisa que no haya mostrado errores de PHP y que responda JSON. */
    private function llamar(string $archivo, ?array $datos = null, ?string $cuerpoCrudo = null): array
    {
        $cuerpo = $cuerpoCrudo ?? ($datos === null ? '' : json_encode($datos));
        $resultado = self::ejecutarPhp($archivo, $cuerpo);

        $this->assertSame('', $resultado['errores'], "{$archivo} mostró errores de PHP:\n" . $resultado['errores']);
        $this->assertIsArray($resultado['json'], "{$archivo} no respondió JSON válido. Respondió:\n" . $resultado['salida']);

        return $resultado['json'];
    }

    /** Ejecuta un PHP simulando que la base de datos no responde. */
    private function llamarSinBaseDeDatos(string $archivo, ?array $datos = null): array
    {
        $resultado = self::ejecutarPhp($archivo, $datos === null ? '' : json_encode($datos), ['OPS_FORZAR_ERROR_DB' => '1']);
        $this->assertIsArray($resultado['json'], "{$archivo} no respondió JSON válido. Respondió:\n" . $resultado['salida']);
        return $resultado['json'];
    }

    /** Datos válidos de una empresa para registrar_empresa.php. */
    private static function empresaValida(array $cambios = []): array
    {
        return array_merge([
            'nombre_comercial' => 'Nueva SA',
            'razon_social'     => 'Nueva Sociedad Anónima',
            'rfc'              => 'NUE123456AB1',
            'direccion'        => 'Calle 1, Tlaxcala',
            'sitio_web'        => 'https://nueva.mx',
            'descripcion'      => 'Empresa de software',
        ], $cambios);
    }

    /** Datos válidos de un alumno, como los envía registro.js. */
    private static function alumnoValido(array $cambios = []): array
    {
        return array_merge([
            'tipo_usuario' => 'alumno',
            'matricula'    => '20232389',
            'password'     => 'Clave123!',
            'confirmar'    => 'Clave123!',
            'nombre'       => 'Ana',
            'apellido_p'   => 'López',
            'apellido_m'   => 'Ruiz',
            'id_carrera'   => '10',
            'grupo'        => '7A',
            'horario'      => null,
            'email'        => 'ana@uatx.mx',
            'telefono'     => '246-1234-567',
            'organizacion' => null,
            'actividad'    => '1',
            'periodo_tipo' => 'primavera',
        ], $cambios);
    }

    /** Datos válidos de un coordinador, como los envía registro.js. */
    private static function coordinadorValido(array $cambios = []): array
    {
        return array_merge([
            'tipo_usuario' => 'coordinador',
            'matricula'    => '1234',
            'password'     => 'Clave123!',
            'confirmar'    => 'Clave123!',
            'nombre'       => 'Luis',
            'apellido_p'   => 'Pérez',
            'apellido_m'   => 'Gómez',
            'id_carrera'   => '11',
            'telefono'     => '2461112233',
            'correo'       => 'luis@uatx.mx',
        ], $cambios);
    }

    // =====================================================================
    // obtener_catalogos.php
    // =====================================================================

    /**
     * Función   : obtener_catalogos.php › "1. Obtener Facultades activas" y "2. Obtener Carreras".
     * Comprueba : que regresa solo las facultades activas ordenadas por nombre y
     *             todas las carreras ordenadas por nombre con su Id_facultad.
     *
     * @testdox [obtener_catalogos.php] Comprueba que regresa las facultades activas y las carreras ordenadas
     */
    #[TestDox('[obtener_catalogos.php] Comprueba que regresa las facultades activas y las carreras ordenadas')]
    public function test_catalogos_regresa_facultades_activas_y_carreras_ordenadas(): void
    {
        $fcbiyt = self::insertar("INSERT INTO Facultades (Nombre, Activo) VALUES ('FCBIyT', 1)");
        $salud  = self::insertar("INSERT INTO Facultades (Nombre, Activo) VALUES ('Ciencias de la Salud', 1)");
        self::insertar("INSERT INTO Facultades (Nombre, Activo) VALUES ('Facultad Cerrada', 0)");
        self::insertar('INSERT INTO Carreras (Nombre, Id_facultad) VALUES (?, ?)', ['Ing. Química', $fcbiyt]);
        self::insertar('INSERT INTO Carreras (Nombre, Id_facultad) VALUES (?, ?)', ['Enfermería', $salud]);
        self::insertar('INSERT INTO Carreras (Nombre, Id_facultad) VALUES (?, ?)', ['Ing. en Computación', $fcbiyt]);

        $respuesta = $this->llamar('obtener_catalogos.php');

        $this->assertSame(['Ciencias de la Salud', 'FCBIyT'], array_column($respuesta['facultades'], 'Nombre'));
        $this->assertSame(['Id_facultad', 'Nombre'], array_keys($respuesta['facultades'][0]));
        $this->assertSame(['Enfermería', 'Ing. en Computación', 'Ing. Química'], array_column($respuesta['carreras'], 'Nombre'));
        $this->assertSame(['Id_carrera', 'Nombre', 'Id_facultad'], array_keys($respuesta['carreras'][0]));
        $this->assertSame($salud, (int) $respuesta['carreras'][0]['Id_facultad']);
    }

    /**
     * Función   : obtener_catalogos.php › consultas de facultades y carreras.
     * Comprueba : que sin datos regresa dos listas vacías (sin errores).
     *
     * @testdox [obtener_catalogos.php] Comprueba que sin datos regresa listas vacías
     */
    #[TestDox('[obtener_catalogos.php] Comprueba que sin datos regresa listas vacías')]
    public function test_catalogos_sin_datos_regresa_listas_vacias(): void
    {
        $this->assertSame(['facultades' => [], 'carreras' => []], $this->llamar('obtener_catalogos.php'));
    }

    /**
     * Función   : obtener_catalogos.php › catch (PDOException).
     * Comprueba : que si no se puede conectar a la BD responde
     *             "Error de base de datos" con el detalle.
     *
     * @testdox [obtener_catalogos.php] Comprueba que sin conexión a la BD responde "Error de base de datos"
     */
    #[TestDox('[obtener_catalogos.php] Comprueba que sin conexión a la BD responde "Error de base de datos"')]
    public function test_catalogos_sin_conexion_responde_error_de_base_de_datos(): void
    {
        $respuesta = $this->llamarSinBaseDeDatos('obtener_catalogos.php');

        $this->assertSame('Error de base de datos', $respuesta['error']);
        $this->assertArrayHasKey('detalle', $respuesta);
    }

    // =====================================================================
    // obtener_actividades.php
    // =====================================================================

    /**
     * Función   : obtener_actividades.php › CONSULTA ACTIVIDADES.
     * Comprueba : que regresa success = true y solo las actividades activas,
     *             ordenadas por nombre, con las llaves Id_actividad y Nombre.
     *
     * @testdox [obtener_actividades.php] Comprueba que regresa solo las actividades activas, ordenadas
     */
    #[TestDox('[obtener_actividades.php] Comprueba que regresa solo las actividades activas, ordenadas')]
    public function test_actividades_regresa_solo_activas_ordenadas(): void
    {
        $servicio = self::insertar("INSERT INTO Actividades (Servicio, Activo) VALUES ('Servicio social', 1)");
        $practicas = self::insertar("INSERT INTO Actividades (Servicio, Activo) VALUES ('Prácticas profesionales', 1)");
        self::insertar("INSERT INTO Actividades (Servicio, Activo) VALUES ('Actividad suspendida', 0)");

        $respuesta = $this->llamar('obtener_actividades.php');

        $this->assertTrue($respuesta['success']);
        $this->assertSame([
            ['Id_actividad' => $practicas, 'Nombre' => 'Prácticas profesionales'],
            ['Id_actividad' => $servicio, 'Nombre' => 'Servicio social'],
        ], array_map(fn ($a) => ['Id_actividad' => (int) $a['Id_actividad'], 'Nombre' => $a['Nombre']], $respuesta['actividades']));
    }

    /**
     * Función   : obtener_actividades.php › CONSULTA ACTIVIDADES.
     * Comprueba : que si no hay actividades activas regresa una lista vacía.
     *
     * @testdox [obtener_actividades.php] Comprueba que sin actividades activas regresa una lista vacía
     */
    #[TestDox('[obtener_actividades.php] Comprueba que sin actividades activas regresa una lista vacía')]
    public function test_actividades_sin_activas_regresa_lista_vacia(): void
    {
        self::insertar("INSERT INTO Actividades (Servicio, Activo) VALUES ('Actividad suspendida', 0)");

        $this->assertSame(['success' => true, 'actividades' => []], $this->llamar('obtener_actividades.php'));
    }

    /**
     * Función   : obtener_actividades.php › CONEXIÓN A BD (catch PDOException).
     * Comprueba : que si no se puede conectar responde "error_conexion_db".
     *
     * @testdox [obtener_actividades.php] Comprueba que sin conexión a la BD responde "error_conexion_db"
     */
    #[TestDox('[obtener_actividades.php] Comprueba que sin conexión a la BD responde "error_conexion_db"')]
    public function test_actividades_sin_conexion_responde_error_conexion_db(): void
    {
        $respuesta = $this->llamarSinBaseDeDatos('obtener_actividades.php');

        $this->assertFalse($respuesta['success']);
        $this->assertSame('error_conexion_db', $respuesta['error']);
    }

    /**
     * Función   : obtener_actividades.php › CONSULTA ACTIVIDADES (catch Exception).
     * Comprueba : que si la consulta falla (por ejemplo, no existe la tabla)
     *             responde "error_consulta_actividades".
     *
     * @testdox [obtener_actividades.php] Comprueba que si falla la consulta responde "error_consulta_actividades"
     */
    #[TestDox('[obtener_actividades.php] Comprueba que si falla la consulta responde "error_consulta_actividades"')]
    public function test_actividades_si_falla_la_consulta_responde_error_consulta(): void
    {
        self::conexion()->exec('DROP TABLE Actividades');

        $respuesta = $this->llamar('obtener_actividades.php');

        $this->assertFalse($respuesta['success']);
        $this->assertSame('error_consulta_actividades', $respuesta['error']);
    }

    // =====================================================================
    // obtener_empresas.php
    // =====================================================================

    /**
     * Función   : obtener_empresas.php › consulta de empresas.
     * Comprueba : que regresa solo las empresas activas ordenadas por nombre,
     *             con Id_empresa y Nombre.
     *
     * @testdox [obtener_empresas.php] Comprueba que regresa solo las empresas activas, ordenadas
     */
    #[TestDox('[obtener_empresas.php] Comprueba que regresa solo las empresas activas, ordenadas')]
    public function test_empresas_regresa_solo_activas_ordenadas(): void
    {
        $sql = 'INSERT INTO Empresas (Nombre, Razon_social, RFC, Direccion, Activo) VALUES (?, ?, ?, ?, ?)';
        $beta = self::insertar($sql, ['Beta', 'Beta SA', 'BET123456AB1', 'Dir', 1]);
        $acme = self::insertar($sql, ['Acme', 'Acme SA', 'ACM123456AB1', 'Dir', 1]);
        self::insertar($sql, ['Cerrada', 'Cerrada SA', 'CER123456AB1', 'Dir', 0]);

        $respuesta = $this->llamar('obtener_empresas.php');

        $this->assertSame(
            [['Id_empresa' => $acme, 'Nombre' => 'Acme'], ['Id_empresa' => $beta, 'Nombre' => 'Beta']],
            array_map(fn ($e) => ['Id_empresa' => (int) $e['Id_empresa'], 'Nombre' => $e['Nombre']], $respuesta['empresas'])
        );
    }

    /**
     * Función   : obtener_empresas.php › consulta de empresas.
     * Comprueba : que si no hay empresas regresa una lista vacía.
     *
     * @testdox [obtener_empresas.php] Comprueba que sin empresas regresa una lista vacía
     */
    #[TestDox('[obtener_empresas.php] Comprueba que sin empresas regresa una lista vacía')]
    public function test_empresas_sin_datos_regresa_lista_vacia(): void
    {
        $this->assertSame(['empresas' => []], $this->llamar('obtener_empresas.php'));
    }

    /**
     * Función   : obtener_empresas.php › catch (Exception).
     * Comprueba : que si no se puede conectar responde "Error al cargar empresas".
     *
     * @testdox [obtener_empresas.php] Comprueba que sin conexión a la BD responde "Error al cargar empresas"
     */
    #[TestDox('[obtener_empresas.php] Comprueba que sin conexión a la BD responde "Error al cargar empresas"')]
    public function test_empresas_sin_conexion_responde_error(): void
    {
        $respuesta = $this->llamarSinBaseDeDatos('obtener_empresas.php');

        $this->assertSame('Error al cargar empresas', $respuesta['error']);
        $this->assertArrayHasKey('detalle', $respuesta);
    }

    // =====================================================================
    // registrar_empresa.php
    // =====================================================================

    public static function cuerposInvalidos(): array
    {
        return [
            'cuerpo vacío'     => [''],
            'texto plano'      => ['hola'],
            'JSON mal formado' => ['{nombre: 1'],
            'objeto vacío'     => ['{}'],
        ];
    }

    /**
     * Función   : registrar_empresa.php › "2. Obtener datos del fetch".
     * Comprueba : que si no llegan datos JSON válidos responde "No se recibieron datos".
     *
     * @testdox [registrar_empresa.php] Comprueba que sin datos válidos responde "No se recibieron datos"
     * @dataProvider cuerposInvalidos
     */
    #[TestDox('[registrar_empresa.php] Comprueba que sin datos válidos responde "No se recibieron datos"')]
    #[DataProvider('cuerposInvalidos')]
    public function test_registrar_empresa_sin_datos(string $cuerpo): void
    {
        $this->assertSame(
            ['success' => false, 'error' => 'No se recibieron datos'],
            $this->llamar('registrar_empresa.php', null, $cuerpo)
        );
    }

    public static function empresasIncompletas(): array
    {
        return [
            'sin nombre comercial'        => [['nombre_comercial' => '']],
            'sin razón social'            => [['razon_social' => '']],
            'sin RFC'                     => [['rfc' => '']],
            'sin dirección'               => [['direccion' => '']],
            'nombre solo con espacios'    => [['nombre_comercial' => '   ']],
        ];
    }

    /**
     * Función   : registrar_empresa.php › "3. Validación de campos obligatorios".
     * Comprueba : que si falta nombre comercial, razón social, RFC o dirección
     *             responde "Campos obligatorios incompletos (*)" y no guarda nada.
     *
     * @testdox [registrar_empresa.php] Comprueba que sin un campo obligatorio no guarda la empresa
     * @dataProvider empresasIncompletas
     */
    #[TestDox('[registrar_empresa.php] Comprueba que sin un campo obligatorio no guarda la empresa')]
    #[DataProvider('empresasIncompletas')]
    public function test_registrar_empresa_exige_campos_obligatorios(array $cambios): void
    {
        $respuesta = $this->llamar('registrar_empresa.php', self::empresaValida($cambios));

        $this->assertSame(['success' => false, 'error' => 'Campos obligatorios incompletos (*)'], $respuesta);
        $this->assertSame([], self::filas('SELECT * FROM Empresas'));
    }

    /**
     * Función   : registrar_empresa.php › "4. Inserción" y "5. Retornar el ID".
     * Comprueba : que guarda la empresa activa, con fecha de registro y sin
     *             espacios sobrantes, y regresa su Id y nombre.
     *
     * @testdox [registrar_empresa.php] Comprueba que guarda la empresa y regresa su Id
     */
    #[TestDox('[registrar_empresa.php] Comprueba que guarda la empresa y regresa su Id')]
    public function test_registrar_empresa_guarda_y_regresa_id(): void
    {
        $respuesta = $this->llamar('registrar_empresa.php', self::empresaValida(['nombre_comercial' => '  Nueva SA  ']));

        $this->assertTrue($respuesta['success']);
        $this->assertSame('Nueva SA', $respuesta['nombre']);
        $empresa = self::filas('SELECT * FROM Empresas')[0];
        $this->assertSame((int) $empresa['Id_empresa'], (int) $respuesta['id_empresa']);
        $this->assertSame('Nueva SA', $empresa['Nombre']);
        $this->assertSame('Nueva Sociedad Anónima', $empresa['Razon_social']);
        $this->assertSame('NUE123456AB1', $empresa['RFC']);
        $this->assertSame('Calle 1, Tlaxcala', $empresa['Direccion']);
        $this->assertSame('https://nueva.mx', $empresa['Sitio_web']);
        $this->assertSame('Empresa de software', $empresa['Descripcion']);
        $this->assertSame(1, (int) $empresa['Activo']);
        $this->assertNotNull($empresa['Fecha_registro']);
    }

    /**
     * Función   : registrar_empresa.php › limpieza de datos (?? '').
     * Comprueba : que sitio web y descripción son opcionales: si no se mandan se
     *             guardan vacíos.
     *
     * @testdox [registrar_empresa.php] Comprueba que sitio web y descripción son opcionales
     */
    #[TestDox('[registrar_empresa.php] Comprueba que sitio web y descripción son opcionales')]
    public function test_registrar_empresa_campos_opcionales(): void
    {
        $datos = self::empresaValida();
        unset($datos['sitio_web'], $datos['descripcion']);

        $respuesta = $this->llamar('registrar_empresa.php', $datos);

        $this->assertTrue($respuesta['success']);
        $empresa = self::filas('SELECT * FROM Empresas')[0];
        $this->assertSame('', $empresa['Sitio_web']);
        $this->assertSame('', $empresa['Descripcion']);
    }

    public static function empresasDuplicadas(): array
    {
        return [
            'RFC repetido'    => [['nombre_comercial' => 'Otra SA']],
            'nombre repetido' => [['rfc' => 'OTR123456AB1']],
        ];
    }

    /**
     * Función   : registrar_empresa.php › "6. Manejo de errores" (código 23000).
     * Comprueba : que si el RFC o el nombre ya existen responde que ya están
     *             registrados, deja el error en el log (error_log) y no guarda
     *             una segunda empresa.
     *
     * @testdox [registrar_empresa.php] Comprueba que no permite repetir RFC ni nombre
     * @dataProvider empresasDuplicadas
     */
    #[TestDox('[registrar_empresa.php] Comprueba que no permite repetir RFC ni nombre')]
    #[DataProvider('empresasDuplicadas')]
    public function test_registrar_empresa_no_permite_duplicados(array $cambios): void
    {
        $this->llamar('registrar_empresa.php', self::empresaValida());

        // Aquí se usa ejecutarPhp() directo porque registrar_empresa.php escribe a
        // propósito un error_log(), que en la terminal sale como texto de error.
        $resultado = self::ejecutarPhp('registrar_empresa.php', json_encode(self::empresaValida($cambios)));
        $respuesta = $resultado['json'];

        $this->assertIsArray($respuesta, "Respuesta no JSON:\n" . $resultado['salida']);
        $this->assertFalse($respuesta['success']);
        $this->assertSame('El nombre de la empresa o el RFC ya se encuentran registrados.', $respuesta['error']);
        $this->assertStringContainsString('Error DB al registrar empresa', $resultado['errores']);
        $this->assertCount(1, self::filas('SELECT * FROM Empresas'));
    }

    /**
     * Función   : registrar_empresa.php › "6. Manejo de errores" (otro error).
     * Comprueba : que si no se puede conectar a la BD responde
     *             "Error interno al guardar en la base de datos."
     *
     * @testdox [registrar_empresa.php] Comprueba que sin conexión a la BD responde "Error interno al guardar..."
     */
    #[TestDox('[registrar_empresa.php] Comprueba que sin conexión a la BD responde "Error interno al guardar..."')]
    public function test_registrar_empresa_sin_conexion(): void
    {
        $respuesta = $this->llamarSinBaseDeDatos('registrar_empresa.php', self::empresaValida());

        $this->assertFalse($respuesta['success']);
        $this->assertSame('Error interno al guardar en la base de datos.', $respuesta['error']);
    }

    // =====================================================================
    // registro.php
    // =====================================================================

    /**
     * Función   : registro.php › lectura de datos (json_decode de php://input).
     * Comprueba : que si no llegan datos JSON válidos responde "No se recibieron datos".
     *
     * @testdox [registro.php] Comprueba que sin datos válidos responde "No se recibieron datos"
     * @dataProvider cuerposInvalidos
     */
    #[TestDox('[registro.php] Comprueba que sin datos válidos responde "No se recibieron datos"')]
    #[DataProvider('cuerposInvalidos')]
    public function test_registro_sin_datos(string $cuerpo): void
    {
        $this->assertSame(
            ['success' => false, 'error' => 'No se recibieron datos'],
            $this->llamar('registro.php', null, $cuerpo)
        );
    }

    /**
     * Función   : registro.php › revisión de matrícula repetida ($stmtCheck).
     * Comprueba : que si la matrícula ya existe responde "La matrícula ya está
     *             registrada." y no crea otro usuario.
     *
     * @testdox [registro.php] Comprueba que no permite registrar una matrícula repetida
     */
    #[TestDox('[registro.php] Comprueba que no permite registrar una matrícula repetida')]
    public function test_registro_rechaza_matricula_repetida(): void
    {
        self::insertar("INSERT INTO Usuarios (Matricula, Contrasena, Id_tipo_usuario) VALUES ('20232389', 'x', 2)");

        $respuesta = $this->llamar('registro.php', self::alumnoValido());

        $this->assertSame(['success' => false, 'error' => 'La matrícula ya está registrada.'], $respuesta);
        $this->assertCount(1, self::filas('SELECT * FROM Usuarios'));
        $this->assertSame([], self::filas('SELECT * FROM Alumnos'));
    }

    /**
     * Función   : registro.php › "1. CREAR EL USUARIO" (alumno).
     * Comprueba : que crea el usuario como alumno (tipo 2), INACTIVO (pendiente de
     *             activación), con fecha de registro y la contraseña cifrada.
     *
     * @testdox [registro.php] Comprueba que crea al alumno como usuario inactivo con la contraseña cifrada
     */
    #[TestDox('[registro.php] Comprueba que crea al alumno como usuario inactivo con la contraseña cifrada')]
    public function test_registro_alumno_crea_usuario_inactivo_con_contrasena_cifrada(): void
    {
        $respuesta = $this->llamar('registro.php', self::alumnoValido());

        $this->assertSame(['success' => true], $respuesta);
        $usuario = self::filas('SELECT * FROM Usuarios')[0];
        $this->assertSame('20232389', $usuario['Matricula']);
        $this->assertSame(2, (int) $usuario['Id_tipo_usuario']);
        $this->assertSame(0, (int) $usuario['Activo']);
        $this->assertNotNull($usuario['Fecha_registro']);
        $this->assertNotSame('Clave123!', $usuario['Contrasena']);
        $this->assertTrue(password_verify('Clave123!', $usuario['Contrasena']));
    }

    /**
     * Función   : registro.php › "2. REGISTRAR DATOS ESPECÍFICOS" (tabla Alumnos).
     * Comprueba : que guarda los datos del alumno ligados al usuario nuevo.
     *
     * @testdox [registro.php] Comprueba que guarda los datos del alumno
     */
    #[TestDox('[registro.php] Comprueba que guarda los datos del alumno')]
    public function test_registro_alumno_guarda_datos_del_alumno(): void
    {
        $this->llamar('registro.php', self::alumnoValido(['horario' => '08:00 - 12:30']));

        $usuario = self::filas('SELECT * FROM Usuarios')[0];
        $alumno  = self::filas('SELECT * FROM Alumnos')[0];
        $this->assertSame((int) $usuario['Id_usuario'], (int) $alumno['Id_usuario']);
        $this->assertSame('Ana', $alumno['Nombre']);
        $this->assertSame('López', $alumno['Apellido_P']);
        $this->assertSame('Ruiz', $alumno['Apellido_M']);
        $this->assertSame(10, (int) $alumno['Id_carrera']);
        $this->assertSame('7A', $alumno['Grupo']);
        $this->assertSame('08:00 - 12:30', $alumno['Horario']);
        $this->assertSame(1, (int) $alumno['Activo']);
    }

    /**
     * Función   : registro.php › "Horario opcional".
     * Comprueba : que si no se manda horario (o viene vacío) se guarda NULL.
     *
     * @testdox [registro.php] Comprueba que el horario es opcional (se guarda NULL)
     */
    #[TestDox('[registro.php] Comprueba que el horario es opcional (se guarda NULL)')]
    public function test_registro_alumno_horario_opcional(): void
    {
        $datos = self::alumnoValido();
        unset($datos['horario']);

        $this->assertSame(['success' => true], $this->llamar('registro.php', $datos));
        $this->assertNull(self::filas('SELECT Horario FROM Alumnos')[0]['Horario']);
    }

    /**
     * Función   : registro.php › INSERT INTO Actividades_Alumnos.
     * Comprueba : que registra la actividad del alumno en estado PENDIENTE, con
     *             el periodo elegido, el año actual y sin empresa si no eligió una.
     *
     * @testdox [registro.php] Comprueba que registra la actividad del alumno como PENDIENTE
     */
    #[TestDox('[registro.php] Comprueba que registra la actividad del alumno como PENDIENTE')]
    public function test_registro_alumno_registra_actividad_pendiente(): void
    {
        $this->llamar('registro.php', self::alumnoValido(['actividad' => '2', 'periodo_tipo' => 'otoño']));

        $alumno = self::filas('SELECT * FROM Alumnos')[0];
        $actividad = self::filas('SELECT * FROM Actividades_Alumnos')[0];
        $this->assertSame((int) $alumno['Id_alumno'], (int) $actividad['Id_alumno']);
        $this->assertSame(2, (int) $actividad['Id_servicio']);
        $this->assertNull($actividad['Id_empresa']);
        $this->assertSame('PENDIENTE', $actividad['Estado']);
        $this->assertSame('otoño', $actividad['periodo_tipo']);
        $this->assertSame((int) date('Y'), (int) $actividad['periodo_año']);
        $this->assertNotNull($actividad['Fecha_registro']);
    }

    /**
     * Función   : registro.php › INSERT INTO Actividades_Alumnos ($data['organizacion']).
     * Comprueba : que si el alumno eligió una empresa se guarda su Id.
     *
     * @testdox [registro.php] Comprueba que guarda la empresa elegida por el alumno
     */
    #[TestDox('[registro.php] Comprueba que guarda la empresa elegida por el alumno')]
    public function test_registro_alumno_guarda_empresa_elegida(): void
    {
        $this->llamar('registro.php', self::alumnoValido(['organizacion' => '6']));

        $this->assertSame(6, (int) self::filas('SELECT Id_empresa FROM Actividades_Alumnos')[0]['Id_empresa']);
    }

    /**
     * Función   : registro.php › "Registro de Coordinador".
     * Comprueba : que un coordinador se crea como usuario tipo 3, inactivo, con
     *             sus datos en Administradores y SIN registros de alumno.
     *
     * @testdox [registro.php] Comprueba que registra a un coordinador en Administradores
     */
    #[TestDox('[registro.php] Comprueba que registra a un coordinador en Administradores')]
    public function test_registro_coordinador(): void
    {
        $respuesta = $this->llamar('registro.php', self::coordinadorValido());

        $this->assertSame(['success' => true], $respuesta);
        $usuario = self::filas('SELECT * FROM Usuarios')[0];
        $this->assertSame('1234', $usuario['Matricula']);
        $this->assertSame(3, (int) $usuario['Id_tipo_usuario']);
        $this->assertSame(0, (int) $usuario['Activo']);
        $admin = self::filas('SELECT * FROM Administradores')[0];
        $this->assertSame((int) $usuario['Id_usuario'], (int) $admin['Id_usuario']);
        $this->assertSame('Luis', $admin['Nombre']);
        $this->assertSame('Pérez', $admin['Apellido_P']);
        $this->assertSame('Gómez', $admin['Apellido_M']);
        $this->assertSame(11, (int) $admin['Id_carrera']);
        $this->assertSame('2461112233', $admin['Telefono']);
        $this->assertSame('luis@uatx.mx', $admin['Correo']);
        $this->assertSame([], self::filas('SELECT * FROM Alumnos'));
        $this->assertSame([], self::filas('SELECT * FROM Actividades_Alumnos'));
    }

    /**
     * Función   : registro.php › transacción (beginTransaction / rollBack).
     * Comprueba : que si falla un paso a la mitad (por ejemplo, la actividad no
     *             se puede guardar) responde "Error en el servidor: ..." y NO deja
     *             guardado ni el usuario ni el alumno.
     *
     * @testdox [registro.php] Comprueba que si falla a la mitad deshace todo (rollback)
     */
    #[TestDox('[registro.php] Comprueba que si falla a la mitad deshace todo (rollback)')]
    public function test_registro_si_falla_a_la_mitad_deshace_todo(): void
    {
        $respuesta = $this->llamar('registro.php', self::alumnoValido(['actividad' => null]));

        $this->assertFalse($respuesta['success']);
        $this->assertStringStartsWith('Error en el servidor: ', $respuesta['error']);
        $this->assertSame([], self::filas('SELECT * FROM Usuarios'));
        $this->assertSame([], self::filas('SELECT * FROM Alumnos'));
        $this->assertSame([], self::filas('SELECT * FROM Actividades_Alumnos'));
    }
}