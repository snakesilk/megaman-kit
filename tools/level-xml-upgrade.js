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

function migrateCheckpoint(sceneNode, levelNode) {
    const checkpointNode = sceneNode.getElementsByTagName('checkpoints')[0];
    if (checkpointNode) {
        levelNode.insertBefore(checkpointNode, sceneNode);
    }
}

function migrateMusic(sceneNode, levelNode) {
    const musicNodes = sceneNode.getElementsByTagName('music');
    for (let i = 0, node; node = musicNodes[i]; ++i) {
        if (node.parentNode.tagName !== 'audio') {
            levelNode.insertBefore(node, sceneNode);
            return;
        }
    }
}

const file = process.argv[2];
const document = readXMLFile(file);

const sceneNode = document.getElementsByTagName('scene')[0];
if (sceneNode.getAttribute('type') !== 'level') {
    process.stderr.write('<scene> not a type="level"');
    process.exit(1);
}

const levelNode = document.createElement('level');
sceneNode.removeAttribute('type');
levelNode.appendChild(sceneNode);
migrateCheckpoint(sceneNode, levelNode);
migrateMusic(sceneNode, levelNode);

process.stdout.write(new XMLSerializer().serializeToString(levelNode));
