import AuthGuard from "../services/AuthGuard.js";
import Entrance from "../models/Entrance.js";
import EntranceService from "../services/EntranceService.js";
import BuildingService from "../services/BuildingService.js";

class EntranceController {
  constructor() {
    this.authGuard = new AuthGuard();
    this.entranceService = new EntranceService();
    this.buildingService = new BuildingService();

    this.form = document.getElementById("entranceForm");
    this.buildingSelect = document.getElementById("buildingId");
    this.tableBody = document.getElementById("entranceTableBody");
    this.message = document.getElementById("message");
    this.editingId = null;
    this.submitButton = null;

    this.initialize();
  }

  async initialize() {
    await this.authGuard.verifyAdmin();
    this.bindEvents();
    await this.loadBuildings();
    await this.loadEntrances();
  }

  bindEvents() {
    this.submitButton = this.form.querySelector('button[type="submit"]');
    this.form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (this.editingId) await this.handleUpdateEntrance();
      else await this.handleCreateEntrance();
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

  async loadEntrances() {
    const records = await this.entranceService.getAllEntrances();

    this.tableBody.innerHTML = "";

    records.forEach((record) => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${record.building.building_code}</td>
        <td>${record.entrance.entranceName}</td>
        <td>${record.entrance.latitude}</td>
        <td>${record.entrance.longitude}</td>
        <td>${record.entrance.isDefault ? "Yes" : "No"}</td>
        <td>${record.entrance.status}</td>
        <td>
          <button class="edit-btn" data-id="${record.entrance.entranceId}">Edit</button>
          <button class="danger-btn" data-id="${record.entrance.entranceId}">Delete</button>
        </td>
      `;

      const buttons = row.querySelectorAll("button");
      buttons[0].addEventListener("click", async () => {
        this.handleEditEntrance(record.entrance);
      });

      buttons[1].addEventListener("click", async () => {
        await this.handleDeleteEntrance(record.entrance.entranceId);
      });

      this.tableBody.appendChild(row);
    });
  }

  async handleCreateEntrance() {
    try {
      this.message.textContent = "";

      const buildingId = Number(document.getElementById("buildingId").value);
      const entranceName = document.getElementById("entranceName").value.trim();
      const latitude = Number(document.getElementById("latitude").value);
      const longitude = Number(document.getElementById("longitude").value);
      const isDefault = document.getElementById("isDefault").checked;
      const status = document.getElementById("status").value;

      const entrance = new Entrance(
        null,
        buildingId,
        entranceName,
        latitude,
        longitude,
        isDefault,
        status
      );

      await this.entranceService.createEntrance(entrance);

      this.form.reset();
      await this.loadEntrances();

      this.message.textContent = "Entrance added successfully.";
      this.message.className = "message success";
    } catch (error) {
      this.message.textContent = error.message;
      this.message.className = "message error";
    }
  }

  async handleDeleteEntrance(entranceId) {
    if (!confirm("Delete this entrance?")) return;

    await this.entranceService.deleteEntrance(entranceId);
    await this.loadEntrances();
  }

  handleEditEntrance(entrance) {
    this.editingId = entrance.entranceId;
    document.getElementById("buildingId").value = entrance.buildingId || "";
    document.getElementById("entranceName").value = entrance.entranceName || "";
    document.getElementById("latitude").value = entrance.latitude || "";
    document.getElementById("longitude").value = entrance.longitude || "";
    document.getElementById("isDefault").checked = !!entrance.isDefault;
    document.getElementById("status").value = entrance.status || "";
    if (this.submitButton) this.submitButton.textContent = "Update Entrance";
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async handleUpdateEntrance() {
    try {
      this.message.textContent = "";

      const entrance = new Entrance(
        this.editingId,
        Number(document.getElementById("buildingId").value),
        document.getElementById("entranceName").value.trim(),
        Number(document.getElementById("latitude").value),
        Number(document.getElementById("longitude").value),
        document.getElementById("isDefault").checked,
        document.getElementById("status").value
      );

      await this.entranceService.updateEntrance(entrance);

      this.editingId = null;
      this.form.reset();
      if (this.submitButton) this.submitButton.textContent = "Add Entrance";

      await this.loadEntrances();

      this.message.textContent = "Entrance updated successfully.";
      this.message.className = "message success";
    } catch (error) {
      this.message.textContent = error.message;
      this.message.className = "message error";
    }
  }
}

new EntranceController();