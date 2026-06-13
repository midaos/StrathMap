import AuthService from "../services/AuthService.js";

class LoginController {
  constructor() {
    this.authService = new AuthService();
    this.form = document.getElementById("loginForm");
    this.message = document.getElementById("message");

    this.bindEvents();
  }

  bindEvents() {
    this.form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await this.handleLogin();
    });
  }

  async handleLogin() {
    try {
      this.message.textContent = "";

      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;

      await this.authService.login(email, password);

      window.location.href = "dashboard.html";
    } catch (error) {
      this.message.textContent = error.message;
    }
  }
}

new LoginController();