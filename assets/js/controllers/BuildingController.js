import AuthGuard from "../services/AuthGuard.js";
import Building from "../models/Building.js";
import BuildingService from "../services/BuildingService.js";
import NotificationService from "../services/NotificationService.js";

class BuildingController {
  constructor() {
    this.authGuard = new AuthGuard();
    this.buildingService = new BuildingService();
    this.notifications = new NotificationService();

    this.form = document.getElementById("buildingForm");
    this.tableBody = document.getElementById("buildingTableBody");
    this.message = document.getElementById("message");
    this.editingId = null;
    this.submitButton = null;

    this.initialize();
  }

  async initialize() {
    await this.authGuard.verifyAdmin();
    this.bindEvents();
    await this.loadBuildings();
  }

  bindEvents() {
    this.submitButton = this.form.querySelector('button[type="submit"]');
    this.form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (this.editingId) await this.handleUpdateBuilding();
      else await this.handleCreateBuilding();
    });
  }

  async loadBuildings() {
    const buildings = await this.buildingService.getAllBuildings();

    this.tableBody.innerHTML = "";

    buildings.forEach((building) => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${building.buildingName}</td>
        <td>${building.buildingCode}</td>
        <td>${building.description || ""}</td>
        <td>
          <button class="edit-btn" data-id="${building.buildingId}">Edit</button>
          <button class="danger-btn" data-id="${building.buildingId}">Delete</button>
        </td>
      `;

      const buttons = row.querySelectorAll("button");
      buttons[0].addEventListener("click", async () => {
        this.handleEditBuilding(building);
      });

      buttons[1].addEventListener("click", async () => {
        await this.handleDeleteBuilding(building.buildingId);
      });

      this.tableBody.appendChild(row);
    });
  }

  async handleCreateBuilding() {
    try {
      this.message.textContent = "";

      const buildingName = document.getElementById("buildingName").value.trim();
      const buildingCode = document.getElementById("buildingCode").value.trim().toUpperCase();
      const description = document.getElementById("description").value.trim();

      const building = new Building(
        null,
        buildingName,
        buildingCode,
        description
      );

      await this.buildingService.createBuilding(building);

      this.form.reset();
      await this.loadBuildings();

      this.message.textContent = "Building added successfully.";
      this.message.className = "message success";
    } catch (error) {
      this.message.textContent = error.message;
      this.message.className = "message error";
    }
  }

  async handleDeleteBuilding(buildingId) {
    const shouldDelete = await this.notifications.confirm({
      title: "Delete building?",
      message: "This will only work if the building has no entrances, floors, or locations linked to it.",
      confirmText: "Delete building"
    });

    if (!shouldDelete) return;

    try {
      await this.buildingService.deleteBuilding(buildingId);
      await this.loadBuildings();
      this.notifications.success("Building deleted successfully.");
    } catch (error) {
      this.notifications.deleteError("Building", error);
    }
  }

  handleEditBuilding(building) {
    this.editingId = building.buildingId;
    document.getElementById("buildingName").value = building.buildingName || "";
    document.getElementById("buildingCode").value = building.buildingCode || "";
    document.getElementById("description").value = building.description || "";
    if (this.submitButton) this.submitButton.textContent = "Update Building";
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async handleUpdateBuilding() {
    try {
      this.message.textContent = "";

      const building = new Building(
        this.editingId,
        document.getElementById("buildingName").value.trim(),
        document.getElementById("buildingCode").value.trim().toUpperCase(),
        document.getElementById("description").value.trim()
      );

      await this.buildingService.updateBuilding(building);

      this.editingId = null;
      this.form.reset();
      if (this.submitButton) this.submitButton.textContent = "Add Building";

      await this.loadBuildings();

      this.message.textContent = "Building updated successfully.";
      this.message.className = "message success";
    } catch (error) {
      this.message.textContent = error.message;
      this.message.className = "message error";
    }
  }

}

new BuildingController();
