const {Parser, Util: {ensure, find}} = require('@snakesilk/xml-loader');
const Spawner = require('@snakesilk/engine/dist/object/Spawner');
const Level = require('../scenes/Level');

class LevelParser extends Parser.SceneParser
{
    getScene(node) {
        ensure(node, 'scene');

        const context = this.createContext(new Level());

        this._parseAudio(node, context);
        this._parseEvents(node, context);
        this._parseMusic(node, context);
        this._parseBehaviors(node, context);
        this._parseCamera(node, context);
        this._parseCheckpoints(node, context);
        this._parseGravity(node, context);
        this._parseSequences(node, context);
        this._parseSpawners(node, context);
        this._parseText(node, context);

        return this._parseObjects(node, context).then(() => {
            return this._parseLayout(node, context);
        }).then(() => {
            return this._parseScripts(node, context);
        }).then(() => {
            return this.loader.resourceLoader.complete();
        }).then(() => {
            return context;
        });
    }

    _parseCheckpoints(node, {scene: level}) {
        const checkpointNodes = find(node, 'checkpoints > checkpoint');
        for (let checkpointNode, i = 0; checkpointNode = checkpointNodes[i]; ++i) {
            const p = this.getPosition(checkpointNode);
            const r = this.getFloat(checkpointNode, 'radius') || undefined;
            level.addCheckPoint(p.x, p.y, r);
        }
    }

    _parseMusic(node, {scene}) {
        const nodes = find(node, 'music > *');
        for (let node, i = 0; node = nodes[i]; ++i) {
            const type = node.tagName;
            const id = this.getAttr(node, 'id')
            if (type === 'level') {
                scene.events.bind(scene.EVENT_PLAYER_RESET, function() {
                    this.audio.play(id);
                });
                scene.events.bind(scene.EVENT_PLAYER_DEATH, function() {
                    this.audio.stop(id);
                });
            } else if (type === 'boss') {
                /* Special boss music treatment here. */
            }
        }
    }

    _parseSpawners(node, {scene}) {
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

    _parseScripts(node, {scene: level}) {
        const scriptNodes = find(node, 'scripts > *');
        for (let scriptNode, i = 0; scriptNode = scriptNodes[i++];) {
            const type = scriptNode.tagName;
            const func = eval(scriptNode.textContent);
            if (typeof func === "function") {
                if (type === 'bootstrap') {
                    func(scene);
                }
            }
        }
    }

    _parseText(node, {scene}) {
        const res = this.loader.resourceManager;
        if (res.has('font', 'nintendo')) {
            scene.assets['start-caption'] = res.get('font', 'nintendo')('READY').createMesh();
        }
    }
}

module.exports = LevelParser;
