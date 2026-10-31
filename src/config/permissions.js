const PERMISSION_MODULES = [
  {
    id: 'users',
    label: 'User management',
    actions: [
      { id: 'view', label: 'View users' },
      { id: 'create', label: 'Add users' },
      { id: 'edit', label: 'Edit users' },
      { id: 'block', label: 'Block or unblock users' }
    ]
  },
  {
    id: 'accounts',
    label: 'Account approvals',
    actions: [
      { id: 'view', label: 'View account approvals' },
      { id: 'approve', label: 'Approve accounts' },
      { id: 'block', label: 'Block or unblock administrator accounts' }
    ]
  },
  {
    id: 'roles',
    label: 'Role management',
    actions: [
      { id: 'assign_admin', label: 'Assign administrator role' },
      { id: 'remove_admin', label: 'Remove administrator role' }
    ]
  },
  {
    id: 'rights',
    label: 'Rights management',
    actions: [
      { id: 'manage', label: 'Assign action rights' }
    ]
  }
];

const ALL_PERMISSIONS = PERMISSION_MODULES.flatMap((module) =>
  module.actions.map((action) => `${module.id}.${action.id}`)
);

const DEFAULT_ADMIN_PERMISSIONS = [
  'users.view',
  'users.create',
  'users.edit',
  'users.block',
  'rights.manage'
];

function normalizePermissions(permissions) {
  if (!Array.isArray(permissions)) {
    return [];
  }

  return [...new Set(permissions.filter((permission) =>
    typeof permission === 'string' && ALL_PERMISSIONS.includes(permission)
  ))];
}

function getUserPermissions(user) {
  if (!user || user.role === 'user') {
    return [];
  }
  if (user.role === 'superadmin') {
    return [...ALL_PERMISSIONS];
  }
  if (Array.isArray(user.permissions)) {
    return normalizePermissions(user.permissions);
  }
  return [...DEFAULT_ADMIN_PERMISSIONS];
}

module.exports = {
  PERMISSION_MODULES,
  ALL_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS,
  normalizePermissions,
  getUserPermissions
};
