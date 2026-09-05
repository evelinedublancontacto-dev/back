/* ------------------------------------------------------------------ *
 *  src/db/sequelize.ts
 *  Conexión única a Postgres.
 *
 *  DATE y TIME se leen como texto, no como Date de JavaScript: una cita
 *  "2026-09-05 a las 10:00" debe seguir siendo eso aunque cambie la zona
 *  horaria del servidor o el horario de verano.
 * ------------------------------------------------------------------ */

import { Sequelize } from 'sequelize';
import pg from 'pg';
import { config } from '../config';

const OID_DATE = 1082;
const OID_TIME = 1083;
pg.types.setTypeParser(OID_DATE, (v: string) => v);
pg.types.setTypeParser(OID_TIME, (v: string) => v.slice(0, 5));

export const sequelize = new Sequelize(config.DATABASE_URL, {
  dialect: 'postgres',
  dialectModule: pg,
  logging: config.ENTORNO === 'desarrollo' && config.SQL_LOG === 'si' ? console.log : false,
  timezone: '+00:00',
  dialectOptions: {
    connectionTimeoutMillis: 3000,
    ...(config.ENTORNO === 'produccion' ? { ssl: { require: true, rejectUnauthorized: false } } : {}),
  },
  define: {
    underscored: true,
    timestamps: true,
    createdAt: 'creado_en',
    updatedAt: 'actualizado_en',
  },
  pool: { max: 10, min: 0, idle: 10_000 },
});
