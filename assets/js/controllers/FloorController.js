import AuthGuard from "../services/AuthGuard.js";
import Floor from "../models/Floor.js";
import FloorService from "../services/FloorService.js";
import BuildingService from "../services/BuildingService.js";

class FloorController {
  constructor() {
    this.authGuard = new AuthGuard();
    this.floorService = new FloorService();
    this.buildingService = new BuildingService();

    this.form = document.getElementById("floorForm");
    this.buildingSelect = document.getElementById("buildingId");
    this.tableBody = document.getElementById("floorTableBody");
    this.message = document.getElementById("message");
    this.editingId = null;
    this.submitButton = null;

    this.initialize();
  }

  async initialize() {
    await this.authGuard.verifyAdmin();
    this.bindEvents();
    await this.loadBuildings();
    await this.loadFloors();
  }

  bindEvents() {
    this.submitButton = this.form.querySelector('button[type="submit"]');
    this.form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (this.editingId) await this.handleUpdateFloor();
      else await this.handleCreateFloor();
    });
  }

  async loadBuildings() {
    const buildings = await this.buildingService.getAllBuildings();

    this.buildingSelect.innerHTML = `<option value="">Select building</option>`;

    buildings.forEach((building) => {
      const option = document.createElement("option");
      option.value = building.buildingId;
      option.textContent = `${building.buildingCode} - ${building.buildingName}`;
      this.buildingSelect.appendChild(option);
    });
  }

  async loadFloors() {
    const records = await this.floorService.getAllFloors();

    this.tableBody.innerHTML = "";

    records.forEach((record) => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${record.building.building_code}</td>
        <td>${record.building.building_name}</td>
        <td>${record.floor.floorNumber}</td>
        <td>${record.floor.floorName}</td>
        <td>
          <button class="edit-btn" data-id="${record.floor.floorId}">Edit</button>
          <button class="danger-btn" data-id="${record.floor.floorId}">Delete</button>
        </td>
      `;

      const buttons = row.querySelectorAll("button");
      buttons[0].addEventListener("click", async () => {
        this.handleEditFloor(record.floor, record.building);
      });

      buttons[1].addEventListener("click", async () => {
        await this.handleDeleteFloor(record.floor.floorId);
      });

      this.tableBody.appendChild(row);
    });
  }

  async handleCreateFloor() {
    try {
      this.message.textContent = "";

      const buildingId = document.getElementById("buildingId").value;
      const floorNumber = document.getElementById("floorNumber").value;
      const floorName = document.getElementById("floorName").value.trim();

      const floor = new Floor(
        null,
        Number(buildingId),
        Number(floorNumber),
        floorName
      );

      await this.floorService.createFloor(floor);

      this.form.reset();
      await this.loadFloors();

      this.message.textContent = "Floor added successfully.";
      this.message.className = "message success";
    } catch (error) {
      this.message.textContent = error.message;
      this.message.className = "message error";
    }
  }

  async handleDeleteFloor(floorId) {
    if (!confirm("Delete this floor?")) return;

    await this.floorService.deleteFloor(floorId);
    await this.loadFloors();
  }

  handleEditFloor(floor, building) {
    this.editingId = floor.floorId;
    document.getElementById("buildingId").value = floor.buildingId || "";
    document.getElementById("floorNumber").value = floor.floorNumber || "";
    document.getElementById("floorName").value = floor.floorName || "";
    if (this.submitButton) this.submitButton.textContent = "Update Floor";
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async handleUpdateFloor() {
    try {
      this.message.textContent = "";

      const floor = new Floor(
        this.editingId,
        Number(document.getElementById("buildingId").value),
        Number(document.getElementById("floorNumber").value),
        document.getElementById("floorName").value.trim()
      );

      await this.floorService.updateFloor(floor);

      this.editingId = null;
      this.form.reset();
      if (this.submitButton) this.submitButton.textContent = "Add Floor";

      await this.loadFloors();

      this.message.textContent = "Floor updated successfully.";
      this.message.className = "message success";
    } catch (error) {
      this.message.textContent = error.message;
      this.message.className = "message error";
    }
  }
}

new FloorController();