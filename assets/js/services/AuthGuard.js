import { SupabaseClient } from "../config/SupabaseClient.js";

export default class AuthGuard {

    constructor() {
        this.supabase = SupabaseClient.getClient();
    }

    async verifyAdmin() {

        const { data } = await this.supabase.auth.getUser();

        if (!data.user) {
            window.location.href = "login.html";
            return;
        }

        const { data: admin } = await this.supabase
            .from("admins")
            .select("*")
            .eq("auth_user_id", data.user.id)
            .maybeSingle();

        if (!admin) {
            await this.supabase.auth.signOut();
            window.location.href = "login.html";
        }
    }
}