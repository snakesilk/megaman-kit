#! /usr/bin/env node
/*
Usage:
    level-xml-upgrade.js [my-level.xml] | xmllint --format -
*/
const fs = require('fs');
const {DOMParser, XMLSerializer} = require('xmldom');

function readXMLFile(file) {
    const xml = fs.readFileSync(file, 'utf8');
    return new DOMParser().parseFromString(xml);
}

const file = process.argv[2];
const document = readXMLFile(file);

const levelNode = document.createElement('level');
const sceneNode = document.getElementsByTagName('scene')[0];
sceneNode.removeAttribute('type');
levelNode.appendChild(sceneNode);
levelNode.insertBefore(sceneNode.getElementsByTagName('checkpoints')[0], sceneNode);
levelNode.insertBefore(sceneNode.getElementsByTagName('music')[0], sceneNode);

process.stdout.write(new XMLSerializer().serializeToString(levelNode));
