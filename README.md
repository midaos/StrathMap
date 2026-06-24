# StrathMap

StrathMap is a Strathmore University campus navigation web application designed to help students, visitors, and staff find campus destinations quickly and confidently. It combines a Leaflet and OpenStreetMap campus map, a searchable indoor directory, GPS-based outdoor routing, and an admin dashboard for maintaining buildings, entrances, floors, categories, and locations.

The project is intentionally scoped for a third-year OOAD system: it focuses on practical campus wayfinding rather than indoor routing, 3D modelling, or a custom digital twin of the university.

## Project Goal

StrathMap solves a common campus problem: a new or anxious student may know the room code or office name they need, but not the building, entrance, floor, or how to get there from their current position.

The application guides the user in two clear stages:

1. Outdoor navigation to the correct building entrance.
2. Indoor guidance details such as building, floor, room code, category, and destination name.

For administrators, the system provides structured tools to manage large numbers of rooms and destinations without editing the map manually.

## Main Features

### Student Map

- Full-screen campus map using Leaflet and OpenStreetMap.
- GPS location shown as a blue dot with a small accuracy ring.
- Search drawer for quickly finding classrooms, offices, services, auditoriums, and room codes.
- Route line from the user's current position to the correct building entrance.
- Destination card with building, floor, room code, category, and indoor guidance.
- `I have arrived` confirmation appears only when the user reaches the destination area.
- Building abbreviation labels and a building key for easier map reading.
- Mobile-first interface with Strathmore-inspired styling.

### Directory

- Card-based directory organized by:
  - Building
  - Floor
  - Location
- Search supports room codes, room names, facilities, offices, and categories.
- Buildings and floors are collapsible so the directory remains usable even with many rooms.
- Selected destinations can be sent directly to the map for routing.

### Admin Dashboard

- Admin authentication through Supabase.
- Campus analytics summary for management reporting.
- Dashboard cards include:
  - Campus buildings
  - Directory depth
  - Navigation pulse
  - Today's movement
  - Campus hotspot
  - Student favourite
  - Most searched category
  - Most visited building
  - Weekly activity
  - System readiness
- Search log analytics are defensive and handle older or partial log data where possible.

### Admin CRUD

Admins can manage:

- Buildings
- Building entrances
- Floors
- Location categories
- Locations

The Locations admin page is designed for large datasets:

- Paginated Supabase reads beyond 1000 records.
- Summary cards for total, searchable, and entrance-linked locations.
- Local filtering by room, building, floor, category, entrance, and visibility.
- Clear separation between outdoor entrances and indoor room details.

## System Scope

### Included

- Campus-focused map experience.
- Outdoor routing to building entrances.
- Searchable indoor destination metadata.
- Admin-managed data.
- Supabase-backed persistence.
- Mobile responsive student and admin interfaces.
- Basic campus analytics from search logs.

### Not Included

- Indoor step-by-step routing.
- Floor switching navigation.
- 3D building models.
- Custom hand-drawn campus map.
- Complex polygon or building outline editing.
- Real-time crowd analytics.
- Physical visit tracking inside buildings.

The system does not claim that a user has physically entered a room. It guides them to the correct building entrance, then shows the details they need to continue inside.

## Technology Stack

- HTML5
- CSS3
- JavaScript ES modules
- Leaflet
- Leaflet Routing Machine
- OpenStreetMap tiles
- Supabase
- Supabase Auth
- Supabase Database

No build system is required. The application runs as static HTML, CSS, and JavaScript files served through a local or hosted web server.

## Folder Structure

```text
StrathMap/
  index.html
  directory.html
  admin/
    dashboard.html
    login.html
    buildings.html
    entrances.html
    floors.html
    categories.html
    locations.html
  assets/
    css/
      styles.css
      style.css
    js/
      config/
        SupabaseClient.js
      controllers/
      services/
      models/
  logo.png
  README.md
```

## Architecture Summary

The project follows a simple MVC-inspired structure:

- Models represent system entities such as Building, Floor, Entrance, Location, Category, and Admin.
- Services handle Supabase reads and writes.
- Controllers handle page behavior, DOM updates, forms, routing, search, and admin workflows.
- Views are plain HTML pages styled with CSS.

This separation keeps the project understandable and maintainable without adding unnecessary framework complexity.

## Important Files

### Public Pages

- `index.html`: Main campus map and navigation experience.
- `directory.html`: Searchable and browsable campus directory.

### Admin Pages

- `admin/dashboard.html`: Analytics and system summary.
- `admin/buildings.html`: Building records and label coordinates.
- `admin/entrances.html`: Building entrance coordinates for outdoor routing.
- `admin/floors.html`: Floors linked to buildings.
- `admin/categories.html`: Location categories.
- `admin/locations.html`: Room, office, and destination records.

### Controllers

- `HomeMapController.js`: Map, GPS, routing, building labels, route status, destination arrival flow.
- `DirectoryController.js`: Directory search, building and floor accordions, destination selection.
- `DashboardController.js`: Admin analytics and dashboard summaries.
- `LocationController.js`: Admin location management, filtering, and summaries.

### Services

- `DirectoryService.js`: Directory loading, destination search, search logging.
- `LocationService.js`: Location CRUD and paginated location reads.
- `BuildingService.js`, `EntranceService.js`, `FloorService.js`, `LocationCategoryService.js`: Admin CRUD support.
- `AuthService.js`, `AuthGuard.js`: Admin authentication and access control.

## Data Model Overview

The system expects these main tables in Supabase:

- `admins`
- `buildings`
- `entrances`
- `floors`
- `location_categories`
- `locations`
- `search_logs`

Conceptually:

- A building has many floors.
- A building has many entrances.
- A floor has many locations.
- A location belongs to a floor.
- A location belongs to a category.
- A location is linked to the building entrance students should use.
- Search logs record destination searches for dashboard analytics.

Building coordinates are used for visual building labels on the map. Entrance coordinates are used for outdoor navigation.

## Navigation Flow

1. A user opens the map.
2. The browser requests GPS permission.
3. The user searches for a destination or opens the directory.
4. The selected destination is saved temporarily in local storage.
5. The map calculates a route to the linked building entrance.
6. When the user reaches the destination area, the app shows arrival confirmation.
7. The user taps `I have arrived`.
8. Outdoor navigation ends and the app shows indoor destination details.

## Admin Data Entry Flow

For best results, admins should enter data in this order:

1. Create buildings.
2. Add building label coordinates if available.
3. Add building entrances with latitude and longitude.
4. Create floors under each building.
5. Create location categories.
6. Add locations and link each one to a floor, category, and building entrance.

This keeps the directory searchable and ensures the map can route students to the correct entrance.

## Running the Project Locally

Because the project uses ES modules and browser APIs, serve it with a local web server instead of opening files directly.

Example:

```bash
python -m http.server 5500
```

Then open:

```text
http://127.0.0.1:5500/index.html
```

For phone GPS testing, the browser usually requires HTTPS or localhost. If testing on a phone, use a secure tunnel or host the app over HTTPS.

## GPS Notes

Web GPS accuracy depends on the device, browser, signal quality, and environment.

On campus, GPS can be affected by:

- Being indoors.
- Tall buildings.
- Weak mobile signal.
- Battery saver mode.
- Browser location permissions.

StrathMap limits the GPS accuracy ring to avoid overwhelming the map visually, but actual device accuracy may still vary.

## Design Notes

The visual direction is based on Strathmore University colours:

- Blue: `#006699`
- Gold: `#FFCC00`
- Red: `#CC0000`
- Black: `#000000`
- White: `#FFFFFF`

The interface is designed to feel more like a production campus tool than a student prototype:

- Minimal map clutter.
- Strong destination visibility.
- Clear search and directory flows.
- Collapsible directory sections.
- Admin summaries for quick reporting.
- Mobile-friendly controls.

## Current Limitations

- Routing depends on GPS accuracy and available map/path data.
- Outdoor routing is approximate and campus-focused.
- Indoor navigation is represented through destination details, not live indoor positioning.
- Analytics are based on searches and destination selections, not verified physical foot traffic.
- Leaflet and OpenStreetMap labels depend on available OSM data.

## Future Improvements

Possible future enhancements include:

- Bulk CSV import for locations.
- Admin export reports for dashboard summaries.
- More detailed accessibility metadata for entrances.
- Optional building outline support.
- Better route refinement using verified campus walkway data.
- Search synonyms and aliases for common student terms.
- Role-based admin permissions.

## Final Summary

StrathMap is a practical, maintainable campus navigation system for Strathmore University. It helps students find where they need to go, gives admins control over campus data, and provides useful system summaries without exceeding the realistic scope of a third-year OOAD project.

The system deliberately prioritizes clarity, maintainability, and real student usability over unnecessary complexity.
