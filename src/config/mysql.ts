import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export class MySQLDatabase {
    private static instance: MySQLDatabase;
    private pool: Pool | null = null;

    static getInstance(): MySQLDatabase {
        if (!MySQLDatabase.instance) {
            MySQLDatabase.instance = new MySQLDatabase();
        }
        return MySQLDatabase.instance;
    }

    async connect(): Promise<void> {
        try {
            this.pool = mysql.createPool({
                host: process.env.MYSQL_HOST || 'localhost',
                user: process.env.MYSQL_USER || 'root',
                password: process.env.MYSQL_PASSWORD || '',
                // database: process.env.MYSQL_DB || 'test', No necesitamos la db, vendra del tenant
                port: parseInt(process.env.MYSQL_PORT || '3306'),
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0,
            });
            console.log('✅ Pool MySQL conectado correctamente');
        } catch (error) {
            console.error('❌ Pool MySQL conexión fallida:', error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            console.log('✅ Pool MySQL desconectado correctamente');
        }
    }

    getPool(): Pool {
        if (!this.pool) {
            throw new Error('Pool MySQL no conectado');
        }
        return this.pool;
    }

    // Para consultas SELECT que devuelven filas
    async query<T extends RowDataPacket[]>(sql: string, params?: any[]): Promise<T> {
        if (!this.pool) {   
            throw new Error('Pool MySQL no conectado');
        }
        try {
            const [rows] = await this.pool.execute<T>(sql, params);
            return rows;
        } catch (error) {
            console.error('❌ Error en consulta MySQL:', error);
            throw error;
        }
    }

    // Para INSERT, UPDATE, DELETE que devuelven ResultSetHeader
    async execute(sql: string, params?: any[]): Promise<ResultSetHeader> {
        if (!this.pool) {   
            throw new Error('Pool MySQL no conectado');
        }
        try {
            const [result] = await this.pool.execute<ResultSetHeader>(sql, params);
            return result;
        } catch (error) {
            console.error('❌ Error en ejecución MySQL:', error);
            throw error;
        }
    }

    async getConnection(): Promise<PoolConnection> {
        if (!this.pool) {
            throw new Error('Pool MySQL no conectado');
        }
        return this.pool.getConnection();
    }
}

export const mysqlDatabase = MySQLDatabase.getInstance();
