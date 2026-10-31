(function () {
  const dialog = document.getElementById('rightsDialog');
  const title = document.getElementById('rightsDialogTitle');
  const modulesContainer = document.getElementById('rightsModules');
  const status = document.getElementById('rightsDialogStatus');
  const saveButton = document.getElementById('saveRightsButton');

  async function parseResponse(response) {
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'The request could not be completed.');
    }
    return result;
  }

  function showStatus(message, isError) {
    status.textContent = message;
    status.className = isError ? 'rights-status error' : 'rights-status';
  }

  function renderModules(modules, selectedPermissions, assignablePermissions) {
    modulesContainer.replaceChildren();
    for (const module of modules) {
      const section = document.createElement('section');
      section.className = 'rights-module';
      const heading = document.createElement('h3');
      heading.textContent = module.label;
      section.append(heading);

      for (const action of module.actions) {
        const permission = `${module.id}.${action.id}`;
        const label = document.createElement('label');
        label.className = 'rights-action';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = permission;
        checkbox.checked = selectedPermissions.includes(permission);
        checkbox.disabled = !assignablePermissions.includes(permission);
        label.append(checkbox, document.createTextNode(action.label));
        section.append(label);
      }

      modulesContainer.append(section);
    }
  }

  window.openRightsDialog = async function (user, onSaved) {
    title.textContent = `Action rights for ${user.name}`;
    status.textContent = '';
    status.className = 'rights-status';
    modulesContainer.replaceChildren();
    saveButton.disabled = true;
    dialog.showModal();

    try {
      const result = await parseResponse(await fetch(
        `/api/users/${encodeURIComponent(user.id)}/permissions`
      ));
      renderModules(
        result.modules,
        result.user.permissions,
        result.assignablePermissions
      );
      saveButton.disabled = false;
    } catch (error) {
      showStatus(error.message, true);
    }

    saveButton.onclick = async () => {
      const permissions = [...modulesContainer.querySelectorAll('input[type="checkbox"]:checked:not(:disabled)')]
        .map((checkbox) => checkbox.value);
      saveButton.disabled = true;
      try {
        const result = await parseResponse(await fetch(
          `/api/users/${encodeURIComponent(user.id)}/permissions`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ permissions })
          }
        ));
        showStatus(result.message, false);
        if (onSaved) {
          await onSaved();
        }
        dialog.close();
      } catch (error) {
        showStatus(error.message, true);
      } finally {
        saveButton.disabled = false;
      }
    };
  };

  document.getElementById('closeRightsButton').addEventListener('click', () => dialog.close());
})();
