namespace March7thHoney.WebServer.Pages;

public static class AdminPageScripts
{
    public static string Render()
    {
        return """
    (() => {
      const config = window.M7_ADMIN_CONFIG || { serverName: "March7thHoney", knownPermissions: [] };

      const state = {
        token: localStorage.getItem("m7-admin-token") || "",
        activeModule: localStorage.getItem("m7-admin-module") || "overview",
        accounts: [],
        roles: [],
        defaultRole: "User",
        selectedUid: null,
        accountsLoaded: false,
        overview: null,
        access: null,
        accountQuery: "",
        accountFilter: "all",
        accountEditorMode: "detail",
        accountTab: "profile",
        commandOutput: "",
        commandText: "",
        commandTarget: ""
      };

      const modules = [
        {
          id: "overview",
          label: "Overview",
          kicker: "Server",
          summary: "Status and activity",
          load: loadOverview,
          render: renderOverview
        },
        {
          id: "accounts",
          label: "Accounts",
          kicker: "Identity",
          summary: "Users and security",
          load: loadAccounts,
          render: renderAccountsModule
        },
        {
          id: "access",
          label: "Access",
          kicker: "Roles",
          summary: "Permissions and roles",
          load: loadAccess,
          render: renderAccessModule
        },
        {
          id: "operations",
          label: "Operations",
          kicker: "Tools",
          summary: "Commands and actions",
          load: loadOperations,
          render: renderOperationsModule
        }
      ];

      const els = {
        loginPanel: document.getElementById("login-panel"),
        adminApp: document.getElementById("admin-app"),
        loginForm: document.getElementById("login-form"),
        adminKey: document.getElementById("admin-key"),
        loginMessage: document.getElementById("login-message"),
        logoutButton: document.getElementById("logout-button"),
        refreshButton: document.getElementById("global-refresh-button"),
        moduleNav: document.getElementById("module-nav"),
        moduleRoot: document.getElementById("module-root"),
        moduleKicker: document.getElementById("module-kicker"),
        moduleTitle: document.getElementById("module-title"),
        statusMessage: document.getElementById("status-message")
      };

      function init() {
        els.loginForm.addEventListener("submit", handleLogin);
        els.logoutButton.addEventListener("click", handleLogout);
        els.refreshButton.addEventListener("click", () => activateModule(state.activeModule, { force: true }));
        renderNav();

        if (state.token) {
          showWorkspace();
          activateModule(state.activeModule).catch(error => {
            setMessage(els.statusMessage, getErrorMessage(error), "bad");
          });
        } else {
          showLogin();
        }
      }

      function renderNav() {
        els.moduleNav.innerHTML = modules.map(module => `
          <button class="nav-button ${module.id === state.activeModule ? "active" : ""}" type="button" data-module="${module.id}">
            <strong>${escapeHtml(module.label)}</strong>
            <span>${escapeHtml(module.summary)}</span>
          </button>
        `).join("");

        for (const button of els.moduleNav.querySelectorAll("[data-module]")) {
          button.addEventListener("click", () => activateModule(button.dataset.module));
        }
      }

      async function activateModule(moduleId, options = {}) {
        const module = modules.find(item => item.id === moduleId) || modules[0];
        state.activeModule = module.id;
        localStorage.setItem("m7-admin-module", module.id);
        renderNav();
        els.moduleKicker.textContent = module.kicker;
        els.moduleTitle.textContent = module.label;
        setMessage(els.statusMessage, "", "");
        els.moduleRoot.innerHTML = `<div class="panel"><div class="empty">Loading ${escapeHtml(module.label.toLowerCase())}...</div></div>`;

        try {
          if (module.load) {
            await module.load(options);
          }
          module.render();
        } catch (error) {
          const message = getErrorMessage(error);
          setMessage(els.statusMessage, message, "bad");
          els.moduleRoot.innerHTML = `<div class="panel"><div class="empty">${escapeHtml(message)}</div></div>`;
        }
      }

      async function handleLogin(event) {
        event.preventDefault();
        setMessage(els.loginMessage, "Logging in...", "");

        try {
          const data = await api("/admin/api/login", {
            method: "POST",
            body: JSON.stringify({ admin_key: els.adminKey.value })
          });
          state.token = data.token;
          localStorage.setItem("m7-admin-token", state.token);
          els.adminKey.value = "";
          showWorkspace();
          await activateModule(state.activeModule, { force: true });
          setMessage(els.loginMessage, "", "");
        } catch (error) {
          setMessage(els.loginMessage, getErrorMessage(error), "bad");
        }
      }

      async function handleLogout() {
        try {
          await api("/admin/api/logout", { method: "POST" });
        } catch {
        }
        clearSession();
      }

      async function api(path, options = {}) {
        const headers = { ...(options.headers || {}) };
        if (state.token) {
          headers.Authorization = `Bearer ${state.token}`;
        }
        if (options.body && !headers["Content-Type"]) {
          headers["Content-Type"] = "application/json";
        }

        const response = await fetch(path, { ...options, headers });
        const body = await response.json().catch(() => ({ message: "Request failed" }));
        if (!response.ok || body.retcode !== 0) {
          if (response.status === 401) {
            clearSession();
          }
          throw new Error(body.message || "Request failed");
        }
        return body.data;
      }

      function showWorkspace() {
        els.loginPanel.classList.add("hidden");
        els.adminApp.classList.remove("hidden");
      }

      function showLogin() {
        els.adminApp.classList.add("hidden");
        els.loginPanel.classList.remove("hidden");
      }

      function clearSession() {
        state.token = "";
        state.selectedUid = null;
        state.accountsLoaded = false;
        state.overview = null;
        state.access = null;
        localStorage.removeItem("m7-admin-token");
        showLogin();
      }

      async function loadOverview(options = {}) {
        if (!state.overview || options.force) {
          state.overview = await api("/admin/api/overview");
        }
      }

      async function handleToggleRegistration() {
        const current = Boolean((state.overview?.server || {}).registration_enabled);
        const next = !current;
        try {
          setMessage(els.statusMessage, "Updating registration...", "");
          await api("/admin/api/registration", { method: "POST", body: JSON.stringify({ enabled: next }) });
          await loadOverview({ force: true });
          renderOverview();
          setMessage(els.statusMessage, next ? "Registration enabled." : "Registration disabled.", "good");
        } catch (error) {
          setMessage(els.statusMessage, getErrorMessage(error), "bad");
        }
      }

      async function handleToggleIdentityLimit() {
        const current = Boolean((state.overview?.server || {}).limit_registration_per_identity);
        const next = !current;
        try {
          setMessage(els.statusMessage, "Updating device limit...", "");
          await api("/admin/api/registration-identity-limit", { method: "POST", body: JSON.stringify({ enabled: next }) });
          await loadOverview({ force: true });
          renderOverview();
          setMessage(els.statusMessage, next ? "Device registration limit enabled." : "Device registration limit disabled.", "good");
        } catch (error) {
          setMessage(els.statusMessage, getErrorMessage(error), "bad");
        }
      }

      async function loadAccounts(options = {}) {
        if (!state.accountsLoaded || options.force) {
          const data = await api("/admin/api/accounts");
          state.accounts = data.accounts || [];
          state.roles = data.roles || [];
          state.defaultRole = data.default_role || state.roles[0] || "User";
          state.accountsLoaded = true;
          if (state.selectedUid && !state.accounts.some(account => account.uid === state.selectedUid)) {
            state.selectedUid = null;
          }
        }
      }

      async function loadAccess(options = {}) {
        if (!state.access || options.force) {
          state.access = await api("/admin/api/access");
        }
      }

      async function loadOperations(options = {}) {
        await loadAccounts(options);
      }

      function renderOverview() {
        const data = state.overview || {};
        const stats = data.stats || {};
        const server = data.server || {};
        const registrationEnabled = Boolean(server.registration_enabled);
        const identityLimitEnabled = Boolean(server.limit_registration_per_identity);
        const onlinePlayers = data.online_players || [];
        const attention = data.attention || [];
        const roleBreakdown = data.role_breakdown || [];

        els.moduleRoot.innerHTML = `
          <div class="metric-grid">
            ${metricCard("Accounts", stats.total_accounts)}
            ${metricCard("Online", stats.online_players)}
            ${metricCard("Banned", stats.banned_accounts)}
            ${metricCard("Unverified", stats.unverified_email)}
            ${metricCard("Roles", stats.roles)}
          </div>

          <div class="dashboard-grid">
            <section class="panel">
              <div class="panel-title">
                <h3>Online players</h3>
                <span class="chip ${onlinePlayers.length ? "good" : ""}">${onlinePlayers.length} active</span>
              </div>
              ${onlinePlayers.length ? `
                <div class="table-scroller">
                  <table>
                    <thead>
                      <tr>
                        <th style="width: 100px;">UID</th>
                        <th>Nickname</th>
                        <th style="width: 90px;">Level</th>
                        <th>Endpoint</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${onlinePlayers.map(player => `
                        <tr>
                          <td>${escapeHtml(player.uid)}</td>
                          <td>${escapeHtml(player.nickname || "")}</td>
                          <td>${escapeHtml(player.level ?? "")}</td>
                          <td class="muted">${escapeHtml(player.endpoint || "")}</td>
                        </tr>
                      `).join("")}
                    </tbody>
                  </table>
                </div>
              ` : `<div class="empty">No active players.</div>`}
            </section>

            <section class="panel">
              <div class="panel-title">
                <h3>Server</h3>
                <span class="chip">${escapeHtml(server.database || "database")}</span>
              </div>
              <div class="panel-body stack">
                ${detailRow("Name", server.name || config.serverName)}
                ${detailRow("Gateway", server.game_address || "")}
                ${detailRow("Uptime", formatDuration(server.uptime_seconds || 0))}
                ${detailRow("Memory", `${formatNumber(server.process_memory_mb || 0)} MB`)}
                ${detailRow("Server time", formatUnix(server.server_time))}
                <div class="inline-actions">
                  <span class="muted" style="min-width: 135px;">Registration</span>
                  <span class="chip ${registrationEnabled ? "good" : "bad"}">${registrationEnabled ? "Enabled" : "Disabled"}</span>
                  <button id="toggle-registration-button" class="button ${registrationEnabled ? "danger" : "success"}" type="button">${registrationEnabled ? "Disable" : "Enable"}</button>
                </div>
                <div class="inline-actions">
                  <span class="muted" style="min-width: 135px;">Device limit</span>
                  <span class="chip ${identityLimitEnabled ? "good" : "bad"}">${identityLimitEnabled ? "On" : "Off"}</span>
                  <button id="toggle-identity-limit-button" class="button ${identityLimitEnabled ? "danger" : "success"}" type="button">${identityLimitEnabled ? "Disable" : "Enable"}</button>
                </div>
              </div>
            </section>
          </div>

          <div class="dashboard-grid">
            <section class="panel">
              <div class="panel-title">
                <h3>Attention</h3>
                <span class="chip ${attention.length ? "warn" : "good"}">${attention.length} flagged</span>
              </div>
              ${attention.length ? `
                <div class="table-scroller">
                  <table>
                    <thead>
                      <tr>
                        <th style="width: 100px;">UID</th>
                        <th>User</th>
                        <th>Email</th>
                        <th style="width: 150px;">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${attention.map(account => `
                        <tr>
                          <td>${escapeHtml(account.uid)}</td>
                          <td>${escapeHtml(account.username || "")}</td>
                          <td class="muted">${escapeHtml(account.email || "")}</td>
                          <td><span class="chip warn">${escapeHtml(account.reason || "")}</span></td>
                        </tr>
                      `).join("")}
                    </tbody>
                  </table>
                </div>
              ` : `<div class="empty">No flagged accounts.</div>`}
            </section>

            <section class="panel">
              <div class="panel-title">
                <h3>Role mix</h3>
              </div>
              <div class="panel-body stack">
                ${roleBreakdown.length ? roleBreakdown.map(item => detailRow(item.role, `${item.count} accounts`)).join("") : `<p class="muted">No role data.</p>`}
              </div>
            </section>
          </div>
        `;

        const toggleRegistrationButton = document.getElementById("toggle-registration-button");
        if (toggleRegistrationButton) {
          toggleRegistrationButton.addEventListener("click", handleToggleRegistration);
        }

        const toggleIdentityLimitButton = document.getElementById("toggle-identity-limit-button");
        if (toggleIdentityLimitButton) {
          toggleIdentityLimitButton.addEventListener("click", handleToggleIdentityLimit);
        }
      }

      function renderAccountsModule() {
        const rows = filteredAccounts();
        const selected = getSelectedAccount();

        els.moduleRoot.innerHTML = `
          <div class="account-grid">
            <section class="panel">
              <div class="toolbar">
                <input id="account-search" type="search" placeholder="Search UID, username, email, role, nickname, permissions, or ban reason" value="${escapeAttr(state.accountQuery)}">
                <select id="account-filter" aria-label="Account filter">
                  ${option("all", "All accounts", state.accountFilter)}
                  ${option("online", "Online", state.accountFilter)}
                  ${option("banned", "Banned", state.accountFilter)}
                  ${option("unverified", "Unverified", state.accountFilter)}
                  ${option("password-missing", "No password", state.accountFilter)}
                </select>
                <button id="new-account-button" class="button primary" type="button">New account</button>
                <span class="chip" id="account-count">${rows.length} ${rows.length === 1 ? "user" : "users"}</span>
              </div>
              <div id="account-results">${accountRowsMarkup(rows)}</div>
            </section>

            ${state.accountEditorMode === "create" ? renderCreateAccountPanel() : renderAccountEditor(selected)}
          </div>
        `;

        bindAccountModule();
      }

      function accountRowsMarkup(rows) {
        if (!rows.length) {
          return `<div class="empty">No accounts match the current view.</div>`;
        }
        return `
          <div class="table-scroller">
            <table aria-label="User accounts">
              <thead>
                <tr>
                  <th style="width: 90px;">UID</th>
                  <th>User</th>
                  <th>Email</th>
                  <th style="width: 120px;">Role</th>
                  <th style="width: 100px;">State</th>
                </tr>
              </thead>
              <tbody>
                ${rows.map(account => `
                  <tr data-select-uid="${account.uid}" class="${account.uid === state.selectedUid ? "selected" : ""}">
                    <td>${escapeHtml(account.uid)}</td>
                    <td>
                      <strong>${escapeHtml(account.username || "")}</strong>
                      <div class="muted">${escapeHtml(account.nickname || "No nickname")}</div>
                    </td>
                    <td class="muted">${escapeHtml(account.email || "")}</td>
                    <td><span class="chip">${escapeHtml(account.role || "")}</span></td>
                    <td>${accountStateChips(account)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>`;
      }

      function bindAccountRows() {
        for (const row of els.moduleRoot.querySelectorAll("[data-select-uid]")) {
          row.addEventListener("click", () => {
            state.selectedUid = Number(row.dataset.selectUid);
            state.accountEditorMode = "detail";
            renderAccountsModule();
          });
        }
      }

      // Typing must never rebuild the search box. Replacing the live input drops
      // focus, aborts IME composition, and makes iOS offer "Undo Typing" after a
      // single character, so filtering only swaps the results list.
      function renderAccountResults() {
        const rows = filteredAccounts();
        const count = document.getElementById("account-count");
        const host = document.getElementById("account-results");
        if (count) {
          count.textContent = `${rows.length} ${rows.length === 1 ? "user" : "users"}`;
        }
        if (host) {
          host.innerHTML = accountRowsMarkup(rows);
          bindAccountRows();
        }
      }

      function renderCreateAccountPanel() {
        return `
          <section class="panel">
            <div class="panel-title">
              <h3>Create account</h3>
              <button id="cancel-create-button" class="button subtle" type="button">Cancel</button>
            </div>
            <div class="panel-body">
              <form id="create-account-form" class="form-grid">
                <label><span>Username</span><input id="create-username" required maxlength="64" autocomplete="off"></label>
                <label><span>Email</span><input id="create-email" type="email" required maxlength="254" autocomplete="off"></label>
                <label><span>Password</span><input id="create-password" type="password" required autocomplete="new-password"></label>
                <label><span>UID</span><input id="create-uid" type="number" min="1" placeholder="Auto"></label>
                <label><span>Role</span><select id="create-role">${roleOptions(state.defaultRole)}</select></label>
                <label class="check-row"><input id="create-email-verified" type="checkbox"> Email verified</label>
                <label class="wide"><span>Permission overrides</span><textarea id="create-permissions" spellcheck="false" placeholder="Optional, comma separated"></textarea></label>
                <div class="actions wide">
                  <button class="button primary" type="submit">Create account</button>
                </div>
              </form>
            </div>
          </section>
        `;
      }

      function renderAccountEditor(account) {
        if (!account) {
          return `
            <section class="panel">
              <div class="panel-title"><h3>Account workspace</h3></div>
              <div class="empty">Select an account or create a new one.</div>
            </section>
          `;
        }

        return `
          <section class="panel ${state.accountTab === "danger" ? "danger-zone" : ""}">
            <div class="panel-title">
              <h3>${escapeHtml(account.username || `UID ${account.uid}`)}</h3>
              <span class="chip ${account.online ? "good" : ""}">${account.online ? "Online" : "Offline"}</span>
            </div>
            <div class="tabs">
              ${tabButton("profile", "Profile")}
              ${tabButton("access", "Access")}
              ${tabButton("security", "Security")}
              ${tabButton("danger", "Danger")}
            </div>
            <div class="panel-body">
              ${renderAccountTab(account)}
            </div>
          </section>
        `;
      }

      function renderAccountTab(account) {
        switch (state.accountTab) {
          case "access":
            return `
              <form id="access-form" class="form-grid">
                <label><span>Role</span><select id="access-role">${roleOptions(account.role || state.defaultRole)}</select></label>
                <label class="wide"><span>Base permissions</span><textarea id="access-base-permissions" disabled spellcheck="false">${escapeHtml(account.base_permissions || "")}</textarea></label>
                <label class="wide"><span>Permission overrides</span><textarea id="access-permissions" spellcheck="false" placeholder="Optional, comma separated">${escapeHtml(account.permissions || "")}</textarea></label>
                <label class="wide"><span>Effective permissions</span><textarea id="access-effective-permissions" disabled spellcheck="false">${escapeHtml(account.effective_permissions || "")}</textarea></label>
                <div class="actions wide">
                  <button class="button primary" type="submit">Save access</button>
                </div>
              </form>
            `;
          case "security":
            return `
              <div class="stack">
                <form id="password-form" class="form-grid">
                  <label class="wide"><span>New password</span><input id="edit-password" type="password" autocomplete="new-password"></label>
                  <div class="actions wide">
                    <button class="button" type="submit">Set password</button>
                    <button id="send-verification-button" class="button subtle" type="button">Send verification email</button>
                    <button id="revoke-tokens-button" class="button subtle" type="button">Revoke tokens</button>
                    <button id="kick-session-button" class="button subtle" type="button">Kick session</button>
                  </div>
                </form>
                <form id="ban-form" class="form-grid">
                  <label class="wide"><span>Ban reason</span><textarea id="ban-reason" spellcheck="false" placeholder="Reason shown to the player">${escapeHtml(account.ban_reason || "")}</textarea></label>
                  <label class="check-row"><input id="ban-permanent" type="checkbox" ${account.banned ? account.ban_permanent !== false ? "checked" : "" : "checked"}> Permanent ban</label>
                  <label><span>Ban expires</span><input id="ban-expires" type="datetime-local" value="${account.ban_expires_at > 0 ? unixToDateTimeLocal(account.ban_expires_at) : ""}"></label>
                  <div class="actions wide">
                    <button class="button danger" type="submit">Ban account</button>
                    <button id="unban-user-button" class="button subtle" type="button" ${account.banned ? "" : "disabled"}>Unban</button>
                  </div>
                </form>
              </div>
            `;
          case "danger":
            return `
              <div class="stack">
                <form id="reset-gameplay-form" class="form-grid">
                  <label class="wide"><span>Type RESET to reset gameplay data</span><input id="reset-confirm" autocomplete="off"></label>
                  <div class="actions wide">
                    <button class="button danger" type="submit">Reset gameplay</button>
                  </div>
                </form>
                <form id="delete-form" class="form-grid">
                  <label class="wide"><span>Type DELETE to remove this account and all data</span><input id="delete-confirm" autocomplete="off"></label>
                  <div class="actions wide">
                    <button class="button danger" type="submit">Delete account</button>
                  </div>
                </form>
              </div>
            `;
          default:
            return `
              <form id="edit-profile-form" class="form-grid">
                <label><span>Username</span><input id="edit-username" value="${escapeAttr(account.username || "")}" required maxlength="64" autocomplete="off"></label>
                <label><span>Email</span><input id="edit-email" type="email" value="${escapeAttr(account.email || "")}" required maxlength="254" autocomplete="off"></label>
                <label><span>Role</span><select id="edit-role">${roleOptions(account.role || state.defaultRole)}</select></label>
                <label class="check-row"><input id="edit-email-verified" type="checkbox" ${account.email_verified ? "checked" : ""}> Email verified</label>
                <div class="wide stack">
                  ${detailRow("UID", account.uid)}
                  ${detailRow("Nickname", account.nickname || "None")}
                  ${detailRow("Trailblaze level", account.level ?? "None")}
                  ${detailRow("Password", account.has_password ? "Set" : "Missing")}
                  ${detailRow("Dispatch token", formatUnix(account.dispatch_token_expires_at))}
                  ${detailRow("Combo token", formatUnix(account.combo_token_expires_at))}
                </div>
                <div class="actions wide">
                  <button class="button primary" type="submit">Save profile</button>
                </div>
              </form>
            `;
        }
      }

      function bindAccountModule() {
        const search = document.getElementById("account-search");
        const filter = document.getElementById("account-filter");
        const newButton = document.getElementById("new-account-button");
        const cancelCreate = document.getElementById("cancel-create-button");

        if (search) {
          search.addEventListener("input", event => {
            state.accountQuery = event.currentTarget.value;
            renderAccountResults();
          });
        }
        if (filter) {
          filter.addEventListener("change", event => {
            state.accountFilter = event.currentTarget.value;
            renderAccountsModule();
          });
        }
        if (newButton) {
          newButton.addEventListener("click", () => {
            state.accountEditorMode = "create";
            state.selectedUid = null;
            renderAccountsModule();
          });
        }
        if (cancelCreate) {
          cancelCreate.addEventListener("click", () => {
            state.accountEditorMode = "detail";
            renderAccountsModule();
          });
        }

        bindAccountRows();

        for (const tab of els.moduleRoot.querySelectorAll("[data-account-tab]")) {
          tab.addEventListener("click", () => {
            state.accountTab = tab.dataset.accountTab;
            renderAccountsModule();
          });
        }

        bindAccountForms();
      }

      function bindAccountForms() {
        const createForm = document.getElementById("create-account-form");
        const profileForm = document.getElementById("edit-profile-form");
        const accessForm = document.getElementById("access-form");
        const passwordForm = document.getElementById("password-form");
        const banPermanent = document.getElementById("ban-permanent");
        const banForm = document.getElementById("ban-form");
        const unbanButton = document.getElementById("unban-user-button");
        const sendVerificationButton = document.getElementById("send-verification-button");
        const revokeTokensButton = document.getElementById("revoke-tokens-button");
        const kickSessionButton = document.getElementById("kick-session-button");
        const resetGameplayForm = document.getElementById("reset-gameplay-form");
        const deleteForm = document.getElementById("delete-form");

        if (createForm) {
          createForm.addEventListener("submit", handleCreateAccount);
        }
        if (profileForm) {
          profileForm.addEventListener("submit", event => handleUpdateAccount(event, "Profile saved."));
        }
        if (accessForm) {
          accessForm.addEventListener("submit", event => handleUpdateAccount(event, "Access saved."));
        }
        if (passwordForm) {
          passwordForm.addEventListener("submit", handleSetPassword);
        }
        if (banPermanent) {
          const expires = document.getElementById("ban-expires");
          expires.disabled = banPermanent.checked;
          banPermanent.addEventListener("change", event => {
            expires.disabled = event.currentTarget.checked;
          });
        }
        if (banForm) {
          banForm.addEventListener("submit", handleBanAccount);
        }
        if (unbanButton) {
          unbanButton.addEventListener("click", handleUnbanAccount);
        }
        if (sendVerificationButton) {
          sendVerificationButton.addEventListener("click", handleSendVerification);
        }
        if (revokeTokensButton) {
          revokeTokensButton.addEventListener("click", () => handleSimpleAccountAction("tokens/revoke", "Tokens revoked."));
        }
        if (kickSessionButton) {
          kickSessionButton.addEventListener("click", () => handleSimpleAccountAction("session/kick", "Session kick requested."));
        }
        if (resetGameplayForm) {
          resetGameplayForm.addEventListener("submit", handleResetGameplay);
        }
        if (deleteForm) {
          deleteForm.addEventListener("submit", handleDeleteAccount);
        }
      }

      async function handleCreateAccount(event) {
        event.preventDefault();
        setMessage(els.statusMessage, "Creating account...", "");

        const uidValue = document.getElementById("create-uid").value.trim();
        try {
          const data = await api("/admin/api/accounts", {
            method: "POST",
            body: JSON.stringify({
              username: document.getElementById("create-username").value.trim(),
              email: document.getElementById("create-email").value.trim(),
              password: document.getElementById("create-password").value,
              uid: uidValue ? Number(uidValue) : null,
              role: document.getElementById("create-role").value,
              permissions: document.getElementById("create-permissions").value,
              email_verified: document.getElementById("create-email-verified").checked
            })
          });

          await refreshAccounts(data.account?.uid);
          state.accountEditorMode = "detail";
          state.accountTab = "profile";
          renderAccountsModule();
          setMessage(els.statusMessage, "Account created.", "good");
        } catch (error) {
          setMessage(els.statusMessage, getErrorMessage(error), "bad");
        }
      }

      async function handleUpdateAccount(event, successMessage) {
        event.preventDefault();
        const account = getSelectedAccount();
        if (!account) {
          setMessage(els.statusMessage, "Select an account first.", "bad");
          return;
        }

        setMessage(els.statusMessage, "Saving account...", "");
        const payload = buildAccountPayload(account);

        try {
          const data = await api(`/admin/api/accounts/${account.uid}`, {
            method: "PUT",
            body: JSON.stringify(payload)
          });

          await refreshAccounts(account.uid);
          renderAccountsModule();
          setMessage(els.statusMessage, data.email_sent ? `${successMessage} Verification email sent.` : successMessage, "good");
        } catch (error) {
          setMessage(els.statusMessage, getErrorMessage(error), "bad");
        }
      }

      async function handleSetPassword(event) {
        event.preventDefault();
        const uid = selectedUidOrNull();
        if (!uid) return;

        setMessage(els.statusMessage, "Setting password...", "");
        try {
          await api(`/admin/api/accounts/${uid}/password`, {
            method: "PUT",
            body: JSON.stringify({ password: document.getElementById("edit-password").value })
          });
          await refreshAccounts(uid);
          renderAccountsModule();
          setMessage(els.statusMessage, "Password updated.", "good");
        } catch (error) {
          setMessage(els.statusMessage, getErrorMessage(error), "bad");
        }
      }

      async function handleBanAccount(event) {
        event.preventDefault();
        const uid = selectedUidOrNull();
        if (!uid) return;

        const permanent = document.getElementById("ban-permanent").checked;
        const expireAt = permanent ? null : dateTimeLocalToUnix(document.getElementById("ban-expires").value);
        if (!permanent && !expireAt) {
          setMessage(els.statusMessage, "Choose when the timed ban expires.", "bad");
          return;
        }

        setMessage(els.statusMessage, "Updating ban...", "");
        try {
          await api(`/admin/api/accounts/${uid}/ban`, {
            method: "POST",
            body: JSON.stringify({
              reason: document.getElementById("ban-reason").value.trim(),
              permanent,
              expire_at: expireAt
            })
          });
          await refreshAccounts(uid);
          renderAccountsModule();
          setMessage(els.statusMessage, "Ban updated.", "good");
        } catch (error) {
          setMessage(els.statusMessage, getErrorMessage(error), "bad");
        }
      }

      async function handleUnbanAccount() {
        const uid = selectedUidOrNull();
        if (!uid) return;

        setMessage(els.statusMessage, "Removing ban...", "");
        try {
          await api(`/admin/api/accounts/${uid}/ban`, { method: "DELETE" });
          await refreshAccounts(uid);
          renderAccountsModule();
          setMessage(els.statusMessage, "Account unbanned.", "good");
        } catch (error) {
          setMessage(els.statusMessage, getErrorMessage(error), "bad");
        }
      }

      async function handleSendVerification() {
        const uid = selectedUidOrNull();
        if (!uid) return;

        setMessage(els.statusMessage, "Sending verification email...", "");
        try {
          const data = await api(`/admin/api/accounts/${uid}/email/verification`, { method: "POST" });
          await refreshAccounts(uid);
          renderAccountsModule();
          setMessage(els.statusMessage,
            data.email_sent ? "Verification email sent." : "Email marked unverified, but sending failed.",
            data.email_sent ? "good" : "bad");
        } catch (error) {
          setMessage(els.statusMessage, getErrorMessage(error), "bad");
        }
      }

      async function handleSimpleAccountAction(action, successMessage) {
        const uid = selectedUidOrNull();
        if (!uid) return;

        setMessage(els.statusMessage, "Working...", "");
        try {
          await api(`/admin/api/accounts/${uid}/${action}`, { method: "POST" });
          await refreshAccounts(uid);
          renderAccountsModule();
          setMessage(els.statusMessage, successMessage, "good");
        } catch (error) {
          setMessage(els.statusMessage, getErrorMessage(error), "bad");
        }
      }

      async function handleResetGameplay(event) {
        event.preventDefault();
        const uid = selectedUidOrNull();
        if (!uid) return;

        if (document.getElementById("reset-confirm").value !== "RESET") {
          setMessage(els.statusMessage, "Type RESET to confirm.", "bad");
          return;
        }

        setMessage(els.statusMessage, "Resetting gameplay...", "");
        try {
          await api(`/admin/api/accounts/${uid}/gameplay/reset`, { method: "POST" });
          await refreshAccounts(uid);
          renderAccountsModule();
          setMessage(els.statusMessage, "Gameplay data reset.", "good");
        } catch (error) {
          setMessage(els.statusMessage, getErrorMessage(error), "bad");
        }
      }

      async function handleDeleteAccount(event) {
        event.preventDefault();
        const uid = selectedUidOrNull();
        if (!uid) return;

        if (document.getElementById("delete-confirm").value !== "DELETE") {
          setMessage(els.statusMessage, "Type DELETE to confirm.", "bad");
          return;
        }

        setMessage(els.statusMessage, "Deleting account...", "");
        try {
          await api(`/admin/api/accounts/${uid}`, { method: "DELETE" });
          await refreshAccounts(null);
          state.selectedUid = null;
          state.accountTab = "profile";
          renderAccountsModule();
          setMessage(els.statusMessage, "Account deleted.", "good");
        } catch (error) {
          setMessage(els.statusMessage, getErrorMessage(error), "bad");
        }
      }

      function renderAccessModule() {
        const access = state.access || {};
        const roles = access.roles || [];
        const knownPermissions = access.known_permissions || config.knownPermissions || [];

        els.moduleRoot.innerHTML = `
          <div class="access-grid">
            <section class="panel">
              <div class="panel-title">
                <h3>Roles</h3>
                <span class="chip">${roles.length} configured</span>
              </div>
              <div class="table-scroller">
                <table>
                  <thead>
                    <tr>
                      <th style="width: 150px;">Role</th>
                      <th>Configured</th>
                      <th>Effective</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${roles.map(role => `
                      <tr>
                        <td><span class="chip">${escapeHtml(role.name)}</span></td>
                        <td>${permissionChips(role.configured_permissions || [])}</td>
                        <td>${permissionChips(role.effective_permissions || [])}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            </section>

            <section class="panel">
              <div class="panel-title">
                <h3>Known permissions</h3>
                <span class="chip">${knownPermissions.length}</span>
              </div>
              <div class="panel-body stack">
                ${detailRow("Default role", access.default_role || state.defaultRole)}
                ${detailRow("Default permissions", (access.default_permissions || []).join(", ") || "None")}
                <div class="permission-list">${permissionChips(knownPermissions)}</div>
              </div>
            </section>
          </div>
        `;
      }

      function renderOperationsModule() {
        const selected = getSelectedAccount();
        const target = state.commandTarget || selected?.uid || "";

        els.moduleRoot.innerHTML = `
          <div class="operations-grid">
            <section class="panel">
              <div class="panel-title">
                <h3>Command console</h3>
                <span class="chip">${target ? `Target ${escapeHtml(target)}` : "No target"}</span>
              </div>
              <div class="panel-body">
                <form id="command-form" class="form-grid">
                  <label><span>Target UID</span><input id="command-target" type="number" min="1" value="${escapeAttr(target)}" placeholder="Online player UID"></label>
                  <label class="wide"><span>Command</span><textarea id="command-text" spellcheck="false" placeholder="/help">${escapeHtml(state.commandText)}</textarea></label>
                  <div class="actions wide">
                    <button class="button primary" type="submit">Execute</button>
                    <button id="clear-console-button" class="button subtle" type="button">Clear output</button>
                  </div>
                </form>
              </div>
            </section>

            <section class="panel">
              <div class="panel-title">
                <h3>Output</h3>
              </div>
              <div class="panel-body">
                <pre id="command-output" class="console-output">${escapeHtml(state.commandOutput || "No command output yet.")}</pre>
              </div>
            </section>
          </div>
        `;

        document.getElementById("command-form").addEventListener("submit", handleExecuteCommand);
        document.getElementById("clear-console-button").addEventListener("click", () => {
          state.commandOutput = "";
          renderOperationsModule();
        });
      }

      async function handleExecuteCommand(event) {
        event.preventDefault();
        const targetInput = document.getElementById("command-target");
        const commandInput = document.getElementById("command-text");
        state.commandTarget = targetInput.value.trim();
        state.commandText = commandInput.value.trim();

        if (!state.commandText) {
          setMessage(els.statusMessage, "Command cannot be empty.", "bad");
          return;
        }

        setMessage(els.statusMessage, "Executing command...", "");
        try {
          const data = await api("/admin/api/commands", {
            method: "POST",
            body: JSON.stringify({
              target_uid: state.commandTarget ? Number(state.commandTarget) : null,
              command: state.commandText
            })
          });
          const header = `> ${state.commandText}`;
          const output = data.output || "Command completed with no output.";
          state.commandOutput = [header, output, state.commandOutput].filter(Boolean).join("\n\n");
          renderOperationsModule();
          setMessage(els.statusMessage, "Command executed.", "good");
        } catch (error) {
          setMessage(els.statusMessage, getErrorMessage(error), "bad");
        }
      }

      function filteredAccounts() {
        const query = state.accountQuery.trim().toLowerCase();
        return state.accounts.filter(account => {
          if (state.accountFilter === "online" && !account.online) return false;
          if (state.accountFilter === "banned" && !account.banned) return false;
          if (state.accountFilter === "unverified" && account.email_verified) return false;
          if (state.accountFilter === "password-missing" && account.has_password) return false;

          if (!query) return true;
          return [
            account.uid,
            account.username,
            account.email,
            account.role,
            account.nickname,
            account.permissions,
            account.base_permissions,
            account.effective_permissions,
            account.ban_reason
          ].join(" ").toLowerCase().includes(query);
        });
      }

      function buildAccountPayload(account) {
        const username = document.getElementById("edit-username")?.value.trim() ?? account.username ?? "";
        const email = document.getElementById("edit-email")?.value.trim() ?? account.email ?? "";
        const role = document.getElementById("edit-role")?.value
          ?? document.getElementById("access-role")?.value
          ?? account.role
          ?? state.defaultRole;
        const emailVerified = document.getElementById("edit-email-verified")?.checked ?? account.email_verified;
        const permissions = document.getElementById("access-permissions")?.value ?? account.permissions ?? "";

        return {
          username,
          email,
          role,
          permissions,
          email_verified: emailVerified
        };
      }

      async function refreshAccounts(selectedUid) {
        state.accountsLoaded = false;
        await loadAccounts({ force: true });
        state.selectedUid = selectedUid;
        state.overview = null;
      }

      function getSelectedAccount() {
        return state.accounts.find(account => account.uid === state.selectedUid) || null;
      }

      function selectedUidOrNull() {
        if (!state.selectedUid) {
          setMessage(els.statusMessage, "Select an account first.", "bad");
          return null;
        }
        return state.selectedUid;
      }

      function roleOptions(selectedRole) {
        const roles = state.roles.length ? state.roles : [state.defaultRole];
        return roles.map(role => option(role, role, selectedRole)).join("");
      }

      function option(value, label, selected) {
        return `<option value="${escapeAttr(value)}" ${String(value) === String(selected) ? "selected" : ""}>${escapeHtml(label)}</option>`;
      }

      function tabButton(id, label) {
        return `<button class="tab ${state.accountTab === id ? "active" : ""}" type="button" data-account-tab="${id}">${escapeHtml(label)}</button>`;
      }

      function metricCard(label, value) {
        return `
          <article class="metric-card">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(formatNumber(value || 0))}</strong>
          </article>
        `;
      }

      function detailRow(label, value) {
        return `
          <div class="inline-actions">
            <span class="muted" style="min-width: 135px;">${escapeHtml(label)}</span>
            <strong>${escapeHtml(value ?? "")}</strong>
          </div>
        `;
      }

      function accountStateChips(account) {
        const chips = [];
        if (account.online) chips.push(`<span class="chip good">Online</span>`);
        if (account.banned) chips.push(`<span class="chip bad">Banned</span>`);
        if (!account.email_verified) chips.push(`<span class="chip warn">Email</span>`);
        if (!account.has_password) chips.push(`<span class="chip warn">Password</span>`);
        if (!chips.length) chips.push(`<span class="chip good">OK</span>`);
        return `<span class="inline-actions">${chips.join("")}</span>`;
      }

      function permissionChips(permissions) {
        const items = Array.isArray(permissions)
          ? permissions
          : String(permissions || "").split(/[,\s;]+/).filter(Boolean);

        return `<span class="permission-list">${items.length
          ? items.map(permission => `<span class="chip">${escapeHtml(permission)}</span>`).join("")
          : `<span class="chip">None</span>`}</span>`;
      }

      function setMessage(element, text, kind = "") {
        element.textContent = text;
        element.className = kind ? `message ${kind}` : "message";
        if (element === els.statusMessage) {
          element.classList.add("inline");
        }
      }

      function getErrorMessage(error) {
        return error instanceof Error ? error.message : "Request failed";
      }

      function escapeHtml(value) {
        return String(value ?? "")
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#039;");
      }

      function escapeAttr(value) {
        return escapeHtml(value);
      }

      function formatNumber(value) {
        return new Intl.NumberFormat().format(Number(value) || 0);
      }

      function formatDuration(seconds) {
        seconds = Number(seconds) || 0;
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
      }

      function formatUnix(value) {
        const timestamp = Number(value) || 0;
        if (timestamp <= 0) return "None";
        return new Date(timestamp * 1000).toLocaleString();
      }

      function unixToDateTimeLocal(value) {
        const date = new Date(Number(value) * 1000);
        const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return local.toISOString().slice(0, 16);
      }

      function dateTimeLocalToUnix(value) {
        if (!value) return null;
        const timestamp = new Date(value).getTime();
        return Number.isFinite(timestamp) ? Math.floor(timestamp / 1000) : null;
      }

      init();
    })();
""";
    }
}
