// Device registration & push-token management (BACKEND-SCHEMA-API.md §10.2).
import { devicesRepo } from '../repositories/index.mjs';
import { notFound, forbidden } from '../lib/errors.mjs';

export async function registerDevice(userId, input) {
  return devicesRepo.upsert(userId, {
    platform: input.platform,
    install_id: input.install_id,
    app_version: input.app_version,
    os_version: input.os_version,
    expo_push_token: input.expo_push_token,
    push_enabled: input.push_enabled,
  });
}

export async function listDevices(userId) {
  return devicesRepo.listByUser(userId);
}

export async function updateDevice(deviceId, userId, patch) {
  const device = await devicesRepo.findById(deviceId);
  if (!device) throw notFound('Device not found');
  if (device.user_id !== userId) throw forbidden();
  const allowed = {};
  for (const k of ['expo_push_token', 'push_enabled', 'app_version', 'os_version']) {
    if (patch[k] !== undefined) allowed[k] = patch[k];
  }
  allowed.last_seen_at = new Date();
  return devicesRepo.update(deviceId, allowed);
}

export async function removeDevice(deviceId, userId) {
  const device = await devicesRepo.findById(deviceId);
  if (!device) throw notFound('Device not found');
  if (device.user_id !== userId) throw forbidden();
  await devicesRepo.remove(deviceId);
  return { ok: true };
}
