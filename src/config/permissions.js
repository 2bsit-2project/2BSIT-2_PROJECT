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


const DASHBOARD_MODULES = [
  {
    id: 'users',
    label: 'User management',
    description: 'Create user accounts and manage user details and access.',
    href: '/admin/users',
    requires: ['users.view']
  },
  {
    id: 'accounts',
    label: 'Account approvals',
    description: 'Review pending accounts and manage account access.',
    href: '/superadmin/users#accounts',
    requires: ['accounts.view']
  },
  {
    id: 'roles',
    label: 'Role management',
    description: 'Assign or remove administrator roles.',
    href: '/superadmin/users#roles',
    requires: ['accounts.view'],
    anyOf: ['roles.assign_admin', 'roles.remove_admin']
  },
  {
    id: 'rights',
    label: 'Rights management',
    description: 'Set action-level permissions for administrators.',
    requires: [],
    anyOf: ['rights.manage']
  }
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


function getDashboardModules(user) {
  const permissions = getUserPermissions(user);
  return DASHBOARD_MODULES
    .filter((module) =>
      (module.id !== 'rights'
        ? module.requires.every((permission) => permissions.includes(permission))
        : permissions.includes(user.role === 'admin' ? 'users.view' : 'accounts.view'))
      && (module.id !== 'rights' || permissions.includes('rights.manage'))
      && (!module.anyOf || module.anyOf.some((permission) => permissions.includes(permission)))
    )
    .map((module) => ({
      id: module.id,
      label: module.label,
      description: module.description,
      href: module.id === 'users' && user.role === 'superadmin'
        ? '/superadmin/users#accounts'
        : module.id === 'rights' && user.role === 'admin'
          ? '/admin/users#rights'
          : module.id === 'rights'
            ? '/superadmin/users#rights'
            : module.href,
      actions: PERMISSION_MODULES
        .find((permissionModule) => permissionModule.id === module.id)
        .actions
        .filter((action) => permissions.includes(`${module.id}.${action.id}`))
        .map((action) => action.label)
    }));
}


module.exports = {
  PERMISSION_MODULES,
  ALL_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS,

  DASHBOARD_MODULES,
  normalizePermissions,
  getUserPermissions,
  getDashboardModules
};
