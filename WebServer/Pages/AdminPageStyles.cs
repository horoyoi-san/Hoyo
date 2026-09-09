namespace March7thHoney.WebServer.Pages;

public static class AdminPageStyles
{
    public static string Render()
    {
        return """
    :root {
      color-scheme: dark;
      --bg: #0b0d11;
      --band: #12151b;
      --panel: #161a21;
      --panel-2: #1d222b;
      --panel-3: #262d38;
      --ink: #eef2f7;
      --muted: #9aa5b4;
      --soft: #6f7b8b;
      --line: #262d38;
      --blue: #4c8dff;
      --green: #35c98a;
      --amber: #e9b558;
      --red: #f2726a;
      --shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
      --radius: 12px;
      --radius-sm: 8px;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      background: var(--bg);
      color: var(--ink);
      font-family: "Inter", "Segoe UI", system-ui, "Microsoft YaHei", Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    button,
    input,
    select,
    textarea {
      font: inherit;
    }

    button {
      border: 0;
    }

    input,
    select,
    textarea {
      width: 100%;
      min-height: 42px;
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      background: #0f1319;
      color: var(--ink);
      outline: none;
      padding: 10px 13px;
      transition: border-color .15s ease, box-shadow .15s ease;
    }

    textarea {
      min-height: 96px;
      resize: vertical;
      line-height: 1.45;
    }

    input:focus,
    select:focus,
    textarea:focus {
      border-color: var(--blue);
      box-shadow: 0 0 0 3px rgba(76, 141, 255, 0.18);
    }

    label {
      display: grid;
      gap: 7px;
      color: var(--muted);
      font-size: 13px;
      font-weight: 600;
    }

    label span {
      overflow-wrap: anywhere;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    th,
    td {
      padding: 13px 16px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: middle;
      font-size: 13px;
    }

    th {
      color: var(--soft);
      background: var(--panel-2);
      font-weight: 600;
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      position: sticky;
      top: 0;
      z-index: 1;
    }

    td {
      color: var(--ink);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    tbody tr {
      cursor: pointer;
    }

    tbody tr:hover {
      background: rgba(76, 141, 255, 0.07);
    }

    tbody tr.selected {
      background: rgba(53, 201, 138, 0.10);
      box-shadow: inset 3px 0 0 var(--green);
    }

    .hidden {
      display: none !important;
    }

    .login-view {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
    }

    .login-card {
      width: min(100%, 430px);
      display: grid;
      gap: 24px;
      padding: 28px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--panel);
      box-shadow: var(--shadow);
    }

    .login-card h1,
    .topbar h1,
    .module-heading h2,
    .panel-title h3 {
      margin: 0;
      letter-spacing: 0;
      overflow-wrap: anywhere;
    }

    .login-card h1 {
      font-size: 26px;
      line-height: 1.2;
    }

    .admin-app {
      min-height: 100vh;
      display: grid;
      grid-template-rows: auto 1fr;
    }

    .topbar {
      min-height: 76px;
      padding: 16px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      border-bottom: 1px solid var(--line);
      background: var(--band);
    }

    .topbar h1 {
      font-size: 22px;
      line-height: 1.15;
    }

    .topbar-actions,
    .actions,
    .tabs,
    .inline-actions,
    .check-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .server-name,
    .muted,
    .empty,
    .hint {
      color: var(--muted);
    }

    .server-name {
      margin: 4px 0 0;
      font-size: 13px;
    }

    .eyebrow {
      margin: 0 0 6px;
      color: var(--green);
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0;
    }

    .admin-layout {
      display: grid;
      grid-template-columns: 250px minmax(0, 1fr);
      min-height: 0;
    }

    .sidebar {
      border-right: 1px solid var(--line);
      background: #14161b;
      padding: 18px;
    }

    .module-nav {
      display: grid;
      gap: 8px;
    }

    .nav-button {
      width: 100%;
      min-height: 48px;
      display: grid;
      gap: 2px;
      border-radius: 8px;
      padding: 10px 12px;
      background: transparent;
      color: var(--muted);
      text-align: left;
      cursor: pointer;
    }

    .nav-button:hover,
    .nav-button.active {
      background: var(--panel-2);
      color: var(--ink);
    }

    .nav-button strong {
      color: inherit;
      font-size: 14px;
    }

    .nav-button span {
      color: var(--soft);
      font-size: 12px;
    }

    .content {
      min-width: 0;
      padding: 24px;
      display: grid;
      align-content: start;
      gap: 18px;
    }

    .module-heading {
      min-height: 58px;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }

    .module-heading h2 {
      font-size: 26px;
      line-height: 1.2;
    }

    .module-root,
    .stack {
      display: grid;
      gap: 16px;
    }

    .metric-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(150px, 1fr));
      gap: 14px;
    }

    .metric-card,
    .panel {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      box-shadow: var(--shadow);
    }

    .metric-card {
      min-height: 104px;
      display: grid;
      align-content: center;
      gap: 8px;
      padding: 16px;
    }

    .metric-card span {
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .metric-card strong {
      font-size: 28px;
      line-height: 1;
      overflow-wrap: anywhere;
    }

    .panel {
      overflow: hidden;
    }

    .panel-body {
      padding: 16px;
    }

    .panel-title,
    .toolbar {
      min-height: 58px;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 1px solid var(--line);
    }

    .panel-title h3 {
      font-size: 16px;
    }

    .dashboard-grid,
    .account-grid,
    .access-grid,
    .operations-grid {
      display: grid;
      gap: 16px;
      align-items: start;
    }

    .dashboard-grid {
      grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr);
    }

    .account-grid {
      grid-template-columns: minmax(0, 1fr) minmax(360px, 460px);
    }

    .access-grid,
    .operations-grid {
      grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
    }

    .toolbar {
      flex-wrap: wrap;
    }

    .toolbar input {
      flex: 1 1 280px;
      max-width: 560px;
    }

    .table-scroller {
      overflow: auto;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .form-grid .wide,
    .wide {
      grid-column: 1 / -1;
    }

    .button {
      min-height: 40px;
      border-radius: var(--radius-sm);
      padding: 9px 16px;
      background: var(--panel-3);
      color: var(--ink);
      cursor: pointer;
      font-weight: 600;
      transition: filter .15s ease, transform .1s ease;
    }

    .button:hover:not(:disabled) {
      filter: brightness(1.15);
      transform: translateY(-1px);
    }

    .button:active:not(:disabled) {
      transform: translateY(0);
    }

    .button:disabled {
      cursor: not-allowed;
      opacity: 0.58;
    }

    .button.primary {
      background: var(--blue);
      color: #08111f;
    }

    .button.success {
      background: var(--green);
      color: #07150f;
    }

    .button.danger {
      background: rgba(239, 111, 100, 0.16);
      color: #ffc2bd;
    }

    .button.subtle {
      background: #20252d;
      color: var(--muted);
    }

    .chip {
      display: inline-flex;
      align-items: center;
      min-height: 26px;
      max-width: 100%;
      border-radius: 999px;
      padding: 4px 9px;
      background: rgba(255, 255, 255, 0.07);
      color: var(--muted);
      font-size: 12px;
      font-weight: 900;
      white-space: nowrap;
    }

    .chip.good {
      background: rgba(67, 200, 137, 0.14);
      color: #7be0ad;
    }

    .chip.warn {
      background: rgba(239, 181, 87, 0.15);
      color: #ffd089;
    }

    .chip.bad {
      background: rgba(239, 111, 100, 0.15);
      color: #ffaaa3;
    }

    .message {
      min-height: 20px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
    }

    .message.inline {
      text-align: right;
      max-width: min(48vw, 520px);
    }

    .message.good {
      color: var(--green);
    }

    .message.bad {
      color: var(--red);
    }

    .empty {
      padding: 22px;
      text-align: center;
    }

    .tabs {
      padding: 12px 16px 0;
      border-bottom: 1px solid var(--line);
    }

    .tab {
      min-height: 34px;
      border-radius: 6px 6px 0 0;
      background: transparent;
      color: var(--muted);
      cursor: pointer;
      padding: 7px 10px;
      font-weight: 800;
    }

    .tab.active {
      background: var(--panel-2);
      color: var(--ink);
    }

    .check-row {
      justify-content: flex-start;
      color: var(--muted);
      font-size: 13px;
      font-weight: 800;
    }

    .check-row input {
      width: 18px;
      min-height: 18px;
      padding: 0;
    }

    .permission-list {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .permission-list .chip {
      white-space: normal;
    }

    .console-output {
      min-height: 240px;
      max-height: 420px;
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #0b0d10;
      color: #d5dde6;
      padding: 14px;
      white-space: pre-wrap;
      line-height: 1.45;
      font-family: "Cascadia Mono", "Consolas", monospace;
      font-size: 13px;
    }

    .danger-zone {
      border-color: rgba(239, 111, 100, 0.42);
    }

    @media (max-width: 1180px) {
      .metric-grid {
        grid-template-columns: repeat(3, minmax(150px, 1fr));
      }

      .dashboard-grid,
      .account-grid,
      .access-grid,
      .operations-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 820px) {
      /* iOS Safari force-zooms the page when a focused field is under 16px. */
      input,
      select,
      textarea {
        font-size: 16px;
      }

      .topbar,
      .module-heading {
        align-items: stretch;
        flex-direction: column;
      }

      .admin-layout {
        grid-template-columns: 1fr;
      }

      .sidebar {
        border-right: 0;
        border-bottom: 1px solid var(--line);
      }

      .module-nav {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .content {
        padding: 18px;
      }

      .message.inline {
        max-width: none;
        text-align: left;
      }
    }

    @media (max-width: 620px) {
      .metric-grid,
      .form-grid,
      .module-nav {
        grid-template-columns: 1fr;
      }

      .topbar {
        padding: 16px 18px;
      }

      th:nth-child(3),
      td:nth-child(3),
      th:nth-child(4),
      td:nth-child(4) {
        display: none;
      }
    }
""";
    }
}
