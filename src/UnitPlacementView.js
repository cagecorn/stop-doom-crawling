export class UnitPlacementView {
    constructor(formationManager, eventManager) {
        this.formationManager = formationManager;
        this.eventManager = eventManager;
        this.container = document.getElementById('formation-placement');
        this.grid = this.container?.querySelector('#formation-grid');
        this.squadList = this.container?.querySelector('#formation-squad-list');
        this.init();
    }

    init() {
        if (!this.grid) return;
        this.renderGrid();
        this.eventManager?.subscribe('formation_data_changed', ({ slots }) => {
            this.updateGrid(slots);
        });
    }

    renderGrid() {
        this.grid.innerHTML = '';
        const slotCount = this.formationManager.slots.length;
        for (let i = 0; i < slotCount; i++) {
            const cell = document.createElement('div');
            cell.className = 'formation-cell';
            cell.dataset.index = i;
            cell.textContent = i + 1;
            cell.addEventListener('dragover', e => e.preventDefault());
            cell.addEventListener('drop', e => {
                e.preventDefault();
                const entityId = e.dataTransfer.getData('text/plain');
                if (entityId) {
                    this.eventManager?.publish('formation_assign_request', {
                        entityId,
                        slotIndex: i
                    });
                }
            });
            this.grid.appendChild(cell);
        }
    }

    updateGrid(slots) {
        if (!this.grid) return;
        const cells = this.grid.querySelectorAll('.formation-cell');
        cells.forEach(cell => {
            const idx = parseInt(cell.dataset.index, 10);
            cell.textContent = slots[idx] ? slots[idx] : idx + 1;
        });
    }
}
