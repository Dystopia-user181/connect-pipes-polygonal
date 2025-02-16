let idIter = 0;

class Polygon {
	position = [0, 0];
	sides = 0;
	sideLength = 0;
	rotation = 0;
	connections = [];
	pipes = 0;
	pipesRotation = 0;
	pipesRotationDisplay = 0;
	dsu = { root: null, size: 1 };
	search = { visited: false, degree: 0 };
	id = idIter;
	locked = false;
	lastCanvasUpdate = 0;
	hasLight = false;
	hasCycle = false;
	constructor(sides = 3, sideLength = 0, position = [0, 0], rotation = 0) {
		this.sides = sides;
		this.sideLength = sideLength;
		this.position = [...position];
		this.rotation = rotation;
		this.connections = Array(sides).fill(null);
		this.dsu.root = this;
		idIter++;
		this.lastCanvasUpdate = currentCanvasUpdate;
		this.computeVertices();
	}

	addConnection(idx) {
		this.pipes |= 1 << idx;
	}
	hasConnection(idx) {
		return (this.pipes & (1 << ((idx - this.pipesRotation + this.sides) % this.sides))) !== 0;
	}

	vertices = [];
	midpts = [];
	computeVertices() {
		if (this.vertices.length) return;
		const x = this.position[0], y = this.position[1], ang = 2 * Math.PI / this.sides;
		const l = this.sideLength / Math.sin(ang / 2) / 2 - 2.5;
		for (let i = 0; i < this.sides; i++) {
			this.vertices.push([
				l * Math.cos((i - 0.5) * ang + this.rotation) + x,
				l * Math.sin((0.5 - i) * ang - this.rotation) + y
			]);
		}
		for (let i = 0; i < this.sides; i++) {
			this.midpts.push([
				this.vertices[i][0] / 2 + this.vertices[(i + 1) % this.sides][0] / 2,
				this.vertices[i][1] / 2 + this.vertices[(i + 1) % this.sides][1] / 2,
			]);
		}
	}
	isClicked(x, y) {
		let t = 0;
		for (let i = 0; i < this.sides; i++) {
			const v1 = this.vertices[i];
			const v2 = this.vertices[(i + 1) % this.sides];
			if (x < Math.min(v1[0], v2[0]) || x >= Math.max(v1[0], v2[0])) continue;
			if (y - v1[1] <= (v2[1] - v1[1]) / (v2[0] - v1[0]) * (x - v1[0])) t++;
		}
		return (t % 2) === 1;
	}

	pipesRotateClockwise() {
		if (this.locked) return;
		this.lastCanvasUpdate = currentCanvasUpdate;
		this.pipesRotation = (this.pipesRotation + this.sides - 1) % this.sides;
		game.calcLight();
	}
	pipesRotateAnticlockwise() {
		if (this.locked) return;
		this.lastCanvasUpdate = currentCanvasUpdate;
		this.pipesRotation = (this.pipesRotation + 1) % this.sides;
		game.calcLight();
	}
	updatePipesRotationDisplay() {
		if (Math.abs(this.pipesRotationDisplay - this.pipesRotation) < 0.25) {
			this.pipesRotationDisplay = this.pipesRotation;
			return;
		}
		this.lastCanvasUpdate = currentCanvasUpdate;
		const antiDist = (this.pipesRotation - this.pipesRotationDisplay + this.sides) % this.sides;
		const dist = (this.sides - antiDist) % this.sides;
		if (dist < antiDist) {
			this.pipesRotationDisplay += this.sides - 0.25;
		} else {
			this.pipesRotationDisplay += 0.25;
		}
		this.pipesRotationDisplay = this.pipesRotationDisplay % this.sides;
	}

	dsu_find() {
		return this.dsu.root.id === this.id ? this : this.dsu.root = this.dsu.root.dsu_find();
	}
	dsu_union(other) {
		if (this.dsu_find() === other.dsu_find()) return;
		this.dsu_find().dsu.size += other.dsu_find().dsu.size;
		other.dsu_find().dsu.root = this.dsu_find();
	}
}

class Hologram {
	parent;
	position = [0, 0];
	constructor(parent, position = [0, 0]) {
		this.parent = parent;
		this.position = position;
		this.computeOwnVertices();
	}
	
	vertices = [];
	computeOwnVertices() {
		if (this.vertices.length) return;
		this.vertices = this.parent.vertices.map(([x, y]) => [
			x + this.position[0] - this.parent.position[0],
			y + this.position[1] - this.parent.position[1],
		]);
	}
	isClicked(x, y) {
		let t = 0;
		for (let i = 0; i < this.parent.sides; i++) {
			const v1 = this.vertices[i];
			const v2 = this.vertices[(i + 1) % this.parent.sides];
			if (x < Math.min(v1[0], v2[0]) || x >= Math.max(v1[0], v2[0])) continue;
			if (y - v1[1] <= (v2[1] - v1[1]) / (v2[0] - v1[0]) * (x - v1[0])) t++;
		}
		return (t % 2) === 1;
	}
}