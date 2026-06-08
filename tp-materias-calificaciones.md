# TP: Materias y Calificaciones

## Objetivo

Agregar dos nuevas entidades al proyecto existente: **Materias** y **Calificaciones**. Deben seguir la misma arquitectura en capas (controller → service → repository) que ya tienen `alumnos` y `cursos`.

Al terminar, la API va a permitir:
- Hacer CRUD de materias.
- Cargar calificaciones de alumnos en materias, con validaciones de negocio.
- Consultar calificaciones con datos del alumno y la materia (JOIN).

---

## 1. Base de datos

### Nuevas tablas

Agregar las siguientes tablas ejecutando el script en pgAdmin o cualquier cliente de PostgreSQL.

```sql
-- Tabla materias
CREATE TABLE materias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(75) NOT NULL
);

-- Tabla calificaciones
-- Cada alumno tiene UNA sola calificación por materia (no se puede repetir la combinación alumno+materia).
CREATE TABLE calificaciones (
    id SERIAL PRIMARY KEY,
    id_alumno INT NOT NULL REFERENCES alumnos(id),
    id_materia INT NOT NULL REFERENCES materias(id),
    nota INT NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    UNIQUE(id_alumno, id_materia)
);
```

### Datos de prueba

Insertar algunas materias para poder probar:

```sql
INSERT INTO materias (nombre) VALUES ('Matemática');
INSERT INTO materias (nombre) VALUES ('Lengua');
INSERT INTO materias (nombre) VALUES ('Historia');
INSERT INTO materias (nombre) VALUES ('Programación');
INSERT INTO materias (nombre) VALUES ('Base de Datos');
```

> No hace falta insertar calificaciones de prueba — van a crearlas desde la API con POST.

---

## 2. Archivos a crear

Siguiendo la estructura del proyecto, crear estos archivos:

| Capa | Archivo | Responsabilidad |
|------|---------|-----------------|
| Entity | `src/entities/materia.js` | Clase `Materia` | 
| Entity | `src/entities/calificacion.js` | Clase `Calificacion` | 
| Repository | `src/repositories/materias-repository.js` | SQL contra la tabla `materias` | 
| Repository | `src/repositories/calificaciones-repository.js` | SQL contra la tabla `calificaciones` (incluye JOINs) |
| Service | `src/services/materias-service.js` | Lógica de negocio de materias |
| Service | `src/services/calificaciones-service.js` | Lógica de negocio de calificaciones (validaciones) |
| Controller | `src/controllers/materias-controller.js` | Endpoints de `/api/materias` |
| Controller | `src/controllers/calificaciones-controller.js` | Endpoints de `/api/calificaciones` |

### Registrar en server.js

Agregar los dos nuevos controllers en `src/server.js`, igual que ya están alumnos y cursos:

```js
import MateriasController       from "./controllers/materias-controller.js"
import CalificacionesController from "./controllers/calificaciones-controller.js"

// ... junto con los app.use existentes:
app.use("/api/materias",        MateriasController);
app.use("/api/calificaciones",  CalificacionesController);
```

---

## 3. Endpoints de Materias

Materias es un CRUD simple, muy similar a cursos. Usar como referencia `cursos-controller.js`, `cursos-service.js` y `cursos-repository.js`.

---

### GET /api/materias

Devuelve todas las materias.

| | |
|---|---|
| **Método** | GET |
| **URL** | `http://localhost:3000/api/materias` |
| **Body** | — (no tiene) |
| **Validaciones** | Ninguna |

**Respuesta exitosa** — `200 OK`:
```json
[
    { "id": 1, "nombre": "Matemática" },
    { "id": 2, "nombre": "Lengua" },
    { "id": 3, "nombre": "Historia" }
]
```

**Base de datos**: ejecuta `SELECT * FROM materias`.

---

### GET /api/materias/:id

Devuelve una materia por su ID.

| | |
|---|---|
| **Método** | GET |
| **URL** | `http://localhost:3000/api/materias/1` |
| **Parámetro de ruta** | `id` — ID de la materia |
| **Body** | — (no tiene) |

**Respuesta exitosa** — `200 OK`:
```json
{ "id": 1, "nombre": "Matemática" }
```

**Si no existe** — `404 Not Found`:
```
No se encontró la materia (id: 99).
```

**Base de datos**: ejecuta `SELECT * FROM materias WHERE id = $1`.

---

### POST /api/materias

Crea una nueva materia.

| | |
|---|---|
| **Método** | POST |
| **URL** | `http://localhost:3000/api/materias` |
| **Body** | JSON (ver ejemplo abajo) |

**Body en Postman**:
```json
{
    "nombre": "Educación Física"
}
```

**Validaciones en el service**:

| Validación | Status code | Mensaje de error |
|---|---|---|
| `nombre` es obligatorio y no puede estar vacío | `400 Bad Request` | `El nombre de la materia es obligatorio.` |

**Respuesta exitosa** — `201 Created`:
```json
6
```
> Devuelve el `id` de la materia creada.

**Base de datos**: ejecuta un `INSERT INTO materias (nombre) VALUES ($1) RETURNING id`.

---

### PUT /api/materias/:id

Modifica una materia existente.

| | |
|---|---|
| **Método** | PUT |
| **URL** | `http://localhost:3000/api/materias/1` |
| **Parámetro de ruta** | `id` — ID de la materia a modificar |
| **Body** | JSON (ver ejemplo abajo) |

**Body en Postman**:
```json
{
    "nombre": "Matemática Avanzada"
}
```

**Respuestas**:

| Caso | Status code | Respuesta |
|---|---|---|
| Se modificó correctamente | `200 OK` | `1` (rowsAffected) |
| No existe la materia | `404 Not Found` | `No se encontró la materia (id: 99).` |

**Base de datos**: ejecuta un `UPDATE materias SET nombre = $2 WHERE id = $1`.

---

### DELETE /api/materias/:id

Elimina una materia por su ID.

| | |
|---|---|
| **Método** | DELETE |
| **URL** | `http://localhost:3000/api/materias/1` |
| **Parámetro de ruta** | `id` — ID de la materia a eliminar |
| **Body** | — (no tiene) |

**Respuestas**:

| Caso | Status code |
|---|---|
| Se eliminó correctamente | `200 OK` |
| No existe la materia | `404 Not Found` |

> **Atención**: si la materia tiene calificaciones cargadas, PostgreSQL va a devolver un error de FK. Eso está bien — la base de datos protege la integridad de los datos. El error se puede atrapar y devolver un `400 Bad Request` con un mensaje como `No se puede eliminar la materia porque tiene calificaciones asociadas.`

**Base de datos**: ejecuta `DELETE FROM materias WHERE id = $1`.

---

## 4. Endpoints de Calificaciones

Esta es la parte principal del TP. Los endpoints de calificaciones tienen **validaciones de negocio** que van en el **service** (no en el controller ni en el repository).

---

### GET /api/calificaciones

Devuelve todas las calificaciones **con el nombre del alumno y el nombre de la materia** (no solo los IDs).

| | |
|---|---|
| **Método** | GET |
| **URL** | `http://localhost:3000/api/calificaciones` |
| **Body** | — (no tiene) |

**Respuesta exitosa** — `200 OK`:
```json
[
    {
        "id": 1,
        "id_alumno": 1,
        "nombre_alumno": "Juan",
        "apellido_alumno": "Pérez",
        "id_materia": 4,
        "nombre_materia": "Programación",
        "nota": 8,
        "fecha": "2026-05-11"
    },
    {
        "id": 2,
        "id_alumno": 1,
        "nombre_alumno": "Juan",
        "apellido_alumno": "Pérez",
        "id_materia": 5,
        "nombre_materia": "Base de Datos",
        "nota": 9,
        "fecha": "2026-05-11"
    }
]
```

> Acá necesitan un **JOIN** de 3 tablas: `calificaciones`, `alumnos` y `materias`.

**Base de datos**: la query tiene que hacer JOIN entre `calificaciones`, `alumnos` y `materias` para traer los nombres además de los IDs.

---

### GET /api/calificaciones/:id

Devuelve una calificación por su ID, **con los nombres** (misma query con JOIN que el GET de todos, pero filtrada por `calificaciones.id`).

| | |
|---|---|
| **Método** | GET |
| **URL** | `http://localhost:3000/api/calificaciones/1` |
| **Parámetro de ruta** | `id` — ID de la calificación |

**Respuesta exitosa** — `200 OK`:
```json
{
    "id": 1,
    "id_alumno": 1,
    "nombre_alumno": "Juan",
    "apellido_alumno": "Pérez",
    "id_materia": 4,
    "nombre_materia": "Programación",
    "nota": 8,
    "fecha": "2026-05-11"
}
```

**Si no existe** — `404 Not Found`:
```
No se encontró la calificación (id: 99).
```

---

### GET /api/calificaciones/alumno/:idAlumno

Devuelve **todas las calificaciones de un alumno específico**, con el nombre de la materia.

| | |
|---|---|
| **Método** | GET |
| **URL** | `http://localhost:3000/api/calificaciones/alumno/1` |
| **Parámetro de ruta** | `idAlumno` — ID del alumno |

**Validaciones en el service**:

| Validación | Status code | Mensaje de error |
|---|---|---|
| El alumno debe existir | `404 Not Found` | `El alumno con id 99 no existe.` |

> Para validar que el alumno existe, **reutilizar** `AlumnosService` (igual que ya se hace en `alumnos-service.js` con `CursosService`).

**Respuesta exitosa** — `200 OK`:
```json
[
    {
        "id": 1,
        "id_materia": 4,
        "nombre_materia": "Programación",
        "nota": 8,
        "fecha": "2026-05-11"
    },
    {
        "id": 2,
        "id_materia": 5,
        "nombre_materia": "Base de Datos",
        "nota": 9,
        "fecha": "2026-05-11"
    }
]
```

> La query hace JOIN entre `calificaciones` y `materias`, filtrada por `id_alumno`.

**Si el alumno no tiene calificaciones** — `200 OK` con array vacío:
```json
[]
```

---

### POST /api/calificaciones

Crea una nueva calificación. **Este es el endpoint con más validaciones del TP.**

| | |
|---|---|
| **Método** | POST |
| **URL** | `http://localhost:3000/api/calificaciones` |
| **Body** | JSON (ver ejemplo abajo) |

**Body en Postman**:
```json
{
    "id_alumno": 1,
    "id_materia": 4,
    "nota": 8
}
```

> El campo `fecha` es opcional. Si no se envía, la base de datos usa la fecha actual (`CURRENT_DATE`).

**Validaciones en el service** (en este orden):

| # | Validación | Status code | Mensaje de error |
|---|---|---|---|
| 1 | `nota` es obligatoria y debe ser un número entero entre 0 y 10 | `400 Bad Request` | `La nota debe ser un número entero entre 0 y 10.` |
| 2 | `id_alumno` es obligatorio y el alumno debe existir en la base de datos | `400 Bad Request` | `El alumno con id 99 no existe.` |
| 3 | `id_materia` es obligatorio y la materia debe existir en la base de datos | `400 Bad Request` | `La materia con id 99 no existe.` |
| 4 | No debe existir ya una calificación para ese alumno en esa materia | `409 Conflict` | `Ya existe una calificación para el alumno 1 en la materia 4.` |

> **Importante**: la validación #4 usa el status code **409 (Conflict)**, no 400. Esto indica que el recurso que se quiere crear **entra en conflicto** con uno que ya existe. Importar `StatusCodes.CONFLICT` de `http-status-codes`.

> **Importante**: las validaciones #2 y #3 requieren **reutilizar los services existentes** (`AlumnosService` y `MateriasService`). Mirar cómo `AlumnosService` ya usa `CursosService` para validar que un curso exista — hacer lo mismo acá.

> **Importante**: la validación #4 requiere que el **repository** tenga un método para buscar si ya existe una calificación para esa combinación de alumno y materia (query con `WHERE id_alumno = $1 AND id_materia = $2`).

**Respuesta exitosa** — `201 Created`:
```json
{
    "id": 1,
    "id_alumno": 1,
    "id_materia": 4,
    "nota": 8,
    "fecha": "2026-05-11"
}
```

**Ejemplo de error por duplicado** — `409 Conflict`:
```json
{
    "error": "Ya existe una calificación para el alumno 1 en la materia 4."
}
```

**Ejemplo de error por nota inválida** — `400 Bad Request`:
```json
{
    "error": "La nota debe ser un número entero entre 0 y 10."
}
```

**Base de datos**: ejecuta `INSERT INTO calificaciones (id_alumno, id_materia, nota, fecha) VALUES ($1, $2, $3, $4) RETURNING *`.

---

### PUT /api/calificaciones/:id

Modifica una calificación existente. Solo se puede cambiar la `nota` y/o la `fecha`.

| | |
|---|---|
| **Método** | PUT |
| **URL** | `http://localhost:3000/api/calificaciones/1` |
| **Parámetro de ruta** | `id` — ID de la calificación a modificar |
| **Body** | JSON (ver ejemplo abajo) |

**Body en Postman**:
```json
{
    "nota": 9
}
```

> **No se permite cambiar** `id_alumno` ni `id_materia` en el PUT. Si el body trae esos campos, ignorarlos. Solo se actualiza `nota` y `fecha`.

**Validaciones en el service**:

| # | Validación | Status code | Mensaje de error |
|---|---|---|---|
| 1 | La calificación debe existir | `404 Not Found` | `No se encontró la calificación (id: 99).` |
| 2 | Si se envía `nota`, debe ser un número entero entre 0 y 10 | `400 Bad Request` | `La nota debe ser un número entero entre 0 y 10.` |

**Respuesta exitosa** — `200 OK`:
```json
1
```
> Devuelve la cantidad de filas afectadas.

**Base de datos**: ejecuta `UPDATE calificaciones SET nota = $2, fecha = $3 WHERE id = $1`.

---

### DELETE /api/calificaciones/:id

Elimina una calificación por su ID.

| | |
|---|---|
| **Método** | DELETE |
| **URL** | `http://localhost:3000/api/calificaciones/1` |
| **Parámetro de ruta** | `id` — ID de la calificación a eliminar |
| **Body** | — (no tiene) |

**Respuestas**:

| Caso | Status code |
|---|---|
| Se eliminó correctamente | `200 OK` |
| No existe la calificación | `404 Not Found` |

**Base de datos**: ejecuta `DELETE FROM calificaciones WHERE id = $1`.

---

## 5. Resumen de status codes

| Status code | Cuándo se usa |
|---|---|
| `200 OK` | GET exitoso, PUT exitoso, DELETE exitoso |
| `201 Created` | POST exitoso (se creó el recurso) |
| `400 Bad Request` | Datos inválidos (nota fuera de rango, campos faltantes, alumno o materia no existe) |
| `404 Not Found` | El recurso que se busca no existe (GET/PUT/DELETE por ID) |
| `409 Conflict` | Se intenta crear un recurso que ya existe (calificación duplicada) |
| `500 Internal Server Error` | Error inesperado del servidor |

---

## 6. Resumen de validaciones en el service

Las validaciones van en el **service**, no en el controller ni en el repository. El controller solo atrapa el error con `try/catch` y devuelve el status code.

### MateriasService

| Método | Validación |
|---|---|
| `createAsync` | `nombre` es obligatorio y no puede estar vacío |

### CalificacionesService

| Método | Validación |
|---|---|
| `createAsync` | `nota` entre 0 y 10 |
| `createAsync` | El alumno debe existir (usar `AlumnosService`) |
| `createAsync` | La materia debe existir (usar `MateriasService`) |
| `createAsync` | No debe existir calificación previa para ese alumno+materia |
| `updateAsync` | La calificación debe existir |
| `updateAsync` | Si se envía `nota`, debe estar entre 0 y 10 |
| `getByAlumnoAsync` | El alumno debe existir (usar `AlumnosService`) |

> **Pista**: cuando una validación falla, el service hace `throw new Error("mensaje")`. El controller lo atrapa con `catch` y responde con el status code que corresponda.

---

## 7. Dónde va cada cosa — Guía rápida

```
¿Es SQL?                          → va en el REPOSITORY
¿Es una regla / validación?       → va en el SERVICE
¿Es un req/res con status code?   → va en el CONTROLLER
```

| Ejemplo | Capa |
|---|---|
| `SELECT * FROM calificaciones JOIN alumnos ...` | Repository |
| `if (nota < 0 \|\| nota > 10) throw new Error(...)` | Service |
| `res.status(StatusCodes.CONFLICT).json(...)` | Controller |
| Verificar que el alumno exista llamando a AlumnosService | Service |
| `INSERT INTO calificaciones ... RETURNING *` | Repository |
| Decidir si responder 400, 404 o 409 | Controller |

---

## 8. Orden sugerido de implementación

1. **Crear las tablas** y los datos de prueba en PostgreSQL.
2. **Materias** completo (entity → repository → service → controller → registrar en server.js). Probar con Postman.
3. **Calificaciones entity y repository** — arrancar con el CRUD básico y el query con JOIN.
4. **CalificacionesService** — agregar las validaciones una por una. Probar cada validación con Postman antes de pasar a la siguiente.
5. **CalificacionesController** — conectar los endpoints. Probar todo junto.
6. **Endpoint GET por alumno** — agregar al final, ya que requiere JOIN y validación de alumno existente.
