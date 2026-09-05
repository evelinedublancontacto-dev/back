# Fases de construcción, tarea por tarea

Complementa a `PLAN.md`. Cada fase termina con un commit en este repositorio
(o en el del front, en F6) y con los criterios de terminado cumplidos. Las
decisiones ya tomadas: alcance completo (PocketBase se apaga al final),
Railway como hosting, Elysia como framework.

Convenciones para todo el código: TypeScript estricto, nombres en español
como en el front (`citas`, `servicios`, `clientes`), respuestas JSON con la
forma `{ datos }` en éxito y `{ error, codigo }` en fallo, fechas de agenda
como texto `AAAA-MM-DD` y `HH:MM` en hora de la Ciudad de México.

---

## F1 — Cimientos

**Objetivo:** un servidor Bun que arranca, se conecta a Postgres, corre
migraciones y tiene una prueba automatizada. Sin dominio todavía.

Tareas:

1. `bun init` con TypeScript. Scripts en `package.json`:
   `dev` (bun --watch), `start`, `test`, `lint`, `migrar`, `migrar:deshacer`,
   `migrar:crear`, `semillas`, `typecheck`.
2. Dependencias: `elysia`, `@elysiajs/cors`, `@elysiajs/swagger`,
   `sequelize`, `pg`, `umzug`, `zod` (validar variables de entorno).
   Desarrollo: `@types/pg`, `eslint`, `typescript-eslint`, `prettier`.
3. `docker-compose.yml` con Postgres 16, volumen persistente, puerto 5432,
   base `eveline`, usuario y contraseña de desarrollo.
4. `src/config.ts`: lee y valida `DATABASE_URL`, `PUERTO`, `ENTORNO`,
   `ORIGENES_PERMITIDOS`, `COOKIE_SECRETO`, `RESEND_API_KEY`,
   `CORREO_REMITENTE`, `CORREO_ADMIN`. Falla al arrancar si falta una en
   producción; en desarrollo avisa.
5. `src/db/sequelize.ts`: instancia única, `logging` solo en desarrollo,
   SSL cuando `ENTORNO=produccion`, zona horaria `+00:00` y tipos
   `DATE`/`TIME` leídos como texto (evita que `pg` convierta a `Date` y
   corra la fecha un día).
6. `src/db/migraciones/`: umzug con almacenamiento en tabla
   `migraciones_sequelize`. Migración `0001-extensiones`: `pgcrypto` para
   `gen_random_uuid()`.
7. `src/app.ts`: Elysia con cors (lista de orígenes desde config,
   `credentials: true`), swagger en `/docs`, manejador global de errores que
   nunca filtra stack en producción, `GET /salud` que responde
   `{ estado: "ok", bd: "ok" | "sin_conexion", version }`.
8. `src/index.ts`: corre migraciones pendientes al arrancar (configurable
   con `MIGRAR_AL_ARRANCAR`), luego escucha.
9. `tests/salud.test.ts` con `bun test`: levanta la app en memoria y
   comprueba `/salud`.
10. `Dockerfile` multi-etapa (imagen `oven/bun`), `railway.json` con
    comando de arranque y `healthcheckPath: /salud`.
11. `.env.example`, `.gitignore`, `README.md` con cómo levantar en local
    en tres comandos.

Terminado cuando: `docker compose up -d && bun run migrar && bun dev`
responde en `/salud` con `bd: ok`; `bun test` pasa; `bun run typecheck`
limpio.

---

## F2 — Agenda

**Objetivo:** reservar una cita desde el público con la misma experiencia
que hoy, pero sin doble reserva, con reglas configurables y con correo de
confirmación.

Migraciones:

- `0002-servicios`: tabla con `id` (slug texto), `titulo`, `descripcion`,
  `duracion_min`, `precio numeric(10,2)`, `activo`, `orden`, `reglas jsonb`.
- `0003-horarios`: `dia_semana` 0-6, `hora_inicio`, `hora_fin`, `activo`.
- `0004-bloqueos`: `fecha`, `hora_inicio` y `hora_fin` opcionales, `motivo`.
- `0005-clientes`: `nombre`, `correo`, `telefono`, `notas`; índice por
  correo.
- `0006-citas`: `cliente_id`, `servicio_id`, `fecha date`, `hora time`,
  `estado` enum (`pendiente`, `confirmada`, `cancelada`, `completada`),
  `notas`, `origen`; **índice único parcial** sobre `(fecha, hora)` donde
  `estado in ('pendiente','confirmada')`.

Semillas (`bun run semillas`, idempotentes):

- Servicios desde `services.json` del front (los 6 actuales), con
  `reglas: { dias_permitidos: [5], modalidad: "presencial" }` para
  `cuencos-tibetanos`.
- Horarios: lunes a viernes 09:00-17:00, que es lo que hoy está en código.

Modelos Sequelize: `Servicio`, `Horario`, `Bloqueo`, `Cliente`, `Cita`,
con asociaciones y `underscored: true`.

Módulos y rutas:

- `servicios`: `GET /v1/servicios` devuelve activos ordenados, con la misma
  forma que hoy espera `useServicios` (`id, titulo, descripcion, duracion,
  precio`).
- `disponibilidad`: `GET /v1/disponibilidad?fecha=&servicio=`. Lógica en
  `src/servicios/agenda.ts`, pura y testeable: día de la semana en CDMX,
  horarios activos, bloques de 60 min, quita bloqueos y citas ocupadas,
  aplica `reglas.dias_permitidos`. Responde `{ slots, disponible, fecha,
  mensaje? }`, compatible con el front actual.
- `citas`: `POST /v1/citas` valida con TypeBox (`nombre, email, telefono,
  servicio, fecha, hora, notas?`), rechaza fechas pasadas y fuera de
  disponibilidad, busca o crea el cliente por correo, inserta la cita en
  `pendiente`. Si el índice único salta, responde 409
  `{ codigo: "horario_ocupado" }`. Rate limit: 5 reservas por IP cada 10
  minutos. Campo trampa `sitioWeb`.
- `src/servicios/correo.ts`: Resend por HTTP. Al reservar manda dos correos:
  confirmación al cliente y aviso a `CORREO_ADMIN`. Si Resend no está
  configurado, registra en consola y la reserva sigue.

Pruebas:

- `agenda.test.ts`: casos de bloques, viernes para cuencos, bloqueo de día,
  hora ocupada.
- `citas.test.ts`: reserva válida; **20 peticiones concurrentes al mismo
  horario, exactamente una entra**; fecha pasada rechazada.

Terminado cuando: las pruebas pasan; con el front local apuntando al back,
el flujo de 4 pasos reserva y llega el correo.

---

## F3 — Autenticación y administración

**Objetivo:** el admin entra con correo y contraseña, y todo lo que hoy hace
contra PocketBase lo hace contra el back con sesión obligatoria.

Migraciones:

- `0007-usuarios`: `correo unique`, `hash`, `nombre`, `rol` (`admin`),
  `activo`.
- `0008-sesiones`: `usuario_id`, `token_hash`, `expira_en`, `ip`,
  `user_agent`. Índice por `token_hash`.
- `0009-bitacora`: `actor_id?`, `accion`, `entidad`, `entidad_id`,
  `antes jsonb`, `despues jsonb`. Trigger que impide `UPDATE` y `DELETE`.

Auth:

- Contraseñas con `Bun.password.hash` (argon2id) y `Bun.password.verify`.
- Sesión: token aleatorio de 32 bytes; en BD se guarda su hash; al
  navegador va en cookie `sesion`, `httpOnly`, `Secure` en producción,
  `SameSite=Lax`, 7 días, renovable.
- `POST /v1/auth/entrar` con rate limit (5 intentos por IP y correo cada 15
  min), `POST /v1/auth/salir` borra la sesión, `GET /v1/auth/yo`.
- Middleware `sesion` (carga usuario si hay cookie válida) y
  `requiereAdmin` (401 si no hay sesión, 403 si no es admin).
- Semilla `bun run semillas:admin -- correo contraseña` para crear el primer
  administrador. Nunca contraseña por defecto.

Admin (todo bajo `/v1/admin`, todo con `requiereAdmin`, todo escribe en
bitácora):

- `citas`: `GET` con filtros `estado`, `desde`, `hasta`, paginado;
  `POST` (crear a mano), `PATCH /:id` (estado y datos), `DELETE /:id`.
- `servicios`, `horarios`, `bloqueos`, `clientes`: CRUD.
- `GET /v1/admin/bitacora` paginado.

Pruebas: login correcto e incorrecto; rate limit de login; 401 sin cookie
en cada ruta admin; bitácora registra un cambio de estado.

Terminado cuando: recorriendo todas las rutas de `/v1/admin` sin cookie se
obtiene 401; con cookie de admin, el panel actual puede hacer lo mismo que
hoy.

---

## F4 — Blog

Migración `0010-posts`: `titulo`, `slug unique`, `extracto`, `contenido`,
`imagen_url`, `categoria`, `publicado`, `publicado_en`.

Rutas: `GET /v1/posts` (publicados, orden por `publicado_en` desc, paginado)
y `GET /v1/posts/:slug`; admin CRUD en `/v1/admin/posts` con generación de
slug si falta y validación de unicidad.

Semilla: los 20 posts de `src/data/wordpressBlogPosts.json` del front, que
hoy son la mayoría del contenido. El único post que vive en PocketBase entra
en F5.

Terminado cuando: `/v1/posts` devuelve los 20 publicados y el admin puede
crear, editar, despublicar y borrar.

---

## F5 — Migración de datos desde PocketBase

Script `scripts/migrar-pocketbase.ts`, se corre una vez con credenciales de
superusuario de PocketBase (`PB_EMAIL`, `PB_PASSWORD`) y `DATABASE_URL`
destino:

1. Exporta `servicios`, `citas`, `posts`, `horarios_disponibles` y `users`
   a JSON en `exportaciones/` (respaldo, en `.gitignore`).
2. Importa servicios (por `id`), horarios, posts (por `slug`).
3. Importa citas: por cada una crea o reutiliza el cliente por correo; mapea
   `disponible` → `pendiente`. Si dos citas históricas chocan con el índice
   único, la segunda se importa como `cancelada` y se lista en el reporte.
4. `users` de PocketBase que sean clientes (no admin) van a `clientes`. Los
   administradores se crean a mano con `semillas:admin` porque los hashes
   no son portables.
5. Imprime un reporte de conteos origen y destino por tabla.

Terminado cuando: los conteos coinciden salvo los casos listados en el
reporte, y el script es re-ejecutable sin duplicar.

---

## F6 — Cambios en el front (rama `back-propio` en el repo front)

Archivo por archivo:

- `package.json`: quitar `pocketbase`. Agregar `NEXT_PUBLIC_API_URL` a
  `.env.example`.
- `src/lib/pocketbase.ts` → se borra. Nuevo `src/lib/api.ts`: `fetch` con
  `credentials: "include"`, base desde `NEXT_PUBLIC_API_URL`, helpers
  `obtener`, `enviar`, `actualizar`, `borrar`, manejo de `{ error, codigo }`.
- `src/contexts/AuthContext.tsx`: `login` llama a `/v1/auth/entrar`, al
  montar consulta `/v1/auth/yo`, `logout` a `/v1/auth/salir`.
- `middleware.ts` (nuevo, raíz): para `/admin/*`, si no hay cookie `sesion`
  redirige a `/login`. La validación real la hace el back en cada llamada.
- `app/admin/page.tsx` y `app/admin/citas/page.tsx`: cada
  `pb.collection(...)` y cada `fetch("/api/citas")` pasa a `api.*` contra
  `/v1/admin/*`. Etiqueta `disponible` → `pendiente`.
- `src/components/admin/*Dialog.tsx` (Cita, Cliente, Servicio, Post,
  DeletePost): reciben y envían con `api.*`; el diálogo de cliente deja de
  crear cuentas de acceso.
- `src/hooks/useAppointments.ts`, `AppointmentCalendar.tsx`,
  `AppointmentForm.tsx`: URLs a `/v1/servicios`, `/v1/disponibilidad`,
  `/v1/citas`. Mostrar el 409 `horario_ocupado` como "ese horario se acaba
  de ocupar, elige otro".
- `app/blog/page.tsx`, `app/blog/[slug]/page.tsx`, `src/lib/blogPosts.ts`:
  leen de `/v1/posts`; se retira la fusión con la semilla de WordPress
  porque ya vive en la base de datos.
- `app/api/citas`, `app/api/disponibilidad`, `app/api/servicios`: se borran.
- `app/login/page.tsx`: sin cambios funcionales; mensajes de error del back.
- `scripts/migrate-blog-to-pocketbase.mjs`: se borra.

Terminado cuando: `grep -r pocketbase` no devuelve nada; con el back local,
el flujo de reserva, el login y todo el admin funcionan; `next build` pasa.
Se abre un pull request en el repo front para revisarlo antes de fusionar.

---

## F7 — Despliegue y corte

1. Railway: en la cuenta de Evelin ya existe el proyecto `lucid-liberation`.
   Se decide en el momento si se reutiliza o se crea `eveline-back`. Se
   agrega Postgres administrado y un servicio desde este repositorio.
2. Variables de producción: `DATABASE_URL` (referencia al Postgres de
   Railway), `ENTORNO=produccion`, `ORIGENES_PERMITIDOS` con el dominio del
   front, `COOKIE_SECRETO`, `RESEND_API_KEY`, `CORREO_REMITENTE`,
   `CORREO_ADMIN`.
3. Migraciones en el arranque del servicio (ya previsto en F1), healthcheck
   en `/salud`.
4. Dominio `api.evelinedublan.com` apuntando a Railway; certificado
   automático. Si el front no queda bajo `evelinedublan.com`, cookie
   `SameSite=None; Secure`.
5. Correr `migrar-pocketbase.ts` contra la base de producción con PocketBase
   congelado (nadie edita en el admin durante la ventana).
6. Crear el administrador de producción con `semillas:admin`.
7. Desplegar el front con `NEXT_PUBLIC_API_URL=https://api.evelinedublan.com`.
8. Prueba de punta a punta en producción: reservar una cita real, recibir
   el correo, verla en el admin, cambiarle el estado.
9. Respaldos: Railway hace copias diarias del Postgres; se documenta cómo
   restaurar. PocketBase se deja encendido 30 días como respaldo y luego se
   apaga.

Terminado cuando: la reserva real de punta a punta funciona y el front en
producción no hace ninguna llamada a `pockethost.io`.

---

## Orden y dependencias

    F1 → F2 → F3 → F4 → F5 → F6 → F7

F4 puede ir en paralelo con F3. F6 puede empezar en cuanto F2 esté (la
parte pública) y terminar cuando F3 y F4 estén (admin y blog).
