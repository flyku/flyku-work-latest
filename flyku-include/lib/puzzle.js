var fs = require('fs');
var path = require('path');
var subs = [];
/**
 * 从属性中获取数据信息
 * @example 见 test
 * @param propertyStr 属性的字符串
 */
var getDataFrom = function (propertyStr) {
    // ( 一个或多个非空格>的字符 空格 = 空格 "' 非贪婪匹配非等号的字符 "' ?= 向后匹配一个空格或者>  )
    var datas = {};
    var dataReg = /([^\s<>'"]+[\s]*=[\s]*(['"]?)[^=>]+?\2(?=[\s]+))|([^\s<>'"]+)/gi;
    (propertyStr + ' ').match(dataReg).forEach(function (dataAttr) {
        var dataKey = dataAttr.match(/^([^\s].*)=/);
        var dataValue = dataAttr.match(/=[\s]*(['"]?)(.*)[\s]*\1/);
        if (dataValue === null) {
            datas[dataAttr] = "true";
        }
        if (dataKey !== null && dataValue !== null) {
            datas[dataKey[1].trim()] = dataValue[2]; //string 去掉外面的 ' 和 "
        }
    });
    //转化成json对象的形式
    return datas;
};

/**
 * 从字符串中获取子模块
 * @param htmlCode html代码
 * @returns {Array} 按priority从高到低排列的子模块
 */
var getSubModules = function (htmlCode) {
    var result = [];
    var puzzles = htmlCode.match(/<puzzle[\s]+?([^>]*)>([\s\S]*?)<\/puzzle>/g);
    if (puzzles === null) {
        return result;
    }
    puzzles.forEach(function (val) {
        var subInnerHTML = val.match(/<puzzle[\s]+?[^>]*>([\s\S]*?)<\/puzzle>/);
        var subModule = getDataFrom(val.replace(/<puzzle|>[\s\S]*?<\/puzzle>/g, ''));
        subModule.tag = val;
        subModule.innerHTML = subInnerHTML[1];
        result.push(subModule);
    });
    result.sort(function (puz1, puz2) {
        var pri1 = puz1.priority || 0;
        var pri2 = puz2.priority || 0;
        if (pri1 < pri2) {
            return 1;
        } else if (pri1 > pri2) {
            return -1;
        } else {
            return 0;
        }
    });
    return result;
};

var parseSubs = function (baseUrl, code, parser) {
    getSubModules(code).forEach(function (sub) {
        var subUrl = path.resolve(path.dirname(baseUrl), sub.module);
        if (/^\/|^\\/.test(sub.module)) { // /bucks/index.html 之类的路径
            if (/\/pages\/|\\pages\\/.test(baseUrl)) { //处于pages文件夹中的页面，根设置在pages下，否则是项目的根文件夹（命令执行的位置）
                subUrl = path.join(process.cwd(), "pages" + sub.module);//自动在pages文件夹中寻找
            } else {
                subUrl = path.join(process.cwd(), sub.module);//自动在pages文件夹中寻找
            }
        }
        subs.push(subUrl);
        var subCode = parser(subUrl);
        subCode = subCode.replace(/\{\{([^\}]+)\}\}/g, function ($0, $1) { //innerHTML
            var props = $1.split('.');
            if (props.length === 1) { //普通取字符串的值
                return sub[$1];
            } else { //长度大于一，取对象中的属性
                try {
                    var propValue = JSON.parse(sub[props[0]]);
                    for (var i = 1, len = props.length; i < len; i++) {
                        propValue = propValue[props[i]];
                        if (propValue === undefined) { // 如果本层已经为 undefine，不再继续向下取，返回 undefined
                            break;
                        }
                    }
                    return propValue;
                } catch (e) {
                    return '\n{ JSON parse Error::' + e + ' in file:' + subUrl + ', property: ' + $1 + ' }';
                }
            }
        });
        code = code.replace(sub.tag, subCode);
    });
    return code;
};

/**
 * 默认自动解析其中的puzzle标签
 * @param pageUrl
 * @param htmlCode html文件的代码
 */
var getFullPage = function (pageUrl, htmlCode) {
    var code = "";
    try {
        code = parseSubs(
            pageUrl,
            htmlCode || fs.readFileSync(pageUrl, 'utf-8'),
            getFullPage
        );
    } catch (e) {
        console.warn(pageUrl, ' is not found local!');
        code = null;
    }
    return code;
};

exports.parseSubs = parseSubs;

exports.puz = getFullPage;

exports.getAllSubs = function () {
    return subs;
};


