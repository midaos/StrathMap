import BuildingService from "../services/BuildingService.js";
import DirectoryService from "../services/DirectoryService.js";
import EntranceService from "../services/EntranceService.js";

const CAMPUS_BOUNDS = L.latLngBounds(
  [-1.31195, 36.81075],
  [-1.30785, 36.81805]
);

const ARRIVAL_RADIUS_METERS = 3;
const DESTINATION_BUILDING_RADIUS_METERS = 45;
const DESTINATION_ENTRY_ZONE_METERS = 28;
const DIRECT_ROUTE_DISTANCE_METERS = 85;
const MAX_ROUTING_DETOUR_RATIO = 2.2;
const ENTRANCE_LABEL_OFFSET = {
  latitude: -0.00009,
  longitude: 0
};
// Curated pedestrian spine used to avoid drawing routes through buildings.
const CAMPUS_WALKWAY_NODES = {
  southGate: [-1.31178, 36.81086],
  southWalk: [-1.31132, 36.81105],
  mainSpineSouth: [-1.31086, 36.81118],
  mainSpineMid: [-1.31042, 36.8113],
  stmbWalk: [-1.31063, 36.81172],
  stmbEast: [-1.31066, 36.81218],
  msbApproach: [-1.31052, 36.81276],
  msbDoorWalk: [-1.31055, 36.81317],
  madarakaFront: [-1.30995, 36.81162],
  centralQuadWest: [-1.30962, 36.81195],
  centralQuad: [-1.30944, 36.81245],
  libraryWalk: [-1.30922, 36.81292],
  northWalk: [-1.30878, 36.81286],
  northGate: [-1.30836, 36.81265],
  sbsLink: [-1.31008, 36.81218],
  sbsFront: [-1.31018, 36.8129],
  sportsLink: [-1.31074, 36.81202],
  studentCentre: [-1.31082, 36.81272],
  eastSpineWest: [-1.3097, 36.81325],
  eastSpineMid: [-1.30984, 36.81415],
  eastSpineEast: [-1.31002, 36.81512],
  farEastWalk: [-1.31018, 36.81628],
  farEastEntry: [-1.31042, 36.81736]
};
const CAMPUS_WALKWAY_EDGES = [
  ["southGate", "southWalk"],
  ["southWalk", "mainSpineSouth"],
  ["mainSpineSouth", "mainSpineMid"],
  ["mainSpineSouth", "stmbWalk"],
  ["mainSpineMid", "stmbWalk"],
  ["stmbWalk", "stmbEast"],
  ["stmbEast", "msbApproach"],
  ["msbApproach", "msbDoorWalk"],
  ["msbDoorWalk", "sbsFront"],
  ["mainSpineMid", "madarakaFront"],
  ["madarakaFront", "centralQuadWest"],
  ["centralQuadWest", "centralQuad"],
  ["centralQuad", "libraryWalk"],
  ["libraryWalk", "northWalk"],
  ["northWalk", "northGate"],
  ["mainSpineMid", "sbsLink"],
  ["sbsLink", "sbsFront"],
  ["mainSpineSouth", "sportsLink"],
  ["sportsLink", "studentCentre"],
  ["studentCentre", "sbsFront"],
  ["sbsFront", "centralQuad"],
  ["centralQuad", "eastSpineWest"],
  ["eastSpineWest", "eastSpineMid"],
  ["eastSpineMid", "eastSpineEast"],
  ["eastSpineEast", "farEastWalk"],
  ["farEastWalk", "farEastEntry"],
  ["libraryWalk", "eastSpineWest"]
];

class HomeMapController {
  constructor() {
    this.map = null;
    this.userMarker = null;
    this.accuracyCircle = null;
    this.arrivalMarker = null;
    this.routeLine = null;
    this.routeHalo = null;
    this.routingControl = null;
    this.watchId = null;
    this.routeActive = false;
    this.arrivalReached = false;
    this.destinationNearby = false;
    this.hasFittedRoute = false;
    this.entranceMarkers = [];
    this.buildingLabels = [];
    this.entranceMarkersById = new Map();
    this.buildingLabelsById = new Map();

    this.buildingService = new BuildingService();
    this.directoryService = new DirectoryService();
    this.entranceService = new EntranceService();

    this.searchForm = document.getElementById("mapSearchForm");
    this.searchInput = document.getElementById("mapSearchInput");
    this.wayfindingPanel = document.getElementById("wayfindingPanel");
    this.wayfindingToggle = document.getElementById("wayfindingToggle");
    this.wayfindingClose = document.getElementById("wayfindingClose");
    this.resultPanel = document.getElementById("mapResultPanel");
    this.routeStatusBar = document.getElementById("routeStatusBar");
    this.routeStatusTitle = document.getElementById("routeStatusTitle");
    this.routeStatusMeta = document.getElementById("routeStatusMeta");
    this.buildingKeyPanel = document.getElementById("buildingKeyPanel");

    this.storedDestination = this.readStoredDestination();
    this.destination = this.storedDestination;
    this.routeMode =
      new URLSearchParams(window.location.search).get("route") === "true";

    this.initializeMap();
    this.loadCampusNavigationData();
    this.bindEvents();
    this.updateDestinationPanel(this.destination);
    this.trackUserLocation();

    if (this.routeMode && this.storedDestination) {
      this.openWayfindingPanel();
      this.startRoute();
    } else if (this.routeMode) {
      this.openWayfindingPanel();
      this.setStatus("Choose a destination", "Search or open the directory to start navigation.");
    }
  }

  initializeMap() {
    this.map = L.map("homeMap", {
      center: [-1.3099, 36.8142],
      zoom: 19,
      minZoom: 18,
      maxZoom: 20,
      maxBounds: CAMPUS_BOUNDS,
      maxBoundsViscosity: 1,
      zoomControl: false,
      attributionControl: false
    });

    L.control.zoom({ position: "bottomright" }).addTo(this.map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 20,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(this.map);

    this.map.setView([-1.3099, 36.8142], 19);
  }

  async loadCampusNavigationData() {
    try {
      const [entranceRows, buildings] = await Promise.all([
        this.entranceService.getAllEntrances(),
        this.buildingService.getAllBuildings()
      ]);

      this.addBuildingLabels(buildings, entranceRows);
      this.renderBuildingKey(buildings, entranceRows);
      this.updateBuildingLabelVisibility();
      this.applyDestinationHighlights();

      this.map.on("zoomend", () => this.updateBuildingLabelVisibility());
    } catch (error) {
      const arrival = this.getEntranceLatLng(this.destination);
      if (arrival) {
        this.addPin(arrival, "destination", this.destination?.location_name || "Destination");
      }
    }
  }

  bindEvents() {
    this.wayfindingToggle?.addEventListener("click", () => {
      this.openWayfindingPanel();
    });

    this.wayfindingClose?.addEventListener("click", () => {
      this.closeWayfindingPanel();
    });

    this.searchForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      await this.handleSearch();
    });

    this.searchInput?.addEventListener("input", () => {
      if (!this.searchInput.value.trim()) {
        this.clearDestinationState({ keepSearch: true });
      }
    });

    this.map?.on("click", () => {
      this.closeWayfindingPanel();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.closeWayfindingPanel();
      }
    });

    this.bindRouteButtons();
  }

  openWayfindingPanel() {
    this.wayfindingPanel?.classList.add("is-open");
    this.wayfindingToggle?.setAttribute("aria-expanded", "true");
  }

  closeWayfindingPanel() {
    this.wayfindingPanel?.classList.remove("is-open");
    this.wayfindingToggle?.setAttribute("aria-expanded", "false");
  }

  bindRouteButtons() {
    document.getElementById("startRouteBtn")?.addEventListener("click", () => {
      this.startRoute();
    });

    document.getElementById("confirmReachedBtn")?.addEventListener("click", () => {
      this.completeOutdoorNavigation();
    });
  }

  async handleSearch() {
    const query = this.searchInput.value.trim();

    if (!query) {
      this.clearDestinationState({ keepSearch: true });
      this.openWayfindingPanel();
      return;
    }

    this.resultPanel.classList.add("is-loading");
    this.clearRouteLayers();
    this.clearArrivalMarker();

    try {
      const result = await this.directoryService.searchLocation(query);

      if (!result) {
        this.destination = null;
        this.arrivalReached = false;
        localStorage.removeItem("selectedDestination");
        this.applyDestinationHighlights();
        this.resultPanel.innerHTML = `
          <span class="destination-label">No match found</span>
          <h2>Destination not found</h2>
          <p class="result-help">Try a room code, office name, or browse the directory.</p>
          <a href="directory.html" class="directory-link">Open directory</a>
        `;
        this.setStatus("No destination selected", "Search again or open the directory.");
        return;
      }

      this.destination = result;
      this.arrivalReached = false;
      this.destinationNearby = false;
      localStorage.setItem("selectedDestination", JSON.stringify(result));
      this.resultPanel.classList.remove("arrival-reached", "destination-nearby");
      this.updateDestinationPanel(result);
      this.clearRouteLayers();
      const arrival = this.getEntranceLatLng(result);
      if (arrival) {
        this.ensureArrivalMarker(arrival);
        this.setStatus(result.location_name || "Destination selected", "Press Start route when you are on campus.");
      } else {
        this.setStatus("Route unavailable", "This destination needs map coordinates before routing can start.");
      }
      this.applyDestinationHighlights();
    } catch (error) {
      this.resultPanel.innerHTML = `
        <span class="destination-label">Search error</span>
        <h2>Could not search</h2>
        <p class="result-help">${this.escapeHTML(error.message)}</p>
      `;
    } finally {
      this.resultPanel.classList.remove("is-loading");
    }
  }

  updateDestinationPanel(destination, options = {}) {
    if (!destination) {
      this.renderEmptyDestinationPanel();
      return;
    }

    const building = destination.floors?.buildings;
    const floor = destination.floors;
    const category = destination.location_categories;
    const reached = Boolean(options.reached);
    const nearby = Boolean(options.nearby);
    const insideGuide = nearby || reached
      ? this.renderInsideGuide(destination, { reached })
      : "";
    const indoorNote = reached
      ? `
        <p class="result-help indoor-note">
          You have reached the destination building. Continue inside to ${this.escapeHTML(destination.location_name || "your destination")}
          ${floor?.floor_name ? `on ${this.escapeHTML(floor.floor_name)}` : "using the details above"}.
        </p>
      `
      : "";
    const routingNote = !reached && this.routeActive
      ? `
        <p class="result-help route-confirm-note">
          ${nearby
            ? "You are near the destination. Tap arrived only when you are physically there."
            : "Keep following the route. Arrival confirmation will appear when you reach the destination area."}
        </p>
      `
      : "";
    const actions = reached
      ? `<a href="directory.html" class="directory-link">Open full directory</a>`
      : this.routeActive
        ? nearby
          ? `<button id="confirmReachedBtn" type="button" class="primary-btn arrived-btn">I have arrived</button>`
          : ""
        : `<button id="startRouteBtn" type="button" class="primary-btn">Start route</button>`;
    const actionsMarkup = actions
      ? `
        <div class="route-actions">
          ${actions}
        </div>
      `
      : "";

    this.resultPanel.innerHTML = `
      <div>
        <span class="destination-label">${reached ? "Arrival details" : "Destination"}</span>
        <h2>${this.escapeHTML(destination.location_name || "Selected destination")}</h2>
      </div>
      <dl>
        <div>
          <dt>Building</dt>
          <dd>${this.escapeHTML(this.formatBuilding(building))}</dd>
        </div>
        <div>
          <dt>Floor</dt>
          <dd>${this.escapeHTML(floor?.floor_name || "N/A")}</dd>
        </div>
        <div>
          <dt>Room code</dt>
          <dd>${this.escapeHTML(destination.location_code || "N/A")}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>${this.escapeHTML(category?.category_name || "N/A")}</dd>
        </div>
      </dl>
      ${indoorNote}
      ${routingNote}
      ${insideGuide}
      ${actionsMarkup}
    `;

    this.bindRouteButtons();
    this.routeStatusTitle.textContent = destination.location_name || "Selected destination";
    this.routeStatusMeta.textContent = this.routeActive
      ? "Waiting for live campus GPS"
      : "Choose Start route when ready";
    this.applyDestinationHighlights();
  }

  renderInsideGuide(destination, { reached = false } = {}) {
    const building = destination.floors?.buildings;
    const floor = destination.floors;
    const category = destination.location_categories;
    const buildingName = this.formatBuilding(building);
    const floorName = floor?.floor_name || "the listed floor";
    const roomCode = destination.location_code || "No room code";
    const locationName = destination.location_name || "your destination";
    const categoryName = category?.category_name || "Campus destination";
    const title = reached ? "Inside guide" : "When you enter";
    const finalStep = reached
      ? "Outdoor navigation is complete. Use these details to continue inside."
      : "When you reach the building entrance, review these details and tap I have arrived to end outdoor navigation.";

    return `
      <section class="inside-guide" aria-label="Indoor destination guide">
        <div class="inside-guide-heading">
          <span>${this.escapeHTML(title)}</span>
          <strong>${this.escapeHTML(floorName)}</strong>
        </div>
        <ol>
          <li>Enter ${this.escapeHTML(buildingName)}.</li>
          <li>Go to ${this.escapeHTML(floorName)} using the nearest stairs or lift.</li>
          <li>Look for ${this.escapeHTML(roomCode)} - ${this.escapeHTML(locationName)}.</li>
          <li>${this.escapeHTML(finalStep)}</li>
        </ol>
        <dl>
          <div>
            <dt>Destination</dt>
            <dd>${this.escapeHTML(locationName)}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>${this.escapeHTML(categoryName)}</dd>
          </div>
        </dl>
      </section>
    `;
  }

  getIndoorStatusText(destination) {
    const floor = destination?.floors?.floor_name || "the listed floor";
    const room = destination?.location_code || destination?.location_name || "your destination";

    return `Continue inside to ${floor}, ${room}. Tap arrived when you are there.`;
  }

  renderEmptyDestinationPanel() {
    if (!this.resultPanel) return;

    this.resultPanel.classList.remove("arrival-reached", "destination-nearby", "is-loading");
    this.resultPanel.innerHTML = `
      <div>
        <span class="destination-label">No destination selected</span>
        <h2>Choose where you want to go</h2>
      </div>
      <p class="result-help">Search for a classroom, office, service, auditorium, or room code.</p>
      <a href="directory.html" class="directory-link">Open full directory</a>
    `;

    if (this.routeStatusTitle) {
      this.routeStatusTitle.textContent = "Ready";
    }

    if (this.routeStatusMeta) {
      this.routeStatusMeta.textContent = "Search or choose a destination to begin routing.";
    }
  }

  trackUserLocation() {
    if (!navigator.geolocation) {
      this.setStatus("GPS unavailable", "This browser does not support web location.");
      return;
    }

    if (!window.isSecureContext) {
      this.setStatus("Secure connection needed", "Phone GPS requires HTTPS. Use an HTTPS tunnel or open the app on localhost.");
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = Math.min(Math.max(position.coords.accuracy || 5, 3), 6);

        if (!CAMPUS_BOUNDS.contains([lat, lng])) {
          this.setStatus("GPS outside campus", "Live routing starts when you are inside Strathmore.");
          return;
        }

        this.updateUserMarker(lat, lng, accuracy);

        if (this.routeActive) {
          if (this.checkArrivalProgress([lat, lng])) return;

          this.drawRoute([lat, lng]);
        }
      },
      (error) => {
        this.setLocationErrorStatus(error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
      }
    );
  }

  startRoute() {
    if (!this.destination) {
      this.openWayfindingPanel();
      this.renderEmptyDestinationPanel();
      this.setStatus("Choose a destination", "Search or open the directory before starting a route.");
      return;
    }

    const arrival = this.getEntranceLatLng(this.destination);

    if (!arrival) {
      this.openWayfindingPanel();
      this.clearRouteLayers();
      this.clearArrivalMarker();
      this.setStatus("Route unavailable", "This destination needs map coordinates before routing can start.");
      return;
    }

    this.routeActive = true;
    this.arrivalReached = false;
    this.destinationNearby = false;
    this.hasFittedRoute = false;
    this.resultPanel.classList.remove("arrival-reached", "destination-nearby");
    this.routeStatusBar?.classList.add("is-active");
    this.updateDestinationPanel(this.destination);
    const start = this.getCurrentUserLatLng();

    if (!start) {
      this.clearRouteLayers();
      this.ensureArrivalMarker(arrival);
      this.setStatus("Waiting for phone GPS", "Allow location access and keep this page open until your blue dot appears.");
      return;
    }

    if (this.checkArrivalProgress(start)) return;

    this.drawRoute(start, arrival);
    this.applyDestinationHighlights();
  }

  drawRoute(startLatLng, arrivalLatLng = this.getEntranceLatLng(this.destination)) {
    if (!arrivalLatLng) return;

    if (this.map.distance(startLatLng, arrivalLatLng) <= DIRECT_ROUTE_DISTANCE_METERS) {
      this.drawDirectRoute(startLatLng, arrivalLatLng);
      return;
    }

    if (window.L?.Routing?.control) {
      this.drawRoutingEngineRoute(startLatLng, arrivalLatLng);
      return;
    }

    this.drawFallbackRoute(startLatLng, arrivalLatLng);
  }

  drawRoutingEngineRoute(startLatLng, arrivalLatLng) {
    const start = Array.isArray(startLatLng)
      ? L.latLng(startLatLng[0], startLatLng[1])
      : L.latLng(startLatLng.lat, startLatLng.lng);
    const arrival = L.latLng(arrivalLatLng[0], arrivalLatLng[1]);

    this.clearRouteLayers();
    this.routeStatusMeta.textContent = "Calculating campus route...";

    const routeOptions = {
      waypoints: [start, arrival],
      routeWhileDragging: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: false,
      show: false,
      createMarker: () => null,
      lineOptions: {
        addWaypoints: false,
        extendToWaypoints: true,
        missingRouteTolerance: 0,
        styles: [
          {
            color: "#ffffff",
            weight: 12,
            opacity: 0.92,
            lineCap: "round",
            lineJoin: "round"
          },
          {
            color: "#006699",
            weight: 6,
            opacity: 0.95,
            lineCap: "round",
            lineJoin: "round"
          }
        ]
      }
    };

    this.routingControl = L.Routing.control(routeOptions)
      .on("routesfound", (event) => {
        const route = event.routes?.[0];
        const coordinates = route?.coordinates || [start, arrival];
        const directDistance = this.map.distance(start, arrival);
        const routedDistance = route?.summary?.totalDistance || directDistance;

        if (this.shouldUseDirectRoute(directDistance, routedDistance)) {
          this.drawDirectRoute(startLatLng, arrivalLatLng);
          return;
        }

        if (!this.hasFittedRoute) {
          this.map.fitBounds(L.latLngBounds(coordinates), {
            paddingTopLeft: [340, 100],
            paddingBottomRight: [70, 110],
            maxZoom: 19
          });
          this.hasFittedRoute = true;
        }

        this.routeStatusMeta.textContent = `${Math.max(1, Math.round(routedDistance / 70))} min walk - ${Math.round(routedDistance)} m`;
      })
      .on("routingerror", () => {
        this.drawFallbackRoute(startLatLng, arrivalLatLng);
      })
      .addTo(this.map);

    this.ensureArrivalMarker(arrivalLatLng);
  }

  drawDirectRoute(startLatLng, arrivalLatLng) {
    const start = Array.isArray(startLatLng)
      ? startLatLng
      : [startLatLng.lat, startLatLng.lng];
    const route = [start, arrivalLatLng];

    this.clearRouteLayers();

    this.routeHalo = L.polyline(route, {
      color: "#ffffff",
      weight: 12,
      opacity: 0.92,
      lineCap: "round",
      lineJoin: "round"
    }).addTo(this.map);

    this.routeLine = L.polyline(route, {
      color: "#006699",
      weight: 6,
      opacity: 0.94,
      lineCap: "round",
      lineJoin: "round"
    }).addTo(this.map);

    this.ensureArrivalMarker(arrivalLatLng);

    if (!this.hasFittedRoute) {
      this.map.fitBounds(L.latLngBounds(route), {
        paddingTopLeft: [340, 100],
        paddingBottomRight: [70, 110],
        maxZoom: 19
      });
      this.hasFittedRoute = true;
    }

    const distance = this.measureRoute(route);
    this.routeStatusMeta.textContent = `${Math.max(1, Math.round(distance / 70))} min walk - ${Math.round(distance)} m direct campus walk`;
  }

  drawFallbackRoute(startLatLng, arrivalLatLng) {
    const route = this.buildCampusRoute(startLatLng, arrivalLatLng);

    this.clearRouteLayers();

    this.routeHalo = L.polyline(route, {
      color: "#ffffff",
      weight: 12,
      opacity: 0.92,
      lineCap: "round",
      lineJoin: "round"
    }).addTo(this.map);

    this.routeLine = L.polyline(route, {
      color: "#006699",
      weight: 6,
      opacity: 0.92,
      lineCap: "round",
      lineJoin: "round"
    }).addTo(this.map);

    this.ensureArrivalMarker(arrivalLatLng);

    if (!this.hasFittedRoute) {
      this.map.fitBounds(L.latLngBounds(route), {
        paddingTopLeft: [340, 100],
        paddingBottomRight: [70, 110],
        maxZoom: 19
      });
      this.hasFittedRoute = true;
    }

    const distance = this.measureRoute(route);
    this.routeStatusMeta.textContent = `${Math.max(1, Math.round(distance / 70))} min walk - ${Math.round(distance)} m`;
  }

  clearRouteLayers() {
    if (this.routingControl) {
      this.map.removeControl(this.routingControl);
      this.routingControl = null;
    }

    if (this.routeLine) {
      this.map.removeLayer(this.routeLine);
      this.routeLine = null;
    }

    if (this.routeHalo) {
      this.map.removeLayer(this.routeHalo);
      this.routeHalo = null;
    }
  }

  clearArrivalMarker() {
    if (this.arrivalMarker) {
      this.map.removeLayer(this.arrivalMarker);
      this.arrivalMarker = null;
    }
  }

  clearDestinationState({ keepSearch = false } = {}) {
    this.destination = null;
    this.routeActive = false;
    this.arrivalReached = false;
    this.destinationNearby = false;
    this.hasFittedRoute = false;
    localStorage.removeItem("selectedDestination");
    this.clearRouteLayers();
    this.clearArrivalMarker();
    this.applyDestinationHighlights();
    this.renderEmptyDestinationPanel();
    this.setStatus("Ready", "Search or choose a destination to begin routing.");

    if (!keepSearch && this.searchInput) {
      this.searchInput.value = "";
    }
  }

  buildCampusRoute(startLatLng, arrival) {
    const start = Array.isArray(startLatLng)
      ? startLatLng
      : [startLatLng.lat, startLatLng.lng];
    const startNode = this.findNearestWalkwayNode(start);
    const arrivalNode = this.findNearestWalkwayNode(arrival);
    const walkwayPath = this.findWalkwayPath(startNode, arrivalNode);

    if (!walkwayPath.length) {
      return [start, arrival];
    }

    return [
      start,
      ...walkwayPath.map((nodeId) => CAMPUS_WALKWAY_NODES[nodeId]),
      arrival
    ];
  }

  checkArrivalProgress(latLng) {
    const arrival = this.getEntranceLatLng(this.destination);
    if (!arrival || !this.destination) return false;

    const arrivalDistance = this.map.distance(latLng, arrival);
    const buildingDistance = this.getDestinationBuildingDistance(latLng);
    const hasReachedOutdoorDestination =
      arrivalDistance <= ARRIVAL_RADIUS_METERS ||
      buildingDistance <= DESTINATION_BUILDING_RADIUS_METERS ||
      (!this.getDestinationBuildingLatLng(this.destination) && arrivalDistance <= DESTINATION_ENTRY_ZONE_METERS);

    if (hasReachedOutdoorDestination && !this.arrivalReached) {
      if (!this.destinationNearby) {
        this.destinationNearby = true;
        this.resultPanel.classList.add("destination-nearby");
        this.updateDestinationPanel(this.destination, { nearby: true });
        this.openWayfindingPanel();
      }

      this.setStatus("Near destination", this.getIndoorStatusText(this.destination));
      return true;
    }

    if (this.destinationNearby) {
      this.destinationNearby = false;
      this.resultPanel.classList.remove("destination-nearby");
      this.updateDestinationPanel(this.destination);
    }

    if (!this.arrivalReached) {
      this.setStatus(
        this.destination.location_name || "Route active",
        `${Math.round(Math.min(arrivalDistance, buildingDistance))} m to destination`
      );
    }

    return false;
  }

  completeOutdoorNavigation() {
    this.arrivalReached = true;
    this.destinationNearby = false;
    this.routeActive = false;
    this.clearRouteLayers();
    this.clearArrivalMarker();
    localStorage.removeItem("selectedDestination");
    this.setStatus("Destination building reached", "Continue inside using the building, floor, and room details.");
    this.resultPanel.classList.remove("destination-nearby");
    this.resultPanel.classList.add("arrival-reached");
    this.updateDestinationPanel(this.destination, { reached: true });
    this.openWayfindingPanel();
  }

  getDestinationBuildingDistance(latLng) {
    const buildingLatLng = this.getDestinationBuildingLatLng(this.destination);

    if (!buildingLatLng) {
      return Number.POSITIVE_INFINITY;
    }

    return this.map.distance(latLng, buildingLatLng);
  }

  getDestinationBuildingLatLng(destination) {
    const building = destination?.floors?.buildings;
    const latitude = building?.latitude ?? building?.building_latitude;
    const longitude = building?.longitude ?? building?.building_longitude;

    if (this.hasValidLatLng(latitude, longitude)) {
      return [Number(latitude), Number(longitude)];
    }

    return null;
  }

  updateUserMarker(lat, lng, accuracy = 8) {
    if (!this.userMarker) {
      this.userMarker = L.circleMarker([lat, lng], {
        radius: 7,
        fillColor: "#006699",
        color: "#ffffff",
        weight: 3,
        fillOpacity: 1
      }).addTo(this.map);

      this.accuracyCircle = L.circle([lat, lng], {
        radius: accuracy,
        stroke: false,
        fillColor: "#006699",
        fillOpacity: 0.14
      }).addTo(this.map);

      return;
    }

    this.userMarker.setLatLng([lat, lng]);
    this.accuracyCircle?.setLatLng([lat, lng]);
    this.accuracyCircle?.setRadius(accuracy);
  }

  ensureArrivalMarker(arrival) {
    const popupContent = this.destination?.location_name
      ? `Destination: ${this.escapeHTML(this.destination.location_name)}`
      : "Destination";

    if (this.arrivalMarker) {
      this.arrivalMarker.setLatLng(arrival);
      this.arrivalMarker.setPopupContent(popupContent);
      return;
    }

    this.arrivalMarker = L.marker(arrival, {
      icon: L.divIcon({
        className: "map-pin map-pin-destination",
        html: "<span></span>",
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      })
    })
      .addTo(this.map)
      .bindPopup(popupContent, {
        closeButton: true,
        autoClose: true,
        closeOnClick: true
      });
  }

  addEntranceMarker({ entrance, building }) {
    const latLng = [Number(entrance.latitude), Number(entrance.longitude)];
    const label = entrance.entranceName || "Building entrance";
    const buildingName = building?.building_name || "";

    const marker = L.marker(latLng, {
      icon: L.divIcon({
        className: "map-pin map-pin-entrance",
        html: "<span></span>",
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })
    })
      .addTo(this.map)
      .bindPopup(`${this.escapeHTML(label)}${buildingName ? `<br>${this.escapeHTML(buildingName)}` : ""}`, {
        closeButton: true,
        autoClose: true,
        closeOnClick: true
      });

    this.entranceMarkers.push(marker);

    if (entrance.entranceId) {
      this.entranceMarkersById.set(String(entrance.entranceId), marker);
    }
  }

  addBuildingLabels(buildings = [], entranceRows = []) {
    const entranceDerivedPositions = this.getEntranceDerivedLabelPositions(entranceRows);
    const labelledBuildingIds = new Set();

    buildings.forEach((building) => {
      const buildingId = building.buildingId ? String(building.buildingId) : "";
      const fallbackPosition = buildingId ? entranceDerivedPositions.get(buildingId) : null;
      const hasBuildingCoordinates = this.hasValidLatLng(building.latitude, building.longitude);
      const lat = hasBuildingCoordinates ? Number(building.latitude) : Number(fallbackPosition?.latitude);
      const lng = hasBuildingCoordinates ? Number(building.longitude) : Number(fallbackPosition?.longitude);
      const labelText =
        building.buildingCode ||
        fallbackPosition?.buildingCode ||
        building.buildingName ||
        fallbackPosition?.buildingName;

      if (!labelText || !this.hasValidLatLng(lat, lng)) return;

      this.addBuildingLabel([lat, lng], labelText, buildingId);
      if (buildingId) labelledBuildingIds.add(buildingId);
    });

    entranceDerivedPositions.forEach((position, buildingId) => {
      if (labelledBuildingIds.has(buildingId)) return;

      const labelText = position.buildingCode || position.buildingName;
      if (!labelText || !this.hasValidLatLng(position.latitude, position.longitude)) return;

      this.addBuildingLabel([position.latitude, position.longitude], labelText, buildingId);
    });
  }

  getEntranceDerivedLabelPositions(entranceRows) {
    const groupedEntrances = new Map();

    entranceRows.forEach(({ entrance, building }) => {
      if (!entrance?.buildingId || !this.hasValidLatLng(entrance.latitude, entrance.longitude)) return;

      const buildingId = String(entrance.buildingId);
      const current = groupedEntrances.get(buildingId) || {
        buildingId,
        buildingCode: building?.building_code || "",
        buildingName: building?.building_name || "",
        preferredEntrance: null
      };

      if (!current.preferredEntrance || entrance.isDefault) {
        current.preferredEntrance = entrance;
      }

      groupedEntrances.set(buildingId, current);
    });

    const positions = new Map();

    groupedEntrances.forEach((group, buildingId) => {
      positions.set(buildingId, {
        buildingId,
        buildingCode: group.buildingCode,
        buildingName: group.buildingName,
        latitude: Number(group.preferredEntrance.latitude) + ENTRANCE_LABEL_OFFSET.latitude,
        longitude: Number(group.preferredEntrance.longitude) + ENTRANCE_LABEL_OFFSET.longitude
      });
    });

    return positions;
  }

  addBuildingLabel(latLng, labelText, buildingId) {
    const toneClass = `label-tone-${this.getLabelTone(labelText || buildingId || "")}`;

    const label = L.marker(latLng, {
      icon: L.divIcon({
          className: `building-map-label ${toneClass}`,
          html: `<span>${this.escapeHTML(labelText)}</span>`,
          iconSize: [96, 26],
          iconAnchor: [48, 13]
        }),
      interactive: false
    }).addTo(this.map);

    this.buildingLabels.push(label);

    if (buildingId) {
      this.buildingLabelsById.set(String(buildingId), label);
    }
  }

  renderBuildingKey(buildings = [], entranceRows = []) {
    if (!this.buildingKeyPanel) return;

    const keyedBuildings = new Map();

    buildings.forEach((building) => {
      const code = building.buildingCode || building.building_code;
      const name = building.buildingName || building.building_name;
      if (!code || !name) return;

      keyedBuildings.set(String(code).toUpperCase(), {
        code: String(code).toUpperCase(),
        name
      });
    });

    entranceRows.forEach(({ building }) => {
      const code = building?.building_code || building?.buildingCode;
      const name = building?.building_name || building?.buildingName;
      if (!code || !name) return;

      keyedBuildings.set(String(code).toUpperCase(), {
        code: String(code).toUpperCase(),
        name
      });
    });

    const items = [...keyedBuildings.values()].sort((a, b) => a.code.localeCompare(b.code));

    if (!items.length) {
      this.buildingKeyPanel.innerHTML = `
        <div class="building-key-title">Building key</div>
        <p>No building labels available yet.</p>
      `;
      return;
    }

    this.buildingKeyPanel.innerHTML = `
      <div class="building-key-title">Building key</div>
      <div class="building-key-list">
        ${items.map(({ code, name }) => `
          <div class="building-key-item">
            <span class="building-key-code label-tone-${this.getLabelTone(code)}">${this.escapeHTML(code)}</span>
            <span>${this.escapeHTML(name)}</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  getLabelTone(value) {
    const text = String(value || "building");
    const hash = [...text].reduce((total, char) => total + char.charCodeAt(0), 0);
    return (hash % 5) + 1;
  }

  updateBuildingLabelVisibility() {
    this.buildingLabels.forEach((label) => {
      const element = label.getElement();
      if (element) {
        element.classList.remove("is-hidden");
      }
    });
  }

  applyDestinationHighlights() {
    this.buildingLabelsById.forEach((marker) => {
      marker.getElement()?.classList.remove("is-selected");
    });

    this.entranceMarkersById.forEach((marker) => {
      marker.getElement()?.classList.remove("is-selected");
    });

    const buildingId = this.destination?.floors?.buildings?.building_id;
    const entranceId = this.destination?.entrances?.entrance_id;

    if (buildingId) {
      this.buildingLabelsById.get(String(buildingId))?.getElement()?.classList.add("is-selected");
    }

    if (entranceId) {
      this.entranceMarkersById.get(String(entranceId))?.getElement()?.classList.add("is-selected");
    }
  }

  addPin(latLng, type, label) {
    L.marker(latLng, {
      icon: L.divIcon({
        className: `map-pin map-pin-${type}`,
        html: "<span></span>",
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })
    })
      .addTo(this.map)
      .bindPopup(this.escapeHTML(label), {
        closeButton: true,
        autoClose: true,
        closeOnClick: true
      });
  }

  getCurrentUserLatLng() {
    const current = this.userMarker?.getLatLng();
    return current ? [current.lat, current.lng] : null;
  }

  setLocationErrorStatus(error) {
    if (error?.code === error?.PERMISSION_DENIED) {
      this.setStatus("Location blocked", "Allow location for this site in your phone browser settings, then reload.");
      return;
    }

    if (error?.code === error?.POSITION_UNAVAILABLE) {
      this.setStatus("GPS unavailable", "Move near a window or outdoors and try again.");
      return;
    }

    if (error?.code === error?.TIMEOUT) {
      this.setStatus("GPS timeout", "Keep the page open a little longer or try outdoors for a stronger signal.");
      return;
    }

    this.setStatus("Location permission needed", "Allow GPS to show where you are on campus.");
  }

  readStoredDestination() {
    try {
      const rawDestination = localStorage.getItem("selectedDestination");
      return rawDestination ? JSON.parse(rawDestination) : null;
    } catch (error) {
      localStorage.removeItem("selectedDestination");
      return null;
    }
  }

  getEntranceLatLng(destination) {
    const lat = Number(destination?.entrances?.latitude);
    const lng = Number(destination?.entrances?.longitude);

    if (this.hasValidLatLng(destination?.entrances?.latitude, destination?.entrances?.longitude)) {
      return [lat, lng];
    }

    return null;
  }

  hasValidLatLng(latitude, longitude) {
    if (latitude === null || latitude === undefined || latitude === "") return false;
    if (longitude === null || longitude === undefined || longitude === "") return false;

    const lat = Number(latitude);
    const lng = Number(longitude);

    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  }

  findNearestWalkwayNode(latLng) {
    return Object.entries(CAMPUS_WALKWAY_NODES).reduce((nearest, [nodeId, nodeLatLng]) => {
      const currentDistance = this.map.distance(latLng, nodeLatLng);
      return currentDistance < nearest.distance
        ? { nodeId, distance: currentDistance }
        : nearest;
    }, { nodeId: null, distance: Number.POSITIVE_INFINITY }).nodeId;
  }

  findWalkwayPath(startNode, endNode) {
    if (!startNode || !endNode) return [];
    if (startNode === endNode) return [startNode];

    const graph = this.buildWalkwayGraph();
    const distances = new Map();
    const previous = new Map();
    const unvisited = new Set(Object.keys(CAMPUS_WALKWAY_NODES));

    unvisited.forEach((nodeId) => distances.set(nodeId, Number.POSITIVE_INFINITY));
    distances.set(startNode, 0);

    while (unvisited.size) {
      const current = [...unvisited].reduce((bestNode, nodeId) => (
        distances.get(nodeId) < distances.get(bestNode) ? nodeId : bestNode
      ));

      if (current === endNode || distances.get(current) === Number.POSITIVE_INFINITY) break;

      unvisited.delete(current);

      graph.get(current)?.forEach(({ nodeId, distance }) => {
        if (!unvisited.has(nodeId)) return;

        const candidateDistance = distances.get(current) + distance;
        if (candidateDistance < distances.get(nodeId)) {
          distances.set(nodeId, candidateDistance);
          previous.set(nodeId, current);
        }
      });
    }

    const path = [];
    let current = endNode;

    while (current) {
      path.unshift(current);
      if (current === startNode) return path;
      current = previous.get(current);
    }

    return [];
  }

  buildWalkwayGraph() {
    const graph = new Map(
      Object.keys(CAMPUS_WALKWAY_NODES).map((nodeId) => [nodeId, []])
    );

    CAMPUS_WALKWAY_EDGES.forEach(([from, to]) => {
      const distance = this.map.distance(CAMPUS_WALKWAY_NODES[from], CAMPUS_WALKWAY_NODES[to]);
      graph.get(from)?.push({ nodeId: to, distance });
      graph.get(to)?.push({ nodeId: from, distance });
    });

    return graph;
  }

  shouldUseDirectRoute(directDistance, routedDistance) {
    if (directDistance <= DIRECT_ROUTE_DISTANCE_METERS) return true;
    if (!Number.isFinite(routedDistance) || routedDistance <= 0) return false;

    return directDistance <= 140 && routedDistance / directDistance >= MAX_ROUTING_DETOUR_RATIO;
  }

  measureRoute(route) {
    return route.reduce((total, point, index) => {
      if (index === 0) return total;
      return total + this.map.distance(route[index - 1], point);
    }, 0);
  }

  setStatus(title, meta) {
    this.routeStatusBar?.classList.add("is-active");
    this.routeStatusTitle.textContent = title;
    this.routeStatusMeta.textContent = meta;
  }

  formatBuilding(building) {
    if (!building) return "N/A";
    return `${building.building_code || ""} ${building.building_name || ""}`.trim();
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

new HomeMapController();

