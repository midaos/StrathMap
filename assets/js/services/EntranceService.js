import { SupabaseClient } from "../config/SupabaseClient.js";
import Entrance from "../models/Entrance.js";

export default class EntranceService {
  constructor() {
    this.supabase = SupabaseClient.getClient();
  }

  async getAllEntrances() {
    const { data, error } = await this.supabase
      .from("entrances")
      .select("*, buildings(building_name, building_code)")
      .order("entrance_name", { ascending: true });

    if (error) throw new Error(error.message);

    return data.map(row => ({
      entrance: new Entrance(
        row.entrance_id,
        row.building_id,
        row.entrance_name,
        row.latitude,
        row.longitude,
        row.is_default,
        row.status
      ),
      building: row.buildings
    }));
  }

  async createEntrance(entrance) {
    const { error } = await this.supabase
      .from("entrances")
      .insert({
        building_id: entrance.buildingId,
        entrance_name: entrance.entranceName,
        latitude: entrance.latitude,
        longitude: entrance.longitude,
        is_default: entrance.isDefault,
        status: entrance.status
      });

    if (error) throw new Error(error.message);
  }

  async updateEntrance(entrance) {
    const { error } = await this.supabase
      .from("entrances")
      .update({
        building_id: entrance.buildingId,
        entrance_name: entrance.entranceName,
        latitude: entrance.latitude,
        longitude: entrance.longitude,
        is_default: entrance.isDefault,
        status: entrance.status
      })
      .eq("entrance_id", entrance.entranceId);

    if (error) throw new Error(error.message);
  }

  async deleteEntrance(entranceId) {
    const { error } = await this.supabase
      .from("entrances")
      .delete()
      .eq("entrance_id", entranceId);

    if (error) throw new Error(error.message);
  }
}