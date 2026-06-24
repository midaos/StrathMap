import { SupabaseClient } from "../config/SupabaseClient.js";
import Location from "../models/Location.js";

export default class LocationService {
  constructor() {
    this.supabase = SupabaseClient.getClient();
  }

  async getAllLocations() {
    const data = await this.fetchAllLocations();

    return data.map((row) => ({
      location: new Location(
        row.location_id,
        row.floor_id,
        row.category_id,
        row.nearest_entrance_id,
        row.location_name,
        row.location_code,
        row.description,
        row.is_searchable
      ),
      floor: row.floors,
      category: row.location_categories,
      entrance: row.entrances
    }));
  }

  async fetchAllLocations() {
    const pageSize = 1000;
    let from = 0;
    let rows = [];

    while (true) {
      const { data, error } = await this.supabase
        .from("locations")
        .select(`
          *,
          floors(floor_name, floor_number, buildings(building_name, building_code)),
          location_categories(category_name),
          entrances(entrance_name)
        `)
        .order("location_name")
        .range(from, from + pageSize - 1);

      if (error) throw new Error(error.message);

      rows = rows.concat(data || []);

      if (!data || data.length < pageSize) {
        return rows;
      }

      from += pageSize;
    }
  }

  async createLocation(location) {
    const { error } = await this.supabase
      .from("locations")
      .insert({
        floor_id: location.floorId,
        category_id: location.categoryId,
        nearest_entrance_id: location.nearestEntranceId,
        location_name: location.locationName,
        location_code: location.locationCode,
        description: location.description,
        is_searchable: location.isSearchable
      });

    if (error) throw new Error(error.message);
  }

  async updateLocation(location) {
    const { error } = await this.supabase
      .from("locations")
      .update({
        floor_id: location.floorId,
        category_id: location.categoryId,
        nearest_entrance_id: location.nearestEntranceId,
        location_name: location.locationName,
        location_code: location.locationCode,
        description: location.description,
        is_searchable: location.isSearchable
      })
      .eq("location_id", location.locationId);

    if (error) throw new Error(error.message);
  }

  async deleteLocation(locationId) {
    const { error } = await this.supabase
      .from("locations")
      .delete()
      .eq("location_id", locationId);

    if (error) throw new Error(error.message);
  }
}
