<?php
/**
 * Archivo      : PublicarVacantesTest.php
 * Módulo       : CU_06 PublicarVacantes (Pruebas unitarias)
 * Archivos bajo prueba (en la carpeta de app/ que empieza con "CU_06"):
 *   obtener_empresas.php
 *   obtener_servicios.php
 *   guardar_vacante.php
 * Herramienta  : PHPUnit
 *
 * Cómo correrlo (desde OPS-web-app, con el Docker del proyecto prendido):
 *   vendor/bin/phpunit --testdox Pruebas_Unitarias/CU_06/PublicarVacantesTest.php
 *
 * Descripción  : Pruebas de los PHP para publicar vacantes. El código original NO se modifica.
 *   - Usan una base de datos APARTE llamada "ops_pruebas_cu06" que se crea sola
 *     dentro del MariaDB de Docker. Tu base de datos real no se toca.
 *   - Cada PHP se ejecuta en un proceso aparte. La prueba le simula la
 *     sesión (cookies), los campos del formulario ($_POST) y el archivo subido
 *     ($_FILES), y revisa el código HTTP y lo que responde.
 *
 * Cada prueba indica:
 *   - Función   : archivo PHP › bloque que se prueba.
 *   - Comprueba : qué comportamiento se verifica.
 */

namespace CU_06;

use PDO;
use PDOException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\TestDox;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class PublicarVacantesTest extends TestCase
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
    private const DB_NAME = 'ops_pruebas_cu06'; // debe contener "prueba"

    private const PUENTE_DOCKER = 'ops-pruebas-puente-bd';
    private const PUERTO_PUENTE = '33061';

    private static ?PDO $pdo = null;
    private static ?array $destino = null;
    private static string $carpetaTemporal = '';

    /** Carpeta del módulo: la primera de app/ que empieza con "CU_06". */
    private static function carpetaApp(): string
    {
        $carpetas = glob(__DIR__ . '/../../app/CU_06*', GLOB_ONLYDIR);
        if (!$carpetas) {
            throw new RuntimeException('No se encontró ninguna carpeta que empiece con "CU_06" dentro de app/.');
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
        $base = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'ops_pruebas_cu06';
        @mkdir($base . DIRECTORY_SEPARATOR . 'php', 0777, true);
        @mkdir($base . DIRECTORY_SEPARATOR . 'CU_06', 0777, true);

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
            self::$carpetaTemporal . DIRECTORY_SEPARATOR . 'CU_06',
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
        foreach (['Vacantes', 'Empresas', 'Actividades'] as $t) {
            $pdo->exec("DROP TABLE IF EXISTS `{$t}`");
        }
        $pdo->exec('CREATE TABLE Empresas (
            Id_empresa INT AUTO_INCREMENT PRIMARY KEY, Nombre VARCHAR(200) NOT NULL, Descripcion TEXT NULL,
            Razon_social VARCHAR(200) NULL, RFC VARCHAR(13) NULL, Direccion TEXT NULL, Sitio_web VARCHAR(255) NULL,
            Activo TINYINT(1) NOT NULL DEFAULT 1)');
        $pdo->exec('CREATE TABLE Actividades (Id_servicio INT AUTO_INCREMENT PRIMARY KEY, Servicio VARCHAR(150) NOT NULL)');
        $pdo->exec('CREATE TABLE Vacantes (
            Id_vacante INT AUTO_INCREMENT PRIMARY KEY,
            Titulo VARCHAR(200) NOT NULL, Descripcion TEXT NULL, Requisitos TEXT NULL,
            Contacto_nombre VARCHAR(150) NULL, Contacto_email VARCHAR(150) NULL, Contacto_telefono VARCHAR(20) NULL,
            Fecha_publicacion DATE NOT NULL, Fecha_expiracion DATE NOT NULL, Flyer_Path VARCHAR(255) NULL,
            Id_servicio INT NULL, Id_empresa INT NULL, Id_carrera INT NOT NULL)');
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

    private const SESION = ['Id_usuario' => '3', 'Id_tipo_usuario' => '3', 'Id_carrera' => '10'];

    /** Campos que manda el formulario en "Registro manual" con una empresa existente. */
    private static function vacanteManual(array $cambios = []): array
    {
        return array_merge([
            'tipo_registro' => 'manual', 'titulo' => 'Desarrollador web', 'Id_servicio' => '2',
            'nombre_contacto' => 'María Soto', 'email' => 'maria@acme.mx', 'telefono' => '2461234567',
            'descripcion' => 'Apoyo en sitio web', 'requisitos' => 'HTML y CSS',
            'publicacion' => '2026-11-13', 'expiracion' => '2026-12-31', 'nueva_empresa' => 'false', 'Id_empresa' => '5',
        ], $cambios);
    }

    /** Campos que manda el formulario en "Registro con flyer" con una empresa existente. */
    private static function vacanteFlyer(array $cambios = []): array
    {
        return array_merge([
            'tipo_registro' => 'flayer', 'titulo' => 'Vacante con flyer', 'Id_servicio' => '1',
            'publicacion' => '2026-11-13', 'expiracion' => '2026-12-31', 'nueva_empresa' => 'false', 'Id_empresa' => '6',
        ], $cambios);
    }

    /** Campos de una nueva empresa. */
    private static function nuevaEmpresa(): array
    {
        return [
            'nueva_empresa' => 'true', 'nombre_empresa' => 'Nueva SA', 'descripcion_empresa' => 'Software',
            'razon_empresa' => 'Nueva Sociedad Anónima', 'rfc_empresa' => 'NUE123456AB1',
            'direccion_empresa' => 'Calle 1', 'web_empresa' => 'nueva.mx',
        ];
    }

    /** Describe un archivo subido como lo haría $_FILES. */
    private static function flyerSubido(int $error = 0): array
    {
        $ruta = tempnam(sys_get_temp_dir(), 'ops_flyer_');
        file_put_contents($ruta, 'flyer');
        return ['archivo_flayer' => ['name' => 'flyer.png', 'type' => 'image/png', 'tmp_name' => $ruta, 'error' => $error, 'size' => 5]];
    }

    // ---------- Llamar a los PHP ----------

    /**
     * Ejecuta un PHP del módulo y regresa [código HTTP, JSON, errores de PHP].
     * Opciones: cookies, post, files, sinBD.
     */
    private function llamar(string $archivo, array $op = []): array
    {
        $archivoCodigo = tempnam(sys_get_temp_dir(), 'ops_codigo_');
        $entorno = [
            'OPS_COOKIES' => json_encode($op['cookies'] ?? []),
            'OPS_POST' => json_encode($op['post'] ?? []),
            'OPS_FILES' => json_encode($op['files'] ?? []),
            'OPS_ARCHIVO_CODIGO' => $archivoCodigo,
        ];
        if (!empty($op['sinBD'])) {
            $entorno['OPS_FORZAR_ERROR_DB'] = '1';
        }

        $resultado = self::ejecutarPhp($archivo, '', $entorno);
        $codigo = (int) file_get_contents($archivoCodigo);
        @unlink($archivoCodigo);

        $this->assertIsArray($resultado['json'], "{$archivo} no respondió JSON válido. Respondió:\n" . $resultado['salida']);
        return [$codigo, $resultado['json'], $resultado['errores']];
    }

    // =====================================================================
    // obtener_empresas.php
    // =====================================================================

    /**
     * Función   : obtener_empresas.php › consulta de empresas.
     * Comprueba : que regresa el Id y el nombre de todas las empresas registradas.
     *
     * @testdox [obtener_empresas.php] Comprueba que regresa el Id y nombre de las empresas
     */
    #[TestDox('[obtener_empresas.php] Comprueba que regresa el Id y nombre de las empresas')]
    public function test_obtener_empresas(): void
    {
        $acme = self::insertar('Empresas', ['Nombre' => 'Acme', 'RFC' => 'ACM123456AB1']);
        $beta = self::insertar('Empresas', ['Nombre' => 'Beta']);

        [$codigo, $r, $errores] = $this->llamar('obtener_empresas.php');

        $this->assertSame([200, ''], [$codigo, $errores]);
        $this->assertSame([['Id_empresa' => $acme, 'Nombre' => 'Acme'], ['Id_empresa' => $beta, 'Nombre' => 'Beta']], $r);
    }

    /**
     * Función   : obtener_empresas.php › consulta de empresas.
     * Comprueba : que sin empresas regresa una lista vacía.
     *
     * @testdox [obtener_empresas.php] Comprueba que sin empresas regresa una lista vacía
     */
    #[TestDox('[obtener_empresas.php] Comprueba que sin empresas regresa una lista vacía')]
    public function test_obtener_empresas_vacio(): void
    {
        $this->assertSame([200, [], ''], $this->llamar('obtener_empresas.php'));
    }

    /**
     * Función   : obtener_empresas.php › catch (PDOException).
     * Comprueba : que sin conexión a la BD responde 500 "Error de conexión: ...".
     *
     * @testdox [obtener_empresas.php] Comprueba que sin conexión a la BD responde 500
     */
    #[TestDox('[obtener_empresas.php] Comprueba que sin conexión a la BD responde 500')]
    public function test_obtener_empresas_sin_bd(): void
    {
        [$codigo, $r] = $this->llamar('obtener_empresas.php', ['sinBD' => true]);

        $this->assertSame(500, $codigo);
        $this->assertStringStartsWith('Error de conexión: ', $r['error']);
    }

    // =====================================================================
    // obtener_servicios.php
    // =====================================================================

    /**
     * Función   : obtener_servicios.php › consulta de servicios.
     * Comprueba : que regresa el Id y el nombre de todos los servicios.
     *
     * @testdox [obtener_servicios.php] Comprueba que regresa el Id y nombre de los servicios
     */
    #[TestDox('[obtener_servicios.php] Comprueba que regresa el Id y nombre de los servicios')]
    public function test_obtener_servicios(): void
    {
        $practicas = self::insertar('Actividades', ['Servicio' => 'Prácticas profesionales']);
        $social = self::insertar('Actividades', ['Servicio' => 'Servicio social']);

        [$codigo, $r, $errores] = $this->llamar('obtener_servicios.php');

        $this->assertSame([200, ''], [$codigo, $errores]);
        $this->assertSame([
            ['Id_servicio' => $practicas, 'Servicio' => 'Prácticas profesionales'],
            ['Id_servicio' => $social, 'Servicio' => 'Servicio social'],
        ], $r);
    }

    /**
     * Función   : obtener_servicios.php › catch (PDOException).
     * Comprueba : que sin conexión a la BD responde 500 "Error de conexión: ...".
     *
     * @testdox [obtener_servicios.php] Comprueba que sin conexión a la BD responde 500
     */
    #[TestDox('[obtener_servicios.php] Comprueba que sin conexión a la BD responde 500')]
    public function test_obtener_servicios_sin_bd(): void
    {
        [$codigo, $r] = $this->llamar('obtener_servicios.php', ['sinBD' => true]);

        $this->assertSame(500, $codigo);
        $this->assertStringStartsWith('Error de conexión: ', $r['error']);
    }

    // =====================================================================
    // guardar_vacante.php
    // =====================================================================

    /**
     * Función   : guardar_vacante.php › VALIDACIÓN DE SESIÓN.
     * Comprueba : que sin las cookies de sesión responde 401 y no guarda nada.
     *
     * @testdox [guardar_vacante.php › validación de sesión] Comprueba que sin sesión responde 401
     */
    #[TestDox('[guardar_vacante.php › validación de sesión] Comprueba que sin sesión responde 401')]
    public function test_guardar_sin_sesion(): void
    {
        [$codigo, $r] = $this->llamar('guardar_vacante.php', ['post' => self::vacanteManual()]);

        $this->assertSame(401, $codigo);
        $this->assertSame(['success' => false, 'error' => 'Sesión no válida. Por favor inicia sesión nuevamente.'], $r);
        $this->assertSame([], self::filas('SELECT * FROM Vacantes'));
    }

    /**
     * Función   : guardar_vacante.php › REGISTRO MANUAL (empresa existente).
     * Comprueba : que guarda la vacante con todos sus datos, la empresa elegida
     *             y la carrera de la sesión (cookie Id_carrera), sin flyer.
     *
     * @testdox [guardar_vacante.php › registro manual] Comprueba que guarda la vacante con empresa existente
     */
    #[TestDox('[guardar_vacante.php › registro manual] Comprueba que guarda la vacante con empresa existente')]
    public function test_guardar_manual(): void
    {
        [$codigo, $r, $errores] = $this->llamar('guardar_vacante.php', ['cookies' => self::SESION, 'post' => self::vacanteManual()]);

        $this->assertSame([200, ['success' => true], ''], [$codigo, $r, $errores]);
        $v = self::filas('SELECT * FROM Vacantes')[0];
        $this->assertSame([
            'Desarrollador web', 'Apoyo en sitio web', 'HTML y CSS', 'María Soto', 'maria@acme.mx', '2461234567',
            '2026-11-13', '2026-12-31', null, 2, 5, 10,
        ], [
            $v['Titulo'], $v['Descripcion'], $v['Requisitos'], $v['Contacto_nombre'], $v['Contacto_email'], $v['Contacto_telefono'],
            $v['Fecha_publicacion'], $v['Fecha_expiracion'], $v['Flyer_Path'], (int) $v['Id_servicio'], (int) $v['Id_empresa'], (int) $v['Id_carrera'],
        ]);
    }

    /**
     * Función   : guardar_vacante.php › REGISTRO MANUAL (nueva empresa).
     * Comprueba : que primero crea la empresa (activa, con todos sus datos) y
     *             luego guarda la vacante ligada a esa empresa nueva.
     *
     * @testdox [guardar_vacante.php › registro manual] Comprueba que crea la empresa nueva y la liga a la vacante
     */
    #[TestDox('[guardar_vacante.php › registro manual] Comprueba que crea la empresa nueva y la liga a la vacante')]
    public function test_guardar_manual_nueva_empresa(): void
    {
        $post = array_merge(self::vacanteManual(), self::nuevaEmpresa());
        unset($post['Id_empresa']);

        [$codigo, $r, $errores] = $this->llamar('guardar_vacante.php', ['cookies' => self::SESION, 'post' => $post]);

        $this->assertSame([200, ['success' => true], ''], [$codigo, $r, $errores]);
        $empresa = self::filas('SELECT * FROM Empresas')[0];
        $this->assertSame(['Nueva SA', 'Software', 'Nueva Sociedad Anónima', 'NUE123456AB1', 'Calle 1', 'nueva.mx', 1],
            [$empresa['Nombre'], $empresa['Descripcion'], $empresa['Razon_social'], $empresa['RFC'],
             $empresa['Direccion'], $empresa['Sitio_web'], (int) $empresa['Activo']]);
        $this->assertSame((int) $empresa['Id_empresa'], (int) self::filas('SELECT Id_empresa FROM Vacantes')[0]['Id_empresa']);
    }

    /**
     * Función   : guardar_vacante.php › VALIDACIÓN DE ARCHIVO (registro con flyer).
     * Comprueba : que sin archivo, o con error al subirlo, responde que no se
     *             recibió el flyer y no guarda la vacante.
     *
     * @testdox [guardar_vacante.php › registro con flyer] Comprueba que sin flyer válido no guarda la vacante
     */
    #[TestDox('[guardar_vacante.php › registro con flyer] Comprueba que sin flyer válido no guarda la vacante')]
    public function test_guardar_flyer_sin_archivo(): void
    {
        $esperado = ['success' => false, 'error' => 'No se recibió el archivo flayer o hubo un error al subirlo.'];

        $this->assertSame($esperado, $this->llamar('guardar_vacante.php', ['cookies' => self::SESION, 'post' => self::vacanteFlyer()])[1]);
        $this->assertSame($esperado, $this->llamar('guardar_vacante.php',
            ['cookies' => self::SESION, 'post' => self::vacanteFlyer(), 'files' => self::flyerSubido(UPLOAD_ERR_PARTIAL)])[1]);
        $this->assertSame([], self::filas('SELECT * FROM Vacantes'));
    }

    /**
     * Función   : guardar_vacante.php › move_uploaded_file().
     * Comprueba : que si el archivo no se puede guardar en el servidor responde
     *             500 y no guarda la vacante.
     *             (En las pruebas move_uploaded_file() siempre falla, porque el
     *             archivo no llegó por una petición web real.)
     *
     * @testdox [guardar_vacante.php › registro con flyer] Comprueba que si no se puede guardar el archivo responde 500
     */
    #[TestDox('[guardar_vacante.php › registro con flyer] Comprueba que si no se puede guardar el archivo responde 500')]
    public function test_guardar_flyer_no_se_puede_mover(): void
    {
        [$codigo, $r] = $this->llamar('guardar_vacante.php',
            ['cookies' => self::SESION, 'post' => self::vacanteFlyer(), 'files' => self::flyerSubido()]);

        $this->assertSame([500, ['success' => false, 'error' => 'No se pudo mover el archivo al servidor.']], [$codigo, $r]);
        $this->assertSame([], self::filas('SELECT * FROM Vacantes'));
    }

    /**
     * Función   : guardar_vacante.php › catch (PDOException).
     * Comprueba : que sin conexión a la BD responde 500 "Error de conexión: ...".
     *
     * @testdox [guardar_vacante.php] Comprueba que sin conexión a la BD responde 500
     */
    #[TestDox('[guardar_vacante.php] Comprueba que sin conexión a la BD responde 500')]
    public function test_guardar_sin_bd(): void
    {
        [$codigo, $r] = $this->llamar('guardar_vacante.php', ['cookies' => self::SESION, 'post' => self::vacanteManual(), 'sinBD' => true]);

        $this->assertSame(500, $codigo);
        $this->assertFalse($r['success']);
        $this->assertStringStartsWith('Error de conexión: ', $r['error']);
    }
}