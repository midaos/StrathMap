import { SupabaseClient } from "../config/SupabaseClient.js";
import LocationCategory from "../models/LocationCategory.js";

export default class LocationCategoryService {
  constructor() {
    this.supabase = SupabaseClient.getClient();
  }

  async getAllCategories() {
    const { data, error } = await this.supabase
      .from("location_categories")
      .select("*")
      .order("category_name");

    if (error) throw new Error(error.message);

    return data.map(row =>
      new LocationCategory(
        row.category_id,
        row.category_name,
        row.description
      )
    );
  }

  async createCategory(category) {
    const { error } = await this.supabase
      .from("location_categories")
      .insert({
        category_name: category.categoryName,
        description: category.description
      });

    if (error) throw new Error(error.message);
  }

  async updateCategory(category) {
    const { error } = await this.supabase
      .from("location_categories")
      .update({
        category_name: category.categoryName,
        description: category.description
      })
      .eq("category_id", category.categoryId);

    if (error) throw new Error(error.message);
  }

  async deleteCategory(categoryId) {
    const { error } = await this.supabase
      .from("location_categories")
      .delete()
      .eq("category_id", categoryId);

    if (error) throw new Error(error.message);
  }
}