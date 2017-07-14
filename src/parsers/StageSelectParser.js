const {Parser: {SceneParser}, Util: {ensure}} = require('@snakesilk/xml-loader');
const StageSelect = require('../scenes/StageSelect');

function fill(x, n) {
    let s = '';
    for (;;) {
        if (n & 1) s += x;
        n >>= 1;
        if (n) x += x;
        else break;
    }
    return s;
}

class StageSelectParser extends SceneParser
{
    getScene(node) {
        ensure(node, 'scene');

        const context = this.createContext(new StageSelect());

        this._parseAudio(node, context);
        this._parseEvents(node, context);
        this._setupBehavior(node, context);
        return this._parseObjects(node, context)
        .then(() => {
            return this._parseLayout(node, context);
        }).then(() => {
            return this.loader.resourceLoader.complete();
        }).then(() => {
            return context;
        });
    }

    _createCaption(text) {
        text = text.split(" ");
        text[1] = fill(" ", 6 - text[1].length) + text[1];
        text = text.join("\n");
        return this.loader.resourceManager.get('font', 'nintendo')(text).createMesh();
    }

    _parseLayout(node, context) {
        const sceneNode = node;
        const {scene} = context;
        const res = this.loader.resourceManager;

        const backgroundNode = sceneNode.getElementsByTagName('background')[0];
        const cameraNode = sceneNode.getElementsByTagName('camera')[0];
        const indicatorNode = sceneNode.getElementsByTagName('indicator')[0];
        const spacingNode = sceneNode.querySelector('spacing');

        scene.setBackgroundColor(this.getAttr(backgroundNode, 'color'));
        scene.setBackgroundModel(context.createEntity('background').model);
        scene.setIndicator(context.createEntity('indicator').model);
        scene.setFrame(context.createEntity('frame').model);

        if (spacingNode) {
            scene.spacing.copy(this.getVector2(spacingNode));
        }
        if (cameraNode) {
            scene.cameraDistance = this.getFloat(cameraNode, 'distance');
        }
        if (indicatorNode) {
            scene.indicatorInterval = this.getFloat(indicatorNode, 'blink-interval');
        }

        const stagesNode = sceneNode.getElementsByTagName('stage');
        scene.rowLength = Math.ceil(Math.sqrt(stagesNode.length));
        for (let stageNode, i = 0; stageNode = stagesNode[i++];) {
            const id = this.getAttr(stageNode, 'id')
            const name = this.getAttr(stageNode, 'name');
            const text = this.getAttr(stageNode, 'caption');
            const caption = this._createCaption(text);
            const avatar = context.createEntity(id).model;
            const characterId = this.getAttr(stageNode, 'character');
            scene.addStage(avatar, caption, name, characterId && res.get('entity', characterId));
        }

        this._parseReveal(node, context);

        const initialIndex = this.getInt(indicatorNode, 'initial-index') || 0;
        scene.initialIndex = initialIndex;

        return Promise.resolve();
    }

    _parseReveal(node, context) {
        const starNodes = node.querySelectorAll(':scope > layout > stars > star');
        for (let node, i = 0; node = starNodes[i]; ++i) {
            const id = this.getAttr(node, 'object');
            const count = this.getInt(node, 'count');
            const depth = this.getFloat(node, 'depth') || 0;
            for (let j = 0; j < count; ++j) {
                const model = context.createEntity(id).model;
                model.position.z = -depth;
                context.scene.addStar(model, depth);
            }
        }

        const podiumNode = node.querySelector(':scope > layout > podium');
        if (podiumNode) {
            const id = this.getAttr(podiumNode, 'object');
            context.scene.setPodium(context.createEntity(id).model);
        }
    }

    _setupBehavior(node, {scene}) {
        const game = this.loader.game;
        scene.events.bind(scene.EVENT_STAGE_ENTER, (stage, index) => {
            try {
                this.loader.loadSceneByName(stage.name).then(scene => {
                    scene.events.bind(scene.EVENT_END, () => {
                        game.setScene(scene);
                    });
                    game.setScene(scene);
                });
            } catch (err) {
                game.setScene(scene);
            }
        });
    }
}

module.exports = StageSelectParser;
