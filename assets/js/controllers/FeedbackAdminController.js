import AuthGuard from "../services/AuthGuard.js";
import FeedbackService from "../services/FeedbackService.js";

class FeedbackAdminController {
  constructor() {
    this.authGuard = new AuthGuard();
    this.feedbackService = new FeedbackService();
    this.feedbackRows = [];

    this.list = document.getElementById("feedbackList");
    this.searchInput = document.getElementById("feedbackSearchInput");
    this.categoryFilter = document.getElementById("feedbackCategoryFilter");
    this.resultSummary = document.getElementById("feedbackResultSummary");

    this.initialize();
  }

  async initialize() {
    await this.authGuard.verifyAdmin();
    this.bindEvents();
    await this.loadFeedback();
  }

  bindEvents() {
    this.searchInput?.addEventListener("input", () => this.renderFeedback());
    this.categoryFilter?.addEventListener("change", () => this.renderFeedback());
  }

  async loadFeedback() {
    try {
      this.feedbackRows = await this.feedbackService.getAllFeedback();
      this.populateCategoryFilter(this.feedbackRows);
      this.renderSummary(this.feedbackRows);
      this.renderFeedback();
      this.setUpdatedAt();
    } catch (error) {
      this.showAlert(`Could not load feedback: ${error.message}`);
    }
  }

  renderFeedback() {
    const rows = this.getFilteredFeedback();

    if (!rows.length) {
      this.list.innerHTML = `<p class="empty-state">No feedback matches the current filters.</p>`;
      this.updateResultSummary(rows.length);
      return;
    }

    this.list.innerHTML = rows.map((row) => `
      <article class="feedback-admin-card">
        <div class="feedback-admin-header">
          <div>
            <span class="feedback-category">${this.escapeHTML(row.category)}</span>
            <h3>${this.escapeHTML(row.destination || row.searched_query || "General StrathMap feedback")}</h3>
          </div>
          <span class="feedback-rating">${this.formatRating(row.rating)}</span>
        </div>
        <p>${this.escapeHTML(row.feedback_message)}</p>
        <dl>
          <div>
            <dt>User</dt>
            <dd>${this.escapeHTML(row.user_name || "Anonymous")}</dd>
          </div>
          <div>
            <dt>Page</dt>
            <dd>${this.escapeHTML(row.current_page || "Not recorded")}</dd>
          </div>
          <div>
            <dt>Search</dt>
            <dd>${this.escapeHTML(row.searched_query || "Not provided")}</dd>
          </div>
          <div>
            <dt>Device</dt>
            <dd>${this.escapeHTML([row.device_type, row.browser].filter(Boolean).join(" - ") || "Not recorded")}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>${this.formatCoordinates(row)}</dd>
          </div>
          <div>
            <dt>Submitted</dt>
            <dd>${this.formatDateTime(row.submitted_at)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>${this.escapeHTML(row.status || "New")}</dd>
          </div>
          <div>
            <dt>Admin notes</dt>
            <dd>${this.escapeHTML(row.admin_notes || "None")}</dd>
          </div>
        </dl>
      </article>
    `).join("");

    this.updateResultSummary(rows.length);
  }

  getFilteredFeedback() {
    const query = this.searchInput?.value.trim().toLowerCase() || "";
    const category = this.categoryFilter?.value || "";

    return this.feedbackRows.filter((row) => {
      const matchesCategory = !category || row.category === category;
      const matchesQuery = !query || [
        row.user_name,
        row.category,
        row.searched_query,
        row.destination,
        row.current_page,
        row.feedback_message,
        row.device_type,
        row.browser,
        row.status
      ].join(" ").toLowerCase().includes(query);

      return matchesCategory && matchesQuery;
    });
  }

  renderSummary(rows) {
    const ratings = rows
      .map((row) => Number(row.rating))
      .filter((rating) => Number.isFinite(rating));
    const average = ratings.length
      ? (ratings.reduce((total, rating) => total + rating, 0) / ratings.length).toFixed(1)
      : "0";
    const topCategory = this.getTopCategory(rows);

    this.setText("feedbackTotal", rows.length);
    this.setText("feedbackAverage", average);
    this.setText("feedbackTopCategory", topCategory.name);
    this.setText("feedbackTopCategoryMeta", topCategory.count ? `${topCategory.count} submissions` : "No category data yet");
  }

  populateCategoryFilter(rows) {
    if (!this.categoryFilter) return;

    const categories = [...new Set(rows.map((row) => row.category).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));

    this.categoryFilter.innerHTML = `
      <option value="">All categories</option>
      ${categories.map((category) => `<option value="${this.escapeHTML(category)}">${this.escapeHTML(category)}</option>`).join("")}
    `;
  }

  getTopCategory(rows) {
    const counts = rows.reduce((map, row) => {
      if (!row.category) return map;
      map.set(row.category, (map.get(row.category) || 0) + 1);
      return map;
    }, new Map());

    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);

    if (!ranked.length) {
      return { name: "None", count: 0 };
    }

    return {
      name: ranked[0][0],
      count: ranked[0][1]
    };
  }

  updateResultSummary(visibleCount) {
    if (!this.resultSummary) return;

    this.resultSummary.textContent = visibleCount === this.feedbackRows.length
      ? `${this.feedbackRows.length} feedback submissions loaded`
      : `${visibleCount} of ${this.feedbackRows.length} submissions shown`;
  }

  setUpdatedAt() {
    const formatter = new Intl.DateTimeFormat("en-KE", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });

    this.setText("feedbackUpdatedAt", `Updated ${formatter.format(new Date())}`);
  }

  formatRating(rating) {
    const value = Number(rating);
    return Number.isFinite(value) ? `${value}/5` : "No rating";
  }

  formatCoordinates(row) {
    if (row.latitude === null || row.latitude === undefined || row.longitude === null || row.longitude === undefined) {
      return "Not shared";
    }

    return `${Number(row.latitude).toFixed(6)}, ${Number(row.longitude).toFixed(6)}`;
  }

  formatDateTime(value) {
    if (!value) return "Not recorded";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not recorded";

    return new Intl.DateTimeFormat("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  showAlert(message) {
    const alert = document.getElementById("feedbackAlert");
    if (!alert) return;

    alert.hidden = false;
    alert.textContent = message;
  }

  setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
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

new FeedbackAdminController();
