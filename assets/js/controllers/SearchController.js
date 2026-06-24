import SearchService from "../services/SearchService.js";

class SearchController {
  constructor() {
    this.searchService = new SearchService();

    this.form = document.getElementById("searchForm");
    this.searchInput = document.getElementById("searchInput");
    this.resultBox = document.getElementById("resultBox");

    this.bindEvents();
  }

  bindEvents() {
    this.form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await this.handleSearch();
    });
  }

  async handleSearch() {
    const query = this.searchInput.value.trim();

    if (!query) return;

    this.resultBox.innerHTML = `<p>Searching...</p>`;

    try {
      const result = await this.searchService.searchDestination(query);

      if (!result) {
        this.resultBox.innerHTML = `
          <div class="result-card">
            <h2>Destination not found</h2>
            <p>Please check the spelling or browse the directory.</p>
          </div>
        `;
        return;
      }

      this.displayResult(result);

    } catch (error) {
      this.resultBox.innerHTML = `
        <div class="result-card">
          <h2>Error</h2>
          <p>${error.message}</p>
        </div>
      `;
    }
  }

  displayResult(result) {
    const building = result.floors.buildings;
    const floor = result.floors;
    const category = result.location_categories;
    const entrance = result.entrances;

    this.resultBox.innerHTML = `
      <div class="result-card">
        <h2>${result.location_name}</h2>

        <p><strong>Code:</strong> ${result.location_code || "N/A"}</p>
        <p><strong>Building:</strong> ${building.building_code} - ${building.building_name}</p>
        <p><strong>Floor:</strong> ${floor.floor_name}</p>
        <p><strong>Category:</strong> ${category.category_name}</p>
        <p><strong>Building entrance:</strong> ${entrance.entrance_name}</p>

        <button id="directionsBtn">
          Get Directions
        </button>
      </div>
    `;

    document.getElementById("directionsBtn").addEventListener("click", () => {
      localStorage.setItem("selectedDestination", JSON.stringify(result));
      window.location.href = "destination.html";
    });
  }
}

new SearchController();
