const expect = require('expect.js');

const {Entity} = require('@snakesilk/engine');
const Megaman = require('../Megaman');

describe('Megaman', () => {
  it('is an instance of entity', () => {
    const instance = new Megaman();
    expect(instance).to.be.a(Entity);
  });
});
