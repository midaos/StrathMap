import { SupabaseClient } from "../config/SupabaseClient.js";

export default class FeedbackService {
  constructor() {
    this.supabase = SupabaseClient.getClient();
  }

  async submitFeedback(feedback) {
    const { error } = await this.supabase
      .from("feedback")
      .insert({
        user_name: this.emptyToNull(feedback.userName),
        category: feedback.category,
        searched_query: this.emptyToNull(feedback.searchedQuery),
        destination: this.emptyToNull(feedback.destination),
        current_page: this.emptyToNull(feedback.currentPage),
        feedback_message: feedback.feedbackMessage,
        rating: feedback.rating || null,
        device_type: this.emptyToNull(feedback.deviceType),
        browser: this.emptyToNull(feedback.browser),
        latitude: this.toNullableNumber(feedback.latitude),
        longitude: this.toNullableNumber(feedback.longitude)
      });

    if (error) throw new Error(error.message);
  }

  async getAllFeedback() {
    const pageSize = 1000;
    let from = 0;
    let rows = [];

    while (true) {
      const { data, error } = await this.supabase
        .from("feedback")
        .select("*")
        .order("submitted_at", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) throw new Error(error.message);

      rows = rows.concat(data || []);

      if (!data || data.length < pageSize) {
        return rows;
      }

      from += pageSize;
    }
  }

  emptyToNull(value) {
    const normalized = String(value || "").trim();
    return normalized ? normalized : null;
  }

  toNullableNumber(value) {
    if (value === null || value === undefined || value === "") return null;

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }
}
