export class SupabaseClient {
  static client = null;

  static initialize() {
    if (!this.client) {
      this.client = supabase.createClient(
        "https://hcawkkraxgbgphxqttjs.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjYXdra3JheGdiZ3BoeHF0dGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNjIwNDQsImV4cCI6MjA5NjkzODA0NH0.Avn-eexyWLmUNG5_0jfc1jzru5zGE7Jt6U4tB0T5WcI"
      );
    }

    return this.client;
  }

  static getClient() {
    return this.initialize();
  }
}