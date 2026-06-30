import { SupabaseClient } from "../config/SupabaseClient.js";
import AuthGuard from "../services/AuthGuard.js";

class DashboardController {
  constructor() {
    this.authGuard = new AuthGuard();
    this.supabase = SupabaseClient.getClient();
    this.initialize();
  }

  async initialize() {
    await this.authGuard.verifyAdmin();
    this.setDashboardDate();
    await this.loadDashboard();
  }

  async loadDashboard() {
    try {
      const [buildings, floors, entrances, categories, locations, searchLogs] =
        await Promise.all([
          this.fetchRows("buildings", "building_id, building_name, building_code"),
          this.fetchRows("floors", "floor_id, building_id, floor_name"),
          this.fetchRows("entrances", "entrance_id, building_id, status, is_default, latitude, longitude"),
          this.fetchRows("location_categories", "category_id, category_name"),
          this.fetchLocations(),
          this.fetchSearchLogs()
        ]);

      const analytics = this.buildAnalytics({
        buildings,
        floors,
        entrances,
        categories,
        locations,
        searchLogs
      });

      this.renderDashboard(analytics);
    } catch (error) {
      this.showAlert(`Could not load dashboard analytics: ${error.message}`);
    }
  }

  async fetchRows(table, columns) {
    return this.fetchAllRows(table, columns);
  }

  async fetchAllRows(table, columns, orderColumn = null, ascending = true) {
    const pageSize = 1000;
    let from = 0;
    let rows = [];

    while (true) {
      let query = this.supabase
        .from(table)
        .select(columns);

      if (orderColumn) {
        query = query.order(orderColumn, { ascending });
      }

      query = query.range(from, from + pageSize - 1);

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      rows = rows.concat(data || []);

      if (!data || data.length < pageSize) {
        return rows;
      }

      from += pageSize;
    }
  }

  async fetchLocations() {
    return this.fetchAllRows(
      "locations",
      `
        location_id,
        location_name,
        location_code,
        is_searchable,
        floors(
          floor_name,
          buildings(
            building_id,
            building_name,
            building_code
          )
        ),
        location_categories(
          category_id,
          category_name
        ),
        entrances(
          entrance_name,
          latitude,
          longitude
        )
      `
    );
  }

  async fetchSearchLogs() {
    const dashboardColumns = `
      raw_input,
      normalized_query,
      matched_location_id,
      matched_building_id,
      category_id,
      result_status,
      created_at
    `;
    const attempts = [
      { columns: dashboardColumns, orderColumn: "created_at" },
      { columns: "*", orderColumn: "created_at" },
      { columns: dashboardColumns, orderColumn: null },
      { columns: "*", orderColumn: null }
    ];
    let lastError = null;

    for (const attempt of attempts) {
      try {
        const rows = await this.fetchAllRows("search_logs", attempt.columns, attempt.orderColumn, false);
        return this.normalizeSearchLogs(rows);
      } catch (error) {
        lastError = error;
      }
    }

    return [];
  }

  normalizeSearchLogs(rows) {
    return (rows || []).map((row) => {
      const matchedLocationId = row.matched_location_id ?? row.location_id ?? null;
      const matchedBuildingId = row.matched_building_id ?? row.building_id ?? null;
      const status = this.normalizeResultStatus(
        row.result_status ?? row.status ?? row.was_found ?? row.found,
        matchedLocationId || matchedBuildingId
      );

      return {
        ...row,
        raw_input: row.raw_input ?? row.query ?? row.search_query ?? row.search_term ?? "",
        normalized_query: row.normalized_query ?? row.normalized_input ?? row.query_normalized ?? "",
        matched_location_id: matchedLocationId,
        matched_building_id: matchedBuildingId,
        category_id: row.category_id ?? null,
        result_status: status,
        created_at: row.created_at ??
          row.searched_at ??
          row.search_date ??
          row.createdAt ??
          row.inserted_at ??
          row.timestamp ??
          row.logged_at ??
          null
      };
    });
  }

  normalizeResultStatus(value, hasMatch) {
    if (typeof value === "boolean") {
      return value ? "found" : "not_found";
    }

    const status = String(value || "").trim().toLowerCase();

    if (["found", "success", "matched", "match"].includes(status)) {
      return "found";
    }

    if (["not_found", "missed", "failed", "no_match", "not found"].includes(status)) {
      return "not_found";
    }

    return hasMatch ? "found" : "not_found";
  }

  enrichSearchLogs(searchLogs, locations) {
    const locationByQuery = new Map();

    locations.forEach((location) => {
      [
        location.location_code,
        location.location_name,
        `${location.location_code || ""} ${location.location_name || ""}`
      ].forEach((value) => {
        const key = this.normalizeAnalyticsQuery(value);
        if (key) locationByQuery.set(key, location);
      });
    });

    return searchLogs.map((log) => {
      if (log.matched_location_id) return log;

      const queryKey = this.normalizeAnalyticsQuery(
        log.normalized_query || log.raw_input
      );
      const location = locationByQuery.get(queryKey);

      if (!location) return log;

      return {
        ...log,
        matched_location_id: location.location_id,
        matched_building_id: location.floors?.buildings?.building_id ?? log.matched_building_id,
        category_id: location.location_categories?.category_id ?? log.category_id,
        result_status: "found"
      };
    });
  }

  normalizeAnalyticsQuery(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "")
      .replace(/^([A-Z])(\d)(\d{2})$/, "$1$2-$3");
  }

  buildAnalytics({ buildings, floors, entrances, categories, locations, searchLogs }) {
    const locationById = new Map(
      locations.map((location) => [String(location.location_id), location])
    );
    const buildingById = new Map(
      buildings.map((building) => [String(building.building_id), building])
    );
    const categoryById = new Map(
      categories.map((category) => [String(category.category_id), category])
    );
    const enrichedSearchLogs = this.enrichSearchLogs(searchLogs, locations);

    const foundLogs = enrichedSearchLogs.filter((log) => log.result_status === "found");
    const todayLogs = enrichedSearchLogs.filter((log) => this.isToday(log.created_at));
    const weeklyLogs = enrichedSearchLogs.filter((log) => this.isWithinDays(log.created_at, 7));
    const weeklyFoundLogs = weeklyLogs.filter((log) => log.result_status === "found");

    const allTimeLocationCounts = this.countBy(foundLogs, "matched_location_id");
    const weeklyLocationCounts = this.countBy(weeklyFoundLogs, "matched_location_id");
    const buildingCounts = this.countLogMatches(foundLogs, (log) => (
      log.matched_building_id ??
      locationById.get(String(log.matched_location_id))?.floors?.buildings?.building_id
    ));
    const categoryCounts = this.countLogMatches(foundLogs, (log) => (
      log.category_id ??
      locationById.get(String(log.matched_location_id))?.location_categories?.category_id
    ));

    const mostVisited = this.topEntry(allTimeLocationCounts);
    const weeklyWinner = this.topEntry(weeklyLocationCounts);
    const hotspotEntry = weeklyWinner || mostVisited;
    const hasWeeklyHotspot = Boolean(weeklyWinner);
    const topBuilding = this.topEntry(buildingCounts);
    const topCategory = this.topEntry(categoryCounts);
    const searchableLocations = locations.filter((location) => location.is_searchable);
    const routeReadyLocations = locations.filter((location) => (
      location.is_searchable &&
      this.hasValidLatLng(location.entrances?.latitude, location.entrances?.longitude)
    ));
    const mappedEntrances = entrances.filter((entrance) => (
      this.hasValidLatLng(entrance.latitude, entrance.longitude)
    ));

    return {
      buildings,
      floors,
      entrances,
      categories,
      locations,
      searchLogs: enrichedSearchLogs,
      foundLogs,
      todayLogs,
      weeklyLogs,
      searchableLocations,
      routeReadyLocations,
      mappedEntrances,
      mostVisited: this.describeLocationMetric(mostVisited, locationById),
      weeklyWinner: this.describeLocationMetric(hotspotEntry, locationById, {
        fallback: !hasWeeklyHotspot && Boolean(mostVisited)
      }),
      hasWeeklyHotspot,
      topLocations: this.describeRankedLocations(allTimeLocationCounts, locationById),
      topBuilding: this.describeBuildingMetric(topBuilding, buildingById),
      topCategory: this.describeCategoryMetric(topCategory, categoryById),
      topCategories: this.describeRankedCategories(categoryCounts, categoryById),
      weeklyTrend: this.buildWeeklyTrend(enrichedSearchLogs)
    };
  }

  renderDashboard(analytics) {
    this.setText("buildingCount", analytics.buildings.length);
    this.setText("locationCount", analytics.locations.length);
    this.setText("searchCount", analytics.searchLogs.length);
    this.setText("todayCount", analytics.todayLogs.length);
    this.setText("buildingMeta", `${analytics.floors.length} floors mapped in the admin system`);
    this.setText("locationMeta", `${analytics.searchableLocations.length} searchable, ${analytics.routeReadyLocations.length} route-ready`);
    this.setText("searchMeta", `${analytics.foundLogs.length} destination selections recorded`);
    this.setText("todayMeta", `${analytics.weeklyLogs.length} searches across the last 7 days`);

    this.setText("weeklyLocationName", analytics.weeklyWinner.name);
    this.setText("weeklyLocationMeta", analytics.weeklyWinner.meta);
    this.setText("weeklyLocationCount", analytics.weeklyWinner.count);
    this.setText("weeklyLocationCountLabel", analytics.hasWeeklyHotspot ? "weekly searches" : "total searches");

    this.setText("mostVisitedName", analytics.mostVisited.name);
    this.setText("mostVisitedMeta", analytics.mostVisited.meta);
    this.setText("mostVisitedCount", analytics.mostVisited.count);

    this.setText("topCategoryName", analytics.topCategory.name);
    this.setText("topCategoryMeta", analytics.topCategory.meta);

    this.setText("topBuildingName", analytics.topBuilding.name);
    this.setText("topBuildingMeta", analytics.topBuilding.meta);
    this.setText("weeklyTotalBadge", `${analytics.weeklyLogs.length} searches`);

    this.setText("searchableCount", analytics.searchableLocations.length);
    this.setText("entranceCount", analytics.mappedEntrances.length);
    this.setText("floorCount", analytics.floors.length);
    this.setText("categoryCount", analytics.categories.length);

    this.renderWeeklyChart(analytics.weeklyTrend);
    this.renderTopLocations(analytics.topLocations);
    this.renderTopCategories(analytics.topCategories);
  }

  renderWeeklyChart(days) {
    const max = Math.max(...days.map((day) => day.count), 1);
    const chart = document.getElementById("weeklyChart");

    chart.innerHTML = days.map((day) => {
      const height = Math.max(8, Math.round((day.count / max) * 100));
      return `
        <div class="chart-day">
          <div class="chart-bar-track">
            <span class="chart-bar" style="height:${height}%"></span>
          </div>
          <strong>${day.count}</strong>
          <span>${day.label}</span>
        </div>
      `;
    }).join("");
  }

  renderTopLocations(locations) {
    const list = document.getElementById("topLocationsList");

    if (!locations.length) {
      list.innerHTML = `<p class="empty-state">Searches will rank destinations once students start using StrathMap.</p>`;
      return;
    }

    list.innerHTML = locations.map((location, index) => `
      <div class="rank-item">
        <span>${index + 1}</span>
        <div>
          <strong>${this.escapeHTML(location.name)}</strong>
          <small>${this.escapeHTML(location.meta)}</small>
        </div>
        <b>${location.count}</b>
      </div>
    `).join("");
  }

  renderTopCategories(categories) {
    const list = document.getElementById("topCategoriesList");

    if (!list) return;

    if (!categories.length) {
      list.innerHTML = `<p class="empty-state">Category trends will appear once destinations are selected from the directory.</p>`;
      return;
    }

    list.innerHTML = categories.map((category, index) => `
      <div class="rank-item">
        <span>${index + 1}</span>
        <div>
          <strong>${this.escapeHTML(category.name)}</strong>
          <small>${this.escapeHTML(category.meta)}</small>
        </div>
        <b>${category.count}</b>
      </div>
    `).join("");
  }

  describeRankedLocations(counts, locationById) {
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([locationId, count]) => this.describeLocationMetric({ id: locationId, count }, locationById));
  }

  describeRankedCategories(counts, categoryById) {
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([categoryId, count]) => this.describeCategoryMetric({ id: categoryId, count }, categoryById));
  }

  describeLocationMetric(entry, locationById, options = {}) {
    if (!entry) {
      return {
        name: "No search data yet",
        meta: "Destination trends will appear here.",
        count: 0
      };
    }

    const location = locationById.get(String(entry.id));
    const building = location?.floors?.buildings;
    const floorName = location?.floors?.floor_name;
    const category = location?.location_categories?.category_name;
    const buildingName = building
      ? `${building.building_code || ""} ${building.building_name || ""}`.trim()
      : "Unknown building";

    return {
      name: location?.location_name || "Unknown location",
      meta: [
        options.fallback ? "All-time hotspot" : null,
        location?.location_code,
        buildingName,
        floorName,
        category
      ].filter(Boolean).join(" - "),
      count: entry.count
    };
  }

  describeBuildingMetric(entry, buildingById) {
    if (!entry) {
      return {
        name: "No data",
        meta: "Destination selections will reveal the busiest building."
      };
    }

    const building = buildingById.get(String(entry.id));
    return {
      name: building
        ? `${building.building_code || ""} ${building.building_name || ""}`.trim()
        : "Unknown building",
      meta: `${entry.count} destination selections`
    };
  }

  describeCategoryMetric(entry, categoryById) {
    if (!entry) {
      return {
        name: "No category data",
        meta: "Category trends will appear as students search.",
        count: 0
      };
    }

    const category = categoryById.get(String(entry.id));
    return {
      name: category?.category_name || "Unknown category",
      meta: `${entry.count} destination searches`,
      count: entry.count
    };
  }

  buildWeeklyTrend(searchLogs) {
    const formatter = new Intl.DateTimeFormat("en", { weekday: "short" });

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = searchLogs.filter((log) => {
        const createdAt = this.parseDate(log.created_at);
        return createdAt && createdAt >= date && createdAt < nextDate;
      }).length;

      return {
        label: formatter.format(date),
        count
      };
    });
  }

  countBy(rows, key) {
    return rows.reduce((counts, row) => {
      const value = row[key];
      if (!value) return counts;

      const id = String(value);
      counts.set(id, (counts.get(id) || 0) + 1);
      return counts;
    }, new Map());
  }

  countLogMatches(rows, resolver) {
    return rows.reduce((counts, row) => {
      const value = resolver(row);
      if (!value) return counts;

      const id = String(value);
      counts.set(id, (counts.get(id) || 0) + 1);
      return counts;
    }, new Map());
  }

  topEntry(counts) {
    const ranked = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    if (!ranked.length) return null;

    return {
      id: ranked[0][0],
      count: ranked[0][1]
    };
  }

  isToday(value) {
    const date = this.parseDate(value);
    if (!date) return false;

    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  isWithinDays(value, days) {
    const date = this.parseDate(value);
    if (!date) return false;

    const threshold = new Date();
    threshold.setDate(threshold.getDate() - days);
    return date >= threshold;
  }

  hasValidLatLng(latitude, longitude) {
    if (latitude === null || latitude === undefined || latitude === "") return false;
    if (longitude === null || longitude === undefined || longitude === "") return false;

    const lat = Number(latitude);
    const lng = Number(longitude);

    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  }

  parseDate(value) {
    if (!value) return null;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  setDashboardDate() {
    const date = new Intl.DateTimeFormat("en-KE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(new Date());

    this.setText("dashboardDate", date);
  }

  formatDateTime(value) {
    const date = this.parseDate(value);
    if (!date) return "Time not recorded";

    return new Intl.DateTimeFormat("en-KE", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  showAlert(message) {
    const alert = document.getElementById("dashboardAlert");
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

new DashboardController();
