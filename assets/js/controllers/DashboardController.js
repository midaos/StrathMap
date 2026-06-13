import AuthGuard from "../services/AuthGuard.js";

class DashboardController {

    constructor() {
        this.authGuard = new AuthGuard();
        this.initialize();
    }

    async initialize() {
        await this.authGuard.verifyAdmin();
    }

}

new DashboardController();