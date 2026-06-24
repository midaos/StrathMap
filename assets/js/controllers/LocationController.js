import AuthGuard from "../services/AuthGuard.js";
import Location from "../models/Location.js";
import LocationService from "../services/LocationService.js";
import FloorService from "../services/FloorService.js";
import EntranceService from "../services/EntranceService.js";
import LocationCategoryService from "../services/LocationCategoryService.js";

class LocationController {
  constructor() {
    this.authGuard = new AuthGuard();
    this.locationService = new LocationService();
    this.floorService = new FloorService();
    this.entranceService = new EntranceService();
    this.categoryService = new LocationCategoryService();

    this.form = document.getElementById("locationForm");
    this.floorSelect = document.getElementById("floorId");
    this.categorySelect = document.getElementById("categoryId");
    this.entranceSelect = document.getElementById("nearestEntranceId");
    this.tableBody = document.getElementById("locationTableBody");
    this.filterInput = document.getElementById("locationFilterInput");
    this.resultSummary = document.getElementById("locationResultSummary");
    this.message = document.getElementById("message");
    this.editingId = null;
    this.submitButton = null;
    this.locationRecords = [];

    this.initialize();
  }

  async initialize() {
    await this.authGuard.verifyAdmin();
    this.bindEvents();
    await this.loadDropdowns();
    await this.loadLocations();
  }

  bindEvents() {
    this.submitButton = this.form.querySelector('button[type="submit"]');
    this.form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (this.editingId) await this.handleUpdateLocation();
      else await this.handleCreateLocation();
    });

    this.filterInput?.addEventListener("input", () => {
      this.renderLocations();
    });
  }

  async loadDropdowns() {
    const floors = await this.floorService.getAllFloors();
    const categories = await this.categoryService.getAllCategories();
    const entrances = await this.entranceService.getAllEntrances();

    this.floorSelect.innerHTML = `<option value="">Select floor</option>`;
    this.categorySelect.innerHTML = `<option value="">Select category</option>`;
    this.entranceSelect.innerHTML = `<option value="">Select nearest entrance</option>`;

    floors.forEach(record => {
      const option = document.createElement("option");
      option.value = record.floor.floorId;
      option.textContent = `${record.building.building_code} - ${record.floor.floorName}`;
      this.floorSelect.appendChild(option);
    });

    categories.forEach(category => {
      const option = document.createElement("option");
      option.value = category.categoryId;
      option.textContent = category.categoryName;
      this.categorySelect.appendChild(option);
    });

    entrances.forEach(record => {
      const option = document.createElement("option");
      option.value = record.entrance.entranceId;
      option.textContent = `${record.building.building_code} - ${record.entrance.entranceName}`;
      this.entranceSelect.appendChild(option);
    });
  }

  async loadLocations() {
    const records = await this.locationService.getAllLocations();
    this.locationRecords = records;
    this.updateLocationSummary(records);
    this.renderLocations();
  }

  renderLocations() {
    const query = this.filterInput?.value.trim().toLowerCase() || "";
    const records = this.locationRecords.filter((record) => this.matchesLocationFilter(record, query));
    this.tableBody.innerHTML = "";

    if (!records.length) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="8">No locations match the current filter.</td>
        </tr>
      `;
      this.updateResultSummary(records.length, this.locationRecords.length);
      return;
    }

    records.forEach(record => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${this.escapeHTML(record.location.locationName)}</td>
        <td>${this.escapeHTML(record.location.locationCode || "")}</td>
        <td>${this.escapeHTML(record.category?.category_name || "")}</td>
        <td>${this.escapeHTML(record.floor?.buildings?.building_code || "")}</td>
        <td>${this.escapeHTML(record.floor?.floor_name || "")}</td>
        <td>${this.escapeHTML(record.entrance?.entrance_name || "")}</td>
        <td>${record.location.isSearchable ? "Yes" : "No"}</td>
        <td>
          <button class="edit-btn" data-id="${record.location.locationId}">Edit</button>
          <button class="danger-btn" data-id="${record.location.locationId}">Delete</button>
        </td>
      `;

      const buttons = row.querySelectorAll("button");
      buttons[0].addEventListener("click", async () => {
        this.handleEditLocation(record);
      });

      buttons[1].addEventListener("click", async () => {
        await this.handleDeleteLocation(record.location.locationId);
      });

      this.tableBody.appendChild(row);
    });

    this.updateResultSummary(records.length, this.locationRecords.length);
  }

  matchesLocationFilter(record, query) {
    if (!query) return true;

    const searchableText = [
      record.location.locationName,
      record.location.locationCode,
      record.category?.category_name,
      record.floor?.buildings?.building_code,
      record.floor?.buildings?.building_name,
      record.floor?.floor_name,
      record.entrance?.entrance_name,
      record.location.isSearchable ? "searchable" : "hidden"
    ].join(" ").toLowerCase();

    return searchableText.includes(query);
  }

  updateLocationSummary(records) {
    this.setText("locationsTotal", records.length);
    this.setText("locationsSearchable", records.filter((record) => record.location.isSearchable).length);
    this.setText("locationsLinked", records.filter((record) => record.location.nearestEntranceId).length);
  }

  updateResultSummary(visibleCount, totalCount) {
    if (!this.resultSummary) return;

    this.resultSummary.textContent = visibleCount === totalCount
      ? `${totalCount} locations loaded`
      : `${visibleCount} of ${totalCount} locations shown`;
  }

  async handleCreateLocation() {
    try {
      this.message.textContent = "";

      const floorId = Number(document.getElementById("floorId").value);
      const categoryId = Number(document.getElementById("categoryId").value);
      const nearestEntranceId = Number(document.getElementById("nearestEntranceId").value);
      const locationName = document.getElementById("locationName").value.trim();
      const locationCode = document.getElementById("locationCode").value.trim().toUpperCase();
      const description = document.getElementById("description").value.trim();
      const isSearchable = document.getElementById("isSearchable").checked;

      const location = new Location(
        null,
        floorId,
        categoryId,
        nearestEntranceId,
        locationName,
        locationCode,
        description,
        isSearchable
      );

      await this.locationService.createLocation(location);

      this.form.reset();
      document.getElementById("isSearchable").checked = true;

      await this.loadLocations();

      this.message.textContent = "Location added successfully.";
      this.message.className = "message success";
    } catch (error) {
      this.message.textContent = error.message;
      this.message.className = "message error";
    }
  }

  async handleDeleteLocation(locationId) {
    if (!confirm("Delete this location?")) return;

    await this.locationService.deleteLocation(locationId);
    await this.loadLocations();
  }

  handleEditLocation(record) {
    this.editingId = record.location.locationId;
    document.getElementById("floorId").value = record.location.floorId || "";
    document.getElementById("categoryId").value = record.location.categoryId || "";
    document.getElementById("nearestEntranceId").value = record.location.nearestEntranceId || "";
    document.getElementById("locationName").value = record.location.locationName || "";
    document.getElementById("locationCode").value = record.location.locationCode || "";
    document.getElementById("description").value = record.location.description || "";
    document.getElementById("isSearchable").checked = !!record.location.isSearchable;

    if (this.submitButton) this.submitButton.textContent = "Update Location";
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async handleUpdateLocation() {
    try {
      this.message.textContent = "";

      const location = new Location(
        this.editingId,
        Number(document.getElementById("floorId").value),
        Number(document.getElementById("categoryId").value),
        Number(document.getElementById("nearestEntranceId").value),
        document.getElementById("locationName").value.trim(),
        document.getElementById("locationCode").value.trim().toUpperCase(),
        document.getElementById("description").value.trim(),
        document.getElementById("isSearchable").checked
      );

      await this.locationService.updateLocation(location);

      this.editingId = null;
      this.form.reset();
      document.getElementById("isSearchable").checked = true;
      if (this.submitButton) this.submitButton.textContent = "Add Location";

      await this.loadLocations();

      this.message.textContent = "Location updated successfully.";
      this.message.className = "message success";
    } catch (error) {
      this.message.textContent = error.message;
      this.message.className = "message error";
    }
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

new LocationController();
