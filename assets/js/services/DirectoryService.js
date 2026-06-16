import { SupabaseClient } from "../config/SupabaseClient.js";

export default class DirectoryService {
  constructor() {
    this.supabase = SupabaseClient.getClient();
  }

  normalizeQuery(rawInput) {
    return rawInput
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "")
      .replace(/^([A-Z])(\d)(\d{2})$/, "$1$2-$3");
  }

  async getDirectory() {
    const { data, error } = await this.supabase
      .from("buildings")
      .select(`
        *,
        floors(
          *,
          locations(
            *,
            location_categories(*),
            entrances(*)
          )
        )
      `)
      .order("building_name");

    if (error) throw new Error(error.message);
    return data;
  }

  async searchLocation(rawInput) {
    const normalizedQuery = this.normalizeQuery(rawInput);

    const { data, error } = await this.supabase
      .from("locations")
      .select(`
        *,
        floors(
          floor_name,
          floor_number,
          buildings(
            building_id,
            building_name,
            building_code
          )
        ),
        location_categories(*),
        entrances(*)
      `)
      .eq("is_searchable", true)
      .or(`location_code.ilike.%${normalizedQuery}%,location_name.ilike.%${rawInput}%`)
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);

    await this.recordSearch(rawInput, normalizedQuery, data);

    return data;
  }

  async recordSearch(rawInput, normalizedQuery, result) {
    await this.supabase.from("search_logs").insert({
      raw_input: rawInput,
      normalized_query: result
        ? result.location_code || result.location_name
        : normalizedQuery,
      matched_location_id: result ? result.location_id : null,
      matched_building_id: result ? result.floors.buildings.building_id : null,
      category_id: result ? result.location_categories.category_id : null,
      result_status: result ? "found" : "not_found"
    });
  }
}