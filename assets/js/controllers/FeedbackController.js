import FeedbackService from "../services/FeedbackService.js";

class FeedbackController {
  constructor() {
    this.feedbackService = new FeedbackService();
    this.form = document.getElementById("feedbackForm");
    this.messageBox = document.getElementById("feedbackMessageBox");
    this.submitButton = this.form?.querySelector('button[type="submit"]');

    this.initialize();
  }

  initialize() {
    this.prefillContext();

    this.form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      await this.handleSubmit();
    });
  }

  prefillContext() {
    const params = new URLSearchParams(window.location.search);
    const source = params.get("source");
    const currentPage = document.getElementById("currentPage");

    if (source && currentPage) {
      currentPage.value = ["map", "directory", "feedback"].includes(source)
        ? source
        : "feedback";
    }

    try {
      const destination = JSON.parse(localStorage.getItem("selectedDestination") || "null");
      if (!destination) return;

      const destinationInput = document.getElementById("destination");
      if (destinationInput && !destinationInput.value) {
        destinationInput.value = destination.location_name || destination.location_code || "";
      }
    } catch (error) {
      localStorage.removeItem("selectedDestination");
    }
  }

  async handleSubmit() {
    const category = document.getElementById("category").value;
    const feedbackMessage = document.getElementById("feedbackMessage").value.trim();

    if (!category || !feedbackMessage) {
      this.showMessage("Please choose a category and write your feedback.", "error");
      return;
    }

    this.setSubmitting(true);

    try {
      const coordinates = await this.getOptionalCoordinates();

      await this.feedbackService.submitFeedback({
        userName: document.getElementById("userName").value,
        category,
        searchedQuery: document.getElementById("searchedQuery").value,
        destination: document.getElementById("destination").value,
        currentPage: document.getElementById("currentPage").value,
        feedbackMessage,
        rating: this.getRating(),
        deviceType: this.getDeviceType(),
        browser: this.getBrowserName(),
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude
      });

      this.form.reset();
      this.showMessage("Thank you. Your feedback has been submitted.", "success");
    } catch (error) {
      this.showMessage(error.message || "Could not submit feedback. Please try again.", "error");
    } finally {
      this.setSubmitting(false);
    }
  }

  getRating() {
    const rating = Number(document.getElementById("rating").value);
    return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null;
  }

  getOptionalCoordinates() {
    const shouldShare = document.getElementById("shareLocation").checked;

    if (!shouldShare || !navigator.geolocation || !window.isSecureContext) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }),
        () => resolve(null),
        {
          enableHighAccuracy: true,
          maximumAge: 30000,
          timeout: 6000
        }
      );
    });
  }

  getDeviceType() {
    const width = window.innerWidth || 0;
    if (width <= 640) return "Mobile";
    if (width <= 1024) return "Tablet";
    return "Desktop";
  }

  getBrowserName() {
    const agent = navigator.userAgent || "";

    if (agent.includes("Edg/")) return "Microsoft Edge";
    if (agent.includes("Chrome/")) return "Chrome";
    if (agent.includes("Firefox/")) return "Firefox";
    if (agent.includes("Safari/")) return "Safari";

    return "Unknown browser";
  }

  setSubmitting(isSubmitting) {
    if (!this.submitButton) return;

    this.submitButton.disabled = isSubmitting;
    this.submitButton.textContent = isSubmitting ? "Submitting..." : "Submit feedback";
  }

  showMessage(message, type) {
    if (!this.messageBox) return;

    this.messageBox.textContent = message;
    this.messageBox.className = `feedback-message ${type}`;
  }
}

new FeedbackController();
