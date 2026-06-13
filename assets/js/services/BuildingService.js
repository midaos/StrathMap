import { SupabaseClient } from "../config/SupabaseClient.js";
import Building from "../models/Building.js";

export default class BuildingService {
  constructor() {
    this.supabase = SupabaseClient.getClient();
  }

  async getAllBuildings() {
    const { data, error } = await this.supabase
      .from("buildings")
      .select("*")
      .order("building_name", { ascending: true });

    if (error) throw new Error(error.message);

    return data.map(row => new Building(
      row.building_id,
      row.building_name,
      row.building_code,
      row.description
    ));
  }

  async createBuilding(building) {
    const { error } = await this.supabase
      .from("buildings")
      .insert({
        building_name: building.buildingName,
        building_code: building.buildingCode,
        description: building.description
      });

    if (error) throw new Error(error.message);
  }

  async updateBuilding(building) {
    const { error } = await this.supabase
      .from("buildings")
      .update({
        building_name: building.buildingName,
        building_code: building.buildingCode,
        description: building.description
      })
      .eq("building_id", building.buildingId);

    if (error) throw new Error(error.message);
  }

  async deleteBuilding(buildingId) {
    const { error } = await this.supabase
      .from("buildings")
      .delete()
      .eq("building_id", buildingId);

    if (error) throw new Error(error.message);
  }
}