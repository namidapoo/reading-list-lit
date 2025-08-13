import "../../src/popup/app";

// アプリケーションをマウント
document.addEventListener("DOMContentLoaded", () => {
	const app = document.getElementById("app");
	if (app) {
		app.innerHTML = "<reading-list-popup></reading-list-popup>";
	}
});
