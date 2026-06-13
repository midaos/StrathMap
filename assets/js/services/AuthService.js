import { SupabaseClient } from "../config/SupabaseClient.js";
import Admin from "../models/Admin.js";

export default class AuthService {
  constructor() {
    this.supabase = SupabaseClient.getClient();
  }

  async login(email, password) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw new Error("Invalid email or password.");
    }

    const user = data.user;

    const { data: adminData, error: adminError } = await this.supabase
      .from("admins")
      .select("*")
      .eq("auth_user_id", user.id)
      .single();

    if (adminError || !adminData) {
      await this.logout();
      throw new Error("Access denied. Admin account not found.");
    }

    return new Admin(
      adminData.admin_id,
      adminData.auth_user_id,
      adminData.full_name,
      adminData.email
    );
  }

  async logout() {
    await this.supabase.auth.signOut();
  }
}