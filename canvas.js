const canvas = document.getElementById("c"), ctx = canvas.getContext("2d");

function renderPolygon(polygon) {
	ctx.fillStyle = polygon.locked ? colors.locked : colors.regular;
	ctx.strokeStyle = polygon.locked ? colors.locked : colors.regular;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(polygon.vertices[0][0], polygon.vertices[0][1]);
	for (let i = 1; i <= polygon.sides; i++) {
		ctx.lineTo(polygon.vertices[i % polygon.sides][0], polygon.vertices[i % polygon.sides][1]);
	}
	ctx.fill();
	ctx.stroke();
	let connections = 0;
	for (let i = 0; i < polygon.sides; i++) {
		if ((polygon.pipes & (1 << i)) === 0) continue;
		connections++;
	}
	ctx.fillStyle = colors.pipe;
	ctx.beginPath();
	const circleSize = polygon === game.source ? 10 : (connections > 1 ? 3 : 7);
	ctx.arc(polygon.position[0], polygon.position[1], circleSize, 0, 2 * Math.PI);
	ctx.fill();
	ctx.strokeStyle = colors.pipe;
	ctx.lineWidth = 6;
	ctx.beginPath();
	const [x, y] = polygon.position;
	for (let i = 0; i < polygon.sides; i++) {
		if ((polygon.pipes & (1 << i)) === 0) continue;
		ctx.moveTo(x, y);
		let v = [polygon.midpts[i][0] - x, polygon.midpts[i][1] - y];
		// Rotation matrix
		const ang = -polygon.pipesRotationDisplay * 2 * Math.PI / polygon.sides;
		const cosang = Math.cos(ang), sinang = Math.sin(ang);
		v = [v[0] * cosang - v[1] * sinang, v[0] * sinang + v[1] * cosang];
		ctx.lineTo(v[0] + x, v[1] + y);
	}
	ctx.stroke();
	if (polygon.hasLight) {
		ctx.beginPath();
		ctx.lineWidth = 2;
		ctx.strokeStyle = polygon.hasCycle ? colors.error : colors.flooded;
		for (let i = 0; i < polygon.sides; i++) {
			if ((polygon.pipes & (1 << i)) === 0) continue;
			ctx.moveTo(x, y);
			let v = [polygon.midpts[i][0] - x, polygon.midpts[i][1] - y];
			// Rotation matrix
			const ang = -polygon.pipesRotationDisplay * 2 * Math.PI / polygon.sides;
			const cosang = Math.cos(ang), sinang = Math.sin(ang);
			v = [v[0] * cosang - v[1] * sinang, v[0] * sinang + v[1] * cosang];
			ctx.lineTo(v[0] + x, v[1] + y);
		}
		ctx.stroke();
	}
	if (polygon.locked) {
		ctx.beginPath();
		ctx.lineWidth = 2;
		ctx.strokeStyle = colors.error;
		for (let i = 0; i < polygon.sides; i++) {
			if ((polygon.pipes & (1 << i)) === 0) continue;
			const other = polygon.connections[(i + polygon.pipesRotation) % polygon.sides];
			if (other && (!other.locked || other.hasConnection(other.connections.indexOf(polygon)))) continue;
			ctx.moveTo(x, y);
			let v = [polygon.midpts[i][0] - x, polygon.midpts[i][1] - y];
			// Rotation matrix
			const ang = -polygon.pipesRotationDisplay * 2 * Math.PI / polygon.sides;
			const cosang = Math.cos(ang), sinang = Math.sin(ang);
			v = [v[0] * cosang - v[1] * sinang, v[0] * sinang + v[1] * cosang];
			ctx.lineTo(v[0] + x, v[1] + y);
		}
		ctx.stroke();
	}
	if (polygon === game.source) {
		ctx.fillStyle = colors.pipe;
		ctx.beginPath();
		ctx.arc(polygon.position[0], polygon.position[1], 10, 0, 2 * Math.PI);
		ctx.fill();
		ctx.strokeStyle = game.source.hasCycle ? colors.error : colors.flooded;
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.arc(polygon.position[0], polygon.position[1], 6, 0, 2 * Math.PI);
		ctx.stroke();
	} else if (polygon.hasLight) {
		ctx.fillStyle = polygon.hasCycle ? colors.error : colors.flooded;
		ctx.beginPath();
		ctx.arc(polygon.position[0], polygon.position[1], circleSize - 2, 0, 2 * Math.PI);
		ctx.fill();
	}
}
function renderHologram(holo) {
	ctx.translate(holo.position[0] - holo.parent.position[0], holo.position[1] - holo.parent.position[1]);
	renderPolygon(holo.parent);
	ctx.fillStyle = "#eee8";
	ctx.beginPath();
	const polygon = holo.parent;
	ctx.moveTo(polygon.vertices[0][0], polygon.vertices[0][1]);
	for (let i = 1; i <= polygon.sides; i++) {
		ctx.lineTo(polygon.vertices[i % polygon.sides][0], polygon.vertices[i % polygon.sides][1]);
	}
	ctx.fill();
	ctx.translate(-holo.position[0] + holo.parent.position[0], -holo.position[1] + holo.parent.position[1]);
}

let currentCanvasUpdate = 0;
let init = false;
let boardTransform = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const Matrix = {
	translate(x, y) {
		return [[1, 0, 0], [0, 1, 0], [x, y, 1]];
	},
	scale(x, y) {
		return [[x, 0, 0], [0, y, 0], [0, 0, 1]];
	},
	mul3x3(a, b) {
		return [
			[
				a[0][0]*b[0][0] + a[1][0]*b[0][1] + a[2][0]*b[0][2],
				a[0][1]*b[0][0] + a[1][1]*b[0][1] + a[2][1]*b[0][2],
				a[0][2]*b[0][0] + a[1][2]*b[0][1] + a[2][2]*b[0][2],
			],
			[
				a[0][0]*b[1][0] + a[1][0]*b[1][1] + a[2][0]*b[1][2],
				a[0][1]*b[1][0] + a[1][1]*b[1][1] + a[2][1]*b[1][2],
				a[0][2]*b[1][0] + a[1][2]*b[1][1] + a[2][2]*b[1][2],
			],
			[
				a[0][0]*b[2][0] + a[1][0]*b[2][1] + a[2][0]*b[2][2],
				a[0][1]*b[2][0] + a[1][1]*b[2][1] + a[2][1]*b[2][2],
				a[0][2]*b[2][0] + a[1][2]*b[2][1] + a[2][2]*b[2][2],
			]
		];
	},
	transformVector(m, v) {
		return [
			m[0][0] * v[0] + m[1][0] * v[1] + m[2][0],
			m[0][1] * v[0] + m[1][1] * v[1] + m[2][1],
		];
	}
};
let zoomLevel = 1;
function initBoard() {
	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
	for (const [_key, poly] of game.board) {
		for (let vertex of poly.vertices) {
			maxX = Math.max(maxX, vertex[0]);
			maxY = Math.max(maxY, vertex[1]);
			minX = Math.min(minX, vertex[0]);
			minY = Math.min(minY, vertex[1]);
		}
	}
	canvas.width = ((maxX - minX) + 10) * zoomLevel;
	canvas.height = ((maxY - minY) + 10) * zoomLevel;
	ctx.resetTransform();
	ctx.scale(zoomLevel, zoomLevel);
	ctx.translate(5 - minX, 5 - minY);
	boardTransform = Matrix.mul3x3(Matrix.translate(minX - 5, minY - 5), Matrix.scale(1/zoomLevel, 1/zoomLevel));
	if (!init) startRenderBoard();
	init = true;
	renderBoard(true);
}
function renderBoard(force = false) {
	if (canvas.width > window.innerWidth) canvas.style.alignSelf = "flex-start";
	else canvas.style.alignSelf = "center";
	currentCanvasUpdate++;
	const holograms = [];
	for (const [_key, poly] of game.board) {
		if (poly instanceof Hologram) {
			holograms.push(poly);
			continue;
		}
		poly.updatePipesRotationDisplay();
		if (!force && currentCanvasUpdate - poly.lastCanvasUpdate > 2) continue;
		renderPolygon(poly);
	}
	// render holograms after polygons for updated rotation display
	for (const holo of holograms) {
		if (!force && currentCanvasUpdate - holo.parent.lastCanvasUpdate > 2) continue;
		renderHologram(holo);
	}
	if (game.won) return;
	let elapsedTime = Math.floor((Date.now() - startTime) / 1000);
	const seconds = elapsedTime % 60;
	elapsedTime = Math.floor(elapsedTime / 60);
	const minutes = elapsedTime % 60;
	elapsedTime = Math.floor(elapsedTime / 60);
	const hours = elapsedTime;
	let timeString = `${seconds}s`;
	if (minutes || hours) timeString = `${minutes}m ` + timeString;
	if (hours) timeString = `${hours}h ` + timeString;
	document.getElementById("time-text").innerText = timeString;
}
function startRenderBoard() {
	renderBoard();
	requestAnimationFrame(startRenderBoard);
}

let eventsStack = [], eventsStackPtr = 0;
canvas.addEventListener("click", (ev) => {
	let x = ev.offsetX, y = ev.offsetY;
	[x, y] = Matrix.transformVector(boardTransform, [x, y]);
	for (const [_, _poly] of game.board) {
		if (_poly.isClicked(x, y)) {
			const poly = _poly instanceof Hologram ? _poly.parent : _poly;
			if (ev.shiftKey) {
				poly.pipesRotateAnticlockwise();
				eventsStack[eventsStackPtr] = ["cc", _];
			} else {
				poly.pipesRotateClockwise();
				eventsStack[eventsStackPtr] = ["c", _];
			}
			eventsStackPtr++;
			if (eventsStack.length > eventsStackPtr) eventsStack.length = eventsStackPtr;
			break;
		}
	}
});

canvas.addEventListener("contextmenu", (ev) => {
	if (game.won) return;
	let x = ev.offsetX, y = ev.offsetY;
	[x, y] = Matrix.transformVector(boardTransform, [x, y]);
	for (const [_, _poly] of game.board) {
		if (_poly.isClicked(x, y)) {
			const poly = _poly instanceof Hologram ? _poly.parent : _poly;
			poly.locked = !poly.locked;
			eventsStack.push(["l", _]);
			eventsStackPtr++;
			if (eventsStack.length > eventsStackPtr) eventsStack.length = eventsStackPtr;
			poly.lastCanvasUpdate = currentCanvasUpdate;
			for (const poly2 of poly.connections) {
				if (poly2) poly2.lastCanvasUpdate = currentCanvasUpdate;
			}
			break;
		}
	}
	ev.preventDefault();
});

function undo() {
	if (!eventsStackPtr) return;
	eventsStackPtr--;
	const [e, k] = eventsStack[eventsStackPtr];
	const poly = game.board.get(k);
	switch (e) {
		case "l": {
			poly.locked = !poly.locked;
			break;
		}
		case "cc": {
			poly.pipesRotateClockwise();
			break;
		}
		case "c": {
			poly.pipesRotateAnticlockwise();
			break;
		}
	}
	poly.lastCanvasUpdate = currentCanvasUpdate;
	for (const poly2 of poly.connections) {
		if (poly2) poly2.lastCanvasUpdate = currentCanvasUpdate;
	}
}
function redo() {
	if (!eventsStack[eventsStackPtr]) return;
	const [e, k] = eventsStack[eventsStackPtr];
	eventsStackPtr++;
	const poly = game.board.get(k);
	switch (e) {
		case "l": {
			poly.locked = !poly.locked;
			break;
		}
		case "cc": {
			poly.pipesRotateAnticlockwise();
			break;
		}
		case "c": {
			poly.pipesRotateClockwise();
			break;
		}
	}
	poly.lastCanvasUpdate = currentCanvasUpdate;
	for (const poly2 of poly.connections) {
		if (poly2) poly2.lastCanvasUpdate = currentCanvasUpdate;
	}
}
function resetGame() {
	if (game.won) return;
	if (!confirm("Are you sure you want to reset? You can still redo your moves.")) return;
	while (eventsStackPtr) undo();
}
document.addEventListener("keydown", (ev) => {
	if (game.won || !ev.ctrlKey) return;
	if (ev.key === "z") {
		undo();
	} else if (ev.key === "y") {
		redo();
	}
});
