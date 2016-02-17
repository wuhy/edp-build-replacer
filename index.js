
/**
 * @file 路径等相关内容替换 处理器
 * @author sparklewhy@gmail.com
 */

/* global AbstractProcessor:false */

var util = require('util');
var minimatch = require('minimatch');
var _ = require('lodash');
var assetUtil = require('asset-util');

/**
 * 解析 HTML 包含的路径信息的 tag/属性 定义
 *
 * @type {Array}
 */
var DEFAULT_HTML_PATH_PARSE_TAGS = [
    {tag: 'img', attrs: ['src', 'srcset']},
    {tag: 'source', attrs: ['src', 'srcset']},
    {tag: 'link', attrs: ['href']},
    {tag: 'script', attrs: ['src']},
    {tag: 'style'},
    {tag: 'object', attrs: ['data']},
    {tag: 'embed', attrs: ['src']}
];

/**
 * 判断给定的路径是否匹配给定的 pattern
 *
 * @inner
 * @param {string} path 要匹配的路径
 * @param {RegExp|string|Array} patterns 匹配的正则或者 `minimatch` 支持的 pattern
 * @return {boolean}
 */
function isMatch(path, patterns) {
    if (!Array.isArray(patterns)) {
        patterns = [patterns];
    }

    return patterns.some(function (p) {
        if (_.isRegExp(p)) {
            return p.test(path);
        }

        return minimatch(path, p, {matchBase: true});
    });
}

/**
 * 查找要处理的文件
 *
 * @inner
 * @param {Array} patterns 查找的 patterns
 * @param {Array.<File>} allFiles 所有的文件集合
 * @return {Array.<File>}
 */
function findProcessFiles(patterns, allFiles) {
    var found = [];
    allFiles.forEach(function (file) {
        if (isMatch(file.path, patterns)) {
            found.push(file);
        }
    });
    return found;
}

/**
 * 内容替换处理器
 *
 * @constructor
 * @param {Object} options 初始化参数
 */
function AssetReplaceProcessor(options) {
    AbstractProcessor.call(this, options);

    this.fileType = _.assign(
        {}, this.fileType, AssetReplaceProcessor.DEFAULT_OPTIONS.fileType
    );

    var replacers = this.replacers || [];
    replacers.forEach(function (item) {
        if (item.type === 'html' && item.path === true) {
            item.rules = _.merge([], item.rules, DEFAULT_HTML_PATH_PARSE_TAGS);
        }
    }, this);
}

util.inherits(AssetReplaceProcessor, AbstractProcessor);

AssetReplaceProcessor.DEFAULT_OPTIONS = {

    /**
     * 处理器名称
     *
     * @const
     * @type {string}
     */
    name: 'AssetReplaceProcessor',

    /**
     * 要处理的文件
     *
     * @type {Array}
     */
    files: ['**/*'],

    /**
     * 默认的文件类型所包含的文件定义
     *
     * @type {Object}
     */
    fileType: {
        html: ['*.{html,htm,phtml,xhtml,tpl}'],
        css: ['*.{css,styl,less,sass,scss}'],
        js: ['*.{js,coffee,ts,dart}']
    },

    /**
     * 替换规则定义
     *
     * @type {Array.<Object>}
     */
    replacers: [],

    /**
     * 是否解析 html 内联脚本/样式
     *
     * @type {boolean}
     */
    parseInline: true
};

/**
 * 构建处理前的行为，选择要处理的文件
 *
 * @param {ProcessContext} processContext 构建环境对象
 * @override
 */
AssetReplaceProcessor.prototype.beforeAll = function (processContext) {
    AbstractProcessor.prototype.beforeAll.apply(this, arguments);

    var files = this.toProcessFiles = this.processFiles;
    // 为了确保处理器只执行一次，这里初始化要处理的文件为一个
    this.processFiles = files.length > 0 ? [files[0]] : [];

    Object.keys(this.fileType).forEach(function (type) {
        this.fileType[type] = findProcessFiles(this.fileType[type], files);
    }, this);

};

/**
 * 构建处理
 *
 * @param {FileInfo} file 文件信息对象
 * @param {ProcessContext} processContext 构建环境对象
 * @param {Function} callback 处理完成回调函数
 */
AssetReplaceProcessor.prototype.process = function (file, processContext, callback) {
    var fileType = this.fileType;
    var allFiles = this.toProcessFiles;
    var getProcessFiles = function (type, pattern) {
        if (!pattern && type) {
            return fileType[type];
        }

        return (pattern && findProcessFiles(pattern, allFiles)) || allFiles;
    };

    var replacers = this.replacers;
    var findReplacersByType = function (type) {
        var result = [];
        for (var i = 0, len = replacers.length; i < len; i++) {
            var item = replacers[i];
            if (item.type === type) {
                result.push(item);
            }
        }

        return result;
    };

    var pathReplacerMap = {
        html: 'replaceHTMLURL',
        css: 'replaceCSSURL'
    };
    var parseInline = this.parseInline && function (info) {
        var replacers = findReplacersByType(info.type);
        var file = {data: info.data, path: info.file.path, inline: true};
        for (var i = 0, len = replacers.length; i < len; i++) {
            var item = replacers[i];
            file.data = replace(file, item);
        }
        return info.match.replace(info.data, file.data);
    };

    var replace = function (file, options) {
        var data = file.data;
        var defaultReplacer = options.replacer;
        var rewriteOption = {
            rules: options.rules,
            parseInline: parseInline,
            type: options.type,
            path: options.path,
            replacer: defaultReplacer
        };

        var rewriter = assetUtil[pathReplacerMap[rewriteOption.type]];
        if (_.isFunction(rewriter)) {
            return rewriter(file, rewriteOption);
        }

        if (Array.isArray(rewriteOption.rules)) {
            data = assetUtil.replaceByRules(file, rewriteOption.rules, rewriteOption);
        }
        else if (_.isFunction(defaultReplacer)) {
            data = defaultReplacer(data, file, rewriteOption);
        }

        return data;
    };

    replacers.forEach(function (item) {
        var processFiles = getProcessFiles(item.type, item.files);
        if (!processFiles || !processFiles.length) {
            return;
        }
        for (var i = 0, len = processFiles.length; i < len; i++) {
            var currFile = processFiles[i];
            currFile.data = replace(currFile, item);
        }
    });
    callback();
};

module.exports = exports = AssetReplaceProcessor;

