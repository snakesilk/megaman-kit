const {XMLLoader, Parser: {ObjectParser}} = require('@snakesilk/xml-loader');

const GameParser = require('../parsers/GameParser');
const StageSelectParser = require('../parsers/StageSelectParser');
const LevelParser = require('../parsers/LevelParser');

class MegamanLoader extends XMLLoader
{
    constructor(game)
    {
        super(game);
        this.entryPoint = null;
        this.sceneIndex = {};
    }
    loadGame(url)
    {
        return this.asyncLoadXML(url).then(doc => {
            const node = doc.querySelector('game');
            const parser = new GameParser(this, node);
            return parser.parse();
        });
    }
    loadSceneByName(name)
    {
        if (!this.sceneIndex[name]) {
            throw new Error(`Scene "${name}" does not exist.`);
        }

        return this.loadScene(this.sceneIndex[name].url);
    }
    parseScene(node)
    {
        if (node.tagName !== 'scene') {
            throw new TypeError('Node not <scene>');
        }

        const type = node.getAttribute('type');
        if (type) {
            if (type === 'level') {
                const parser = new LevelParser(this, node);
                return parser.getScene();
            } else if (type === 'stage-select') {
                const parser = new StageSelectParser(this, node);
                return parser.getScene();
            } else {
                throw new Error(`Scene type "${type}" not recognized`);
            }
        } else {
            return super.parseScene(node);
        }
    }
}

module.exports = MegamanLoader;
