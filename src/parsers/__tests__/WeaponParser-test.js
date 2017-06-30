const expect = require('expect.js');
const sinon = require('sinon');
const {createNode} = require('@snakesilk/testing/xml');

const {Entity, Loader, Objects} = require('@snakesilk/engine');
const WeaponParser = require('../WeaponParser');
const Entities = require('../../entities');

describe('WeaponParser', function() {
    let parser, Weapon;

    beforeEach(() => {
        const loader = new Loader();
        loader.entities.add(Entities);
        parser = new WeaponParser(loader);
    });

    [
        'AirShooter',
        'CrashBomber',
        'EnemyPlasma',
        'MetalBlade',
        'Plasma',
        'TimeStopper',
    ].forEach(name => {
        const id = name + '-id';
        const code = name[0];
        const projectileId = name + '-projectile';
        const xmlString = `<weapon source="${name}" id="${id}" name="${name}-name" code="${code}" ammo="28" cost="1.75">
            <projectile id="${projectileId}" amount="3"/>
        </weapon>`;

        describe(`when parsing ${xmlString}`, () => {
            beforeEach(() => {
                parser.loader.resourceManager.addObject(projectileId, Entity);
                const node = createNode(xmlString);
                Weapon = parser.parseWeapon(node);
            });

            it(`produces a ${name} weapon`, () => {
                expect(Weapon).to.be.a(Function);
            });
        });
    });
});
