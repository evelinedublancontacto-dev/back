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

## Estructura

    src/
      index.ts            arranque: migra y escucha
      app.ts              Elysia: cors, openapi, errores, rutas
      config.ts           variables de entorno validadas con zod
      db/
        sequelize.ts      conexión; DATE y TIME se leen como texto
        migraciones/      umzug, archivos NNNN-nombre.ts
    scripts/migrar.ts     CLI de migraciones
    tests/                bun test

## Convenciones

Nombres en español como en el front. Respuestas `{ ...datos }` en éxito y
`{ error, codigo }` en fallo. Fechas de agenda como `AAAA-MM-DD` y `HH:MM`,
siempre en hora de la Ciudad de México.
