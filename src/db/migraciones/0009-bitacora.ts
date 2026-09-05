import { DataTypes } from 'sequelize';
import type { ContextoMigracion } from './index';

/* Registro de cambios administrativos. Un trigger impide UPDATE y DELETE:
   lo que entra a la bitácora se queda tal cual. */
export async function up({ context: q }: ContextoMigracion) {
  await q.createTable('bitacora', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: q.sequelize.literal('gen_random_uuid()') },
    actor_id: { type: DataTypes.UUID, allowNull: true },
    actor_correo: { type: DataTypes.STRING(254), allowNull: false, defaultValue: 'sistema' },
    accion: { type: DataTypes.STRING(40), allowNull: false }, // crear | actualizar | borrar | entrar | salir
    entidad: { type: DataTypes.STRING(40), allowNull: false }, // cita | servicio | ...
    entidad_id: { type: DataTypes.STRING(80), allowNull: false, defaultValue: '' },
    antes: { type: DataTypes.JSONB, allowNull: true },
    despues: { type: DataTypes.JSONB, allowNull: true },
    ip: { type: DataTypes.STRING(64), allowNull: false, defaultValue: '' },
    creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });
  await q.addIndex('bitacora', ['entidad', 'entidad_id']);
  await q.addIndex('bitacora', ['creado_en']);
  await q.sequelize.query(`
    CREATE OR REPLACE FUNCTION bitacora_solo_insercion() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'La bitácora no se modifica ni se borra';
    END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER bitacora_inmutable
      BEFORE UPDATE OR DELETE ON bitacora
      FOR EACH ROW EXECUTE FUNCTION bitacora_solo_insercion();
  `);
}

export async function down({ context: q }: ContextoMigracion) {
  await q.sequelize.query('DROP TRIGGER IF EXISTS bitacora_inmutable ON bitacora; DROP FUNCTION IF EXISTS bitacora_solo_insercion();');
  await q.dropTable('bitacora');
}
