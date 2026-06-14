// users + devices data access (Identity cluster).
import { insertRow, updateById, findById, query, queryOne } from './_helpers.mjs';

export const usersRepo = {
  findById: (id) => findById('users', id),

  findByEmail: (email) =>
    queryOne('SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL', [email]),

  findByHandle: (handle) =>
    queryOne('SELECT * FROM users WHERE handle = $1 AND deleted_at IS NULL', [handle]),

  /** Create an anonymous user (default state on first launch). */
  createAnonymous: ({ timezone = 'UTC', locale = 'en-US' } = {}) =>
    insertRow('users', { is_anonymous: true, primary_provider: 'anonymous', timezone, locale }),

  update: (id, patch) => updateById('users', id, patch),

  /** Attach a real identity to an existing anonymous user ("claim"). */
  claim: (id, { primary_provider, email, display_name }) =>
    updateById('users', id, {
      is_anonymous: false,
      primary_provider,
      email: email ?? null,
      display_name: display_name ?? null,
      claimed_at: new Date(),
    }),

  /** Soft-delete (GDPR / Apple account deletion); a purge job hard-deletes later. */
  softDelete: (id) =>
    updateById('users', id, { status: 'deleted', deleted_at: new Date(), email: null, handle: null }),
};

export const devicesRepo = {
  findById: (id) => findById('devices', id),

  findByInstall: (userId, installId) =>
    queryOne('SELECT * FROM devices WHERE user_id = $1 AND install_id = $2', [userId, installId]),

  listByUser: (userId) =>
    query('SELECT * FROM devices WHERE user_id = $1 ORDER BY created_at DESC', [userId]).then(
      (r) => r.rows,
    ),

  /** Upsert by (user_id, install_id) — devices are stable per install. */
  async upsert(userId, { platform, install_id, app_version, os_version, expo_push_token, push_enabled }) {
    const existing = await this.findByInstall(userId, install_id);
    const patch = {
      platform,
      app_version: app_version ?? null,
      os_version: os_version ?? null,
      last_seen_at: new Date(),
    };
    if (expo_push_token !== undefined) patch.expo_push_token = expo_push_token;
    if (push_enabled !== undefined) patch.push_enabled = push_enabled;
    if (existing) return updateById('devices', existing.id, patch);
    return insertRow('devices', { user_id: userId, install_id, ...patch });
  },

  update: (id, patch) => updateById('devices', id, patch),

  remove: (id) => query('DELETE FROM devices WHERE id = $1', [id]),

  /** Push-enabled devices for a user (notification fan-out target). */
  pushTargets: (userId) =>
    query(
      `SELECT * FROM devices
       WHERE user_id = $1 AND push_enabled = true AND expo_push_token IS NOT NULL`,
      [userId],
    ).then((r) => r.rows),
};
