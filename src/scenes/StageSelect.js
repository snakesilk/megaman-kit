const THREE = require('three');
const {Easing, Entity} = require('@snakesilk/engine');
const {Solid} = require('@snakesilk/platform-traits');

class StageSelect
{
    constructor(scene) {
        this.scene = scene;

        this.EVENT_STAGE_ENTER = 'stage-enter';
        this.EVENT_STAGE_SELECTED = 'stage-selected';
        this.EVENT_SELECTION_CHANGED = 'selection-changed';
        this.EVENT_BOSS_REVEAL = 'boss-reveal';

        this._state = {};

        this.animations = {};
        this.scene.camera.camera.position.z = 120;
        this.cameraDesiredPosition = new THREE.Vector3();
        this.cameraDistance = 140;
        this.cameraSmoothing = 20;
        this.captionOffset = new THREE.Vector3(0, -32, .2);
        this.currentIndex = undefined;
        this.initialIndex = 0;
        this.indicator = null;
        this.indicatorInterval = 1;
        this.podium = undefined;
        this.stages = [];
        this.stars = [];
        this.rowLength = 3;
        this.spacing = new THREE.Vector2(64, 64);
        this.starSpeed = 200;

        const input = this.scene.input;
        input.disable();
        input.hit(input.LEFT, () => {
            this.steer(-1, 0);
        });
        input.hit(input.RIGHT, () => {
            this.steer(1, 0);
        });
        input.hit(input.UP, () => {
            this.steer(0, -1);
        });
        input.hit(input.DOWN, () => {
            this.steer(0, 1);
        });
        input.hit(input.START, () => {
            this.enter();
        });

        const simulate = (dt) => {
            this.update(dt);
        };

        this.modifiers = new Set();

        this.scene.events.bind(this.scene.EVENT_CREATE, (game) => {
            this.equalize(this.initialIndex);
            this.modifiers.clear();
            this.animations = {
                'flash': this.createFlashAnimation(),
                'indicator': this.createIndicatorAnimation(),
                'stars': this.createStarAnimation(game.renderer.domElement),
            };
            /*if (game.state) {

            }*/
        });

        this.scene.events.bind(this.scene.EVENT_START, () => {
            this.scene.world.events.bind(this.scene.world.EVENT_SIMULATE, simulate);
            this.scene.camera.panTo(this.cameraDesiredPosition, 1, Easing.easeOutQuad());
            this.enableIndicator();
            this.scene.input.enable();
        });

        this.scene.events.bind(this.scene.EVENT_DESTROY, () => {
            this.scene.world.events.unbind(this.scene.world.EVENT_SIMULATE, simulate);
        });
    }

    addStage(avatar, caption, name, character) {
        const x = this.stages.length % this.rowLength;
        const y = Math.floor(this.stages.length / this.rowLength);

        const pos = new THREE.Vector2(this.spacing.x * x, -this.spacing.y * y);
        const frame = this.frame.clone();

        this.stages.push({
            "avatar": avatar,
            "name": name,
            "caption": caption,
            "frame": frame,
            "character": character,
        });

        frame.position.set(pos.x, pos.y, 0);
        avatar.position.set(pos.x, pos.y, .1);
        caption.position.copy(avatar.position);
        caption.position.add(this.captionOffset);
        this.scene.world.scene.add(frame);
        this.scene.world.scene.add(avatar);
        this.scene.world.scene.add(caption);
    }

    addStar(model) {
        this.stars.push(model);
    }

    createFlashAnimation() {
        const light = this.scene.world.ambientLight.color;
        const defaultLight = light.clone();

        const interval = (3/60) * 2;
        let time = 0;
        let state = false;

        const on = () => {
            light.setRGB(5,5,5);
            state = true;
        };
        const off = () => {
            light.copy(defaultLight);
            state = false;
        };

        return (dt) => {
            if (dt === -1) {
                time = 0;
                off();
            } else {
                time += dt;
                const prog = (time % interval) / interval;
                if (state === true && prog < .5) {
                    off();
                } else if (state === false && prog > .5) {
                    on();
                }
            }
        }
    }

    createIndicatorAnimation() {
        const interval = this.indicatorInterval * 2;
        const indicator = this.indicator;
        let time = 0;
        return (dt) => {
            if (dt === -1) {
                time = 0;
                indicator.visible = false;
            } else {
                time += dt;
            }
            indicator.visible = (time % interval) / interval < .5;
        }
    }

    createStarAnimation(viewport) {
        const scene = this.scene.world.scene;
        const spread = 160;
        const center = this.bossRevealCenter;
        const camera = this.scene.camera.camera;
        const aspect = viewport.width / viewport.height;

        this.stars.forEach(star => {
            const vFOV = camera.fov * Math.PI / 180;
            const h = 2 * Math.tan(vFOV / 2) * Math.abs(this.cameraDistance - star.position.z);
            const w = h * aspect;
            star.position.x = center.x + (Math.random() * w) - w / 2;
            star.position.y = center.y + (Math.random() * h) - h / 2;
            star.userData.maxY = center.y + h / 2;
            star.userData.minY = center.y - h / 2;
            star.userData.maxX = center.x + w / 2;
            star.userData.minX = center.x - w / 2;
            scene.add(star);
        });

        return dt => {
            this.stars.forEach(star => {
                if (star.position.x > star.userData.maxX) {
                    star.position.x = star.userData.minX;
                    star.position.y = star.userData.minY + Math.random() * Math.abs(star.userData.minY - star.userData.maxY);
                }
                star.position.x += this.starSpeed * dt;

            });
        }
    }

    equalize(index) {
        if (!this.stages[index]) {
            index = 0;
        }

        const center = new THREE.Vector3();
        center.x = this.stages[0].avatar.position.x
                 + this.stages[this.rowLength - 1].avatar.position.x;
        center.x /= 2;

        center.y = this.stages[0].avatar.position.y
                 + this.stages[this.stages.length - 1].avatar.position.y;
        center.y /= 2;
        center.y -= 8; // Adjust for caption.

        if (this.podium) {
            this.podium.position.copy(center);
            this.podium.position.y += 512;
            this.podiumSolid.position.copy(this.podium.position);
            this.podiumSolid.position.y -= 24;
        }

        this.stageSelectCenter = center.clone();
        this.stageSelectCenter.z += this.cameraDistance;
        this.bossRevealCenter = this.podium.position.clone();
        this.bossRevealCenter.z += this.cameraDistance;

        this.cameraDesiredPosition.copy(this.stageSelectCenter);
        this.scene.camera.position.copy(center);
        this.scene.camera.position.z = this.cameraDesiredPosition.z - 100;

        this.selectIndex(index);
        this.scene.world.getObject('background').position.copy(center);
    }

    enter() {
        this.scene.input.release();
        this.scene.input.disable();
        this.disableIndicator();

        const stage = this.getSelected();
        this.scene.events.trigger(this.EVENT_STAGE_SELECTED, [stage]);
        this.runFlash().then(() => {
            if (stage.character) {
                return this.runBossReveal(stage).then(() => {
                    this.scene.events.trigger(this.EVENT_STAGE_ENTER, [stage]);
                });
            } else {
                this.scene.events.trigger(this.EVENT_STAGE_ENTER, [stage]);
            }
        });
    }

    getSelected() {
        return this.stages[this.currentIndex];
    }

    runFlash() {
        this.modifiers.add(this.animations.flash);
        return this.scene.waitFor(1.0).then(() => {
            this.modifiers.delete(this.animations.flash);
            this.animations.flash(-1);
        });
    }

    runBossReveal(stage) {
        if (!this._state.bossReveal) {
            this._state.bossReveal = {};
        }
        const state = this._state.bossReveal;

        if (state.currentBoss) {
            this.scene.world.removeObject(state.currentBoss);
        }

        const scene = this.scene;
        const camera = scene.camera;
        const character = new stage.character();
        character.direction.x = -1;
        character.position.copy(this.podium.position);
        character.position.y += 150;

        this.modifiers.add(this.animations.stars);

        scene.events.trigger(this.EVENT_BOSS_REVEAL, [stage]);
        scene.waitFor(.5).then(() => {
            state.currentBoss = character;
            scene.world.addObject(character);
        });

        return camera.panTo(
            this.bossRevealCenter,
            1,
            Easing.easeInOutCubic()
        )
        .then(() => scene.waitFor(6));
    }

    selectIndex(index) {
        if (!this.stages[index]) {
            return false;
        }
        const avatar = this.stages[index].avatar;
        this.indicator.position.x = avatar.position.x;
        this.indicator.position.y = avatar.position.y;
        if (this.animations.indicator) {
            this.animations.indicator(-1);
        }

        this.currentIndex = index;

        return this.currentIndex;
    }

    setFrame(model) {
        this.frame = model;
    }

    disableIndicator() {
        this.animations.indicator(-1);
        this.modifiers.delete(this.animations.indicator);
    }

    enableIndicator() {
        this.modifiers.add(this.animations.indicator);
    }

    setIndicator(model) {
        this.indicator = model;
        this.indicator.position.z = .1;
        this.scene.world.scene.add(model);
    }

    setPodium(model) {
        this.podium = model;
        this.scene.world.scene.add(model);
        const solid = new Entity();
        solid.addCollisionRect(64, 16);
        solid.applyTrait(new Solid());
        solid.solid.fixed = true;
        solid.solid.obstructs = true;
        this.podiumSolid = solid;
        this.scene.world.addObject(solid);
    }

    steer(x, y) {
        let newIndex = this.currentIndex;
        let d = (this.currentIndex % this.rowLength) + x;
        if (d >= 0 && d < this.rowLength) {
            newIndex += x;
        }
        d = newIndex + y * this.rowLength;
        if (d >= 0 && d < this.stages.length) {
            newIndex = d;
        }

        if (newIndex === this.currentIndex) {
            return;
        }

        this.selectIndex(newIndex);

        this.scene.events.trigger(this.EVENT_SELECTION_CHANGED, [this.currentIndex]);
    }

    update(dt) {
        this.modifiers.forEach(mod => {
            mod(dt);
        });
    }
}

module.exports = StageSelect;
