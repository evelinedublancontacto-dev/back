import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../db/sequelize';

export class Post extends Model<InferAttributes<Post>, InferCreationAttributes<Post>> {
  declare id: CreationOptional<string>;
  declare titulo: string;
  declare slug: string;
  declare extracto: CreationOptional<string>;
  declare contenido: CreationOptional<string>;
  declare imagen_url: CreationOptional<string>;
  declare categoria: CreationOptional<string>;
  declare publicado: CreationOptional<boolean>;
  declare publicado_en: CreationOptional<Date | null>;
  declare origen_id: CreationOptional<string | null>;
  declare creado_en: CreationOptional<Date>;
  declare actualizado_en: CreationOptional<Date>;

  /** Misma forma que el tipo BlogPostRecord del front, para no tocar sus vistas. */
  publico(conContenido = true) {
    return {
      id: this.id,
      title: this.titulo,
      slug: this.slug,
      excerpt: this.extracto,
      ...(conContenido ? { content: this.contenido } : {}),
      image: this.imagen_url,
      category: this.categoria,
      published: this.publicado,
      date: this.publicado_en?.toISOString(),
      created: this.creado_en?.toISOString(),
    };
  }
}

Post.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    titulo: { type: DataTypes.STRING(300), allowNull: false },
    slug: { type: DataTypes.STRING(200), allowNull: false },
    extracto: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    contenido: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    imagen_url: { type: DataTypes.STRING(1000), allowNull: false, defaultValue: '' },
    categoria: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'sanacion-energetica' },
    publicado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    publicado_en: { type: DataTypes.DATE, allowNull: true },
    origen_id: { type: DataTypes.STRING(80), allowNull: true },
    creado_en: DataTypes.DATE,
    actualizado_en: DataTypes.DATE,
  },
  { sequelize, tableName: 'posts' },
);
