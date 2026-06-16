import DirectoryService from "../services/DirectoryService.js";

class DirectoryController {
  constructor() {
    this.directoryService = new DirectoryService();

    this.searchForm = document.getElementById("directorySearchForm");
    this.searchInput = document.getElementById("directorySearchInput");
    this.directoryContainer = document.getElementById("directoryContainer");
    this.resultBox = document.getElementById("resultBox");

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
  }

  async loadDirectory() {
    this.directoryContainer.innerHTML = `<p>Loading directory...</p>`;

    try {
      const buildings = await this.directoryService.getDirectory();

      this.directoryContainer.innerHTML = "";
      this.selectedLocations.clear();

      buildings.forEach((building) => {
        const buildingBox = document.createElement("div");
        buildingBox.className = "directory-building";

        let floorsHtml = "";

        (building.floors || []).forEach((floor) => {
          let locationsHtml = "";

          (floor.locations || []).forEach((location) => {
            this.selectedLocations.set(String(location.location_id), {
              ...location,
              floors: {
                ...floor,
                buildings: {
                  building_id: building.building_id,
                  building_name: building.building_name,
                  building_code: building.building_code
                }
              }
            });

            locationsHtml += `
              <li>
                <button 
                  class="directory-location-btn" 
                  data-location-id="${location.location_id}">
                  ${location.location_name}
                  ${location.location_code ? `(${location.location_code})` : ""}
                </button>
              </li>
            `;
          });

          floorsHtml += `
            <div class="directory-floor">
              <h4>${floor.floor_name}</h4>
              <ul>${locationsHtml || "<li>No locations added.</li>"}</ul>
            </div>
          `;
        });

        buildingBox.innerHTML = `
          <h3>${building.building_code} - ${building.building_name}</h3>
          ${floorsHtml || "<p>No floors added.</p>"}
        `;

        this.directoryContainer.appendChild(buildingBox);
      });

      document.querySelectorAll(".directory-location-btn").forEach((button) => {
        button.addEventListener("click", () => {
          const locationId = button.dataset.locationId;
          const location = this.selectedLocations.get(String(locationId));

          this.displayLocationDetails(location);
        });
      });

    } catch (error) {
      this.directoryContainer.innerHTML = `<p>${error.message}</p>`;
    }
  }

  async handleSearch() {
    const query = this.searchInput.value.trim();

    if (!query) return;

    this.resultBox.innerHTML = `<p>Searching...</p>`;

    try {
      const result = await this.directoryService.searchLocation(query);

      if (!result) {
        this.resultBox.innerHTML = `
          <div class="result-card">
            <h2>Destination not found</h2>
            <p>Please check the spelling or browse the directory below.</p>
          </div>
        `;
        return;
      }

      this.displayLocationDetails(result);

    } catch (error) {
      this.resultBox.innerHTML = `
        <div class="result-card">
          <h2>Error</h2>
          <p>${error.message}</p>
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
    const entrance = location.entrances;

    this.resultBox.innerHTML = `
      <div class="result-card">
        <h2>${location.location_name}</h2>

        <p><strong>Code:</strong> ${location.location_code || "N/A"}</p>
        <p><strong>Building:</strong> ${building ? `${building.building_code} - ${building.building_name}` : "N/A"}</p>
        <p><strong>Floor:</strong> ${floor?.floor_name || "N/A"}</p>
        <p><strong>Category:</strong> ${category?.category_name || "N/A"}</p>
        <p><strong>Route Endpoint:</strong> ${entrance?.entrance_name || "N/A"}</p>

        <button id="showRouteBtn">Show Route</button>
      </div>
    `;

    document.getElementById("showRouteBtn").addEventListener("click", () => {
      localStorage.setItem("selectedDestination", JSON.stringify(location));
      window.location.href = "index.html?route=true";
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

new DirectoryController();