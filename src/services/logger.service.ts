import morgan , { StreamOptions} from "morgan";

import { Request } from "express";

import { config } from "../config/config";

class LoggerService {
    private static instance: LoggerService;

    private constructor() {}

    static getInstance() : LoggerService {
        if(!LoggerService.instance){
            LoggerService.instance = new LoggerService();
        }
        return LoggerService.instance;
    }

    private stream: StreamOptions = {
        write: (message: string) => {
            console.log(message.trim());
        }
    }

    public getMorganMiddleware() {
        morgan.token('tenant-id', (req: Request)=> {
            return req.tenant?.id || 'unknown';
        });

        morgan.token('tenant-name', (req: Request)=> {
            return req.tenant?.name || 'unknown';
        });

        morgan.token('client-ip', (req: Request)=> {
            return req.tenant?.clientIp || 'unknown';
        });

        morgan.token('tenant-status', (req: Request)=> {
            if(!req.tenant) return '❓';
            if(!req.tenant.isKnown) return 'unknown';
            if(!req.tenant.isActive) return '🟡';
            return '🟢';
        })

        const format = config.nodeEnv === 'development' 
        ? ':tenant-status [:tenant-id] :method :url :status - :response-time ms | IP: :client-ip'
        : '[:date[iso]] :tenant-status [:tenant-id] ":tenant-name" :method :url :status :response-time ms | IP: :client-ip | UA: :user-agent';

        return morgan(format, {stream: this.stream});
    }

    public logWithTenant(
        level: 'info' | 'warn' | 'error' | 'debug',
        message: string,
        req?: Request,
        additional?: any
      ): void {
        const timestamp = new Date().toISOString();
        const tenantInfo = req?.tenant ? `[${req.tenant.id}] "${req.tenant.name}"` : '[unknown]';
        
        const logMessage = `[${timestamp}] ${level.toUpperCase()} ${tenantInfo} ${message}`;
        
        if (additional) {
          console.log(logMessage, additional);
        } else {
          console.log(logMessage);
        }
      }
    
      // Métodos de conveniencia
      public info(message: string, req?: Request, additional?: any): void {
        this.logWithTenant('info', message, req, additional);
      }
    
      public warn(message: string, req?: Request, additional?: any): void {
        this.logWithTenant('warn', message, req, additional);
      }
    
      public error(message: string, req?: Request, additional?: any): void {
        this.logWithTenant('error', message, req, additional);
      }
    
      public debug(message: string, req?: Request, additional?: any): void {
        if (config.logLevel === 'debug') {
          this.logWithTenant('debug', message, req, additional);
        }
      }
}

export const logger = LoggerService.getInstance();