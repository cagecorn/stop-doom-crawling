import { TRAITS } from '../data/traits.js';
import { adjustMonsterStatsForAquarium } from '../utils/aquariumUtils.js';

export class MonsterManager {
    constructor(a = null, b = null, c = null, d = null, e = 0) {
        // allow legacy signature (count,map,assets,ev,factory)
        if (typeof a === 'number') {
            this.eventManager = d;
            this.assets = c;
            this.factory = e;
            this.mapManager = b;
            this._initialCount = a;
        } else {
            this.eventManager = a;
            this.assets = b;
            this.factory = c;
            this.mapManager = d;
            this._initialCount = e || 0;
        }
        this.monsters = [];
        this.metaAIManager = null;
        this.traitManager = null;
        console.log("[MonsterManager] Initialized");

        if (this.eventManager) {
            this.eventManager.subscribe('entity_removed', (data) => {
                this.monsters = this.monsters.filter(m => m.id !== data.victimId);
            });
        }

        if (this._initialCount > 0 && this.mapManager && this.assets && this.factory) {
            this._spawnMonsters(this._initialCount);
        }
    }

    setTraitManager(traitManager) {
        this.traitManager = traitManager;
    }

    setMetaAIManager(metaAIManager) {
        this.metaAIManager = metaAIManager;
    }

    addMonster(monster) {
        this.monsters.push(monster);
        if (this.metaAIManager) {
            const group =
                this.metaAIManager.groups['dungeon_monsters'] ||
                this.metaAIManager.createGroup('dungeon_monsters');
            group.addMember(monster);
        }
    }

    _spawnMonsters(count) {
        for (let i = 0; i < count; i++) {
            const pos = this.mapManager.getRandomFloorPosition();
            if (pos) {
                let stats = {};
                if (this.mapManager.name === 'aquarium') {
                    stats = adjustMonsterStatsForAquarium(stats);
                }
                const monster = this.factory.create('monster', {
                    x: pos.x,
                    y: pos.y,
                    tileSize: this.mapManager.tileSize,
                    groupId: 'dungeon_monsters',
                    image: this.assets?.monster,
                    baseStats: stats
                });
                this.addMonster(monster);
            }
        }
    }

    removeMonster(monsterId) {
        this.monsters = this.monsters.filter(m => m.id !== monsterId);
    }

    update() {
        // placeholder for future logic
    }

    getMonsterAt(x, y) {
        for (const monster of this.monsters) {
            if (
                x >= monster.x && x < monster.x + monster.width &&
                y >= monster.y && y < monster.y + monster.height
            ) {
                return monster;
            }
        }
        return null;
    }

    getMonsters() {
        return this.monsters;
    }

    render(ctx) {
        for (const monster of this.monsters.filter(m => !m.isDying)) {
            if (monster.render) monster.render(ctx);
        }
    }
}
