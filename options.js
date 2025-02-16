let activeTheme = localStorage.getItem("polypipes-theme") ?? "default";
let colors = {};

function setTheme(themeId) {
	activeTheme = themeId;
	document.getElementById("theme-css").href = `themes/${themeId}.css`;
	colors = THEME_COLORS[themeId];
	renderBoard(true);

	localStorage.setItem("polypipes-theme", themeId);
}

document.querySelectorAll(".c-theme").forEach(themeBtn => {
	// That's weird!
	// The class of a theme selector button is "c-theme c-theme-x"
	// This finds the value of x.
	let themeId = themeBtn.classList.value.split("-")[3];
	themeBtn.addEventListener("click", () => setTheme(themeId));
});

const THEME_COLORS = {
	default: {
		regular: "#bbb",
		locked: "#777",
		pipe: "#000",
		error: "#f00",
		flooded: "#7cf",
	},
	light: {
		regular: "#bbb",
		locked: "#ddd",
		pipe: "#000",
		error: "#f00",
		flooded: "#7cf",
	},
	dark: {
		regular: "#777",
		locked: "#555",
		pipe: "#ccc",
		error: "#f44",
		flooded: "#5ad",
	},
	black: {
		regular: "#555",
		locked: "#222",
		pipe: "#fff",
		error: "#f00",
		flooded: "#000",
	},
	mystic: {
		regular: "#669",
		locked: "#336",
		pipe: "#aad",
		error: "#f44",
		flooded: "#83b",
	},
};

setTheme(activeTheme);
