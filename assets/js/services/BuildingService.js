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
      row.description,
      row.latitude,
      row.longitude
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
    const dependencies = await this.getBuildingDependencies(buildingId);

    if (dependencies.entrances || dependencies.floors) {
      const parts = [];
      if (dependencies.entrances) parts.push(`${dependencies.entrances} entrance${dependencies.entrances === 1 ? "" : "s"}`);
      if (dependencies.floors) parts.push(`${dependencies.floors} floor${dependencies.floors === 1 ? "" : "s"}`);

      throw new Error(`This building cannot be deleted because it still has ${parts.join(" and ")} linked to it. Delete or move those records first.`);
    }

    const { error } = await this.supabase
      .from("buildings")
      .delete()
      .eq("building_id", buildingId);

    if (error) throw new Error(error.message);
  }

  async getBuildingDependencies(buildingId) {
    const [entrances, floors] = await Promise.all([
      this.countRows("entrances", "building_id", buildingId),
      this.countRows("floors", "building_id", buildingId)
    ]);

    return { entrances, floors };
  }

  async countRows(table, column, value) {
    const { count, error } = await this.supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq(column, value);

    if (error) throw new Error(error.message);

    return count || 0;
  }
}
