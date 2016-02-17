edp-build-replacer
========

> Edp Build plugin for resource path replace or anthing others replace.

edp-build-replacer 是 [edp-build](https://github.com/ecomfe/edp-build) 的一个插件，用于替换静态资源内容，比如样式引用的 url。

## Usage


### Install

```shell
npm install edp-build-replacer
```

### Config

在 `edp-build-config.js` 文件里，添加该处理器：

```javascript
exports.getProcessors = function () {

    var Replacer = require('edp-build-replacer');
    var cssUrlReplacer = new Replacer({
        files: ['views/**/*.tpl'],
        replacers: [
            {
                // 用于 html 内联样式的替换规则定义
                type: 'css',
                path: true,
                files: [],
                replacer: function (path, file) {
                    if (file.isLocalPath(path)) {
                        path = path.replace(/^\/src\//, '{%$feRoot%}/');
                    }
                    return path;
                }
            }, 
            {
                type: 'html',
                rules: [
                    {tag: 'style'} 
                ]
            }
        ]
    });
    
    // init EDP Build other processors

    return [
        lessCompiler,
        cssCompressor,
        moduleCompiler,
        cssUrlReplacer,
        pathMapper
    ];
}
```

### Options

* files - `Array.<string|RegExp>` `optional` 要替换处理的文件，默认所有构建处理的文件

* fileType - `Object` `optional` 默认文件类型所要处理的文件，可选，默认定义的文件类型如下：

    ```javascript
    {
        html: ['*.{html,htm,phtml,xhtml,tpl}'],
        css: ['*.{css,styl,less,sass,scss}'],
        js: ['*.{js,coffee,ts,dart}']
    }
    ```
        
* parseInline - `boolean` `optional` 是否解析 html 的内联脚本和样式，可选，默认 true
        
* replacers - `Array.<Object>` 定义的内容替换规则，规则定义选项：
        
    * type - `string` `optional` 要替换处理的文件类型，可选
            
    * path - `boolean` `optional` 要替换处理的是否是路径信息，可选，默认 false，对于 `type` 为 `html` 默认会解析如下 `tag` 的路径信息，对于 `type` 为 `css` 会解析所有 `css` 的 `url` 信息进行替换处理。 
           
        ```javascript
        [
           {tag: 'img', attrs: ['src', 'srcset']},
           {tag: 'source', attrs: ['src', 'srcset']},
           {tag: 'link', attrs: ['href']},
           {tag: 'script', attrs: ['src']},
           {tag: 'style'},
           {tag: 'object', attrs: ['data']},
           {tag: 'embed', attrs: ['src']}
        ]
        ```
    * files - `Array.<string>` `optional` 该替换器要替换处理的文件，可选，默认为 `fileType` 定义的文件，若不存在，则为最外层 `files` 选项定义的文件
    
    * replacer - `string|Object|Function` `optional` 替换内容定义
        
        ```javascript
        replacer: {
            domain: 'http://www.baidu.com', // 为路径添加 domain 信息
            domain: { // 将已有的 domain 替换为 新的 domain
                from: 'http://release.com',
                to: 'http://test.com'
            },
            domain: function (url, file) { // 自定义的 domain 替换逻辑
                var isLocal = file.isLocalPath(url);
                var absPath = file.resolve(url);
            },
            
            transform: function (url, file) { // 路径转换处理逻辑定义
                var SRC_REGEXP = /(^|\/)src(\/|$)/;
                return url.replace(SRC_REGEXP, '$1asset$2');
            }
        }            
        ```
        
        ```javascript
        {
            // path: false
            replacer: function (found) {
                var value = found.value;
                return found.match;
            },
            
            // path: true
            replacer: function (url, file) {
                return url;
            }
        }
        ```
    * rules - `Array.<Object>=` 自定义的替换规则，规则选项定义如下：
    
        ```javascript
        [
            {
                tag: 'img',
                attrs: [ // 可选
                    'src', // 解析的属性名
                    {
                        name: 'srcset', // 解析的属性名
                        multiline: true, // 属性值是否允许多行
                        parse: function (value) { // 自定义的属性值解析方法
                            return string | Array.<string>;
                        }
                    }
                ],
                path: true, // 是否作为路径处理，可选，默认会继承外面的 path 属性
                replacer: `string|Object|Function` // 默认继承外面的 replacer 选项，可选
            },
            {
                tag: {
                    name: 'script',
                    close: 'true' // 是否有闭合标签，默认没有
                }
                // 未指定属性，script 默认解析 src 属性，link 解析 href 属性，
                // img/source 解析 src,srcset 属性
            },
            {
                reg: /src=([^\s]+?)/g,
                group: 1, // 作为路径处理匹配的分组作为路径值
                replacer: 'http://www.baidu.com' // 只会替换正则匹配的分组部分内容
            },
            {
                replacer: function (found) {
                    var match = found.match; // 不指定 reg/tag，这里 match 为处理的文件内容
                    return match;
                }
            }
        ]
        ```
