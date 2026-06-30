export default class NotificationService {
  constructor() {
    this.ensureStyles();
    this.toastRegion = this.ensureToastRegion();
  }

  success(message, options = {}) {
    this.show(message, { ...options, type: "success" });
  }

  error(message, options = {}) {
    this.show(message, { ...options, type: "error" });
  }

  warning(message, options = {}) {
    this.show(message, { ...options, type: "warning" });
  }

  deleteError(entityName, error) {
    this.warning(this.getDeleteErrorMessage(entityName, error), {
      title: `${entityName} not deleted`,
      duration: 8000
    });
  }

  getDeleteErrorMessage(entityName, error) {
    const message = String(error?.message || error || "");
    const normalized = message.toLowerCase();

    if (
      normalized.includes("foreign key") ||
      normalized.includes("violates") ||
      normalized.includes("still referenced") ||
      normalized.includes("23503")
    ) {
      return `${entityName} cannot be deleted because other records still use it. Move or delete the linked records first.`;
    }

    return message || `${entityName} could not be deleted.`;
  }

  info(message, options = {}) {
    this.show(message, { ...options, type: "info" });
  }

  show(message, { title = "", type = "info", duration = 5000 } = {}) {
    const toast = document.createElement("div");
    toast.className = `app-toast app-toast-${type}`;
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    toast.innerHTML = `
      ${title ? `<strong>${this.escapeHTML(title)}</strong>` : ""}
      <span>${this.escapeHTML(message)}</span>
      <button type="button" aria-label="Dismiss notification">Close</button>
    `;

    toast.querySelector("button").addEventListener("click", () => toast.remove());
    this.toastRegion.appendChild(toast);

    if (duration > 0) {
      window.setTimeout(() => toast.remove(), duration);
    }
  }

  confirm({
    title = "Confirm action",
    message = "Are you sure?",
    confirmText = "Confirm",
    cancelText = "Cancel",
    tone = "danger"
  } = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "app-confirm-overlay";
      overlay.innerHTML = `
        <section class="app-confirm-card" role="dialog" aria-modal="true" aria-labelledby="appConfirmTitle">
          <span class="app-confirm-kicker">${tone === "danger" ? "Please confirm" : "Action required"}</span>
          <h2 id="appConfirmTitle">${this.escapeHTML(title)}</h2>
          <p>${this.escapeHTML(message)}</p>
          <div class="app-confirm-actions">
            <button type="button" class="app-confirm-cancel">${this.escapeHTML(cancelText)}</button>
            <button type="button" class="app-confirm-accept ${tone === "danger" ? "danger" : ""}">${this.escapeHTML(confirmText)}</button>
          </div>
        </section>
      `;

      const close = (value) => {
        overlay.remove();
        resolve(value);
      };

      overlay.querySelector(".app-confirm-cancel").addEventListener("click", () => close(false));
      overlay.querySelector(".app-confirm-accept").addEventListener("click", () => close(true));
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) close(false);
      });
      overlay.addEventListener("keydown", (event) => {
        if (event.key === "Escape") close(false);
      });

      document.body.appendChild(overlay);
      overlay.querySelector(".app-confirm-cancel").focus();
    });
  }

  ensureToastRegion() {
    let region = document.getElementById("appNotificationRegion");

    if (!region) {
      region = document.createElement("div");
      region.id = "appNotificationRegion";
      region.className = "app-toast-region";
      region.setAttribute("aria-live", "polite");
      document.body.appendChild(region);
    }

    return region;
  }

  ensureStyles() {
    if (document.getElementById("appNotificationStyles")) return;

    const style = document.createElement("style");
    style.id = "appNotificationStyles";
    style.textContent = `
      .app-toast-region {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 3000;
        display: grid;
        gap: 10px;
        width: min(380px, calc(100vw - 28px));
      }

      .app-toast {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 5px 12px;
        padding: 13px 14px;
        border: 1px solid rgba(0, 0, 0, 0.12);
        border-left: 5px solid #006699;
        border-radius: 8px;
        background: #ffffff;
        color: #000000;
        box-shadow: 0 18px 46px rgba(0, 0, 0, 0.18);
      }

      .app-toast strong,
      .app-toast span {
        grid-column: 1;
      }

      .app-toast strong {
        font-size: 0.82rem;
      }

      .app-toast span {
        color: rgba(0, 0, 0, 0.72);
        font-size: 0.88rem;
        line-height: 1.35;
      }

      .app-toast button {
        grid-column: 2;
        grid-row: 1 / span 2;
        align-self: start;
        min-height: 30px;
        padding: 0 9px;
        border: 1px solid rgba(0, 0, 0, 0.14);
        border-radius: 6px;
        background: #ffffff;
        color: #000000;
        font-size: 0.72rem;
        font-weight: 800;
      }

      .app-toast-success {
        border-left-color: #006699;
      }

      .app-toast-warning {
        border-left-color: #FFCC00;
      }

      .app-toast-error {
        border-left-color: #CC0000;
      }

      .app-confirm-overlay {
        position: fixed;
        inset: 0;
        z-index: 3100;
        display: grid;
        place-items: center;
        padding: 20px;
        background: rgba(0, 0, 0, 0.42);
      }

      .app-confirm-card {
        width: min(440px, 100%);
        padding: 22px;
        border-radius: 10px;
        background: #ffffff;
        box-shadow: 0 28px 80px rgba(0, 0, 0, 0.26);
      }

      .app-confirm-kicker {
        color: #006699;
        font-size: 0.72rem;
        font-weight: 900;
        letter-spacing: 0.07em;
        text-transform: uppercase;
      }

      .app-confirm-card h2 {
        margin: 7px 0 8px;
        color: #000000;
        font-size: 1.22rem;
      }

      .app-confirm-card p {
        margin: 0;
        color: rgba(0, 0, 0, 0.68);
        line-height: 1.5;
      }

      .app-confirm-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
      }

      .app-confirm-actions button {
        min-height: 40px;
        padding: 0 14px;
        border-radius: 6px;
        font-weight: 800;
      }

      .app-confirm-cancel {
        border: 1px solid rgba(0, 0, 0, 0.18);
        background: #ffffff;
        color: #000000;
      }

      .app-confirm-accept {
        border: 0;
        background: #006699;
        color: #ffffff;
      }

      .app-confirm-accept.danger {
        background: #CC0000;
      }

      @media (max-width: 640px) {
        .app-toast-region {
          left: 12px;
          right: 12px;
          bottom: max(12px, env(safe-area-inset-bottom));
          width: auto;
        }

        .app-confirm-actions {
          display: grid;
        }

        .app-confirm-actions button {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  escapeHTML(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
