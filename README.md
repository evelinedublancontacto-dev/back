# Eveline Dublan · Back

API en Bun + Elysia + Sequelize + PostgreSQL. Sustituye a PocketBase como
backend del front. El plan completo está en `PLAN.md` y el desglose por fases
en `FASES.md`.

## Levantar en local

    cp .env.example .env
    docker compose up -d        # Postgres 16 en localhost:5433
    bun install
    bun dev                     # corre migraciones y escucha en :3001

Comprobar: http://localhost:3001/salud · documentación: http://localhost:3001/docs

## Comandos

    bun test                    pruebas
    bun run typecheck           tipos
    bun run lint                eslint
    bun run migrar              aplicar migraciones pendientes
    bun run migrar:deshacer     revertir la última
    bun run migrar:pendientes   listar sin aplicar
    bun run migrar:crear nombre generar archivo de migración
    bun run semillas            servicios y horarios iniciales (idempotente)
    bun run semillas:admin correo contraseña ["Nombre"]
                                crear administrador o cambiarle la contraseña

## API pública (v1)

    GET  /v1/servicios                        activos, en orden
    GET  /v1/disponibilidad?fecha&servicio    bloques del día
    POST /v1/citas                            reservar; 409 horario_ocupado si el bloque se acaba de tomar

## Auth y administración

    POST /v1/auth/entrar   { correo, contrasena }  deja cookie `sesion` httpOnly
    POST /v1/auth/salir
    GET  /v1/auth/yo

    /v1/admin/citas        GET (filtros estado, desde, hasta, paginado) · POST · GET/PATCH/DELETE /:id
    /v1/admin/servicios    GET · POST · PATCH/DELETE /:id
    /v1/admin/horarios     GET · POST · PATCH/DELETE /:id
    /v1/admin/bloqueos     GET · POST · DELETE /:id
    /v1/admin/clientes     GET (?q=) · POST · GET/PATCH/DELETE /:id
    /v1/admin/bitacora     GET

Todo `/v1/admin` exige sesión de administrador; sin ella responde 401 antes
de validar el cuerpo. Contraseñas con argon2id (`Bun.password`); en la base
se guarda el HMAC del token de sesión, nunca el token. Cada escritura del
admin queda en `bitacora`, una tabla que un trigger vuelve inmutable.

La doble reserva la impide un índice único parcial en la tabla `citas`
(`fecha, hora` donde el estado es pendiente o confirmada), no el código.
Las canceladas y completadas no cuentan, así que un horario cancelado vuelve
a quedar libre sin borrar historial.

## Estructura

    src/
      index.ts            arranque: migra y escucha
      app.ts              Elysia: cors, openapi, errores, rutas
      config.ts           variables de entorno validadas con zod
      errores.ts          ErrorHttp: estatus + código estable para el front
      db/
        sequelize.ts      conexión; DATE y TIME se leen como texto
        migraciones/      umzug, archivos NNNN-nombre.ts
        semillas/         datos iniciales
      modelos/            Sequelize; index.ts declara asociaciones
      modulos/            una carpeta por recurso: rutas, servicio, esquemas
      servicios/          agenda.ts (cálculo puro), fechas.ts (CDMX), correo.ts (Resend)
      middleware/         rateLimit.ts, sesion.ts (conSesion, soloAdmin)
    scripts/crear-admin.ts primer administrador
    scripts/migrar.ts     CLI de migraciones
    tests/                bun test

## Convenciones

Nombres en español como en el front. Respuestas `{ ...datos }` en éxito y
`{ error, codigo }` en fallo. Fechas de agenda como `AAAA-MM-DD` y `HH:MM`,
siempre en hora de la Ciudad de México.
