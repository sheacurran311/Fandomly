import type { Express } from 'express';
import { registerTaskManagementRoutes } from './task-management-routes';
import { registerTaskAvailabilityRoutes } from './task-availability-routes';
import { registerTaskExecutionRoutes } from './task-execution-routes';

export function registerTaskRoutes(app: Express) {
  registerTaskManagementRoutes(app);
  registerTaskAvailabilityRoutes(app);
  registerTaskExecutionRoutes(app);
}
