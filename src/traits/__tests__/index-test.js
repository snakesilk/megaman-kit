const expect = require('expect.js');

const {createNode} = require('@snakesilk/testing/xml');
const {Loader} = require('@snakesilk/engine');
const {Parser} = require('@snakesilk/xml-loader');
const PlatformTraits = require('@snakesilk/platform-traits');
const MegamanTraits = require('@snakesilk/megaman-traits');

const registry = require('..');

describe('Registry', () => {
  let loader;

  beforeEach(() => {
    loader = new Loader();
    loader.traits.add(registry);
  });

  [
    // Inherited from Platform kit.
    ['attach', 'Attach', PlatformTraits],
    ['climbable', 'Climbable', PlatformTraits],
    ['climber', 'Climber', PlatformTraits],
    ['contact-damage', 'ContactDamage', PlatformTraits],
    ['death-spawn', 'DeathSpawn', PlatformTraits],
    ['death-zone', 'DeathZone', PlatformTraits],
    ['disappearing', 'Disappearing', PlatformTraits],
    ['environment', 'Environment', PlatformTraits],
    ['fixed-force', 'FixedForce', PlatformTraits],
    ['glow', 'Glow', PlatformTraits],
    ['health', 'Health', PlatformTraits],
    ['invincibility', 'Invincibility', PlatformTraits],
    ['jump', 'Jump', PlatformTraits],
    ['lifetime', 'Lifetime', PlatformTraits],
    ['light', 'Light', PlatformTraits],
    ['light-control', 'LightControl', PlatformTraits],
    ['move', 'Move', PlatformTraits],
    ['physics', 'Physics', PlatformTraits],
    //['pickupable', 'Pickupable', PlatformTraits],
    ['projectile', 'Projectile', PlatformTraits],
    ['rotate', 'Rotate', PlatformTraits],
    ['solid', 'Solid', PlatformTraits],
    ['spawn', 'Spawn', PlatformTraits],
    ['translate', 'Translate', PlatformTraits],

    // Megaman-specific
    ['conveyor', 'Conveyor', MegamanTraits],
    ['destructibe', 'Destructible', MegamanTraits],
    ['door', 'Door', MegamanTraits],
    ['elevator', 'Elevator', MegamanTraits],
    ['fallaway', 'Fallaway', MegamanTraits],
    ['headlight', 'Headlight', MegamanTraits],
    ['stun', 'Stun', MegamanTraits],
    ['teleport', 'Teleport', MegamanTraits],
    ['weapon', 'Weapon', MegamanTraits],

  ].forEach(([shortName, traitName, source]) => {
    describe(`when trait node name is "${shortName}"`, function() {
      let parser, trait;

      beforeEach(() => {
        parser = new Parser.TraitParser(loader);
      });

      it(`returns a factory that creates ${traitName}`, () => {
        const node = createNode(`<trait name="${shortName}"/>`);
        trait = parser.parseTrait(node)();
        expect(trait).to.be.a(source[traitName]);
      });
    });
  });
});