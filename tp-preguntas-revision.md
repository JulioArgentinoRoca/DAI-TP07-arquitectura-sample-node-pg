# Preguntas sobre el TP — De server-noob a arquitectura en capas

Las siguientes preguntas evalúan la comprensión del recorrido completo del proyecto: desde `server-noob.js` (V1), pasando por `server-noob-mejorada.js` (V2), hasta `server.js` con capas (V3) y la clase `DbPg` (V4).

---

### V1 — server-noob.js

**1.** En `server-noob.js`, cada endpoint crea un `new Client(config)`, hace `await client.connect()`, ejecuta la query, y en el `finally` hace `await client.end()`. Explicá con tus palabras qué problema de performance tiene este enfoque cuando la API recibe muchos requests simultáneos.

Cada request abre una conexión nueva a PostgreSQL, hace la autenticación, ejecuta la query, y destruye la conexión. Ese ciclo cuesta entre 20 y 100ms extra por request, más allá del tiempo de la query en sí. Si la API recibe 100 requests simultáneos, se intentan abrir 100 conexiones al mismo tiempo. PostgreSQL tiene un límite de conexiones que por defecto son 100, así que bajo carga real el servidor se queda sin conexiones disponibles y empieza a rechazar requests. El problema no es el tiempo de una sola operación, sino que no escala: a mayor tráfico, peor se pone.

**2.** ¿Qué pasa si PostgreSQL está apagado y un request llega a `server-noob.js`? El `client.connect()` falla, y después se ejecuta el `finally` con `await client.end()`. ¿Qué error puede ocurrir y por qué?

Si PostgreSQL está apagado, client.connect() lanza una excepción que va al catch. Pero el finally se ejecuta siempre, con o sin error. Entonces se llama client.end() sobre un cliente que nunca llegó a conectarse, eso genera otro error. Este error ocurre porque el finally no tiene su propio try/catch.

**3.** En `server-noob.js`, si un compañero te dice "el endpoint de crear alumno tiene un bug", tenés que buscarlo en un archivo de ~215 líneas. ¿Por qué esto se vuelve un problema más grave a medida que la aplicación crece? Mencioná también qué pasa con Git cuando dos personas trabajan en el mismo archivo.

Si se agregan más entidades como materias, calificaciones, grupos, etc... el archivo crece exponencialmente. Encontrar el endpoint de crear alumno en ese contexto requiere buscar manualmente, y cualquier modificación implica revisar un archivo gigante donde cualquier cosa puede romperse.
En Git el problema seria que si dos personas trabajan en el mismo archivo al mismo tiempo, ambas ramas modifican las mismas líneas del mismo archivo. Al mergear, Git no puede resolver automáticamente el conflicto y hay que resolverlo a mano. Con archivos separados por recurso, cada persona toca un archivo distinto y los merges son limpios.

**4.** Las queries en `server-noob.js` usan parámetros posicionales (`$1`, `$2`, etc.) en vez de concatenar strings. ¿Qué vulnerabilidad se previene con esto y por qué es importante?

Lo que previene esto es que hackers hagan inyecciones de SQL, que es basicamente mandar queries como parametros que se ejecutan sobre la DB

---

### V2 — server-noob-mejorada.js

**5.** En la versión mejorada se reemplazó `Client` por `Pool`. Explicá la diferencia entre ambos: ¿cómo maneja las conexiones cada uno? ¿Cuándo conviene usar `Client` y cuándo `Pool`?

Client representa una conexión única. Cada request crea su propia conexión desde cero.
Pool mantiene un conjunto de conexiones ya abiertas. Cuando llega un request, toma una conexión libre del pool, ejecuta la query, y la devuelve al pool para que la use el próximo request.
Usar Client tiene sentido en scripts que corren una sola vez y terminan. Para un servidor que está corriendo continuamente y recibe múltiples requests, siempre es mejor usar Pool.

**6.** ¿Qué es un `Router` de Express y qué problema resuelve en esta versión? ¿Por qué las rutas dentro del router no incluyen `/api/alumnos` y solo definen `''` o `'/:id'`?

Un Router es un mini-servidor Express que puede definir sus propios endpoints y middlewares, y después conectarse al servidor principal con app.use(). Resuelve el problema de tener todo en un solo archivo. Cada recurso tiene su propio archivo de rutas.
Las rutas dentro del router no incluyen /api/alumnos porque esa parte ya la define el servidor principal cuando hace app.use("/api/alumnos", AlumnosRouter). Express concatena automáticamente el prefijo con las rutas del router.

**7.** En `server-noob-mejorada.js`, el archivo principal tiene solo ~26 líneas. ¿Qué responsabilidad tiene ese archivo ahora? ¿Dónde está la lógica de los endpoints?

El archivo server-noob-mejorada.js solo tiene responsabilidades de arranque y configuración: crea la app Express, agrega los middlewares, registra los routers con sus prefijos, y llama a app.listen(). No contiene ninguna lógica de SQL ni las de negocio.
La lógica de los endpoints vive en router/alumnos-router-noob.js y router/cursos-router-noob.js.

**8.** En la versión mejorada desaparece el bloque `finally`. ¿Por qué ya no es necesario cerrar la conexión manualmente al usar `Pool`?

Con Pool, el desarrollador nunca llama a connect() ni a end() manualmente. Cuando se hace pool.query(sql), el pool internamente toma una conexión disponible, ejecuta la query, y la devuelve al pool solo. Si la query falla, el pool devuelve la conexión igual. No hay nada que cerrar desde afuera, así que el finally no tiene sentido que este.

---

### V3 — server.js (arquitectura en capas)

**9.** Nombrá las tres capas de la arquitectura y explicá con tus palabras qué responsabilidad tiene cada una. ¿Cuál conoce los `req` y `res` de Express? ¿Cuál conoce el SQL? ¿Cuál tiene las reglas de negocio?

Controller: es el único que conoce req y res de Express. Recibe el request HTTP, extrae los datos (req.params, req.body), llama al service correspondiente, y responde con el status code adecuado.
Service: contiene las reglas de negocio. Valida datos, aplica cálculos, coordina con otros services.
Repository: es el único que conoce el SQL y la base de datos. Ejecuta queries contra PostgreSQL y devuelve los resultados.

**10.** En `alumnos-service.js`, la edad del alumno se calcula en el service con una función JavaScript, en vez de calcularla en la query SQL. ¿Por qué se eligió calcularla en el service y no en la base de datos?

Podría calcularse en SQL, pero eso mezcla lógica de negocio dentro de la query. Si mañana la regla cambia, hay que modificar el SQL del repository en lugar de cambiar una función en JavaScript.
Además, la edad calculada en JavaScript se puede probar en forma aislada, sin necesidad de una base de datos. El service también puede agregar la edad a cualquier alumno que venga de cualquier fuente, no solo de una query SQL específica.

**11.** Cuando se crea un alumno con un `id_curso` que no existe, `AlumnosService` llama a `CursosService` para verificarlo. ¿Por qué llama al service de cursos y no directamente al repository de cursos?

Si AlumnosService llamara directamente a CursosRepository, estaría saltando una capa y accediendo a los datos de cursos sin pasar por la lógica de negocio de cursos. Si mañana CursosService agrega alguna regla, esa regla no se aplicaría en la validación de alumnos.
Llamando a CursosService.getByIdAsync(), se respeta la encapsulación: cualquier regla que tenga el service de cursos se aplica automáticamente. La arquitectura en capas implica que cada capa solo habla con su capa adyacente hacia abajo.

**12.** ¿Para qué sirve el archivo `.env` y la librería `dotenv`? ¿Qué problema de las versiones anteriores resuelve? ¿Por qué el archivo `.env` no se sube al repositorio de Git?

El archivo .env almacena variables de entorno: credenciales de la base de datos, puerto del servidor, configuración de logs. La librería dotenv carga esas variables al process.env de Node cuando arranca la aplicación.
Resuelve dos problemas de las versiones anteriores: las credenciales estaban hardcodeadas en db-config.js, y el puerto estaba fijo en 3000.
El .env no se sube a Git porque contiene información sensible que no debería estar en un repositorio, especialmente si es público. En su lugar, se sube un .env-template con los nombres de las variables pero sin valores reales, para que cada desarrollador sepa qué variables configurar localmente.

**13.** ¿Qué hace `LogHelper` y por qué es mejor que usar `console.log(error)` suelto en cada lugar del código?

LogHelper centraliza el comportamiento de logging. Según la configuración del .env, puede escribir los errores en un archivo de log con timestamp, mostrarlos en consola, ambas cosas, o ninguna. Además formatea el error con nombre, mensaje y stack trace completo.
Con console.log(error) suelto en cada lugar del código, si hay que cambiar cómo se loguean los errores, hay que buscar y modificar cada console.log en todos los archivos. Con LogHelper, ese cambio se hace en un solo lugar y afecta a todo el sistema. También aplica el principio DRY: la lógica de logging no se repite.

---

### V4 — DbPg y DbMssql

**14.** Mirá `alumnos-repository.js` (versión original) y `alumnos-repository-new.js` (versión refactorizada). ¿Qué código repetido (boilerplate) se eliminó al extraer la clase `DbPg`? Mencioná al menos 3 cosas que ya no aparecen en el repository nuevo.

Los tres imports de infraestructura: import pkg from 'pg', import config from ..., import LogHelper from ... y la línea const { Pool } = pkg
El campo this.DBPool = null en el constructor y el método completo getDBPool() con su lógica de lazy initialization
El bloque try { ... } catch (error) { LogHelper.logError(error); } que rodeaba cada query
El acceso manual a .rows, .rows[0], .rows[0].id y .rowCount para extraer el dato relevante del resultado de pg

**15.** La clase `DbPg` tiene 4 métodos: `queryAll`, `queryOne`, `queryReturnId` y `queryRowCount`. ¿Qué devuelve cada uno y en qué tipo de operación SQL se usa cada uno?

queryAll(sql, values?): devuelve resultPg.rows. Se usa en operaciones SELECT que devuelven múltiples registros, como SELECT * FROM alumnos.
queryOne(sql, values?): devuelve resultPg.rows[0]. Se usa en SELECT filtrados por ID que devuelven un solo registro, como SELECT * FROM alumnos WHERE id=$1.
queryReturnId(sql, values?): devuelve resultPg.rows[0].id. Se usa en INSERT con la cláusula RETURNING id, para obtener el ID autogenerado del registro recién creado.
queryRowCount(sql, values?): devuelve resultPg.rowCount. Se usa en UPDATE y DELETE, donde lo que interesa saber es cuántas filas fueron afectadas por la operación.


**16.** En los repositories nuevos, la clase se importa como `import Db from './db-pg.js'` (con el nombre `Db`, no `DbPg`). ¿Por qué se usa ese nombre genérico? ¿Qué pasa si mañana querés cambiar de PostgreSQL a SQL Server — cuántas líneas del repository tenés que modificar?

El repository usa el nombre Db porque así el código del repository no depende del nombre de la implementación concreta. Todos los métodos se llaman como this.db.queryAll(...), this.db.queryOne(...), etc.
Para cambiar de PostgreSQL a SQL Server, se modifica una sola línea en cada repository:

import Db from './db-pg.js';   --->   import Db from './db-mssql.js';

---

### "¿Dónde lo pondrías?" — Situaciones prácticas

En cada situación, indicá en qué capa lo pondrías (controller, service o repository) y explicá por qué.

**17.** Necesitás agregar un nuevo endpoint `GET /api/alumnos/curso/:idCurso` que devuelva todos los alumnos de un curso. La query sería `SELECT * FROM alumnos WHERE id_curso = $1`. ¿Dónde pondrías esa query? ¿Dónde pondrías la ruta del endpoint? ¿Agregarías algo en el service?

La query SELECT * FROM alumnos WHERE id_curso = $1 va en el repository alumnos-repository.js, en un método nuevo llamado por ejemplo getByCursoAsync(idCurso).
La ruta GET /api/alumnos/curso/:idCurso va en el controller alumnos-controller.js, que extrae req.params.idCurso y llama a currentService.getByCursoAsync(idCurso).
En el service se podría agregar la misma lógica de calcular la edad que ya existe en getAllAsync: mapear los resultados con agregarEdad(). Si el endpoint también debe devolver la edad de cada alumno, esa transformación va en el service. Si no es necesario, el service sería un pass-through al repository.

**18.** El cliente pide que al crear un alumno, si no se manda `fecha_nacimiento`, el sistema ponga la fecha de hoy por defecto. ¿En qué capa pondrías esa lógica y por qué? ¿Es una regla de negocio o es algo de la base de datos?

Esta lógica va en el service, antes de llamar al repository.

jscreateAsync = async (entity) => {
    if (!entity.fecha_nacimiento) {
        entity.fecha_nacimiento = new Date().toISOString().split('T')[0];
    }
    await this.validarCursoExiste(entity.id_curso);
    return await this.AlumnosRepository.createAsync(entity);
}

**19.** Necesitás que al eliminar un curso, se verifique primero que no tenga alumnos asociados, y si tiene, devolver un error `400` con el mensaje "No se puede eliminar el curso porque tiene alumnos asociados". ¿Dónde pondrías la verificación (la consulta de si tiene alumnos)? ¿Dónde pondrías el `throw new Error(...)`? ¿Y dónde se atraparía ese error para devolver el `400`?


La consulta de si el curso tiene alumnos (SELECT COUNT(*) FROM alumnos WHERE id_curso = $1) va en el repository de alumnos, en un método como countByCursoAsync(idCurso). Es SQL puro.
El throw new Error("No se puede eliminar el curso porque tiene alumnos asociados") va en el service de cursos (cursos-service.js), en el método deleteByIdAsync, después de consultar al repository de alumnos. Es una regla de negocio.
El catch que convierte ese error en una respuesta 400 Bad Request va en el controller de cursos. El controller atrapa el error del service y decide qué status code enviar


**20.** Te piden agregar un endpoint que devuelva un resumen por curso: nombre del curso, cantidad de alumnos, y el promedio de edad de esos alumnos. ¿Qué parte resolvés con SQL (en el repository) y qué parte resolvés con lógica (en el service)? ¿O se puede resolver todo en una sola capa?

El nombre del curso y la cantidad de alumnos se resuelven en el repository con SQL, usando un JOIN y un GROUP BY:

SELECT c.id, c.nombre, COUNT(a.id) AS cantidad_alumnos
FROM cursos c
LEFT JOIN alumnos a ON a.id_curso = c.id
GROUP BY c.id, c.nombre

El promedio de edad no se puede resolver limpiamente en SQL de la misma manera que se calcula en el service. Lo correcto es traer las fechas de nacimiento desde la base de datos y calcular el promedio en el service, reutilizando la misma función.