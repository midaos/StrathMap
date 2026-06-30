import NotificationService from "../services/NotificationService.js";

class DestinationController {
  constructor() {
    this.notifications = new NotificationService();
    this.destination = JSON.parse(
      localStorage.getItem("selectedDestination")
    );

    this.detailsBox = document.getElementById("destinationDetails");
    this.getDirectionsBtn = document.getElementById("getDirectionsBtn");
    this.endNavigationBtn = document.getElementById("endNavigationBtn");
    this.mapContainer = document.getElementById("map");

    this.map = null;
    this.routingControl = null;

    this.initialize();
  }

  initialize() {
    if (!this.destination) {
      this.detailsBox.innerHTML = `
        <h2>No destination selected</h2>
        <p>Please return to search and select a destination.</p>
      `;
      this.getDirectionsBtn.style.display = "none";
      return;
    }

    this.displayDestinationDetails();
    this.bindEvents();
  }

  bindEvents() {
    this.getDirectionsBtn.addEventListener("click", () => {
      this.startNavigation();
    });

    this.endNavigationBtn.addEventListener("click", () => {
      this.endNavigation();
    });
  }

  displayDestinationDetails() {
    const building = this.destination.floors.buildings;
    const floor = this.destination.floors;
    const category = this.destination.location_categories;
    const entrance = this.destination.entrances;

    this.detailsBox.innerHTML = `
      <h2>${this.destination.location_name}</h2>

      <p><strong>Code:</strong> ${this.destination.location_code || "N/A"}</p>
      <p><strong>Building:</strong> ${building.building_code} - ${building.building_name}</p>
      <p><strong>Floor:</strong> ${floor.floor_name}</p>
      <p><strong>Category:</strong> ${category.category_name}</p>
      <p><strong>Building entrance:</strong> ${entrance.entrance_name}</p>
    `;
  }

  startNavigation() {
    if (!navigator.geolocation) {
      this.notifications.error("Geolocation is not supported by this browser.", { title: "GPS unavailable" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.showMap(position.coords.latitude, position.coords.longitude);
      },
      () => {
        this.notifications.error("Enable location access to use navigation.", { title: "Location access denied" });
      }
    );
  }

  showMap(userLat, userLng) {
    const entrance = this.destination.entrances;

    const entranceLat = Number(entrance.latitude);
    const entranceLng = Number(entrance.longitude);

    this.mapContainer.style.display = "block";
    this.getDirectionsBtn.style.display = "none";
    this.endNavigationBtn.style.display = "inline-block";

    if (!this.map) {
      this.map = L.map("map").setView([userLat, userLng], 18);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap"
      }).addTo(this.map);
    }

    L.marker([userLat, userLng])
      .addTo(this.map)
      .bindPopup("Your Location")
      .openPopup();

    L.marker([entranceLat, entranceLng])
      .addTo(this.map)
      .bindPopup("Building Entrance");

    this.routingControl = L.Routing.control({
      waypoints: [
        L.latLng(userLat, userLng),
        L.latLng(entranceLat, entranceLng)
      ],
      routeWhileDragging: false
    }).addTo(this.map);
  }

  endNavigation() {
    if (this.routingControl) {
      this.map.removeControl(this.routingControl);
    }

    this.mapContainer.style.display = "none";
    this.endNavigationBtn.style.display = "none";
    this.getDirectionsBtn.style.display = "inline-block";
  }
}

new DestinationController();
