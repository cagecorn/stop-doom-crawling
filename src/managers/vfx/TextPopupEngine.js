export class TextPopupEngine {
    constructor() {
        this.popups = [];
        console.log('[TextPopupEngine] Initialized');
    }

    /**
     * 새로운 텍스트 팝업을 추가합니다.
     * @param {string} text
     * @param {object} target Entity or object with x,y,width,height
     * @param {object} [options]
     */
    add(text, target, options = {}) {
        if (!target) return;
        const duration = options.duration || 30;

        let yOffset = options.offsetY !== undefined ? options.offsetY : (target.height || 0);
        if (Array.isArray(target.effects) && target.effects.some(e => e.id === 'airborne')) {
            yOffset += (target.height || 0) * 0.5;
        }

        const popup = {
            text,
            x: target.x + (target.width || 0) / 2,
            y: target.y - yOffset,
            duration,
            life: duration,
            color: options.color || 'white',
            floatSpeed: options.floatSpeed || 0.5,
            alpha: 1.0,
            font: options.font || '16px Arial'
        };
        this.popups.push(popup);
    }

    update() {
        for (let i = this.popups.length - 1; i >= 0; i--) {
            const popup = this.popups[i];
            popup.life--;
            if (popup.vy !== undefined) {
                popup.y += popup.vy;
            } else {
                popup.y -= popup.floatSpeed;
            }

            if (popup.fadeSpeed !== undefined) {
                popup.alpha -= popup.fadeSpeed;
            } else {
                popup.alpha = popup.life / popup.duration;
            }

            if (popup.life <= 0 || popup.alpha <= 0) {
                this.popups.splice(i, 1);
            }
        }
    }

    render(ctx) {
        if (!ctx) return;
        for (const popup of this.popups) {
            ctx.save();
            if (popup.isUI && ctx.setTransform) {
                ctx.setTransform(1, 0, 0, 1, 0, 0);
            }
            ctx.globalAlpha = popup.alpha;
            ctx.fillStyle = popup.fillStyle || popup.color;
            ctx.font = popup.font;
            ctx.textAlign = popup.alignment || 'center';
            if (popup.strokeStyle) {
                ctx.strokeStyle = popup.strokeStyle;
                ctx.lineWidth = popup.lineWidth || 1;
                ctx.strokeText(popup.text, popup.x, popup.y);
            }
            ctx.fillText(popup.text, popup.x, popup.y);
            ctx.restore();
        }
    }
}
