import "./styles/globals.css";
import "./popup-component";

// アプリケーションをマウント
document.addEventListener("DOMContentLoaded", () => {
	const app = document.getElementById("app");
	if (app) {
		app.innerHTML = "<reading-list-popup></reading-list-popup>";
	}
});
