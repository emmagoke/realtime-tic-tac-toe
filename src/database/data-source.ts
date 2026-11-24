// import { DataSource, DataSourceOptions } from 'typeorm';
// import { config } from 'dotenv';

// config(); // load .env

// export const dataSourceOptions: DataSourceOptions = {
//     type: 'postgres',
//     host: process.env.DB_HOST || 'localhost',
//     port: Number(process.env.DB_PORT) || 5432,
//     username: process.env.DB_USER || '',
//     password: process.env.DB_PASSWORD || '',
//     database: process.env.DB_NAME || 'abc',
//     entities: [__dirname + '/../**/*.entity{.ts,.js}'],
//     migrations: [__dirname + '/migrations/*{.ts,.js}'],
//     migrationsTableName: '__migrations__',
//     synchronize: false,
//     ssl: { rejectUnauthorized: false },
// };

// const dataSource = new DataSource(dataSourceOptions);
// export default dataSource;

import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './typeorm.config';

config(); // load .env

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

export const dataSourceOptions = buildDataSourceOptions(url, process.env.DB_SSL === 'true');

export default new DataSource(dataSourceOptions);
