var nodeVersion = process.versions.node.split("."),
    major = parseInt(nodeVersion[0],10),
    minor = parseInt(nodeVersion[1],10);



exports = module.exports = {major: major, minor: minor};