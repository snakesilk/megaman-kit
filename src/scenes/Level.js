const THREE = require('three');
const {Keyboard, SyncPromise} = require('@snakesilk/engine');

class Level
{
    constructor(scene) {
        this.scene = scene;

        this.EVENT_PLAYER_RESET = 'player-reset';
        this.EVENT_PLAYER_DEATH = 'player-death';

        this.assets = {};
        this.player = null;
        this.scene.camera.camera.position.z = 150;

        this.cameraFollowOffset = new THREE.Vector2(0, 25);

        this.checkPoints = [];
        this.checkPointIndex = 0;
        this.checkPointOffset = new THREE.Vector2(0, 200);

        this.deathRespawnTime = 4;
        this.readyBlinkTime = 2;

        const onDeath = () => {
            --this.player.lives;
            this.scene.events.trigger(this.EVENT_PLAYER_DEATH);
            this.scene.waitFor(this.deathRespawnTime).then(() => {
                if (this.player.lives <= 0) {
                    this.scene.events.trigger(this.EVENT_END);
                } else {
                    this.resetPlayer();
                }
            });
        };

        this.scene.events.bind(this.scene.EVENT_CREATE, (game) => {
            this.inputs = {
                character: this.createCharacterInput(game),
                menu: this.createMenuInput(game),
            };
            this.player = game.player;

            const char = this.player.character;
            if (char) {
                char.events.bind(char.health.EVENT_DEATH, onDeath);
            }
        });

        this.scene.events.bind(this.scene.EVENT_DESTROY, () => {
            const char = this.player.character;
            if (char) {
                char.events.unbind(char.health.EVENT_DEATH, onDeath);
            }

            this.scene.camera.unfollow();
            this.scene.world.objects.forEach(object => {
                if (object !== undefined) {
                    this.scene.world.removeObject(object);
                }
            });
        });

        this.scene.events.bind(this.scene.EVENT_UPDATE_TIME, () => {
            this.detectCheckpoint();
        });

        this.scene.events.bind(this.scene.EVENT_START, () => {
            this.resetPlayer()
        });
    }

    addCheckPoint(x, y, r) {
        this.checkPoints.push({
            'pos': new THREE.Vector2(x, y),
            'radius': r || 100,
        });
    }

    createCharacterInput(game) {
        const input = new Keyboard();
        const player = game.player;

        input.intermittent(input.LEFT,
            () => {
                player.character.aim.x = -1;
            },
            () => {
                if (player.character.aim.x === -1) {
                    player.character.aim.x = 0;
                }
            });
        input.intermittent(input.RIGHT,
            () => {
                player.character.aim.x = 1;
            },
            () => {
                if (player.character.aim.x === 1) {
                    player.character.aim.x = 0;
                }
            });
        input.intermittent(input.UP,
            () => {
                player.character.aim.y = 1;
            },
            () => {
                if (player.character.aim.y === 1) {
                    player.character.aim.y = 0;
                }
            });
        input.intermittent(input.DOWN,
            () => {
                player.character.aim.y = -1;
            },
            () => {
                if (player.character.aim.y === -1) {
                    player.character.aim.y = 0;
                }
            });

        input.intermittent(input.A,
            () => {
                player.character.jump.engage();
            },
            () => {
                player.character.jump.cancel();
            });
        input.hit(input.B,
            () => {
                player.character.weapon.fire();
            });
        input.hit(input.START,
            () => {
                //levelrunner.toggleMenu();
            });
        input.hit(input.SELECT,
            () => {
                this.scene.events.trigger(this.EVENT_END);
            });

        return input;
    }

    createMenuInput() {
        return new Keyboard();
    }

    detectCheckpoint() {
        if (this.player.character) {
            const playerPosition = this.player.character.position;
            for (let i = 0, l = this.checkPoints.length; i !== l; ++i) {
                const checkpoint = this.checkPoints[i];
                if (checkpoint.pos.distanceTo(playerPosition) < checkpoint.radius) {
                    this.checkPointIndex = i;
                    return;
                }
            }
        }
    }

    followPlayer() {
        this.scene.camera.follow(
            this.player.character,
            this.cameraFollowOffset);
    }

    goToCheckpoint(index) {
        this.checkPointIndex = index;
        this.resetPlayer();
    }

    pauseGamePlay() {
        this.scene.input = this.inputs.menu;
        this.scene.pause();
    }

    resumeGamePlay() {
        this.scene.input = this.inputs.character;
        this.scene.resume();
    }

    readyBlink() {
        if (this.readyBlinkTime === 0 || !this.assets['start-caption']) {
            return SyncPromise.resolve();
        }

        const model = this.assets['start-caption'];
        const camera = this.scene.camera.camera;
        const interval = 9/60;

        model.visible = true;
        this.scene.world.scene.add(model);

        return this.scene.doFor(this.readyBlinkTime, (elapsed) => {
            model.position.x = camera.position.x;
            model.position.y = camera.position.y;
            model.visible = elapsed % (interval * 2) < interval;
        })
        .then(() => {
            this.scene.world.scene.remove(model);
        });
    }

    resetCheckpoint() {
        this.resetObjects();
        return this.readyBlink()
        .then(() => {
            this.resumeGamePlay();
        });
    }

    resetObjects() {
        this.scene.world.objects.forEach(obj => {
            if (obj) {
                obj.reset();
            }
        });
    }

    resetPlayer() {
        const player = this.player;
        const character = player.character;
        if (!character) {
            return;
        }

        if (player.defaultWeapon) {
            player.equipWeapon(player.defaultWeapon);
        }

        const scene = this.scene;
        const {world, camera} = scene;

        world.removeObject(character);

        character.reset();
        character.direction.set(character.DIRECTION_RIGHT, 0);
        character.integrator.reset();

        const checkpoint = this.checkPoints[this.checkPointIndex];
        if (checkpoint) {
            const startPosition = checkpoint.pos.clone();
            const playerPosition = checkpoint.pos.clone().add(this.checkPointOffset);
            const cameraPosition = checkpoint.pos.clone().add(this.cameraFollowOffset);

            camera.velocity.set(0, 0, 0);
            camera.unfollow();
            camera.jumpToPath(cameraPosition);

            const startFollow = () => {
                camera.follow(character);
                character.events.unbind(character.teleport.EVENT_END, startFollow);
            };
            character.moveTo(playerPosition);
            character.teleport.to(startPosition);
            character.events.bind(character.teleport.EVENT_END, startFollow);

            this.resetCheckpoint().then(() => {
                world.addObject(character);
            });
        }
        else {
            character.moveTo(new THREE.Vector2(0, 0));
            camera.follow(character);
            world.addObject(character);
            this.resumeGamePlay();
        }

        scene.events.trigger(this.EVENT_PLAYER_RESET);
    }
}

module.exports = Level;
