const {XMLLoader, Parser: {ObjectParser}} = require('@snakesilk/xml-loader');

const GameParser = require('../parsers/GameParser');
const StageSelectParser = require('../parsers/StageSelectParser');
const LevelParser = require('../parsers/LevelParser');

class MegamanLoader extends XMLLoader
{
    constructor(game) {
        super(game);

        this.levelParser = new LevelParser(this);
        this.stageSelectParser = new StageSelectParser(this);

        this.entryPoint = null;
        this.sceneIndex = {};
    }

    loadGame(url) {
        return this.asyncLoadXML(url).then(doc => {
            const node = doc.querySelector('game');
            const parser = new GameParser(this, node);
            return parser.parse();
        });
    }

    loadSceneByName(name) {
        if (!this.sceneIndex[name]) {
            throw new Error(`Scene "${name}" does not exist.`);
        }

        return this.loadScene(this.sceneIndex[name].url)
        .then(({scene}) => scene);
    }

    parseScene(node) {
        if (node.tagName !== 'scene') {
            throw new TypeError('Node not <scene>');
        }

        const type = node.getAttribute('type');
        if (type) {
            if (type === 'level') {
                return this.levelParser.getScene(node);
            } else if (type === 'stage-select') {
                return this.stageSelectParser.getScene(node);
            } else {
                throw new Error(`Scene type "${type}" not recognized`);
            }

        } else {
            return super.parseScene(node);
        }
    }
}

module.exports = MegamanLoader;
