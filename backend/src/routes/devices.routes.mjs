// Device & push registration (BACKEND-SCHEMA-API.md §10.2).
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok } from '../lib/http.mjs';
import { validateBody } from '../middleware/validate.mjs';
import { requireAuth } from '../middleware/auth.mjs';
import { registerDevice, listDevices, updateDevice, removeDevice } from '../services/device.service.mjs';

export const devicesRouter = Router();
devicesRouter.use(requireAuth);

devicesRouter.get(
  '/devices',
  asyncHandler(async (req, res) => ok(res, { data: await listDevices(req.user.id) })),
);

devicesRouter.post(
  '/devices',
  validateBody(
    z.object({
      platform: z.enum(['ios', 'android', 'web']),
      install_id: z.string().min(1),
      app_version: z.string().optional(),
      os_version: z.string().optional(),
      expo_push_token: z.string().optional(),
      push_enabled: z.boolean().optional(),
    }),
  ),
  asyncHandler(async (req, res) => ok(res, await registerDevice(req.user.id, req.body), 201)),
);

devicesRouter.patch(
  '/devices/:id',
  validateBody(
    z.object({
      expo_push_token: z.string().nullable().optional(),
      push_enabled: z.boolean().optional(),
      app_version: z.string().optional(),
      os_version: z.string().optional(),
    }),
  ),
  asyncHandler(async (req, res) => ok(res, await updateDevice(req.params.id, req.user.id, req.body))),
);

devicesRouter.delete(
  '/devices/:id',
  asyncHandler(async (req, res) => ok(res, await removeDevice(req.params.id, req.user.id))),
);
