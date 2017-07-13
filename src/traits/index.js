const {Parser} = require('@snakesilk/xml-loader');
const {Traits: PlatformTraitRegistry} = require('@snakesilk/platform-kit');
const Traits = require('@snakesilk/megaman-traits');

const {createFactory} = Parser.TraitParser;

const MegamanTraitRegistry = {
  'conveyor': createFactory(Traits.Conveyor),
  'destructible': require('./Destructible'),
  'door': require('./Door'),
  'elevator': require('./Elevator'),
  'fallaway': createFactory(Traits.Fallaway),
  'headlight': createFactory(Traits.Headlight),
  'stun': createFactory(Traits.Stun),
  'teleport': createFactory(Traits.Teleport),
  'weapon': require('./Weapon'),
};

module.exports = Object.assign({},
  PlatformTraitRegistry,
  MegamanTraitRegistry);