function shuffle(array) {
	let currentIndex = array.length,  randomIndex;
	while (currentIndex != 0) {
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;
		[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
	}

	return array;
}

const game = {
	board: new Map(),
	source: null,
	won: false,
	makeWin() {
		game.won = true;
		document.getElementById("win-text").style.display = "block";
		for (const [_, poly] of game.board) {
			poly.locked = true;
			poly.lastCanvasUpdate = currentCanvasUpdate;
		}
		requestAnimationFrame(() => requestAnimationFrame(() => alert("You won!")));
	},
	calcLight() {
		const hasLight = new Map();
		const hasCycle = new Map();
		for (const [key, poly] of game.board) {
			if (poly instanceof Hologram) continue;
			poly.search.visited = false;
			poly.search.degree = 0;
			hasLight.set(key, poly.hasLight);
			hasCycle.set(key, poly.hasCycle);
			poly.hasLight = false;
			poly.hasCycle = false;
		}
		const nodes = [];
		function DFS(i) {
			const stack = [i];
			while (stack.length) {
				const u = stack.pop();
				if (!u.search.visited) {
					nodes.push(u);
					u.search.visited = true;
					for (let i = 0; i < u.sides; i++) {
						const v = u.connections[i];
						if (!v || !u.hasConnection(i)) continue;
						if (!v.hasConnection(v.connections.indexOf(u))) continue;
						v.search.degree++;
						if (!v.search.visited) {
							v.hasLight = true;
							stack.push(v);
						}
					}
				}
			}
		}
		game.source.hasLight = true;
		DFS(game.source);
		for (const poly of nodes) {
			poly.search.visited = false;
		}
		function DFS2(i) {
			const stack = [i];
			while (stack.length) {
				const u = stack.pop();
				if (!u.search.visited) {
					u.search.visited = true;
					for (let i = 0; i < u.sides; i++) {
						const v = u.connections[i];
						if (!v || !u.hasConnection(i) || !v.hasLight) continue;
						if (!v.hasConnection(v.connections.indexOf(u)) || v.search.visited) continue;
						v.search.degree--;
						if (v.search.degree === 1) stack.push(v);
					}
				}
			}
		}
		for (const poly of nodes) {
			if (poly.search.degree <= 1 && !poly.search.visited) DFS2(poly);
		}
		for (const poly of nodes) {
			if (poly.search.degree > 1) poly.hasCycle = true;
		}
		let allLit = true;
		for (const [key, poly] of game.board) {
			if (poly instanceof Hologram) continue;
			if (!poly.hasLight || poly.hasCycle) allLit = false;
			if (hasLight.get(key) !== poly.hasLight) poly.lastCanvasUpdate = currentCanvasUpdate;
			if (hasCycle.get(key) !== poly.hasCycle) poly.lastCanvasUpdate = currentCanvasUpdate;
		}
		if (allLit) game.makeWin();
	},
	generateFromBoard() {
		game.won = false;
		document.getElementById("win-text").style.display = "none";
		const NODE_PROBABILITY = 0.07;
		const EDGE_PROBABILITY = 0.11;
		const queue = new Queue();
		for (const [_key, poly] of game.board) {
			if (poly instanceof Hologram) continue;
			if (Math.random() < NODE_PROBABILITY || poly === game.source) queue.push(poly);
		}
		for (const [_key, poly] of game.board) {
			if (poly instanceof Hologram) continue;
			if (poly.dsu.root !== poly || poly.dsu.size > 1) continue;
			queue.push(poly);
			while (queue.length()) {
				const top = queue.pop();
				let validCons = top.connections.map((other, idx) => [other, idx])
					.filter(con => con[0] && con[0].dsu_find() !== top.dsu_find());
				if (!validCons.length) continue;
				if (queue.length === 0 || top === poly) { 
					let rng = Math.floor(Math.random() * validCons.length);
					top.addConnection(validCons[rng][1]);
					validCons[rng][0].addConnection(validCons[rng][0].connections.indexOf(top));
					top.dsu_union(validCons[rng][0]);
					queue.push(validCons[rng][0]);
				}
				for (const con of validCons) {
					if (Math.random() < EDGE_PROBABILITY && con[0].dsu_find() !== top.dsu_find()) {
						top.addConnection(con[1]);
						con[0].addConnection(con[0].connections.indexOf(top));
						top.dsu_union(con[0]);
						queue.push(con[0]);
					}
				}
			}
		}
		if (game.source.dsu.size === game.board.size) return;
		function DFS(i) {
			const stack = [i];
			while (stack.length) {
				const u = stack.pop();
				if (!u.search.visited) {
					u.search.visited = true;
					const order = shuffle(Array.from(Array(u.sides), (_, i) => i));
					for (const i of order) {
						if (u.connections[i] && !u.connections[i].search.visited) {
							stack.push(u.connections[i]);
							if (u.dsu_find() !== u.connections[i].dsu_find()) {
								u.addConnection(i);
								u.connections[i].addConnection(u.connections[i].connections.indexOf(u));
								u.dsu_union(u.connections[i]);
							}
						}
					}
				}
			}
		}
		DFS(game.source);
	},
	generateGame(type, x, y) {
		startTime = Date.now();
		eventsStack = [];
		eventsStackPtr = 0;
		game.board = new Map();
		BOARD_TYPES[type].generate(x, y);
		game.generateFromBoard();
		for (const [_, poly] of game.board) {
			poly.pipesRotation = Math.floor(Math.random() * poly.sides);
			poly.pipesRotationDisplay = poly.pipesRotation;
		}
		game.calcLight();
		initBoard();
	},
	makeGameFromUI() {
		const type = document.getElementById("board-type").value;
		const x = Number(document.getElementById("width").value);
		const y = Number(document.getElementById("height").value);
		if (x < 2 || x > 99) {
			alert("Width must be between 2 and 99!");
			return;
		}
		if (y < 2 || y > 99) {
			alert("Height must be between 2 and 99!");
			return;
		}
		game.generateGame(type, x, y);
	}
};

const BOARD_TYPES = {
	square: {
		generate(x, y) {
			const sideLen = 35;
			for (let i = 0; i < x; i++) {
				for (let j = 0; j < y; j++) {
					game.board.set(
						i * 1e7 + j,
						new Polygon(4, sideLen, [(i + 0.5) * sideLen, (j + 0.5) * sideLen])
					);
				}
			}
			game.source = game.board.get(Math.floor(x / 2) * 1e7 + Math.floor(y / 2));
			for (let i = 0; i < x; i++) {
				for (let j = 0; j < y; j++) {
					const poly = game.board.get(i * 1e7 + j);
					poly.connections[0] = game.board.get((i + 1) * 1e7 + j);
					poly.connections[1] = game.board.get(i * 1e7 + (j - 1));
					poly.connections[2] = game.board.get((i - 1) * 1e7 + j);
					poly.connections[3] = game.board.get(i * 1e7 + (j + 1));
				}
			}
		}
	},
	squareWrap: {
		generate(x, y) {
			x = Math.max(3, x);
			y = Math.max(3, y);
			const sideLen = 35;
			BOARD_TYPES.square.generate(x, y);
			for (let i = 0; i < x; i++) {
				const poly1 = game.board.get(i * 1e7 + (y - 1));
				const poly2 = game.board.get(i * 1e7);
				poly1.connections[3] = poly2;
				poly2.connections[1] = poly1;
				game.board.set("hx1" + i.toString(), new Hologram(poly1, [(i + 0.5) * sideLen, -0.5 * sideLen]));
				game.board.set("hx2" + i.toString(), new Hologram(poly2, [(i + 0.5) * sideLen, (y + 0.5) * sideLen]));
			}
			for (let i = 0; i < y; i++) {
				const poly1 = game.board.get((x - 1) * 1e7 + i);
				const poly2 = game.board.get(i);
				poly1.connections[0] = poly2;
				poly2.connections[2] = poly1;
				game.board.set("hy1" + i.toString(), new Hologram(poly1, [-0.5 * sideLen, (i + 0.5) * sideLen]));
				game.board.set("hy2" + i.toString(), new Hologram(poly2, [(x + 0.5) * sideLen, (i + 0.5) * sideLen]));
			}
		}
	},
	triangle: {
		generate(x, y) {
			const keyFrom = (x, y) => x.toString() + "_" + y.toString();
			const sideLen = 50;
			const midptR = sideLen / Math.sqrt(3) / 2;
			const diam = sideLen * Math.sqrt(3) / 2;
			for (let j = 0; j < y; j++) {
				const subtr = ((j === y - 1) && (y % 2 === 1)) ? 1 : 0;
				for (let i = 0 + subtr; i < 2 * x - 1 - subtr; i++) {
					game.board.set(
						keyFrom(i, j),
						new Polygon(3, sideLen,
							[(i + 1) * sideLen / 2, j * diam + midptR * (2 - (i + j) % 2)],
							(i + j) % 2 === 0 ? Math.PI / 6 : -Math.PI * 5 / 6
						)
					);
				}
			}
			game.source = game.board.get(keyFrom(x - 1, Math.floor(y / 2)));
			for (const [key, poly] of game.board) {
				let [x1, y1] = key.split("_");
				x1 = parseInt(x1, 10);
				y1 = parseInt(y1, 10);
				const type = (y1 + x1) % 2;
				poly.connections[type] = game.board.get(keyFrom(x1 + 1, y1));
				poly.connections[1 - type] = game.board.get(keyFrom(x1 - 1, y1));
				poly.connections[2] = game.board.get(keyFrom(x1, y1 + (type === 0 ? 1 : -1)));
			}
		}
	},
	hexagon: {
		generate(x, y) {
			const keyFrom = (x, y) => x.toString() + "_" + y.toString();
			const sideLen = 24;
			const midptR = sideLen / 2 / Math.tan(Math.PI / 6);
			for (let i = 0; i < y; i++) {
				for (let j = -Math.min(i, y - 1 - i); j < x + Math.min(i, y - 1 - i); j++) {
					game.board.set(
						keyFrom(i * 2, j * 2 + 1), 
						new Polygon(6, sideLen, [(j + 1) * midptR * 2, i * sideLen * 3 + sideLen])
					);
				}
			}
			for (let i = 0; i < y - 1; i++) {
				for (let j = -Math.min(i, y - 2 - i); j < x + 1 + Math.min(i, y - 2 - i); j++) {
					game.board.set(
						keyFrom(i * 2 + 1, j * 2), 
						new Polygon(6, sideLen, [j * midptR * 2 + midptR, i * sideLen * 3 + sideLen * 2.5])
					);
				}
			}
			for (const [key, poly] of game.board) {
				let [y1, x1] = key.split("_");
				x1 = parseInt(x1, 10);
				y1 = parseInt(y1, 10);
				poly.connections[0] = game.board.get(keyFrom(y1, x1 + 2));
				poly.connections[1] = game.board.get(keyFrom(y1 - 1, x1 + 1));
				poly.connections[2] = game.board.get(keyFrom(y1 - 1, x1 - 1));
				poly.connections[3] = game.board.get(keyFrom(y1, x1 - 2));
				poly.connections[4] = game.board.get(keyFrom(y1 + 1, x1 - 1));
				poly.connections[5] = game.board.get(keyFrom(y1 + 1, x1 + 1));
			}
			game.source = game.board.get(keyFrom(y - 1, Math.ceil(x / 2) * 2 - ((y % 2 === 1) ? 1 : 0)));
		}
	},
	kagome: {
		generate(x, y, wrap = false) {
			const keyFrom = (...e) => e.join("_");
			const sideLen = 40;
			const midptR = sideLen * Math.sqrt(3) / 2;
			for (let i = 0; i < y; i++) {
				for (let j = 0; j < x; j++) {
					game.board.set(
						keyFrom(i, j * 2 + i % 2), 
						new Polygon(6, sideLen, [(j * 2 + i % 2) * sideLen, (i + 1) * midptR * 2], Math.PI / 6)
					);
					game.board.set(
						keyFrom(i, j * 2 + 1 - i % 2, 0),
						new Polygon(3, sideLen, [(j * 2 + 1 - (i % 2)) * sideLen, (i + 2/3) * midptR * 2], -Math.PI * 5 / 6)
					);
					game.board.set(
						keyFrom(i, j * 2 + 1 - i % 2, 1),
						new Polygon(3, sideLen, [(j * 2 + 1 - (i % 2)) * sideLen, (i + 4/3) * midptR * 2], Math.PI / 6)
					);
				}
			}
			if (!wrap) {
				game.board.delete(keyFrom(0, x * 2 - 1, 0));
				game.board.delete(keyFrom(y - 1, (y % 2) * (x * 2 - 1), 1));
			}
			const modX = wrap ? x * 2 : 1e7, modY = wrap ? y : 1e7;
			for (const [key, poly] of game.board) {
				if (poly.sides !== 3) continue;
				let [y1, x1, z] = key.split("_");
				x1 = parseInt(x1, 10);
				y1 = parseInt(y1, 10);
				z = parseInt(z, 10);
				const left = game.board.get(keyFrom(y1, (x1 + modX - 1) % modX));
				const right = game.board.get(keyFrom(y1, (x1 + 1) % modX));
				switch (z) {
					case 0: {
						const top = game.board.get(keyFrom((y1 + modY - 1) % modY, x1));
						poly.connections[2] = top;
						if (top) top.connections[4] = poly;
						poly.connections[0] = left;
						if (left) left.connections[0] = poly;
						poly.connections[1] = right;
						if (right) right.connections[2] = poly;
						break;
					}
					case 1: {
						const bottom = game.board.get(keyFrom((y1 + 1) % modY, x1));
						poly.connections[2] = bottom;
						if (bottom) bottom.connections[1] = poly;
						poly.connections[1] = left;
						if (left) left.connections[5] = poly;
						poly.connections[0] = right;
						if (right) right.connections[3] = poly;
						break;
					}
				}
			}
			const sourceY = Math.floor(y / 2),
			sourceX = Math.floor(x / 2) * 2 + sourceY % 2;
			game.source = game.board.get(keyFrom(sourceY, sourceX));
		}
	},
	kagomeWrap: {
		generate(x, y) {
			const keyFrom = (...e) => e.join("_");
			const sideLen = 40;
			const midptR = sideLen * Math.sqrt(3) / 2;
			// y has to be a multiple of 2
			y = Math.ceil(y / 2) * 2;
			BOARD_TYPES.kagome.generate(x, y, true);
			for (let i = 0; i < y; i += 2) {
				const t0 = game.board.get(keyFrom(i, x * 2 - 1, 0)),
					t1 = game.board.get(keyFrom(i, x * 2 - 1, 1));
				const hex = game.board.get(keyFrom(i, 0));
				game.board.set(keyFrom(i, x * 2), new Hologram(hex, [(x * 2) * sideLen, (i + 1) * midptR * 2]));
				game.board.set(keyFrom(i, -1, 0), new Hologram(t0, [-sideLen, (i + 2/3) * midptR * 2]));
				game.board.set(keyFrom(i, -1, 1), new Hologram(t1, [-sideLen, (i + 4/3) * midptR * 2]));
			}
			for (let i = 1; i < y; i += 2) {
				const t0 = game.board.get(keyFrom(i, 0, 0)),
					t1 = game.board.get(keyFrom(i, 0, 1));
				const hex = game.board.get(keyFrom(i, x * 2 - 1));
				game.board.set(keyFrom(i, -1), new Hologram(hex, [-sideLen, (i + 1) * midptR * 2]));
				game.board.set(keyFrom(i, x * 2, 0), new Hologram(t0, [(x * 2) * sideLen, (i + 2/3) * midptR * 2]));
				game.board.set(keyFrom(i, x * 2, 1), new Hologram(t1, [(x * 2) * sideLen, (i + 4/3) * midptR * 2]));
			}
			for (let j = 0; j < x; j++) {
				game.board.set(
					keyFrom(y, j * 2), 
					new Hologram(game.board.get(keyFrom(0, j * 2)), [j * 2 * sideLen, (y + 1) * midptR * 2])
				);
				game.board.set(
					keyFrom(y, j * 2 + 1, 0),
					new Hologram(game.board.get(keyFrom(0, j * 2 + 1, 0)), [(j * 2 + 1) * sideLen, (y + 2/3) * midptR * 2])
				);
				game.board.set(
					keyFrom(y, j * 2 + 1, 1),
					new Hologram(game.board.get(keyFrom(0, j * 2 + 1, 1)), [(j * 2 + 1) * sideLen, (y + 4/3) * midptR * 2])
				);

				game.board.set(
					keyFrom(-1, j * 2 + 1), 
					new Hologram(game.board.get(keyFrom(y - 1, j * 2 + 1)), [(j * 2 + 1) * sideLen, 0])
				);
				game.board.set(
					keyFrom(-1, j * 2, 0),
					new Hologram(game.board.get(keyFrom(y - 1, j * 2, 0)), [j * 2 * sideLen, -2/3 * midptR])
				);
				game.board.set(
					keyFrom(-1, j * 2, 1),
					new Hologram(game.board.get(keyFrom(y - 1, j * 2, 1)), [j * 2 * sideLen, 2/3 * midptR])
				);
			}
			game.board.set(
				keyFrom(y, x * 2),
				new Hologram(game.board.get("0_0"), [(x * 2) * sideLen, (y + 1) * midptR * 2])
			);
			game.board.set(
				keyFrom(-1, -2),
				new Hologram(game.board.get(keyFrom(y - 1, x * 2 - 1)), [-sideLen, 0])
			);
			game.board.set(
				keyFrom(y, -1, 0),
				new Hologram(game.board.get(keyFrom(0, x * 2 - 1, 0)), [-sideLen, (y + 2/3) * midptR * 2])
			);
			game.board.set(
				keyFrom(-1, x * 2, 1),
				new Hologram(game.board.get(keyFrom(y - 1, 0, 1)), [x * 2 * sideLen, 2/3 * midptR])
			);
		}
	},
	octagonal: {
		generate(x, y) {
			const keyFrom = (...e) => e.join("_");
			const sideLen = 35;
			const diag = 35 / Math.sqrt(2);
			for (let i = 0; i < x; i++) {
				for (let j = 0; j < y; j++) {
					game.board.set(
						keyFrom(2 * i, 2 * j), 
						new Polygon(8, sideLen, [(i + 0.5) * (sideLen + diag * 2), (j + 0.5) * (sideLen + diag * 2)])
					);
				}
			}
			for (let i = 0; i < x - 1; i++) {
				for (let j = 0; j < y - 1; j++) {
					game.board.set(
						keyFrom(2 * i + 1, 2 * j + 1), 
						new Polygon(4, sideLen, [(i + 1) * (sideLen + diag * 2), (j + 1) * (sideLen + diag * 2)], Math.PI / 4)
					);
				}
			}
			function makeCon([p1, id1], [p2, id2]) {
				p1.connections[id1] = p2;
				if (p2) p2.connections[id2] = p1;
			}
			for (const [key, poly] of game.board) {
				if (poly.sides !== 8) continue;
				let [x1, y1] = key.split("_");
				x1 = parseInt(x1, 10);
				y1 = parseInt(y1, 10);
				const right = game.board.get(keyFrom(x1 + 2, y1));
				const bottom = game.board.get(keyFrom(x1, y1 + 2));
				const tl = game.board.get(keyFrom(x1 - 1, y1 - 1));
				const tr = game.board.get(keyFrom(x1 + 1, y1 - 1));
				const br = game.board.get(keyFrom(x1 + 1, y1 + 1));
				const bl = game.board.get(keyFrom(x1 - 1, y1 + 1));
				makeCon([poly, 0], [right, 4]);
				makeCon([poly, 6], [bottom, 2]);
				makeCon([poly, 3], [tl, 3]);
				makeCon([poly, 1], [tr, 2]);
				makeCon([poly, 7], [br, 1]);
				makeCon([poly, 5], [bl, 0]);
			}
			if (x % 2 === 0 && y % 2 === 0) game.source = game.board.get(keyFrom(x - 1, y - 1))
			else game.source = game.board.get(keyFrom(Math.floor(x / 2) * 2, Math.floor(y / 2) * 2));
		}
	},
	dodecagonal: {
		generate(x, y) {
			const keyFrom = (...e) => e.join("_");
			const sideLen = 32;
			const docMidptR = sideLen / Math.tan(Math.PI / 12) / 2;
			const hexMidptR = sideLen / Math.tan(Math.PI / 6) / 2;
			const sqMidptR = sideLen / 2;
			const unitD = docMidptR * 2 + sideLen;
			const euDistSq = ([a, b], [c, d]) => (a - c) * (a - c) + (b - d) * (b - d);
			const makeCon = (a, b) => {
				let aId = 0, aClosest = Infinity;
				for (let i = 0; i < a.sides; i++) {
					const e = euDistSq(a.midpts[i], b.position);
					if (e < aClosest) {
						aClosest = e;
						aId = i;
					}
				}
				let bId = 0, bClosest = Infinity;
				for (let i = 0; i < b.sides; i++) {
					const e = euDistSq(b.midpts[i], a.position);
					if (e < bClosest) {
						bClosest = e;
						bId = i;
					}
				}
				a.connections[aId] = b;
				b.connections[bId] = a;
			}
			for (let i = 0; i < x; i++) {
				for (let j = 0; j < y; j++) {
					game.board.set(
						keyFrom("ddc", i, j),
						new Polygon(12, sideLen, [(i + (j % 2) / 2 + 10) * unitD, (j + 10) * unitD * Math.sqrt(3/4)])
					);
					const ddc = game.board.get(keyFrom("ddc", i, j));
					const [x1, y1] = ddc.position;
					let polys = [];
					for (let k = 0; k < 6; k++) {
						const sqAng = k * 2 * Math.PI / 6;
						const sqX = Math.cos(-sqAng) * (docMidptR + sqMidptR) + x1;
						const sqY = Math.sin(-sqAng) * (docMidptR + sqMidptR) + y1;
						if (!game.board.get(keyFrom(sqX.toFixed(5), sqY.toFixed(5)))) {
							game.board.set(
								keyFrom(sqX.toFixed(5), sqY.toFixed(5)),
								new Polygon(4, sideLen, [sqX, sqY], sqAng)
							);
						}
						polys.push(game.board.get(keyFrom(sqX.toFixed(5), sqY.toFixed(5))));
						const hexAng = (k * 2 + 1) * Math.PI / 6;
						const hexX = Math.cos(-hexAng) * (docMidptR + hexMidptR) + x1;
						const hexY = Math.sin(-hexAng) * (docMidptR + hexMidptR) + y1;
						if (!game.board.get(keyFrom(hexX.toFixed(5), hexY.toFixed(5)))) {
							game.board.set(
								keyFrom(hexX.toFixed(5), hexY.toFixed(5)),
								new Polygon(6, sideLen, [hexX, hexY], hexAng)
							);
						}
						polys.push(game.board.get(keyFrom(hexX.toFixed(5), hexY.toFixed(5))));
					}
					for (const poly of polys) {
						makeCon(ddc, poly);
					}
					for (let i = 1; i < 12; i += 2) {
						makeCon(polys[i], polys[i - 1]);
						makeCon(polys[i], polys[(i + 1) % 12]);
					}
				}
			}
			game.source = game.board.get(keyFrom("ddc", Math.floor(x / 2), Math.floor(y / 2)));
		}
	}
}

window.onload = () => requestAnimationFrame(() => game.generateGame("square", 5, 5));

let startTime = Date.now();