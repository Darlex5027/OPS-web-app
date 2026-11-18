<?php
/**
 * Archivo      : VisualizarVacantesTest.php
 * Módulo       : CU_04_VisualizarVacantes (Pruebas unitarias)
 * Archivos bajo prueba :
 *   app/CU_04_VisualizarVacantes/obtener_vacantes.php
 *   app/CU_04_VisualizarVacantes/eliminar_vacante.php
 * Herramienta  : PHPUnit
 *
 * Cómo correrlo (desde OPS-web-app, con el Docker del proyecto prendido):
 *   vendor/bin/phpunit --testdox Pruebas_Unitarias/CU_04/VisualizarVacantesTest.php
 *
 * Descripción  : Pruebas de los PHP de vacantes. El código original NO se modifica.
 *   - Usan una base de datos APARTE llamada "ops_pruebas_cu04" que se crea sola
 *     dentro del MariaDB de Docker. Tu base de datos real no se toca.
 *   - Cada PHP se ejecuta en un proceso aparte. La prueba le simula la sesión
 *     (cookies Id_usuario, Id_tipo_usuario e Id_carrera) y el cuerpo JSON, y
 *     revisa el código HTTP y el JSON que responde.
 *
 * Cada prueba indica:
 *   - Función   : archivo PHP › función o bloque que se prueba.
 *   - Comprueba : qué comportamiento se verifica.
 */

namespace CU_04;

use PDO;
use PDOException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\TestDox;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class VisualizarVacantesTest extends TestCase
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
    private const DB_NAME = 'ops_pruebas_cu04'; // debe contener "prueba"

    private const CARPETA_APP = __DIR__ . '/../../app/CU_04_Visualizar_Vacantes';

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
     *    require_once("../php/db.php"); al ejecutarlo desde <temporal>/CU_04_VisualizarVacantes,
     *    PHP carga este db.php en lugar del real.
     *  - simular_input.php: hace que php://input devuelva el JSON enviado por la prueba
     *    (en la terminal no existe el cuerpo de una petición HTTP) y simula las
     *    cookies de sesión, los campos POST y los archivos subidos.
     */
    private static function prepararArchivosTemporales(): void
    {
        $base = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'ops_pruebas_cu04';
        @mkdir($base . DIRECTORY_SEPARATOR . 'php', 0777, true);
        @mkdir($base . DIRECTORY_SEPARATOR . 'CU_04_Visualizar_Vacantes', 0777, true);

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
            self::$carpetaTemporal . DIRECTORY_SEPARATOR . 'CU_04_Visualizar_Vacantes',
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

    /** Crea las tablas que usan los PHP de vacantes (versión mínima para pruebas). */
    private static function crearEsquema(): void
    {
        $pdo = self::conexion();
        foreach (['Vacantes', 'Empresas', 'Actividades'] as $t) {
            $pdo->exec("DROP TABLE IF EXISTS `{$t}`");
        }
        $pdo->exec('CREATE TABLE Empresas (Id_empresa INT AUTO_INCREMENT PRIMARY KEY, Nombre VARCHAR(200) NOT NULL)');
        $pdo->exec('CREATE TABLE Actividades (Id_servicio INT AUTO_INCREMENT PRIMARY KEY, Servicio VARCHAR(150) NOT NULL)');
        $pdo->exec('CREATE TABLE Vacantes (
            Id_vacante INT AUTO_INCREMENT PRIMARY KEY,
            Titulo VARCHAR(200) NOT NULL, Descripcion TEXT NULL, Requisitos TEXT NULL,
            Contacto_nombre VARCHAR(150) NULL, Contacto_email VARCHAR(150) NULL, Contacto_telefono VARCHAR(20) NULL,
            Fecha_publicacion DATE NOT NULL, Fecha_expiracion DATE NOT NULL,
            Flyer_Path VARCHAR(255) NULL,
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

    /** Fecha de hoy (según la BD) más/menos $dias, en formato AAAA-MM-DD. */
    private static function fecha(int $dias = 0): string
    {
        $stmt = self::conexion()->prepare('SELECT DATE_ADD(CURDATE(), INTERVAL ? DAY)');
        $stmt->execute([$dias]);
        return (string) $stmt->fetchColumn();
    }

    /** Crea una vacante vigente de la carrera 10. */
    private static function crearVacante(array $cambios = []): int
    {
        return self::insertar('Vacantes', array_merge([
            'Titulo' => 'Vacante', 'Descripcion' => 'Descripción', 'Requisitos' => 'Requisitos',
            'Contacto_nombre' => 'María', 'Contacto_email' => 'maria@acme.mx', 'Contacto_telefono' => '246-123-4567',
            'Fecha_publicacion' => self::fecha(-5), 'Fecha_expiracion' => self::fecha(30),
            'Flyer_Path' => null, 'Id_servicio' => null, 'Id_empresa' => null, 'Id_carrera' => 10,
        ], $cambios));
    }

    // ---------- Llamar a los PHP ----------

    /**
     * Ejecuta un PHP de vacantes y regresa [código HTTP, JSON].
     * Opciones: datos (arreglo JSON), cuerpo (texto crudo), cookies, sinBD.
     */
    private function llamar(string $archivo, array $op = []): array
    {
        $archivoCodigo = tempnam(sys_get_temp_dir(), 'ops_codigo_');
        $cuerpo = $op['cuerpo'] ?? (isset($op['datos']) ? json_encode($op['datos']) : '');

        $entorno = [
            'OPS_COOKIES' => json_encode($op['cookies'] ?? []),
            'OPS_ARCHIVO_CODIGO' => $archivoCodigo,
        ];
        if (!empty($op['sinBD'])) {
            $entorno['OPS_FORZAR_ERROR_DB'] = '1';
        }

        $resultado = self::ejecutarPhp($archivo, $cuerpo, $entorno);
        $codigo = (int) file_get_contents($archivoCodigo);
        @unlink($archivoCodigo);

        $this->assertSame('', $resultado['errores'], "{$archivo} mostró errores de PHP:\n" . $resultado['errores']);
        $this->assertIsArray($resultado['json'], "{$archivo} no respondió JSON válido. Respondió:\n" . $resultado['salida']);
        return [$codigo, $resultado['json']];
    }

    private const SESION_ALUMNO      = ['Id_usuario' => '5', 'Id_tipo_usuario' => '2', 'Id_carrera' => '10'];
    private const SESION_COORDINADOR = ['Id_usuario' => '3', 'Id_tipo_usuario' => '3', 'Id_carrera' => '10'];
    private const SESION_ADMIN       = ['Id_usuario' => '1', 'Id_tipo_usuario' => '1', 'Id_carrera' => '10'];

    // =====================================================================
    // obtener_vacantes.php
    // =====================================================================

    public static function sesionesIncompletas(): array
    {
        return [
            'sin cookies'          => [[]],
            'sin Id_carrera'       => [['Id_usuario' => '5', 'Id_tipo_usuario' => '2']],
            'sin Id_usuario'       => [['Id_carrera' => '10']],
            'Id_carrera vacío'     => [['Id_usuario' => '5', 'Id_carrera' => '']],
        ];
    }

    /**
     * Función   : obtener_vacantes.php › VALIDACIÓN DE SESIÓN.
     * Comprueba : que sin Id_usuario o sin Id_carrera en las cookies responde
     *             401 "Sesión no válida.".
     *
     * @testdox [obtener_vacantes.php › validación de sesión] Comprueba que sin sesión completa responde 401
     * @dataProvider sesionesIncompletas
     */
    #[TestDox('[obtener_vacantes.php › validación de sesión] Comprueba que sin sesión completa responde 401')]
    #[DataProvider('sesionesIncompletas')]
    public function test_obtener_sin_sesion(array $cookies): void
    {
        $this->assertSame([401, ['success' => false, 'error' => 'Sesión no válida.']],
            $this->llamar('obtener_vacantes.php', ['cookies' => $cookies]));
    }

    /**
     * Función   : obtener_vacantes.php › consulta de vacantes (WHERE).
     * Comprueba : que solo regresa las vacantes de la carrera de la sesión que
     *             no han expirado (las que expiran hoy sí se muestran).
     *
     * @testdox [obtener_vacantes.php] Comprueba que solo regresa vacantes vigentes de la carrera del usuario
     */
    #[TestDox('[obtener_vacantes.php] Comprueba que solo regresa vacantes vigentes de la carrera del usuario')]
    public function test_obtener_filtra_por_carrera_y_vigencia(): void
    {
        self::crearVacante(['Titulo' => 'Vigente']);
        self::crearVacante(['Titulo' => 'Expira hoy', 'Fecha_expiracion' => self::fecha(0)]);
        self::crearVacante(['Titulo' => 'Expiró ayer', 'Fecha_expiracion' => self::fecha(-1)]);
        self::crearVacante(['Titulo' => 'Otra carrera', 'Id_carrera' => 20]);

        [$codigo, $r] = $this->llamar('obtener_vacantes.php', ['cookies' => self::SESION_ALUMNO]);

        $this->assertSame(200, $codigo);
        $this->assertEqualsCanonicalizing(['Vigente', 'Expira hoy'], array_column($r, 'Titulo'));
    }

    /**
     * Función   : obtener_vacantes.php › consulta de vacantes (ORDER BY).
     * Comprueba : que las vacantes vienen de la más reciente a la más antigua.
     *
     * @testdox [obtener_vacantes.php] Comprueba que ordena de la publicación más reciente a la más antigua
     */
    #[TestDox('[obtener_vacantes.php] Comprueba que ordena de la publicación más reciente a la más antigua')]
    public function test_obtener_ordena_por_fecha_de_publicacion(): void
    {
        self::crearVacante(['Titulo' => 'Antigua', 'Fecha_publicacion' => self::fecha(-20)]);
        self::crearVacante(['Titulo' => 'Reciente', 'Fecha_publicacion' => self::fecha(-1)]);
        self::crearVacante(['Titulo' => 'Media', 'Fecha_publicacion' => self::fecha(-10)]);

        [, $r] = $this->llamar('obtener_vacantes.php', ['cookies' => self::SESION_ALUMNO]);

        $this->assertSame(['Reciente', 'Media', 'Antigua'], array_column($r, 'Titulo'));
    }

    /**
     * Función   : obtener_vacantes.php › consulta de vacantes (LEFT JOIN).
     * Comprueba : que cada vacante trae todos sus campos más el nombre de la
     *             empresa y del servicio; si no tiene, vienen como null.
     *
     * @testdox [obtener_vacantes.php] Comprueba los campos de cada vacante con empresa y servicio
     */
    #[TestDox('[obtener_vacantes.php] Comprueba los campos de cada vacante con empresa y servicio')]
    public function test_obtener_campos_de_la_vacante(): void
    {
        $empresa = self::insertar('Empresas', ['Nombre' => 'Acme']);
        $servicio = self::insertar('Actividades', ['Servicio' => 'Servicio social']);
        $id = self::crearVacante([
            'Titulo' => 'Con todo', 'Flyer_Path' => '/home/uploads/Flyers/1.png',
            'Id_empresa' => $empresa, 'Id_servicio' => $servicio, 'Fecha_publicacion' => self::fecha(-1),
        ]);
        self::crearVacante(['Titulo' => 'Sin empresa', 'Fecha_publicacion' => self::fecha(-2)]);

        [, $r] = $this->llamar('obtener_vacantes.php', ['cookies' => self::SESION_ALUMNO]);

        $this->assertSame([
            'Id_vacante', 'Titulo', 'Descripcion', 'Requisitos', 'Contacto_nombre', 'Contacto_email',
            'Contacto_telefono', 'Fecha_publicacion', 'Fecha_expiracion', 'Flyer_Path', 'Id_servicio', 'Empresa', 'Servicio',
        ], array_keys($r[0]));
        $this->assertSame($id, (int) $r[0]['Id_vacante']);
        $this->assertSame('Acme', $r[0]['Empresa']);
        $this->assertSame('Servicio social', $r[0]['Servicio']);
        $this->assertSame('/home/uploads/Flyers/1.png', $r[0]['Flyer_Path']);
        $this->assertNull($r[1]['Empresa']);
        $this->assertNull($r[1]['Servicio']);
    }

    /**
     * Función   : obtener_vacantes.php › consulta de vacantes.
     * Comprueba : que si no hay vacantes regresa una lista vacía.
     *
     * @testdox [obtener_vacantes.php] Comprueba que sin vacantes regresa una lista vacía
     */
    #[TestDox('[obtener_vacantes.php] Comprueba que sin vacantes regresa una lista vacía')]
    public function test_obtener_sin_vacantes(): void
    {
        $this->assertSame([200, []], $this->llamar('obtener_vacantes.php', ['cookies' => self::SESION_ALUMNO]));
    }

    /**
     * Función   : obtener_vacantes.php › catch (PDOException).
     * Comprueba : que si no se puede conectar a la BD responde 500 "Error de conexión: ...".
     *
     * @testdox [obtener_vacantes.php] Comprueba que sin conexión a la BD responde 500
     */
    #[TestDox('[obtener_vacantes.php] Comprueba que sin conexión a la BD responde 500')]
    public function test_obtener_sin_bd(): void
    {
        [$codigo, $r] = $this->llamar('obtener_vacantes.php', ['cookies' => self::SESION_ALUMNO, 'sinBD' => true]);

        $this->assertSame(500, $codigo);
        $this->assertFalse($r['success']);
        $this->assertStringStartsWith('Error de conexión: ', $r['error']);
    }

    // =====================================================================
    // eliminar_vacante.php
    // =====================================================================

    /**
     * Función   : eliminar_vacante.php › Verificar sesión activa.
     * Comprueba : que sin cookies de sesión responde 401 y no borra nada.
     *
     * @testdox [eliminar_vacante.php › verificar sesión] Comprueba que sin sesión responde 401
     */
    #[TestDox('[eliminar_vacante.php › verificar sesión] Comprueba que sin sesión responde 401')]
    public function test_eliminar_sin_sesion(): void
    {
        $id = self::crearVacante();

        $r = $this->llamar('eliminar_vacante.php', ['datos' => ['Id_vacante' => $id]]);

        $this->assertSame([401, ['success' => false, 'mensaje' => 'Sesión no válida']], $r);
        $this->assertCount(1, self::filas('SELECT * FROM Vacantes'));
    }

    /**
     * Función   : eliminar_vacante.php › Verificar permiso.
     * Comprueba : que un alumno (tipo 2) no puede eliminar vacantes (403).
     *
     * @testdox [eliminar_vacante.php › verificar permiso] Comprueba que un alumno no puede eliminar (403)
     */
    #[TestDox('[eliminar_vacante.php › verificar permiso] Comprueba que un alumno no puede eliminar (403)')]
    public function test_eliminar_alumno_sin_permiso(): void
    {
        $id = self::crearVacante();

        $r = $this->llamar('eliminar_vacante.php', ['cookies' => self::SESION_ALUMNO, 'datos' => ['Id_vacante' => $id]]);

        $this->assertSame([403, ['success' => false, 'mensaje' => 'No tienes permiso para eliminar vacantes']], $r);
        $this->assertCount(1, self::filas('SELECT * FROM Vacantes'));
    }

    public static function cuerposIncompletos(): array
    {
        return [
            'cuerpo vacío'      => [''],
            'no es JSON'        => ['hola'],
            'sin Id_vacante'    => ['{"id":1}'],
        ];
    }

    /**
     * Función   : eliminar_vacante.php › Leer y validar el body JSON.
     * Comprueba : que sin JSON o sin Id_vacante responde 400 "Datos incompletos".
     *
     * @testdox [eliminar_vacante.php › validar body] Comprueba que sin Id_vacante responde 400
     * @dataProvider cuerposIncompletos
     */
    #[TestDox('[eliminar_vacante.php › validar body] Comprueba que sin Id_vacante responde 400')]
    #[DataProvider('cuerposIncompletos')]
    public function test_eliminar_datos_incompletos(string $cuerpo): void
    {
        $this->assertSame([400, ['success' => false, 'mensaje' => 'Datos incompletos']],
            $this->llamar('eliminar_vacante.php', ['cookies' => self::SESION_COORDINADOR, 'cuerpo' => $cuerpo]));
    }

    public static function idsInvalidos(): array
    {
        return ['cero' => [0], 'negativo' => [-3], 'texto' => ['abc']];
    }

    /**
     * Función   : eliminar_vacante.php › validación del Id (intval > 0).
     * Comprueba : que un Id que no es un número positivo responde 400.
     *
     * @testdox [eliminar_vacante.php › validar body] Comprueba que un Id no válido responde 400
     * @dataProvider idsInvalidos
     */
    #[TestDox('[eliminar_vacante.php › validar body] Comprueba que un Id no válido responde 400')]
    #[DataProvider('idsInvalidos')]
    public function test_eliminar_id_invalido($id): void
    {
        $this->assertSame([400, ['success' => false, 'mensaje' => 'ID de vacante no válido']],
            $this->llamar('eliminar_vacante.php', ['cookies' => self::SESION_COORDINADOR, 'datos' => ['Id_vacante' => $id]]));
    }

    /**
     * Función   : eliminar_vacante.php › Eliminar registro (rowCount() === 0).
     * Comprueba : que si la vacante no existe responde 404.
     *
     * @testdox [eliminar_vacante.php] Comprueba que una vacante inexistente responde 404
     */
    #[TestDox('[eliminar_vacante.php] Comprueba que una vacante inexistente responde 404')]
    public function test_eliminar_vacante_inexistente(): void
    {
        $this->assertSame([404, ['success' => false, 'mensaje' => 'La vacante no existe o ya fue eliminada']],
            $this->llamar('eliminar_vacante.php', ['cookies' => self::SESION_COORDINADOR, 'datos' => ['Id_vacante' => 999]]));
    }

    public static function sesionesConPermiso(): array
    {
        return ['administrador (1)' => [self::SESION_ADMIN], 'coordinador (3)' => [self::SESION_COORDINADOR]];
    }

    /**
     * Función   : eliminar_vacante.php › Eliminar registro de la BD.
     * Comprueba : que administrador y coordinador eliminan la vacante indicada
     *             (y solo esa); el Id también puede llegar como texto.
     *
     * @testdox [eliminar_vacante.php] Comprueba que administrador y coordinador eliminan solo la vacante indicada
     * @dataProvider sesionesConPermiso
     */
    #[TestDox('[eliminar_vacante.php] Comprueba que administrador y coordinador eliminan solo la vacante indicada')]
    #[DataProvider('sesionesConPermiso')]
    public function test_eliminar_exito(array $sesion): void
    {
        $borrar = self::crearVacante(['Titulo' => 'Borrar']);
        self::crearVacante(['Titulo' => 'Conservar']);

        $r = $this->llamar('eliminar_vacante.php', ['cookies' => $sesion, 'datos' => ['Id_vacante' => (string) $borrar]]);

        $this->assertSame([200, ['success' => true, 'mensaje' => 'Vacante eliminada correctamente']], $r);
        $this->assertSame(['Conservar'], array_column(self::filas('SELECT Titulo FROM Vacantes'), 'Titulo'));
    }

    /**
     * Función   : eliminar_vacante.php › Eliminar el archivo del flyer.
     * Comprueba : que al eliminar la vacante también se borra su flyer del servidor.
     *
     * @testdox [eliminar_vacante.php] Comprueba que también borra el archivo del flyer
     */
    #[TestDox('[eliminar_vacante.php] Comprueba que también borra el archivo del flyer')]
    public function test_eliminar_borra_el_flyer(): void
    {
        $flyer = tempnam(sys_get_temp_dir(), 'ops_flyer_');
        $id = self::crearVacante(['Flyer_Path' => $flyer]);

        $r = $this->llamar('eliminar_vacante.php', ['cookies' => self::SESION_COORDINADOR, 'datos' => ['Id_vacante' => $id]]);

        $this->assertSame(200, $r[0]);
        $this->assertFileDoesNotExist($flyer);
    }

    /**
     * Función   : eliminar_vacante.php › Eliminar el archivo del flyer (file_exists).
     * Comprueba : que si el archivo del flyer ya no existe la vacante se elimina
     *             igual, sin errores.
     *
     * @testdox [eliminar_vacante.php] Comprueba que si el flyer ya no existe elimina igual sin errores
     */
    #[TestDox('[eliminar_vacante.php] Comprueba que si el flyer ya no existe elimina igual sin errores')]
    public function test_eliminar_flyer_inexistente(): void
    {
        $id = self::crearVacante(['Flyer_Path' => '/ruta/que/no/existe/flyer.png']);

        $r = $this->llamar('eliminar_vacante.php', ['cookies' => self::SESION_COORDINADOR, 'datos' => ['Id_vacante' => $id]]);

        $this->assertSame([200, ['success' => true, 'mensaje' => 'Vacante eliminada correctamente']], $r);
        $this->assertSame([], self::filas('SELECT * FROM Vacantes'));
    }

    /**
     * Función   : eliminar_vacante.php › catch (PDOException).
     * Comprueba : que si no se puede conectar a la BD responde 500
     *             "Error de base de datos: ...".
     *
     * @testdox [eliminar_vacante.php] Comprueba que sin conexión a la BD responde 500
     */
    #[TestDox('[eliminar_vacante.php] Comprueba que sin conexión a la BD responde 500')]
    public function test_eliminar_sin_bd(): void
    {
        [$codigo, $r] = $this->llamar('eliminar_vacante.php',
            ['cookies' => self::SESION_COORDINADOR, 'datos' => ['Id_vacante' => 1], 'sinBD' => true]);

        $this->assertSame(500, $codigo);
        $this->assertFalse($r['success']);
        $this->assertStringStartsWith('Error de base de datos: ', $r['mensaje']);
    }
}