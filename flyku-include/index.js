/**
 * Created by flyku on 2016/12/24.
 */
var fs = require('fs');
var include = require('./lib/include');
var puzzle = require('./lib/puzzle');

exports.include = include.include;
exports.puz = puzzle.puz;
exports.allPuz = puzzle.getAllSubs;
exports.allInc = include.getAllSubs;
exports.multiTag = function (pageUrl, htmlCode) {
    if (!fs.existsSync(pageUrl)) {
        console.warn(pageUrl, ' is not found local!');
        return null;
    }
    var code = htmlCode || fs.readFileSync(pageUrl, 'utf-8');
    code = include.parseSubs(pageUrl, code, exports.multiTag);
    code = puzzle.parseSubs(pageUrl, code, exports.multiTag);
    return code;
};
