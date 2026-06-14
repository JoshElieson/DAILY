// auth_identities + auth_sessions data access.
import { insertRow, updateById, query, queryOne } from './_helpers.mjs';

export const authIdentitiesRepo = {
  find: (provider, subject) =>
    queryOne('SELECT * FROM auth_identities WHERE provider = $1 AND provider_subject = $2', [
      provider,
      subject,
    ]),

  listByUser: (userId) =>
    query('SELECT * FROM auth_identities WHERE user_id = $1', [userId]).then((r) => r.rows),

  create: ({ user_id, provider, provider_subject, email }) =>
    insertRow('auth_identities', { user_id, provider, provider_subject, email: email ?? null }),
};

export const authSessionsRepo = {
  create: ({ user_id, device_id, refresh_hash, expires_at }) =>
    insertRow('auth_sessions', {
      user_id,
      device_id: device_id ?? null,
      refresh_hash,
      expires_at,
    }),

  findByHash: (refresh_hash) =>
    queryOne('SELECT * FROM auth_sessions WHERE refresh_hash = $1', [refresh_hash]),

  revoke: (id) => updateById('auth_sessions', id, { revoked_at: new Date() }, { touch: false }),

  revokeAllForUser: (userId) =>
    query('UPDATE auth_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [
      userId,
    ]),

  /** Rotate: revoke old, create new (refresh-token rotation). */
  async rotate(oldId, { user_id, device_id, refresh_hash, expires_at }) {
    await this.revoke(oldId);
    return this.create({ user_id, device_id, refresh_hash, expires_at });
  },
};
