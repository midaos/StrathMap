import DirectoryService from "../services/DirectoryService.js";

class DirectoryController {
  constructor() {
    this.directoryService = new DirectoryService();

    this.searchForm = document.getElementById("directorySearchForm");
    this.searchInput = document.getElementById("directorySearchInput");
    this.directoryContainer = document.getElementById("directoryContainer");
    this.resultBox = document.getElementById("resultBox");
    this.expandDirectoryBtn = document.getElementById("expandDirectoryBtn");
    this.collapseDirectoryBtn = document.getElementById("collapseDirectoryBtn");

    this.selectedLocations = new Map();

    this.initialize();
  }

  async initialize() {
    this.bindEvents();
    await this.loadDirectory();
  }

  bindEvents() {
    this.searchForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      await this.handleSearch();
    });

    this.expandDirectoryBtn?.addEventListener("click", () => {
      this.setDirectoryExpanded(true);
    });

    this.collapseDirectoryBtn?.addEventListener("click", () => {
      this.setDirectoryExpanded(false);
    });

    this.directoryContainer.addEventListener("click", (event) => {
      const buildingToggle = event.target.closest(".building-card-header");
      if (buildingToggle) {
        this.toggleBuilding(buildingToggle);
        return;
      }

      const floorToggle = event.target.closest(".floor-card-heading");
      if (floorToggle) {
        this.toggleFloor(floorToggle);
        return;
      }

      const locationButton = event.target.closest(".directory-location-card");
      if (locationButton) {
        const locationId = locationButton.dataset.locationId;
        const location = this.selectedLocations.get(String(locationId));
        this.displayLocationDetails(location);
      }
    });
  }

  async loadDirectory() {
    this.directoryContainer.innerHTML = `<div class="directory-loading">Loading directory...</div>`;

    try {
      const buildings = await this.directoryService.getDirectory();

      this.directoryContainer.innerHTML = "";
      this.selectedLocations.clear();
      this.directoryContainer.classList.add("directory-card-grid");

      buildings.forEach((building, buildingIndex) => {
        const buildingBox = document.createElement("article");
        buildingBox.className = "directory-building-card";
        const buildingKey = `building-${building.building_id || buildingIndex}`;
        const buildingBodyId = `${buildingKey}-body`;

        let floorsHtml = "";
        let locationCount = 0;

        (building.floors || []).forEach((floor, floorIndex) => {
          const floorKey = `${buildingKey}-floor-${floor.floor_id || floorIndex}`;
          const floorBodyId = `${floorKey}-body`;
          let locationsHtml = "";

          (floor.locations || []).forEach((location) => {
            locationCount += 1;

            this.selectedLocations.set(String(location.location_id), {
              ...location,
              floors: {
                ...floor,
                buildings: {
                  building_id: building.building_id,
                  building_name: building.building_name,
                  building_code: building.building_code,
                  latitude: building.latitude,
                  longitude: building.longitude
                }
              }
            });

            const category = location.location_categories?.category_name || "Campus location";
            const roomCode = location.location_code || "No room code";

            locationsHtml += `
              <button
                class="directory-location-card"
                data-location-id="${location.location_id}">
                <span class="location-card-code">${this.escapeHTML(location.location_code || "No code")}</span>
                <strong>${this.escapeHTML(location.location_name)}</strong>
                <span class="location-card-meta">${this.escapeHTML(category)} - ${this.escapeHTML(roomCode)}</span>
                <span class="location-card-action">View details</span>
                </button>
            `;
          });

          floorsHtml += `
            <section class="directory-floor-card">
              <button
                class="floor-card-heading"
                type="button"
                aria-expanded="false"
                aria-controls="${this.escapeHTML(floorBodyId)}">
                <span>${this.escapeHTML(floor.floor_name || "Unnamed floor")}</span>
                <small>${(floor.locations || []).length} locations</small>
                <i aria-hidden="true">Open</i>
              </button>
              <div id="${this.escapeHTML(floorBodyId)}" class="location-card-grid floor-card-body" hidden>
                ${locationsHtml || `<p class="empty-state">No locations added on this floor.</p>`}
              </div>
            </section>
          `;
        });

        buildingBox.innerHTML = `
          <button
            class="building-card-header"
            type="button"
            aria-expanded="false"
            aria-controls="${this.escapeHTML(buildingBodyId)}">
            <span class="building-code-chip">${this.escapeHTML(building.building_code || "BLD")}</span>
            <div>
              <h3>${this.escapeHTML(building.building_name || "Unnamed building")}</h3>
              <p>${locationCount} locations across ${(building.floors || []).length} floors</p>
            </div>
            <span class="building-toggle-label" aria-hidden="true">Open</span>
          </button>
          <div id="${this.escapeHTML(buildingBodyId)}" class="building-card-body" hidden>
            ${floorsHtml || `<p class="empty-state">No floors added for this building.</p>`}
          </div>
        `;

        this.directoryContainer.appendChild(buildingBox);
      });

    } catch (error) {
      this.directoryContainer.innerHTML = `<div class="result-card result-error"><h2>Directory unavailable</h2><p>${this.escapeHTML(error.message)}</p></div>`;
    }
  }

  toggleBuilding(toggleButton) {
    const card = toggleButton.closest(".directory-building-card");
    const isOpen = card.classList.toggle("is-open");
    const body = card.querySelector(".building-card-body");
    if (body) body.hidden = !isOpen;
    toggleButton.setAttribute("aria-expanded", String(isOpen));
    toggleButton.querySelector(".building-toggle-label").textContent = isOpen ? "Close" : "Open";
  }

  toggleFloor(toggleButton) {
    const card = toggleButton.closest(".directory-floor-card");
    const isOpen = card.classList.toggle("is-open");
    const body = card.querySelector(".floor-card-body");
    if (body) body.hidden = !isOpen;
    toggleButton.setAttribute("aria-expanded", String(isOpen));
    toggleButton.querySelector("i").textContent = isOpen ? "Close" : "Open";
  }

  setDirectoryExpanded(shouldExpand) {
    document.querySelectorAll(".directory-building-card").forEach((card) => {
      card.classList.toggle("is-open", shouldExpand);
      const body = card.querySelector(".building-card-body");
      if (body) body.hidden = !shouldExpand;
      const toggleButton = card.querySelector(".building-card-header");
      toggleButton?.setAttribute("aria-expanded", String(shouldExpand));
      const label = toggleButton?.querySelector(".building-toggle-label");
      if (label) label.textContent = shouldExpand ? "Close" : "Open";
    });

    document.querySelectorAll(".directory-floor-card").forEach((card) => {
      card.classList.toggle("is-open", shouldExpand);
      const body = card.querySelector(".floor-card-body");
      if (body) body.hidden = !shouldExpand;
      const toggleButton = card.querySelector(".floor-card-heading");
      toggleButton?.setAttribute("aria-expanded", String(shouldExpand));
      const label = toggleButton?.querySelector("i");
      if (label) label.textContent = shouldExpand ? "Close" : "Open";
    });
  }

  async handleSearch() {
    const query = this.searchInput.value.trim();

    if (!query) return;

    this.resultBox.innerHTML = `<div class="directory-loading">Searching...</div>`;

    try {
      const result = await this.directoryService.searchLocation(query);

      if (!result) {
        this.resultBox.innerHTML = `
          <div class="result-card result-empty">
            <h2>Destination not found</h2>
            <p>Please check the spelling or browse the directory below.</p>
          </div>
        `;
        return;
      }

      this.displayLocationDetails(result);

    } catch (error) {
      this.resultBox.innerHTML = `
        <div class="result-card result-error">
          <h2>Error</h2>
          <p>${this.escapeHTML(error.message)}</p>
        </div>
      `;
    }
  }

  displayLocationDetails(location) {
    if (!location) {
      this.resultBox.innerHTML = `
        <div class="result-card">
          <h2>Error</h2>
          <p>Location details could not be loaded.</p>
        </div>
      `;
      return;
    }

    const building = location.floors?.buildings;
    const floor = location.floors;
    const category = location.location_categories;

    this.resultBox.innerHTML = `
      <div class="result-card result-card-featured">
        <div class="result-card-header">
          <span class="destination-label">Selected destination</span>
          <h2>${this.escapeHTML(location.location_name)}</h2>
          <p>${this.escapeHTML(location.location_code || "No room code")}</p>
        </div>

        <dl class="result-detail-grid">
          <div>
            <dt>Building</dt>
            <dd>${this.escapeHTML(building ? `${building.building_code} - ${building.building_name}` : "N/A")}</dd>
          </div>
          <div>
            <dt>Floor</dt>
            <dd>${this.escapeHTML(floor?.floor_name || "N/A")}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>${this.escapeHTML(category?.category_name || "N/A")}</dd>
          </div>
          <div>
            <dt>Room code</dt>
            <dd>${this.escapeHTML(location.location_code || "N/A")}</dd>
          </div>
        </dl>

        <button id="showRouteBtn">Show Route</button>
      </div>
    `;

    document.getElementById("showRouteBtn").addEventListener("click", () => {
      localStorage.setItem("selectedDestination", JSON.stringify(location));
      window.location.href = "index.html?route=true";
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
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

new DirectoryController();
