const {Parser, Util: {children, ensure}} = require('@snakesilk/xml-loader');
const StageSelect = require('../scenes/StageSelect');

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
            this.parseIndicator(node, context, stageSelect);
            this.parseStages(node, context, stageSelect);
            stageSelect.initialize();
            return this.loader.resourceLoader.complete()
            .then(() => context);
        });
    }

    parseIndicator(node, context, stageSelect) {
        const indicatorNode = node.querySelector('indicator');
        stageSelect.indicatorInterval = this.getFloat(indicatorNode, 'blink-interval');
        stageSelect.initialIndex = this.getInt(indicatorNode, 'initial-index') || 0;
    }

    parseStages(node, context, stageSelect) {
        const {scene} = context;

        const spacingNode = node.querySelector('spacing');
        stageSelect.spacing.copy(this.getVector2(spacingNode));

        const stageNodes = node.querySelectorAll('stages > stage');
        [...stageNodes].forEach(node => {
            const avatarId = this.getAttr(node, 'avatar');
            const captionId = this.getAttr(node, 'caption');
            const characterId = this.getAttr(node, 'character');
            const scene = this.getAttr(node, 'scene');

            stageSelect.addStage({
                scene,
                avatar: context.createEntity(avatarId),
                frame: context.createEntity('frame'),
                caption: context.createEntity(captionId),
                character: characterId
                    ? this.loader.resourceManager.get('entity', characterId)
                    : undefined,
            });
        });
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
                this.loader.loadSceneByName(stage.scene)
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
