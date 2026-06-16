class HomeMapController {
  constructor() {
    this.map = null;
    this.userMarker = null;
    this.accuracyCircle = null;
    this.endpointMarker = null;
    this.routingControl = null;
    this.watchId = null;
    this.routeHidden = false;

    this.strathmoreCenter = [-1.3099, 36.8115];

    this.strathmoreBounds = L.latLngBounds(
      [-1.3135, 36.8075],
      [-1.3068, 36.8150]
    );

    this.destination = JSON.parse(localStorage.getItem("selectedDestination"));
    this.routeMode =
      new URLSearchParams(window.location.search).get("route") === "true";

    this.initializeMap();
    this.showRouteBanner();
    this.trackUserLocation();
  }

  initializeMap() {
    this.map = L.map("homeMap", {
      center: this.strathmoreCenter,
      zoom: 18,
      minZoom: 17,
      maxZoom: 20,
      maxBounds: this.strathmoreBounds,
      maxBoundsViscosity: 1.0,
      zoomControl: true
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 20,
      attribution: "© OpenStreetMap"
    }).addTo(this.map);
  }

  trackUserLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy || 15;

        this.updateUserMarker(lat, lng, accuracy);

        if (this.routeMode && this.destination && !this.routeHidden) {
          this.updateRoute(lat, lng);
          this.checkEndpointReached(lat, lng);
        }
      },
      () => {
        alert("Location access denied. Map will show Strathmore campus only.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
      }
    );
  }
updateUserMarker(lat, lng, accuracy = 15) {
  const displayAccuracy = Math.min(accuracy, 15);

  if (!this.userMarker) {
    this.userMarker = L.circleMarker([lat, lng], {
      radius: 8,
      fillColor: "#1a73e8",
      color: "#ffffff",
      weight: 4,
      opacity: 1,
      fillOpacity: 1
    }).addTo(this.map);

    this.accuracyCircle = L.circle([lat, lng], {
      radius: displayAccuracy,
      stroke: false,
      fillColor: "#1a73e8",
      fillOpacity: 0.12
    }).addTo(this.map);

    this.map.setView([lat, lng], 18);
  } else {
    this.userMarker.setLatLng([lat, lng]);

    if (this.accuracyCircle) {
      this.accuracyCircle.setLatLng([lat, lng]);
      this.accuracyCircle.setRadius(displayAccuracy);
    }
  }
}

  updateRoute(userLat, userLng) {
    const entrance = this.destination?.entrances;

    if (!entrance) return;

    const endpointLat = Number(entrance.latitude);
    const endpointLng = Number(entrance.longitude);

    if (Number.isNaN(endpointLat) || Number.isNaN(endpointLng)) return;

    if (!this.endpointMarker) {
      this.endpointMarker = L.marker([endpointLat, endpointLng])
        .addTo(this.map)
        .bindPopup(entrance.entrance_name || "Destination Entrance");
    }

    if (this.routingControl) {
      this.routingControl.setWaypoints([
        L.latLng(userLat, userLng),
        L.latLng(endpointLat, endpointLng)
      ]);
      return;
    }

    this.routingControl = L.Routing.control({
      waypoints: [
        L.latLng(userLat, userLng),
        L.latLng(endpointLat, endpointLng)
      ],
      routeWhileDragging: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      show: false,

      createMarker: function () {
        return null;
      },

      lineOptions: {
        styles: [
          {
            color: "#0b3d2e",
            weight: 6,
            opacity: 0.85
          }
        ]
      }
    }).addTo(this.map);
  }

  checkEndpointReached(userLat, userLng) {
    const entrance = this.destination?.entrances;

    if (!entrance) return;

    const endpointLat = Number(entrance.latitude);
    const endpointLng = Number(entrance.longitude);

    const distance = this.map.distance(
      [userLat, userLng],
      [endpointLat, endpointLng]
    );

    if (distance <= 20) {
      this.hideRoute(true);
    }
  }

  hideRoute(reached = false) {
    this.routeHidden = true;

    if (this.routingControl) {
      this.map.removeControl(this.routingControl);
      this.routingControl = null;
    }

    if (this.endpointMarker) {
      this.map.removeLayer(this.endpointMarker);
      this.endpointMarker = null;
    }

    localStorage.removeItem("selectedDestination");

    const banner = document.getElementById("routeBanner");

    if (banner) {
      banner.innerHTML = reached
        ? `
          <h2>Entrance reached</h2>
          <p>Continue inside the building using the destination details.</p>
          <a href="directory.html" class="primary-link">Back to Directory</a>
        `
        : `
          <h2>Navigation ended</h2>
          <p>The route has been cleared.</p>
          <a href="directory.html" class="primary-link">Back to Directory</a>
        `;
    }
  }

  showRouteBanner() {
    if (!this.routeMode || !this.destination) return;

    const building = this.destination.floors?.buildings;
    const floor = this.destination.floors;
    const entrance = this.destination.entrances;

    const banner = document.createElement("section");
    banner.id = "routeBanner";
    banner.className = "home-overlay";

    banner.innerHTML = `
      <h2>${this.destination.location_name}</h2>
      <p><strong>Building:</strong> ${building?.building_code || ""} - ${building?.building_name || ""}</p>
      <p><strong>Floor:</strong> ${floor?.floor_name || "N/A"}</p>
      <p><strong>Endpoint:</strong> ${entrance?.entrance_name || "N/A"}</p>
      <button id="endRouteBtn" class="secondary-btn">End Navigation</button>
    `;

    document.querySelector(".map-home").appendChild(banner);

    document.getElementById("endRouteBtn").addEventListener("click", () => {
      this.hideRoute(false);
    });
  }
}

new HomeMapController();