import { DataSourceOptions } from 'typeorm';

export const buildDataSourceOptions = (url: string, ssl = false): DataSourceOptions => ({
  type: 'postgres',
  url,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsTableName: '__migrations__',
  synchronize: false,
  ssl: ssl ? { rejectUnauthorized: false } : false,
});
