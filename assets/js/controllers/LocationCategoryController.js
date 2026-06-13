import AuthGuard from "../services/AuthGuard.js";
import LocationCategory from "../models/LocationCategory.js";
import LocationCategoryService from "../services/LocationCategoryService.js";

class LocationCategoryController {
  constructor() {
    this.authGuard = new AuthGuard();
    this.categoryService = new LocationCategoryService();

    this.form = document.getElementById("categoryForm");
    this.tableBody = document.getElementById("categoryTableBody");
    this.message = document.getElementById("message");
    this.editingId = null;
    this.submitButton = null;

    this.initialize();
  }

  async initialize() {
    await this.authGuard.verifyAdmin();
    this.bindEvents();
    await this.loadCategories();
  }

  bindEvents() {
    this.submitButton = this.form.querySelector('button[type="submit"]');
    this.form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (this.editingId) await this.handleUpdateCategory();
      else await this.handleCreateCategory();
    });
  }

  async loadCategories() {
    const categories = await this.categoryService.getAllCategories();

    this.tableBody.innerHTML = "";

    categories.forEach(category => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${category.categoryName}</td>
        <td>${category.description || ""}</td>
        <td>
          <button class="edit-btn" data-id="${category.categoryId}">Edit</button>
          <button class="danger-btn" data-id="${category.categoryId}">Delete</button>
        </td>
      `;

      const buttons = row.querySelectorAll("button");
      buttons[0].addEventListener("click", async () => {
        this.handleEditCategory(category);
      });

      buttons[1].addEventListener("click", async () => {
        await this.handleDeleteCategory(category.categoryId);
      });

      this.tableBody.appendChild(row);
    });
  }

  async handleCreateCategory() {
    try {

      const categoryName =
        document.getElementById("categoryName").value.trim();

      const description =
        document.getElementById("description").value.trim();

      const category = new LocationCategory(
        null,
        categoryName,
        description
      );

      await this.categoryService.createCategory(category);

      this.form.reset();

      await this.loadCategories();

      this.message.textContent =
        "Category added successfully.";

      this.message.className =
        "message success";

    } catch (error) {

      this.message.textContent =
        error.message;

      this.message.className =
        "message error";
    }
  }

  async handleDeleteCategory(categoryId) {

    if (!confirm("Delete this category?"))
      return;

    await this.categoryService.deleteCategory(categoryId);

    await this.loadCategories();
  }

  handleEditCategory(category) {
    this.editingId = category.categoryId;
    document.getElementById("categoryName").value = category.categoryName || "";
    document.getElementById("description").value = category.description || "";
    if (this.submitButton) this.submitButton.textContent = "Update Category";
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async handleUpdateCategory() {
    try {
      this.message.textContent = "";

      const category = new LocationCategory(
        this.editingId,
        document.getElementById("categoryName").value.trim(),
        document.getElementById("description").value.trim()
      );

      await this.categoryService.updateCategory(category);

      this.editingId = null;
      this.form.reset();
      if (this.submitButton) this.submitButton.textContent = "Add Category";

      await this.loadCategories();

      this.message.textContent = "Category updated successfully.";
      this.message.className = "message success";
    } catch (error) {
      this.message.textContent = error.message;
      this.message.className = "message error";
    }
  }
}

new LocationCategoryController();