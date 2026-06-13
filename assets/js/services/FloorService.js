import { SupabaseClient } from "../config/SupabaseClient.js";
import Floor from "../models/Floor.js";

export default class FloorService {
  constructor() {
    this.supabase = SupabaseClient.getClient();
  }

  async getAllFloors() {
    const { data, error } = await this.supabase
      .from("floors")
      .select("*, buildings(building_name, building_code)")
      .order("floor_number", { ascending: true });

    if (error) throw new Error(error.message);

    return data.map(row => ({
      floor: new Floor(
        row.floor_id,
        row.building_id,
        row.floor_number,
        row.floor_name
      ),
      building: row.buildings
    }));
  }

  async createFloor(floor) {
    const { error } = await this.supabase
      .from("floors")
      .insert({
        building_id: floor.buildingId,
        floor_number: floor.floorNumber,
        floor_name: floor.floorName
      });

    if (error) throw new Error(error.message);
  }

  async updateFloor(floor) {
    const { error } = await this.supabase
      .from("floors")
      .update({
        building_id: floor.buildingId,
        floor_number: floor.floorNumber,
        floor_name: floor.floorName
      })
      .eq("floor_id", floor.floorId);

    if (error) throw new Error(error.message);
  }

  async deleteFloor(floorId) {
    const { error } = await this.supabase
      .from("floors")
      .delete()
      .eq("floor_id", floorId);

    if (error) throw new Error(error.message);
  }
}