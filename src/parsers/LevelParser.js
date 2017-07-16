const {Parser, Util: {children, ensure, find}} = require('@snakesilk/xml-loader');
const Spawner = require('@snakesilk/engine/dist/object/Spawner');
const Level = require('../scenes/Level');

class LevelParser extends Parser
{
    constructor(loader) {
        super(loader);
        this.sceneParser = new Parser.SceneParser(loader);
    }

    getScene(node) {
        ensure(node, 'level');

        const sceneNode = children(node, 'scene')[0];
        return this.sceneParser.getScene(sceneNode)
        .then(context => {
            const level = new Level(context.scene);
            this.parseCheckpoints(node, level);
            this.parseMusic(node, context, level);
            this.parseSpawners(node, context);
            this.parseText(node, level);
            console.log(level);

            return this.loader.resourceLoader.complete()
            .then(() => context);
        });
    }

    parseCheckpoints(node, level) {
        const checkpointNodes = find(node, 'checkpoints > checkpoint');
        for (let checkpointNode, i = 0; checkpointNode = checkpointNodes[i]; ++i) {
            const p = this.getPosition(checkpointNode);
            const r = this.getFloat(checkpointNode, 'radius') || undefined;
            level.addCheckPoint(p.x, p.y, r);
        }
    }

    parseMusic(node, {scene}, level) {
        const nodes = find(node, 'music > *');
        for (let node, i = 0; node = nodes[i]; ++i) {
            const type = node.tagName;
            const id = this.getAttr(node, 'id')
            if (type === 'level') {
                scene.events.bind(level.EVENT_PLAYER_RESET, function() {
                    this.audio.play(id);
                });
                scene.events.bind(level.EVENT_PLAYER_DEATH, function() {
                    this.audio.stop(id);
                });
            } else if (type === 'boss') {
                /* Special boss music treatment here. */
            }
        }
    }

    parseSpawners(node, {scene}) {
        const world = scene.world;
        const spawnerNodes = find(node, 'layout > spawner');
        for (let spawnerNode, i = 0; spawnerNode = spawnerNodes[i]; ++i) {
            const spawner = new Spawner();
            const position = this.getPosition(spawnerNode);
            spawner.position.copy(position);
            spawner.position.z = 0;

            const spawnableNodes = spawnerNode.getElementsByTagName('*');
            for (let spawnableNode, j = 0; spawnableNode = spawnableNodes[j]; ++j) {
                const objectId = spawnableNode.getAttribute('id');
                const objectRef = this.loader.resourceManager.get('entity', objectId);
                spawner.pool.push(objectRef);
            }

            spawner.maxTotalSpawns = this.getFloat(spawnerNode, 'count') || Infinity;
            spawner.maxSimultaneousSpawns = this.getFloat(spawnerNode, 'simultaneous') || 1;
            spawner.interval = this.getFloat(spawnerNode, 'interval') || 0;
            spawner.minDistance = this.getFloat(spawnerNode, 'min-distance') || 64;
            spawner.maxDistance = this.getFloat(spawnerNode, 'max-distance') || 256;

            world.addObject(spawner);
        }
        return Promise.resolve();
    }

    parseText(node, level) {
        const ReadyToast = this.loader.resourceManager.get('entity', 'READY');
        level.assets['readyToast'] = new ReadyToast();
    }
}

module.exports = LevelParser;
