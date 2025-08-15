import "@popup/app";

// Mount application
document.addEventListener("DOMContentLoaded", () => {
	const app = document.getElementById("app");
	if (app) {
		app.innerHTML = "<reading-list-popup></reading-list-popup>";
	}
});
