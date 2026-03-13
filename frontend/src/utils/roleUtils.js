export const normalizeRole = (role) => String(role || '').trim().toLowerCase();

export const isSuperAdminRole = (role) => normalizeRole(role) === 'superadmin';

export const isAdminRole = (role) => normalizeRole(role) === 'admin';

export const isAdminOrSuperAdminRole = (role) =>
  isAdminRole(role) || isSuperAdminRole(role);
