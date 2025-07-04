// src/pathfindingManager.js
import tfLoader from '../utils/tf-loader.js';
import { SETTINGS } from '../../config/gameSettings.js';

export class PathfindingManager {
    constructor(mapManager) {
        this.mapManager = mapManager;
        if (SETTINGS.ENABLE_PATHFINDING_WORKER && typeof Worker !== 'undefined') {
            try {
                const url = new URL('../workers/pathfindingWorker.js', import.meta.url);
                this.worker = new Worker(url);
                const data = {
                    map: mapManager.map,
                    width: mapManager.width,
                    height: mapManager.height,
                    tileTypes: mapManager.tileTypes,
                };
                this.worker.postMessage({ type: 'init', mapData: data });
            } catch (err) {
                console.warn('[PathfindingManager] Worker init failed:', err);
            }
        }
    }

    _bfs(startX, startY, endX, endY, isBlocked) {
        const { map, width, height, tileTypes } = this.mapManager;

        if (startX === endX && startY === endY) return [];

        const queue = [{ x: startX, y: startY }];
        const visited = new Set([`${startX},${startY}`]);
        const cameFrom = new Map();

        const dirs = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 }
        ];

        while (queue.length > 0) {
            const current = queue.shift();

            if (current.x === endX && current.y === endY) {
                const path = [];
                let key = `${endX},${endY}`;
                while (key !== `${startX},${startY}`) {
                    const [cx, cy] = key.split(',').map(Number);
                    path.unshift({ x: cx, y: cy });
                    key = cameFrom.get(key);
                }
                return path;
            }

            for (const dir of dirs) {
                const nx = current.x + dir.x;
                const ny = current.y + dir.y;
                const nKey = `${nx},${ny}`;

                if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
                if (map[ny][nx] === tileTypes.WALL) continue;
                if (isBlocked(nx, ny) && !(nx === endX && ny === endY)) continue;
                if (visited.has(nKey)) continue;

                visited.add(nKey);
                cameFrom.set(nKey, `${current.x},${current.y}`);
                queue.push({ x: nx, y: ny });
            }
        }

        return []; // 경로를 찾지 못한 경우 빈 배열 반환
    }

    // 타겟 주변의 이동 가능한 위치까지 경로를 찾는다.
    findPath(startX, startY, endX, endY, isBlocked = () => false) {
        if (startX === endX && startY === endY) {
            return [];
        }

        if (this.worker) {
            return new Promise((resolve) => {
                const handler = (e) => {
                    this.worker.removeEventListener('message', handler);
                    resolve(e.data || []);
                };
                this.worker.addEventListener('message', handler);
                this.worker.postMessage({ type: 'find', args: [startX, startY, endX, endY] });
            });
        }

        // debug logging removed to avoid performance issues

        const basePath = this._bfs(startX, startY, endX, endY, isBlocked);
        if (basePath.length > 0) return basePath;

        const { map, width, height, tileTypes } = this.mapManager;
        const dirs = [
            { x: 1, y: 0 }, { x: -1, y: 0 },
            { x: 0, y: 1 }, { x: 0, y: -1 }
        ];
        let bestPath = [];
        for (const dir of dirs) {
            const nx = endX + dir.x;
            const ny = endY + dir.y;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            if (map[ny][nx] === tileTypes.WALL) continue;
            const path = this._bfs(startX, startY, nx, ny, isBlocked);
            if (path.length > 0 && (bestPath.length === 0 || path.length < bestPath.length)) {
                bestPath = path;
            }
        }

        return bestPath;
    }

    // 현재 위치에서 가장 가까운 탈출 지점을 찾는다.
    findEscapeRoute(startX, startY, isBlocked = () => false) {
        const { map, width, height, tileTypes } = this.mapManager;

        const visited = new Set([`${startX},${startY}`]);
        const queue = [{ x: startX, y: startY }];
        const dirs = [
            { x: 1, y: 0 }, { x: -1, y: 0 },
            { x: 0, y: 1 }, { x: 0, y: -1 }
        ];

        while (queue.length > 0) {
            const current = queue.shift();

            for (const dir of dirs) {
                const nx = current.x + dir.x;
                const ny = current.y + dir.y;
                const key = `${nx},${ny}`;

                if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
                if (visited.has(key)) continue;
                if (map[ny][nx] === tileTypes.WALL) {
                    visited.add(key);
                    continue;
                }
                if (!isBlocked(nx, ny)) {
                    return { x: nx, y: ny };
                }
                visited.add(key);
                queue.push({ x: nx, y: ny });
            }
        }

        return null;
    }

    async findPathTensor(startX, startY, endX, endY) {
        if (!SETTINGS.ENABLE_TENSORFLOW_PATHING) {
            return this.findPath(startX, startY, endX, endY);
        }

        try {
            await tfLoader.init();
            const tf = tfLoader.getTf();
            if (!this.model) {
                this.model = await tf.loadLayersModel('./assets/pathfinding-model.json');
            }
            const input = tf.tensor2d([[startX, startY, endX, endY]]);
            const output = this.model.predict(input).arraySync()[0];
            return output.map(([x, y]) => ({ x, y }));
        } catch (e) {
            console.warn('Tensor pathfinding failed, falling back to BFS', e);
            return this.findPath(startX, startY, endX, endY);
        }
    }
}
