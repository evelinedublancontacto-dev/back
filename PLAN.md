# Back de Eveline Dublan — Plan de construcción

Bun + Elysia + Sequelize + PostgreSQL. Sustituye a PocketBase como backend del
front (`evelinedublancontacto-dev/front`).

## 1. Punto de partida: qué hace hoy el front

Backend actual: PocketBase alojado en `eveline-dublan.pockethost.io`, consumido
desde el navegador y desde tres rutas API de Next.

Colecciones en uso: `users` (admin y "clientes" mezclados), `citas`,
`servicios`, `posts`, `horarios_disponibles` (opcional; hay horarios por
defecto en código: lunes a viernes de 9 a 17, bloques de 60 minutos).

Rutas API de Next:

| Ruta | Qué hace |
|---|---|
| `GET/POST/PATCH/DELETE /api/citas` | CRUD completo de citas contra PocketBase |
| `GET /api/disponibilidad?fecha&servicioId` | Genera bloques libres del día; cuencos tibetanos solo viernes |
| `GET /api/servicios` | Lee `src/data/services.json`, no PocketBase |

Flujos: reservar cita (público, 4 pasos: servicio, fecha, hora, datos), admin
(posts, servicios, clientes, citas), login (auth de PocketBase), blog
(PocketBase más semilla de WordPress), contacto (WhatsApp, sin servidor),
cursos, meditaciones y Luz de Luna (estáticos, sin servidor).

## 2. Problemas encontrados que el back debe resolver

1. **Seguridad.** Las rutas `/api/citas` (`GET`, `PATCH`, `DELETE`) no piden
   sesión. Hoy lo único que impide leer, alterar o borrar citas desde fuera
   son las reglas de PocketBase, que están cerradas a anónimos; pero esas
   mismas reglas rompen las llamadas del propio admin, que usa esas rutas
   sin autenticarse. El panel `/admin` solo se protege en el navegador.
2. **Doble fuente de servicios.** El público lee `services.json`; el admin
   edita la colección `servicios`. Lo que se cambia en el admin no llega a la
   página de reservas.
3. **Doble reserva posible.** Nada impide que dos personas tomen el mismo
   horario si envían a la vez: la comprobación es leer y luego escribir.
4. **Semántica confusa.** El estado `disponible` se usa como "pendiente de
   confirmar".
5. **Clientes son cuentas de acceso.** Crear un cliente crea un usuario con
   login.
6. **Sin confirmación.** Al reservar no sale correo ni aviso a nadie.
7. **Reglas en código.** La zona horaria (CDMX) y "cuencos solo viernes" están
   escritas en el front y en la ruta, no son configurables.

## 3. Decisiones (con recomendación)

| # | Decisión | Recomendación | Por qué |
|---|---|---|---|
| D1 | Alcance | **Decidido:** sustituir PocketBase por completo en v1 | El sistema es pequeño; dejar dos backends a medias duplica auth y mantenimiento |
| D2 | Framework HTTP | Elysia | Nativo de Bun, validación con TypeBox, OpenAPI incluido |
| D3 | Auth | Cookie de sesión httpOnly + `Bun.password` (argon2id) | Sin librerías extra; sesiones revocables en BD |
| D4 | Imágenes de posts | Seguir guardando URL en v1 | Hoy el admin pega una URL, no sube archivo. Subida a S3/R2 en v2 |
| D5 | Hosting | **Decidido:** Railway: servicio Bun + Postgres | Ya hay cuenta; dominio `api.evelinedublan.com` |
| D6 | Integración front-back | El front llama al back directo con `credentials: include`; CORS con lista de orígenes | Con `api.` en el mismo sitio, la cookie funciona con `SameSite=Lax` |
| D7 | Migración de datos | Script que exporta PocketBase e importa a Postgres | Posts, citas, servicios, clientes. Posts también desde la semilla de WordPress (16 artículos) |
| D8 | Repositorios | Back en `evelinedublancontacto-dev/back`; cambios de front en su repo | Se despliegan por separado |

## 4. Arquitectura

    back/
      package.json  bunfig.toml  tsconfig.json  .env.example
      docker-compose.yml        Postgres local
      Dockerfile  railway.json  despliegue
      src/
        index.ts                arranque
        app.ts                  Elysia: cors, cookies, errores, rutas, /docs
        config.ts               variables de entorno validadas
        db/
          sequelize.ts          conexión pg
          migraciones/          umzug, archivos .ts numerados
          semillas/             servicios, horarios, posts, admin inicial
        modelos/                Usuario Sesion Cliente Servicio Horario
                                Bloqueo Cita Post Bitacora
        modulos/                auth citas disponibilidad servicios posts
                                clientes horarios bloqueos
                                (cada uno: rutas.ts servicio.ts esquemas.ts)
        servicios/              correo.ts (Resend), fechas.ts (CDMX)
        middleware/             sesion.ts requiereAdmin.ts rateLimit.ts
      tests/

Sequelize v6 con `pg` puro (no `pg-native`) y migraciones con `umzug`, no con
`sequelize-cli`: la CLI corre sobre Node y lleva mal TypeScript bajo Bun.
Nunca `sync()` en producción.

## 5. Modelo de datos

    usuarios    id uuid, correo unique, hash, nombre, rol (admin), activo
    sesiones    id, usuario_id, token_hash, expira_en, ip, user_agent
    clientes    id, nombre, correo, telefono, notas          (separado de usuarios)
    servicios   id slug, titulo, descripcion, duracion_min, precio numeric(10,2),
                activo, orden, reglas jsonb  → {dias_permitidos:[5], modalidad:"presencial"}
    horarios    id, dia_semana 0-6, hora_inicio time, hora_fin time, activo
    bloqueos    id, fecha, hora_inicio?, hora_fin?, motivo   (vacaciones, días cerrados)
    citas       id, cliente_id, servicio_id, fecha date, hora time,
                estado (pendiente | confirmada | cancelada | completada),
                notas, origen, created
                ÍNDICE ÚNICO PARCIAL (fecha, hora) WHERE estado IN ('pendiente','confirmada')
                → la base de datos impide la doble reserva, no el código
    posts       id, titulo, slug unique, extracto, contenido, imagen_url,
                categoria, publicado, publicado_en
    bitacora    id, actor_id?, accion, entidad, entidad_id, antes jsonb,
                despues jsonb, created   (solo inserción)

`disponible` pasa a llamarse `pendiente`; el front actualiza etiquetas.

## 6. API v1

Público:

    GET  /salud
    GET  /v1/servicios                       activos, en orden
    GET  /v1/disponibilidad?fecha&servicio   bloques del día: horarios, bloqueos,
                                             reglas del servicio, citas ocupadas
    POST /v1/citas                           crea cliente si no existe + cita pendiente;
                                             rate limit; correo de confirmación
    GET  /v1/posts   GET /v1/posts/:slug     publicados

Auth:

    POST /v1/auth/entrar   POST /v1/auth/salir   GET /v1/auth/yo

Admin (sesión con rol admin; sin ella, 401 en todo el bloque):

    GET PATCH DELETE  /v1/admin/citas/:id       GET /v1/admin/citas?estado&desde&hasta
    CRUD              /v1/admin/servicios  /posts  /clientes  /horarios  /bloqueos
    GET               /v1/admin/bitacora

Documentación OpenAPI generada en `/docs`.

## 7. Cambios en el front (rama en su repositorio)

- Quitar la dependencia `pocketbase`; nuevo `src/lib/api.ts` con `fetch` y
  `credentials: "include"`.
- `AuthContext` pasa a `/v1/auth/*`.
- Admin: cada `pb.collection(...)` se cambia por una llamada al back.
- Blog: lee del back. Opción de generar estático con revalidación.
- Borrar `app/api/*`. Durante la transición pueden quedar como proxy.
- Proteger `/admin` en servidor con `middleware.ts` que valide la sesión.
- Etiquetas de estado: `disponible` → `pendiente`.

## 8. Fases y criterio de terminado

El desglose tarea por tarea de cada fase está en `FASES.md`.

| Fase | Contenido | Terminado cuando | Estimación |
|---|---|---|---|
| F0 | Este plan | D1 a D8 confirmadas | — |
| F1 | Cimientos: bun init, Elysia, config, Sequelize + pg, umzug, docker compose, `/salud`, `bun test`, lint, Dockerfile | `bun dev` levanta, la migración 0001 corre, el test de salud pasa | 1 día |
| F2 | Agenda: servicios, horarios, bloqueos, disponibilidad, citas públicas con índice único, correo | Un test con peticiones concurrentes no logra duplicar un horario; paridad con `/api/disponibilidad` actual | 1.5 días |
| F3 | Auth y admin: usuarios, sesiones, middleware, CRUDs, bitácora | Sin cookie, 401 en todo `/v1/admin`; login con rate limit | 1.5 días |
| F4 | Blog y clientes | Posts publicados servidos; admin CRUD | 0.5 día |
| F5 | Migración de datos desde PocketBase y semilla de WordPress | Conteos iguales en origen y destino | 0.5 día |
| F6 | Front (§7) | Cero referencias a `pocketbase`; reserva y admin funcionan contra el back local | 1.5 días |
| F7 | Despliegue: Railway, variables, migraciones en predeploy, dominio, CORS, respaldos. Corte: el front apunta al back; PocketBase queda de respaldo 30 días | Reserva real de punta a punta en producción | 0.5 día |

Total aproximado: 7 días de trabajo.

## 9. Riesgos y mitigación

- **Datos personales en citas.** Sin listados públicos, rate limit, bitácora
  de cambios, política de retención.
- **Zona horaria.** Toda la agenda se calcula en `America/Mexico_City` en el
  servidor. Las citas se guardan como `date` + `time`, no como `timestamptz`,
  porque una cita "a las 10" debe seguir siendo a las 10 aunque cambie el
  horario de verano.
- **Cookies entre dominios.** El back vive en `api.evelinedublan.com` para
  compartir sitio con el front y usar `SameSite=Lax`. Si el front queda en
  otro dominio, se cambia a `SameSite=None; Secure`.
- **Sequelize bajo Bun.** Se prueba en F1, antes de escribir dominio. Si algo
  falla, el respaldo es `postgres.js`.
- **PocketBase sigue vivo durante la migración.** Congelar cambios en el
  admin durante la ventana de corte.

## 10. Fuera de v1

Pagos en línea, subida de archivos, cursos y meditaciones en base de datos,
recordatorios automáticos por WhatsApp, más de un usuario administrador con
permisos distintos.
