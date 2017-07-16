const {Parser, Util: {children, ensure}} = require('@snakesilk/xml-loader');
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

class StageSelectParser extends Parser
{
    constructor(loader) {
        super(loader);
        this.sceneParser = new Parser.SceneParser(loader);
    }

    getScene(node) {
        ensure(node, 'stage-select');

        const sceneNode = children(node, 'scene')[0];

        return this.sceneParser.getScene(sceneNode)
        .then(context => {
            const stageSelect = new StageSelect(context.scene);
            this.setupBehavior(node, context, stageSelect);
            this.parseReveal(node, context, stageSelect);
            this.parseLayout(node, context, stageSelect);
            return this.loader.resourceLoader.complete()
            .then(() => context);
        });
    }

    createCaption(text, fontId) {
        text = text.split(" ");
        text[1] = fill(" ", 6 - text[1].length) + text[1];
        text = text.join("\n");
        return this.loader.resourceManager.get('font', fontId)(text).createMesh();
    }

    parseLayout(node, context, stageSelect) {
        const sceneNode = node;
        const {scene} = context;
        const res = this.loader.resourceManager;

        const backgroundNode = sceneNode.getElementsByTagName('background')[0];
        const cameraNode = sceneNode.getElementsByTagName('camera')[0];
        const indicatorNode = sceneNode.getElementsByTagName('indicator')[0];
        const spacingNode = sceneNode.querySelector('spacing');

        stageSelect.setBackgroundColor(this.getAttr(backgroundNode, 'color'));
        stageSelect.setBackgroundModel(context.createEntity('background').model);
        stageSelect.setIndicator(context.createEntity('indicator').model);
        stageSelect.setFrame(context.createEntity('frame').model);

        if (spacingNode) {
            stageSelect.spacing.copy(this.getVector2(spacingNode));
        }
        if (cameraNode) {
            stageSelect.cameraDistance = this.getFloat(cameraNode, 'distance');
        }
        if (indicatorNode) {
            stageSelect.indicatorInterval = this.getFloat(indicatorNode, 'blink-interval');
        }

        const stagesNode = sceneNode.getElementsByTagName('stage');
        stageSelect.rowLength = Math.ceil(Math.sqrt(stagesNode.length));
        for (let stageNode, i = 0; stageNode = stagesNode[i++];) {
            const id = this.getAttr(stageNode, 'id')
            const name = this.getAttr(stageNode, 'name');
            const text = this.getAttr(stageNode, 'caption');
            const caption = this.createCaption(text, 'nintendo');
            const avatar = context.createEntity(id).model;
            const characterId = this.getAttr(stageNode, 'character');
            stageSelect.addStage(avatar, caption, name, characterId && res.get('entity', characterId));
        }

        const initialIndex = this.getInt(indicatorNode, 'initial-index') || 0;
        stageSelect.initialIndex = initialIndex;
    }

    parseReveal(node, context, stageSelect) {
        const starNodes = node.querySelectorAll(':scope > layout > stars > star');
        for (let node, i = 0; node = starNodes[i]; ++i) {
            const id = this.getAttr(node, 'object');
            const count = this.getInt(node, 'count');
            const depth = this.getFloat(node, 'depth') || 0;
            for (let j = 0; j < count; ++j) {
                const model = context.createEntity(id).model;
                model.position.z = -depth;
                stageSelect.addStar(model, depth);
            }
        }

        const podiumNode = node.querySelector(':scope > layout > podium');
        if (podiumNode) {
            const id = this.getAttr(podiumNode, 'object');
            stageSelect.setPodium(context.createEntity(id).model);
        }
    }

    setupBehavior(node, {scene}, stageSelect) {
        /*
        Bind action to load a stage to stage select event
        and on the loading of the next scene bind to re-enter
        this stage select on end.
        */

        const game = this.loader.game;
        const stageSelectScene = scene;
        scene.events.bind(stageSelect.EVENT_STAGE_ENTER, (stage, index) => {
            try {
                this.loader.loadSceneByName(stage.name)
                .then(scene => {
                    scene.events.bind(scene.EVENT_END, () => {
                        game.setScene(stageSelectScene);
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
