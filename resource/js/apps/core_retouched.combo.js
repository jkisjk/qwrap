//	document.write('<script type="text/javascript" src="' + srcPath + 'core/core_base.js"><\/script>');

/*
	Copyright (c) Baidu Youa Wed QWrap
	version: $version$ $release$ released
	author: QWrap 月影、CC、JK
*/


/**
 * @singleton 
 * @class QW QW是QWrap的默认域，所有的核心Class都应定义在QW的域下
 */
(function() {
	var QW = {
		/**
		 * @property {string} VERSION 脚本库的版本号
		 * @default $version$
		 */
		VERSION: "$version$",
		/**
		 * @property {string} RELEASE 脚本库的发布号（小版本）
		 * @default $release$
		 */
		RELEASE: "$release$",
		/**
		 * @property {string} PATH 脚本库的运行路径
		 * @type string
		 */
		PATH: (function() {
			var sTags = document.getElementsByTagName("script");
			return sTags[sTags.length - 1].src.replace(/\/[^\/]+\/[^\/]+$/, "/");
		}()),

		/**
		 * 获得一个命名空间
		 * @method namespace
		 * @static
		 * @param { String } sSpace 命名空间符符串。如果命名空间不存在，则自动创建。
		 * @param { Object } root (Optional) 命名空间的起点。当没传root时：如果sSpace以“.”打头，则是默认为QW为根，否则默认为window。
		 * @return {any} 返回命名空间对应的对象 
		 */
		namespace: function(sSpace, root) {
			var arr = sSpace.split('.'),
				i = 0,
				nameI;
			if (sSpace.indexOf('.') == 0) {
				i = 1;
				root = root || QW;
			}
			root = root || window;
			for (; nameI = arr[i++];) {
				if (!root[nameI]) {
					root[nameI] = {};
				}
				root = root[nameI];
			}
			return root;
		},

		/**
		 * QW无冲突化，还原可能被抢用的window.QW变量
		 * @method noConflict
		 * @static
		 * @return {json} 返回QW的命名空间 
		 */
		noConflict: (function() {
			var _previousQW = window.QW;
			return function() {
				window.QW = _previousQW;
				return QW;
			}
		}()),

		/**
		 * 异步加载脚本
		 * @method loadJs
		 * @static
		 * @param { String } url Javascript文件路径
		 * @param { Function } onsuccess (Optional) Javascript加载后的回调函数
		 * @param { Option } options (Optional) 配置选项，例如charset
		 */
		loadJs: function(url, onsuccess, options) {
			options = options || {};
			var head = document.getElementsByTagName('head')[0] || document.documentElement,
				script = document.createElement('script'),
				done = false;
			script.src = url;
			if (options.charset) {
				script.charset = options.charset;
			}
			script.onerror = script.onload = script.onreadystatechange = function() {
				if (!done && (!this.readyState || this.readyState == "loaded" || this.readyState == "complete")) {
					done = true;
					if (onsuccess) {
						onsuccess();
					}
					script.onerror = script.onload = script.onreadystatechange = null;
					head.removeChild(script);
				}
			};
			head.insertBefore(script, head.firstChild);
		},
		/**
		 * 加载css样式表
		 * @method loadCss
		 * @static
		 * @param { String } url Css文件路径
		 */
		loadCss: function(url) {
			var head = document.getElementsByTagName('head')[0] || document.documentElement,
			css = document.createElement('link');
			css.rel = 'stylesheet';
			css.type = 'text/css';
			css.href = url;
			head.insertBefore(css, head.firstChild);
		},


		/**
		 * 抛出异常
		 * @method error
		 * @static
		 * @param { obj } 异常对象
		 * @param { type } Error (Optional) 错误类型，默认为Error
		 */
		error: function(obj, type) {
			type = type || Error;
			throw new type(obj);
		}
	};

	/*
	 * @class Wrap Wrap包装器。在对象的外面加一个外皮
	 * @namespace QW
	 * @param {any} core 被包装对象
	 * @return {Wrap}
	 */
	/*
	QW.Wrap=function(core) {
		this.core=core;
	};
	*/

	window.QW = QW;
}());


//	document.write('<script type="text/javascript" src="' + srcPath + 'core/module.h.js"><\/script>');

/*
	Copyright (c) Baidu Youa Wed QWrap
	version: $version$ $release$ released
	author: JK
*/

/**
 * @class ModuleH 模块管理Helper
 * @singleton 
 * @namespace QW
 * @helper
 */
(function() {

	var modules = {},
		loadJs = QW.loadJs,
		loadingModules = [],
		isLoading = false;
	function mix(des, src, override) {
		for (var i in src) {
			if (override || !(i in des)) {
				des[i] = src[i];
			}
		}
		return des;
	}
	function isPlainObject(obj) {
		return !!obj && obj.constructor == Object;
	}


	function loadsJsInOrder() {
		//浏览器不能保证动态添加的ScriptElement会按顺序执行，所以人为来保证一下
		//参见：http://www.stevesouders.com/blog/2009/04/27/loading-scripts-without-blocking/
		//测试帮助：http://1.cuzillion.com/bin/resource.cgi?type=js&sleep=3&jsdelay=0&n=1&t=1294649352
		//todo: 目前没有充分利用部分浏览器的并行下载功能，可以改进。
		//todo: 如果服务器端能combo，则可修改以下内容以适应。
		var moduleI = loadingModules[0];
		function loadedDone() {
			moduleI.loadStatus = 2;
			var cbs = moduleI.__callbacks;
			for (var i = 0; i < cbs.length; i++) {
				cbs[i]();
			}
			isLoading = false;
			loadsJsInOrder();
		}
		if (!isLoading && moduleI) {
			//alert(moduleI.url);
			isLoading = true;
			loadingModules.splice(0, 1);
			var checker = moduleI.loadedChecker;
			if (checker && checker()) { //如果有loaderChecker，则用loaderChecker判断一下是否已经加载过
				loadedDone();
			} else {
				loadJs(moduleI.url.replace(/^\/\//, QW.PATH), loadedDone);
			}
		}
	}


	var ModuleH = {
		/**
		 * @property {Array} provideDomains provide方法针对的命名空间
		 */
		provideDomains: [QW],
		/**
		 * 向QW这个命名空间里设变量
		 * @method provide
		 * @static
		 * @param {string|Json} moduleName 如果类型为string，则为key，否则为Json，表示将该Json里的值dump到QW命名空间
		 * @param {any} value (Optional) 值
		 * @return {void} 
		 */
		provide: function(moduleName, value) {
			if (typeof moduleName == 'string') {
				var domains = ModuleH.provideDomains;
				for (var i = 0; i < domains.length; i++) {
					if (!domains[i][moduleName]) {domains[i][moduleName] = value; }
				}
			} else if (isPlainObject(moduleName)) {
				for (i in moduleName) {
					ModuleH.provide(i, moduleName[i]);
				}
			}
		},

		/** 
		 * 添加模块配置。
		 * @method addConfig
		 * @static
		 * @param {string} moduleName 模块名。（如果为json，则是moduleName/details 的键值对json）
		 * @param {json} details 模块的依整配置，目前支持以下：
		 url: string，js路径名。如果以"//"开头，则指相对于QW.PATH。
		 requires: string，本模所依赖的其它模块。多个模块用“,”分隔
		 use: 本模所加载后，需要接着加载的模块。多个模块用“,”分隔
		 loadedChecker: 模块是否已经预加载的判断函数。如果本函数返回true，表示已经加载过。
		 * @example 
		 addConfig('Editor',{url:'wed/editor/Editor.js',requires:'Dom',use:'Panel,Drap'});//配置一个模块
		 addConfig({'Editor':{url:'wed/editor/Editor.js',requires:'Dom',use:'Panel,Drap'}});//配置多个模块
		 */
		addConfig: function(moduleName, details) {
			if (typeof moduleName == 'string') {
				var json = mix({}, details);
				json.moduleName = moduleName;
				json.__callbacks = [];
				modules[moduleName] = json;
			} else if (isPlainObject(moduleName)) {
				for (var i in moduleName) {
					ModuleH.addConfig(i, moduleName[i]);
				}
			}
		},

		/** 
		 * 按需加载模块相关js，加载完后执行callback。
		 * @method use
		 * @static
		 * @param {string} moduleName 需要接着加载的模块名。多个模块用“,”分隔
		 * @param {Function} callback 需要执行的函数.
		 * @return {void} 
		 * @remark 
		 需要考虑的情况：
		 use的module未加载/加载中/已加载、二重required或use的文件已加载/加载中/未加载
		 */
		use: function(moduleName, callback) {
			var modulesJson = {},//需要加载的模块Json（用json效率快）
				modulesArray = [],//需要加载的模块Array（用array来排序）		
				names = moduleName.split(','),
				i,
				j,
				k,
				len,
				moduleI;

			while (names.length) { //收集需要排队的模块到modulesJson
				var names2 = {};
				for (i = 0; i < names.length; i++) {
					var nameI = names[i];
					if (!nameI || QW[nameI]) {//如果已被预加载，也会忽略
						continue; 
					}
					if (!modulesJson[nameI]) { //还没进行收集
						if (!modules[nameI]) { //还没进行config
							throw 'Unknown module: ' + nameI;
						}
						if (modules[nameI].loadStatus != 2) { //还没被加载过  loadStatus:1:加载中、2:已加载
							var checker = modules[nameI].loadedChecker;
							if (checker && checker()) { //如果有loaderChecker，则用loaderChecker判断一下是否已经加载过
								continue;
							}
							modulesJson[nameI] = modules[nameI]; //加入队列。
						}
						var refs = ['requires', 'use'];
						for (j = 0; j < refs.length; j++) { //收集附带需要加载的模块
							var sRef = modules[nameI][refs[j]];
							if (sRef) {
								var refNames = sRef.split(',');
								for (k = 0; k < refNames.length; k++) {names2[refNames[k]] = 0; }
							}
						}
					}
				}
				names = [];
				for (i in names2) {
					names.push(i);
				}
			}
			for (i in modulesJson) { //转化成加载数组
				modulesArray.push(modulesJson[i]);
			}

			for (i = 0, len = modulesArray.length; i < len; i++) { //排序。 本排序法节约代码，但牺了性能
				if (!modulesArray[i].requires) {
					continue; 
				}
				for (j = i + 1; j < len; j++) {
					if (new RegExp('(^|,)' + modulesArray[j].moduleName + '(,|$)').test(modulesArray[i].requires)) {
						//如果发现前面的模块requires后面的模块，则将被required的模块移到前面来，并重新查它在新位置是否合适
						var moduleJ = modulesArray[j];
						modulesArray.splice(j, 1);
						modulesArray.splice(i, 0, moduleJ);
						i--;
						break;
					}
				}
			}

			var loadIdx = -1,
				//需要加载并且未加载的最后一个模块的index
				loadingIdx = -1; //需要加载并且正在加载的最后一个模块的index
			for (i = 0; i < modulesArray.length; i++) {
				moduleI = modulesArray[i];
				if (!moduleI.loadStatus && (new RegExp('(^|,)' + moduleI.moduleName + '(,|$)').test(moduleName))) {
					loadIdx = i;
				}
				if (moduleI.loadStatus == 1 && (new RegExp('(^|,)' + moduleI.moduleName + '(,|$)').test(moduleName))) {
					loadingIdx = i;
				}
			}
			if (loadIdx != -1) { //还有未开始加载的
				modulesArray[loadIdx].__callbacks.push(callback);
			} else if (loadingIdx != -1) { //还有正在加载的
				modulesArray[loadingIdx].__callbacks.push(callback);
			} else {
				callback();
				return;
			}

			for (i = 0; i < modulesArray.length; i++) {
				moduleI = modulesArray[i];
				if (!moduleI.loadStatus) { //需要load的js。todo: 模块combo加载
					moduleI.loadStatus = 1;
					loadingModules.push(moduleI);
				}
			}
			loadsJsInOrder();
		}
	};

	QW.ModuleH = ModuleH;
	QW.use = ModuleH.use;
	QW.provide = ModuleH.provide;

}());


//	document.write('<script type="text/javascript" src="' + srcPath + 'core/browser.js"><\/script>');

/*
	Copyright (c) Baidu Youa Wed QWrap
	version: $version$ $release$ released
	author: JK
*/


/**
 * @class Browser js的运行环境，浏览器以及版本信息。（Browser仅基于userAgent进行嗅探，存在不严谨的缺陷。）
 * @singleton 
 * @namespace QW 
 */
QW.Browser = (function() {
	var na = window.navigator,
		ua = na.userAgent.toLowerCase(),
		browserTester = /(msie|webkit|gecko|presto|opera|safari|firefox|chrome|maxthon)[ \/]([\d.]+)/ig,
		Browser = {
			platform: na.platform
		};
	ua.replace(browserTester, function(a, b, c) {
		var bLower = b.toLowerCase();
		Browser[bLower] = c;
	});
	if (Browser.opera) { //Opera9.8后版本号位置变化
		ua.replace(/opera.*version\/([\d.]+)/, function(a, b) {
			Browser.opera = b;
		});
	}
	if (Browser.msie) {
		Browser.ie = Browser.msie;
		var v = parseInt(Browser.msie, 10);
		Browser['ie' + v] = true;
	}
	return Browser;
}());
if (QW.Browser.ie) {
	try {
		document.execCommand("BackgroundImageCache", false, true);
	} catch (e) {}
};


//	document.write('<script type="text/javascript" src="' + srcPath + 'core/string.h.js"><\/script>');

/*
	Copyright (c) Baidu Youa Wed QWrap
	version: $version$ $release$ released
	author: JK
*/

/**
 * @class StringH 核心对象String的扩展
 * @singleton
 * @namespace QW
 * @helper
 */

(function() {

	var StringH = {
		/** 
		 * 除去字符串两边的空白字符
		 * @method trim
		 * @static
		 * @param {String} s 需要处理的字符串
		 * @return {String}  除去两端空白字符后的字符串
		 * @remark 如果字符串中间有很多连续tab,会有有严重效率问题,相应问题可以用下一句话来解决.
		 return s.replace(/^[\s\xa0\u3000]+/g,"").replace(/([^\u3000\xa0\s])[\u3000\xa0\s]+$/g,"$1");
		 */
		trim: function(s) {
			return s.replace(/^[\s\xa0\u3000]+|[\u3000\xa0\s]+$/g, "");
		},
		/** 
		 * 对一个字符串进行多次replace
		 * @method mulReplace
		 * @static
		 * @param {String} s  需要处理的字符串
		 * @param {array} arr  数组，每一个元素都是由replace两个参数组成的数组
		 * @return {String} 返回处理后的字符串
		 * @example alert(mulReplace("I like aa and bb. JK likes aa.",[[/aa/g,"山"],[/bb/g,"水"]]));
		 */
		mulReplace: function(s, arr) {
			for (var i = 0; i < arr.length; i++) {
				s = s.replace(arr[i][0], arr[i][1]);
			}
			return s;
		},
		/** 
		 * 字符串简易模板
		 * @method format
		 * @static
		 * @param {String} s 字符串模板，其中变量以{0} {1}表示
		 * @param {String} arg0 (Optional) 替换的参数
		 * @return {String}  模板变量被替换后的字符串
		 * @example alert(format("{0} love {1}.",'I','You'))
		 */
		format: function(s, arg0) {
			var args = arguments;
			return s.replace(/\{(\d+)\}/ig, function(a, b) {
				return args[(b | 0) + 1] || '';
			});
		},

		/*
		* 字符串简易模板
		* @method tmpl
		* @static
		* @param {String} sTmpl 字符串模板，其中变量以｛$aaa｝表示
		* @param {Object} opts 模板参数
		* @return {String}  模板变量被替换后的字符串
		* @example alert(tmpl("{$a} love {$b}.",{a:"I",b:"you"}))
		tmpl:function(sTmpl,opts){
			return sTmpl.replace(/\{\$(\w+)\}/g,function(a,b){return opts[b]});
		},
		*/

		/** 
		 * 字符串模板
		 * @method tmpl
		 * @static
		 * @param {String} sTmpl 字符串模板，其中变量以{$aaa}表示。模板语法：
		 分隔符为{xxx}，"}"之前没有空格字符。
		 js表达式/js语句里的'}', 需使用' }'，即前面有空格字符
		 {strip}...{/strip}里的所有\r\n打头的空白都会被清除掉
		 {}里只能使用表达式，不能使用语句，除非使用以下标签
		 {js ...}		－－任意js语句, 里面如果需要输出到模板，用print("aaa");
		 {if(...)}		－－if语句，写法为{if($a>1)},需要自带括号
		 {elseif(...)}	－－elseif语句，写法为{elseif($a>1)},需要自带括号
		 {else}			－－else语句，写法为{else}
		 {/if}			－－endif语句，写法为{/if}
		 {for(...)}		－－for语句，写法为{for(var i=0;i<1;i++)}，需要自带括号
		 {/for}			－－endfor语句，写法为{/for}
		 {while(...)}	－－while语句,写法为{while(i-->0)},需要自带括号
		 {/while}		－－endwhile语句, 写法为{/while}
		 * @param {Object} opts (Optional) 模板参数
		 * @return {String|Function}  如果调用时传了opts参数，则返回字符串；如果没传，则返回一个function（相当于把sTmpl转化成一个函数）
		 
		 * @example alert(tmpl("{$a} love {$b}.",{a:"I",b:"you"}));
		 * @example alert(tmpl("{js print('I')} love {$b}.",{b:"you"}));
		 */
		tmpl: (function() {
			/*
			sArrName 拼接字符串的变量名。
			*/
			var sArrName = "sArrCMX",
				sLeft = sArrName + '.push("';
			/*
				tag:模板标签,各属性含义：
				tagG: tag系列
				isBgn: 是开始类型的标签
				isEnd: 是结束类型的标签
				cond: 标签条件
				rlt: 标签结果
				sBgn: 开始字符串
				sEnd: 结束字符串
			*/
			var tags = {
				'js': {
					tagG: 'js',
					isBgn: 1,
					isEnd: 1,
					sBgn: '");',
					sEnd: ';' + sLeft
				},
				//任意js语句, 里面如果需要输出到模板，用print("aaa");
				'if': {
					tagG: 'if',
					isBgn: 1,
					rlt: 1,
					sBgn: '");if',
					sEnd: '{' + sLeft
				},
				//if语句，写法为{if($a>1)},需要自带括号
				'elseif': {
					tagG: 'if',
					cond: 1,
					rlt: 1,
					sBgn: '");} else if',
					sEnd: '{' + sLeft
				},
				//if语句，写法为{elseif($a>1)},需要自带括号
				'else': {
					tagG: 'if',
					cond: 1,
					rlt: 2,
					sEnd: '");}else{' + sLeft
				},
				//else语句，写法为{else}
				'/if': {
					tagG: 'if',
					isEnd: 1,
					sEnd: '");}' + sLeft
				},
				//endif语句，写法为{/if}
				'for': {
					tagG: 'for',
					isBgn: 1,
					rlt: 1,
					sBgn: '");for',
					sEnd: '{' + sLeft
				},
				//for语句，写法为{for(var i=0;i<1;i++)},需要自带括号
				'/for': {
					tagG: 'for',
					isEnd: 1,
					sEnd: '");}' + sLeft
				},
				//endfor语句，写法为{/for}
				'while': {
					tagG: 'while',
					isBgn: 1,
					rlt: 1,
					sBgn: '");while',
					sEnd: '{' + sLeft
				},
				//while语句,写法为{while(i-->0)},需要自带括号
				'/while': {
					tagG: 'while',
					isEnd: 1,
					sEnd: '");}' + sLeft
				} //endwhile语句, 写法为{/while}
			};

			return function(sTmpl, opts) {
				var N = -1,
					NStat = []; //语句堆栈;
				var ss = [
					[/\{strip\}([\s\S]*?)\{\/strip\}/g, function(a, b) {
						return b.replace(/[\r\n]\s*\}/g, " }").replace(/[\r\n]\s*/g, "");
					}],
					[/\\/g, '\\\\'],
					[/"/g, '\\"'],
					[/\r/g, '\\r'],
					[/\n/g, '\\n'], //为js作转码.
					[
						/\{[\s\S]*?\S\}/g, //js里使用}时，前面要加空格。
						function(a) {
							a = a.substr(1, a.length - 2);
							for (var i = 0; i < ss2.length; i++) {a = a.replace(ss2[i][0], ss2[i][1]); }
							var tagName = a;
							if (/^(.\w+)\W/.test(tagName)) {tagName = RegExp.$1; }
							var tag = tags[tagName];
							if (tag) {
								if (tag.isBgn) {
									var stat = NStat[++N] = {
										tagG: tag.tagG,
										rlt: tag.rlt
									};
								}
								if (tag.isEnd) {
									if (N < 0) {throw new Error("多余的结束标记" + a); }
									stat = NStat[N--];
									if (stat.tagG != tag.tagG) {throw new Error("标记不匹配：" + stat.tagG + "--" + tagName); }
								} else if (!tag.isBgn) {
									if (N < 0) {throw new Error("多余的标记" + a); }
									stat = NStat[N];
									if (stat.tagG != tag.tagG) {throw new Error("标记不匹配：" + stat.tagG + "--" + tagName); }
									if (tag.cond && !(tag.cond & stat.rlt)) {throw new Error("标记使用时机不对：" + tagName); }
									stat.rlt = tag.rlt;
								}
								return (tag.sBgn || '') + a.substr(tagName.length) + (tag.sEnd || '');
							} else {
								return '",(' + a + '),"';
							}
						}
					]
				];
				var ss2 = [
					[/\\n/g, '\n'],
					[/\\r/g, '\r'],
					[/\\"/g, '"'],
					[/\\\\/g, '\\'],
					[/\$(\w+)/g, 'opts["$1"]'],
					[/print\(/g, sArrName + '.push(']
				];
				for (var i = 0; i < ss.length; i++) {
					sTmpl = sTmpl.replace(ss[i][0], ss[i][1]);
				}
				if (N >= 0) {throw new Error("存在未结束的标记：" + NStat[N].tagG); }
				sTmpl = 'var ' + sArrName + '=[];' + sLeft + sTmpl + '");return ' + sArrName + '.join("");';
				//alert('转化结果\n'+sTmpl);
				var fun = new Function('opts', sTmpl);
				if (arguments.length > 1) {return fun(opts); }
				return fun;
			};
		}()),

		/** 
		 * 判断一个字符串是否包含另一个字符串
		 * @method contains
		 * @static
		 * @param {String} s 字符串
		 * @param {String} opts 子字符串
		 * @return {String} 模板变量被替换后的字符串
		 * @example alert(contains("aaabbbccc","ab"))
		 */
		contains: function(s, subStr) {
			return s.indexOf(subStr) > -1;
		},

		/** 
		 * 全角字符转半角字符
		 全角空格为12288，转化成" "；
		 全角句号为12290，转化成"."；
		 其他字符半角(33-126)与全角(65281-65374)的对应关系是：均相差65248 
		 * @method dbc2sbc
		 * @static
		 * @param {String} s 需要处理的字符串
		 * @return {String}  返回转化后的字符串
		 * @example 
		 var s="发票号是ＢＢＣ１２３４５６，发票金额是１２.３５元";
		 alert(dbc2sbc(s));
		 */
		dbc2sbc: function(s) {
			return StringH.mulReplace(s, [
				[/[\uff01-\uff5e]/g, function(a) {
					return String.fromCharCode(a.charCodeAt(0) - 65248);
				}],
				[/\u3000/g, ' '],
				[/\u3002/g, '.']
			]);
		},

		/** 
		 * 得到字节长度
		 * @method byteLen
		 * @static
		 * @param {String} s 字符串
		 * @return {number}  返回字节长度
		 */
		byteLen: function(s) {
			return s.replace(/[^\x00-\xff]/g, "--").length;
		},

		/** 
		 * 得到指定字节长度的子字符串
		 * @method subByte
		 * @static
		 * @param {String} s 字符串
		 * @param {number} len 字节长度
		 * @param {string} tail (Optional) 结尾字符串
		 * @return {string}  返回指定字节长度的子字符串
		 */
		subByte: function(s, len, tail) {
			if (StringH.byteLen(s) <= len) {return s; }
			tail = tail || '';
			len -= StringH.byteLen(tail);
			return s.substr(0, len).replace(/([^\x00-\xff])/g, "$1 ") //双字节字符替换成两个
				.substr(0, len) //截取长度
				.replace(/[^\x00-\xff]$/, "") //去掉临界双字节字符
				.replace(/([^\x00-\xff]) /g, "$1") + tail; //还原
		},

		/** 
		 * 驼峰化字符串。将“ab-cd”转化为“abCd”
		 * @method camelize
		 * @static
		 * @param {String} s 字符串
		 * @return {String}  返回转化后的字符串
		 */
		camelize: function(s) {
			return s.replace(/\-(\w)/ig, function(a, b) {
				return b.toUpperCase();
			});
		},

		/** 
		 * 反驼峰化字符串。将“abCd”转化为“ab-cd”。
		 * @method decamelize
		 * @static
		 * @param {String} s 字符串
		 * @return {String} 返回转化后的字符串
		 */
		decamelize: function(s) {
			return s.replace(/[A-Z]/g, function(a) {
				return "-" + a.toLowerCase();
			});
		},

		/** 
		 * 字符串为javascript转码
		 * @method encode4Js
		 * @static
		 * @param {String} s 字符串
		 * @return {String} 返回转化后的字符串
		 * @example 
		 var s="my name is \"JK\",\nnot 'Jack'.";
		 window.setTimeout("alert('"+encode4Js(s)+"')",10);
		 */
		encode4Js: function(s) {
			return StringH.mulReplace(s, [
				[/\\/g, "\\u005C"],
				[/"/g, "\\u0022"],
				[/'/g, "\\u0027"],
				[/\//g, "\\u002F"],
				[/\r/g, "\\u000A"],
				[/\n/g, "\\u000D"],
				[/\t/g, "\\u0009"]
			]);
		},

		/** 
		 * 为http的不可见字符、不安全字符、保留字符作转码
		 * @method encode4Http
		 * @static
		 * @param {String} s 字符串
		 * @return {String} 返回处理后的字符串
		 */
		encode4Http: function(s) {
			return s.replace(/[\u0000-\u0020\u0080-\u00ff\s"'#\/\|\\%<>\[\]\{\}\^~;\?\:@=&]/, function(a) {
				return encodeURIComponent(a);
			});
		},

		/** 
		 * 字符串为Html转码
		 * @method encode4Html
		 * @static
		 * @param {String} s 字符串
		 * @return {String} 返回处理后的字符串
		 * @example 
		 var s="<div>dd";
		 alert(encode4Html(s));
		 */
		encode4Html: function(s) {
			var el = document.createElement('pre'); //这里要用pre，用div有时会丢失换行，例如：'a\r\n\r\nb'
			var text = document.createTextNode(s);
			el.appendChild(text);
			return el.innerHTML;
		},

		/** 
		 * 字符串为Html的value值转码
		 * @method encode4HtmlValue
		 * @static
		 * @param {String} s 字符串
		 * @return {String} 返回处理后的字符串
		 * @example:
		 var s="<div>\"\'ddd";
		 alert("<input value='"+encode4HtmlValue(s)+"'>");
		 */
		encode4HtmlValue: function(s) {
			return StringH.encode4Html(s).replace(/"/g, "&quot;").replace(/'/g, "&#039;");
		},

		/** 
		 * 与encode4Html方法相反，进行反编译
		 * @method decode4Html
		 * @static
		 * @param {String} s 字符串
		 * @return {String} 返回处理后的字符串
		 */
		decode4Html: function(s) {
			var div = document.createElement('div');
			div.innerHTML = StringH.stripTags(s);
			return div.childNodes[0] ? div.childNodes[0].nodeValue || '' : '';
		},
		/** 
		 * 将所有tag标签消除，即去除<tag>，以及</tag>
		 * @method stripTags
		 * @static
		 * @param {String} s 字符串
		 * @return {String} 返回处理后的字符串
		 */
		stripTags: function(s) {
			return s.replace(/<[^>]*>/gi, '');
		},
		/** 
		 * eval某字符串。如果叫"eval"，在这里需要加引号，才能不影响YUI压缩。不过其它地方用了也会有问题，所以改名evalJs，
		 * @method evalJs
		 * @static
		 * @param {String} s 字符串
		 * @param {any} opts 运行时需要的参数。
		 * @return {any} 根据字符结果进行返回。
		 */
		evalJs: function(s, opts) { //如果用eval，在这里需要加引号，才能不影响YUI压缩。不过其它地方用了也会有问题，所以改成evalJs，
			return new Function("opts", s)(opts);
		},
		/** 
		 * eval某字符串，这个字符串是一个js表达式，并返回表达式运行的结果
		 * @method evalExp
		 * @static
		 * @param {String} s 字符串
		 * @param {any} opts eval时需要的参数。
		 * @return {any} 根据字符结果进行返回。
		 */
		evalExp: function(s, opts) {
			return new Function("opts", "return (" + s + ");")(opts);
		},
		/** 
		 * 解析url或search字符串。
		 * @method queryUrl
		 * @static
		 * @param {String} s url或search字符串
		 * @param {String} key (Optional) 参数名。
		 * @return {Json|String|Array|undefined} 如果key为空，则返回解析整个字符串得到的Json对象；否则返回参数值。有多个参数，或参数名带[]的，参数值为Array。
		 */
		queryUrl: function(url, key) {
			url = url.replace(/^[^?=]*\?/ig, '').split('#')[0];	//去除网址与hash信息
			var json = {};
			//考虑到key中可能有特殊符号如“[].”等，而[]却有是否被编码的可能，所以，牺牲效率以求严谨，就算传了key参数，也是全部解析url。
			url.replace(/(^|&)([^&=]+)=([^&]*)/g, function (a, b, key , value){
				key = decodeURIComponent(key);
				value = decodeURIComponent(value);
				if (!(key in json)) {
					json[key] = /\[\]$/.test(key) ? [value] : value; //如果参数名以[]结尾，则当作数组
				}
				else if (json[key] instanceof Array) {
					json[key].push(value);
				}
				else {
					json[key] = [json[key], value];
				}
			});
			return key ? json[key] : json;
		}
	};

	QW.StringH = StringH;

}());


//	document.write('<script type="text/javascript" src="' + srcPath + 'core/object.h.js"><\/script>');

/*
	Copyright (c) Baidu Youa Wed QWrap
	version: $version$ $release$ released
	author: 月影、JK
*/


/**
 * @class ObjectH 核心对象Object的静态扩展
 * @singleton
 * @namespace QW
 * @helper
 */

(function() {
	var encode4Js = QW.StringH.encode4Js;
	function getConstructorName(o) {
		return o != null && Object.prototype.toString.call(o).slice(8, -1);
	}
	var ObjectH = {

		/** 
		 * 判断一个变量是否是string值或String对象
		 * @method isString
		 * @static
		 * @param {any} obj 目标变量
		 * @returns {boolean} 
		 */
		isString: function(obj) {
			return getConstructorName(obj) == 'String';
		},

		/** 
		 * 判断一个变量是否是function对象
		 * @method isFunction
		 * @static
		 * @param {any} obj 目标变量
		 * @returns {boolean} 
		 */
		isFunction: function(obj) {
			return getConstructorName(obj) == 'Function';
		},

		/** 
		 * 判断一个变量是否是Array对象
		 * @method isArray
		 * @static
		 * @param {any} obj 目标变量
		 * @returns {boolean} 
		 */
		isArray: function(obj) {
			return getConstructorName(obj) == 'Array';
		},

		/** 
		 * 判断一个变量是否是typeof 'object'
		 * @method isObject
		 * @static
		 * @param {any} obj 目标变量
		 * @returns {boolean} 
		 */
		isObject: function(obj) {
			return obj !== null && typeof obj == 'object';
		},

		/** 
		 * 判断一个变量是否是Array泛型，即:有length属性并且该属性是数值的对象
		 * @method isArrayLike
		 * @static
		 * @param {any} obj 目标变量
		 * @returns {boolean} 
		 */
		isArrayLike: function(obj) {
			return !!obj && typeof obj == 'object' && obj.nodeType != 1 && typeof obj.length == 'number';
		},

		/** 
		 * 判断一个变量的constructor是否是Object。---通常可用于判断一个对象是否是{}或由new Object()产生的对象。
		 * @method isPlainObject
		 * @static
		 * @param {any} obj 目标变量
		 * @returns {boolean} 
		 */
		isPlainObject: function(obj) {
			return !!obj && obj.constructor === Object;
		},

		/** 
		 * 判断一个变量是否是Wrap对象
		 * @method isWrap
		 * @static
		 * @param {any} obj 目标变量
		 * @param {string} coreName (Optional) core的属性名，默认为'core'
		 * @returns {boolean} 
		 */
		isWrap: function(obj, coreName) {
			return !!(obj && obj[coreName || 'core']);
		},

		/** 
		 * 判断一个变量是否是Html的Element元素
		 * @method isElement
		 * @static
		 * @param {any} obj 目标变量
		 * @returns {boolean} 
		 */
		isElement: function(obj) {
			return !!obj && obj.nodeType == 1;
		},

		/** 
		 * 为一个对象设置属性，支持以下三种调用方式:
		 set(obj, prop, value)
		 set(obj, propJson)
		 set(obj, props, values)
		 ---特别说明propName里带的点，会被当作属性的层次
		 * @method set
		 * @static
		 * @param {Object} obj 目标对象
		 * @param {string|Json|Array|setter} prop 如果是string,则当属性名(属性名可以是属性链字符串,如"style.display")；如果是function，则当setter函数；如果是Json，则当prop/value对；如果是数组，则当prop数组，第二个参数对应的也是value数组
		 * @param {any | Array} value 属性值
		 * @returns {Object} obj 
		 * @example 
		 var el={style:{},firstChild:{}};
		 set(el,"id","aaaa");
		 set(el,{className:"cn1", 
		 "style.display":"block",
		 "style.width":"8px"
		 });
		 */
		set: function(obj, prop, value) {
			if (ObjectH.isArray(prop)) {
				//set(obj, props, values)
				for (var i = 0; i < prop.length; i++) {
					ObjectH.set(obj, prop[i], value[i]);
				}
			} else if (typeof prop == 'object') {
				//set(obj, propJson)
				for (i in prop) {
					ObjectH.set(obj, i, prop[i]);
				}
			} else if (typeof prop == 'function') { //getter
				var args = [].slice.call(arguments, 1);
				args[0] = obj;
				prop.apply(null, args);
			} else {
				//set(obj, prop, value);
				var keys = prop.split(".");
				i = 0;
				for (var obj2 = obj, len = keys.length - 1; i < len; i++) {
					obj2 = obj2[keys[i]];
				}
				obj2[keys[i]] = value;
			}
			return obj;
		},

		/** 
		 * 得到一个对象的相关属性，支持以下三种调用方式:
		 get(obj, prop) -> obj[prop]
		 get(obj, props) -> propValues
		 get(obj, propJson) -> propJson
		 * @method get
		 * @static
		 * @param {Object} obj 目标对象
		 * @param {string|Array|getter} prop 如果是string,则当属性名(属性名可以是属性链字符串,如"style.display")；如果是function，则当getter函数；如果是array，则当获取的属性名序列；
		 如果是Array，则当props看待
		 * @param {boolean} nullSensitive 是否对属性链异常敏感。即，如果属性链中间为空，是否抛出异常
		 * @returns {any|Array} 返回属性值
		 * @example 
		 get(obj,"style"); //返回obj["style"];
		 get(obj,"style.color"); //返回 obj.style.color;
		 get(obj,"styleee.color"); //返回 undefined;
		 get(obj,"styleee.color",true); //抛空指针异常，因为obj.styleee.color链条中的obj.styleee为空;
		 get(obj,["id","style.color"]); //返回 [obj.id, obj.style.color];
		 */
		get: function(obj, prop, nullSensitive) {
			if (ObjectH.isArray(prop)) { //get(obj, props)
				var ret = [],
					i;
				for (i = 0; i < prop.length; i++) {
					ret[i] = ObjectH.get(obj, prop[i], nullSensitive);
				}
			} else if (typeof prop == 'function') { //getter
				var args = [].slice.call(arguments, 1);
				args[0] = obj;
				return prop.apply(null, args);
			} else { //get(obj, prop)
				var keys = prop.split(".");
				ret = obj;
				for (i = 0; i < keys.length; i++) {
					if (!nullSensitive && ret == null) {return; }
					ret = ret[keys[i]];
				}
			}
			return ret;
		},

		/** 
		 * 将源对象的属性并入到目标对象
		 * @method mix
		 * @static
		 * @param {Object} des 目标对象
		 * @param {Object|Array} src 源对象，如果是数组，则依次并入
		 * @param {boolean} override (Optional) 是否覆盖已有属性
		 * @returns {Object} des
		 */
		mix: function(des, src, override) {
			if (ObjectH.isArray(src)) {
				for (var i = 0, len = src.length; i < len; i++) {
					ObjectH.mix(des, src[i], override);
				}
				return des;
			}
			for (i in src) {
				if (override || !(des[i] || (i in des))) {
					des[i] = src[i];
				}
			}
			return des;
		},

		/**
		 * <p>输出一个对象里面的内容</p>
		 * <p><strong>如果属性被"."分隔，会取出深层次的属性</strong>，例如:</p>
		 * <p>ObjectH.dump(o, "aa"); //得到 {"aa": o.aa}</p>
		 * @method dump
		 * @static
		 * @param {Object} obj 被操作的对象
		 * @param {Array} props 包含要被复制的属性名称的数组
		 * @return {Object} 包含被dump出的属性的对象 
		 */
		dump: function(obj, props) {
			var ret = {};
			for (var i = 0, len = props.length; i < len; i++) {
				if (i in props) {
					var key = props[i];
					ret[key] = obj[key];
				}
			}
			return ret;
		},
		/**
		 * 在对象中的每个属性项上运行一个函数，并将函数返回值作为属性的值。
		 * @method map
		 * @static
		 * @param {Object} obj 被操作的对象
		 * @param {function} fn 迭代计算每个属性的算子，该算子迭代中有三个参数value-属性值，key-属性名，obj，当前对象
		 * @param {Object} thisObj (Optional)迭代计算时的this
		 * @return {Object} 返回包含这个对象中所有属性计算结果的对象
		 */
		map: function(obj, fn, thisObj) {
			var ret = {};
			for (var key in obj) {
				ret[key] = fn.call(thisObj, obj[key], key, obj);
			}
			return ret;
		},
		/**
		 * 得到一个对象中所有可以被枚举出的属性的列表
		 * @method keys
		 * @static
		 * @param {Object} obj 被操作的对象
		 * @return {Array} 返回包含这个对象中所有属性的数组
		 */
		keys: function(obj) {
			var ret = [];
			for (var key in obj) {
				if (obj.hasOwnProperty(key)) {
					ret.push(key);
				}
			}
			return ret;
		},

		/**
		 * 以keys/values数组的方式添加属性到一个对象<br/>
		 * <strong>如果values的长度大于keys的长度，多余的元素将被忽略</strong>
		 * @method fromArray
		 * @static
		 * @param {Object} obj 被操作的对象
		 * @param {Array} keys 存放key的数组
		 * @param {Array} values 存放value的数组
		 * @return {Object} 返回添加了属性的对象
		 */
		fromArray: function(obj, keys, values) {
			values = values || [];
			for (var i = 0, len = keys.length; i < len; i++) {
				obj[keys[i]] = values[i];
			}
			return obj;
		},

		/**
		 * 得到一个对象中所有可以被枚举出的属性值的列表
		 * @method values
		 * @static
		 * @param {Object} obj 被操作的对象
		 * @return {Array} 返回包含这个对象中所有属性值的数组
		 */
		values: function(obj) {
			var ret = [];
			for (var key in obj) {
				if (obj.hasOwnProperty(key)) {
					ret.push(obj[key]);
				}
			}
			return ret;
		},
		/**
		 * 以某对象为原型创建一个新的对象 （by Ben Newman）
		 * @method create
		 * @static 
		 * @param {Object} proto 作为原型的对象
		 * @param {Object} props (Optional) 附加属性
		 */
		create: function(proto, props) {
			var ctor = function(ps) {
				if (ps) {
					ObjectH.mix(this, ps, true);
				}
			};
			ctor.prototype = proto;
			return new ctor(props);
		},
		/** 
		 * 序列化一个对象(只序列化String,Number,Boolean,Date,Array,Json对象和有toJSON方法的对象,其它的对象都会被序列化成null)
		 * @method stringify
		 * @static
		 * @param {Object} obj 需要序列化的Json、Array对象或其它对象
		 * @returns {String} : 返回序列化结果
		 * @example 
		 var card={cardNo:"bbbb1234",history:[{date:"2008-09-16",count:120.0,isOut:true},1]};
		 alert(stringify(card));
		 */
		stringify: function(obj) {
			if (obj == null) {return null; }
			if (obj.toJSON) {
				obj = obj.toJSON();
			}
			var type = typeof obj;
			switch (type) {
			case 'string':
				return '"' + encode4Js(obj) + '"';
			case 'number':
			case 'boolean':
				return obj.toString();
			case 'object':
				if (obj instanceof Date) {return 'new Date(' + obj.getTime() + ')'; }
				if (obj instanceof Array) {
					var ar = [];
					for (var i = 0; i < obj.length; i++) {ar[i] = ObjectH.stringify(obj[i]); }
					return '[' + ar.join(',') + ']';
				}
				if (ObjectH.isPlainObject(obj)) {
					ar = [];
					for (i in obj) {
						ar.push('"' + encode4Js(i) + '":' + ObjectH.stringify(obj[i]));
					}
					return '{' + ar.join(',') + '}';
				}
			}
			return null; //无法序列化的，返回null;
		},

		/** 
		 * encodeURI一个Json对象
		 * @method encodeURIJson
		 * @static
		 * @param {Json} json  Json数据，只有一层json，每一键对应的值可以是字符串或字符串数组
		 * @returns {string} : 返回被encodeURI结果。
		 */
		encodeURIJson: function(json){
			var s = [];
			for( var p in json ){
				if(json[p]==null) continue;
				if(json[p] instanceof Array)
				{
					for (var i=0;i<json[p].length;i++) s.push( encodeURIComponent(p) + '=' + encodeURIComponent(json[p][i]));
				}
				else
					s.push( encodeURIComponent(p) + '=' + encodeURIComponent(json[p]));
			}
			return s.join('&');
		}

	};

	QW.ObjectH = ObjectH;
}());


//	document.write('<script type="text/javascript" src="' + srcPath + 'core/array.h.js"><\/script>');

/*
	Copyright (c) Baidu Youa Wed QWrap
	version: $version$ $release$ released
	author: JK
*/

/**
 * @class ArrayH 核心对象Array的扩展
 * @singleton 
 * @namespace QW
 * @helper
 */
(function() {

	var ArrayH = {
		/** 
		 * 在数组中的每个项上运行一个函数，并将全部结果作为数组返回。
		 * @method map
		 * @static
		 * @param {Array} arr 待处理的数组.
		 * @param {Function} callback 需要执行的函数.
		 * @param {Object} pThis (Optional) 指定callback的this对象.
		 * @return {Array} 返回满足过滤条件的元素组成的新数组 
		 * @example 
		 var arr=["aa","ab","bc"];
		 var arr2=map(arr,function(a,b){return a.substr(0,1)=="a"});
		 alert(arr2);
		 */
		map: function(arr, callback, pThis) {
			var len = arr.length;
			var rlt = new Array(len);
			for (var i = 0; i < len; i++) {
				if (i in arr) {
					rlt[i] = callback.call(pThis, arr[i], i, arr);
				}
			}
			return rlt;
		},

		/** 
		 * 对Array的每一个元素运行一个函数。
		 * @method forEach
		 * @static
		 * @param {Array} arr 待处理的数组.
		 * @param {Function} callback 需要执行的函数.
		 * @param {Object} pThis (Optional) 指定callback的this对象.
		 * @return {void}  
		 * @example 
		 var arr=["a","b","c"];
		 var dblArr=[];
		 forEach(arr,function(a,b){dblArr.push(b+":"+a+a);});
		 alert(dblArr);
		 */
		forEach: function(arr, callback, pThis) {
			for (var i = 0, len = arr.length; i < len; i++) {
				if (i in arr) {
					callback.call(pThis, arr[i], i, arr);
				}
			}
		},

		/** 
		 * 在数组中的每个项上运行一个函数，并将函数返回真值的项作为数组返回。
		 * @method filter
		 * @static
		 * @param {Array} arr 待处理的数组.
		 * @param {Function} callback 需要执行的函数.
		 * @param {Object} pThis (Optional) 指定callback的this对象.
		 * @return {Array} 返回满足过滤条件的元素组成的新数组 
		 * @example 
		 var arr=["aa","ab","bc"];
		 var arr2=filter(arr,function(a,b){return a.substr(0,1)=="a"});
		 alert(arr2);
		 */
		filter: function(arr, callback, pThis) {
			var rlt = [];
			for (var i = 0, len = arr.length; i < len; i++) {
				if ((i in arr) && callback.call(pThis, arr[i], i, arr)) {
					rlt.push(arr[i]);
				}
			}
			return rlt;
		},

		/** 
		 * 判断数组中是否有元素满足条件。
		 * @method some
		 * @static
		 * @param {Array} arr 待处理的数组.
		 * @param {Function} callback 需要执行的函数.
		 * @param {Object} pThis (Optional) 指定callback的this对象.
		 * @return {boolean} 如果存在元素满足条件，则返回true. 
		 * @example 
		 var arr=["aa","ab","bc"];
		 var arr2=filter(arr,function(a,b){return a.substr(0,1)=="a"});
		 alert(arr2);
		 */
		some: function(arr, callback, pThis) {
			for (var i = 0, len = arr.length; i < len; i++) {
				if (i in arr && callback.call(pThis, arr[i], i, arr)) {
					return true;
				}
			}
			return false;
		},

		/** 
		 * 判断数组中所有元素都满足条件。
		 * @method every
		 * @static
		 * @param {Array} arr 待处理的数组.
		 * @param {Function} callback 需要执行的函数.
		 * @param {Object} pThis (Optional) 指定callback的this对象.
		 * @return {boolean} 所有元素满足条件，则返回true. 
		 * @example 
		 var arr=["aa","ab","bc"];
		 var arr2=filter(arr,function(a,b){return a.substr(0,1)=="a"});
		 alert(arr2);
		 */
		every: function(arr, callback, pThis) {
			for (var i = 0, len = arr.length; i < len; i++) {
				if (i in arr && !callback.call(pThis, arr[i], i, arr)) {
					return false;
				}
			}
			return true;
		},

		/** 
		 * 返回一个元素在数组中的位置（从前往后找）。如果数组里没有该元素，则返回-1
		 * @method indexOf
		 * @static
		 * @param {Array} arr 待处理的数组.
		 * @param {Object} obj 元素，可以是任何类型
		 * @param {int} fromIdx (Optional) 从哪个位置开始找起，如果为负，则表示从length+startIdx开始找
		 * @return {int} 则返回该元素在数组中的位置.
		 * @example 
		 var arr=["a","b","c"];
		 alert(indexOf(arr,"c"));
		 */
		indexOf: function(arr, obj, fromIdx) {
			var len = arr.length;
			fromIdx |= 0; //取整
			if (fromIdx < 0) {
				fromIdx += len;
			}
			if (fromIdx < 0) {
				fromIdx = 0;
			}
			for (; fromIdx < len; fromIdx++) {
				if (fromIdx in arr && arr[fromIdx] === obj) {
					return fromIdx;
				}
			}
			return -1;
		},

		/** 
		 * 返回一个元素在数组中的位置（从后往前找）。如果数组里没有该元素，则返回-1
		 * @method lastIndexOf
		 * @static
		 * @param {Array} arr 待处理的数组.
		 * @param {Object} obj 元素，可以是任何类型
		 * @param {int} fromIdx (Optional) 从哪个位置开始找起，如果为负，则表示从length+startIdx开始找
		 * @return {int} 则返回该元素在数组中的位置.
		 * @example 
		 var arr=["a","b","a"];
		 alert(lastIndexOf(arr,"a"));
		 */
		lastIndexOf: function(arr, obj, fromIdx) {
			var len = arr.length;
			fromIdx |= 0; //取整
			if (!fromIdx || fromIdx >= len) {
				fromIdx = len - 1;
			}
			if (fromIdx < 0) {
				fromIdx += len;
			}
			for (; fromIdx > -1; fromIdx--) {
				if (fromIdx in arr && arr[fromIdx] === obj) {
					return fromIdx;
				}
			}
			return -1;
		},

		/** 
		 * 判断数组是否包含某元素
		 * @method contains
		 * @static
		 * @param {Array} arr 待处理的数组.
		 * @param {Object} obj 元素，可以是任何类型
		 * @return {boolean} 如果元素存在于数组，则返回true，否则返回false
		 * @example 
		 var arr=["a","b","c"];
		 alert(contains(arr,"c"));
		 */
		contains: function(arr, obj) {
			return (ArrayH.indexOf(arr, obj) >= 0);
		},

		/** 
		 * 清空一个数组
		 * @method clear
		 * @static
		 * @param {Array} arr 待处理的数组.
		 * @return {void} 
		 */
		clear: function(arr) {
			arr.length = 0;
		},

		/** 
		 * 将数组里的某(些)元素移除。
		 * @method remove
		 * @static
		 * @param {Array} arr 待处理的数组.
		 * @param {Object} obj0 待移除元素
		 * @param {Object} obj1 … 待移除元素
		 * @return {number} 返回第一次被移除的位置。如果没有任何元素被移除，则返回-1.
		 * @example 
		 var arr=["a","b","c"];
		 remove(arr,"a","c");
		 alert(arr);
		 */
		remove: function(arr, obj) {
			var idx = -1;
			for (var i = 1; i < arguments.length; i++) {
				var oI = arguments[i];
				for (var j = 0; j < arr.length; j++) {
					if (oI === arr[j]) {
						if (idx < 0) {
							idx = j;
						}
						arr.splice(j--, 1);
					}
				}
			}
			return idx;
		},

		/** 
		 * 数组元素除重，得到新数据
		 * @method unique
		 * @static
		 * @param {Array} arr 待处理的数组.
		 * @return {void} 数组元素除重，得到新数据
		 * @example 
		 var arr=["a","b","a"];
		 alert(unique(arr));
		 */
		unique: function(arr) {
			var rlt = [],
				oI = null,
				indexOf = Array.indexOf || ArrayH.indexOf;
			for (var i = 0, len = arr.length; i < len; i++) {
				if (indexOf(rlt, oI = arr[i]) < 0) {
					rlt.push(oI);
				}
			}
			return rlt;
		},

		/** 
		 * 为数组元素进行递推操作。
		 * @method reduce
		 * @static
		 * @param {Array} arr 待处理的数组.
		 * @param {Function} callback 需要执行的函数。
		 * @param {any} initial (Optional) 初始值，如果没有这初始，则从第一个有效元素开始。没有初始值，并且没有有效元素，会抛异常
		 * @return {any} 返回递推结果. 
		 * @example 
		 var arr=[1,2,3];
		 alert(reduce(arr,function(a,b){return Math.max(a,b);}));
		 */
		reduce: function(arr, callback, initial) {
			var len = arr.length;
			var i = 0;
			if (arguments.length < 3) { //找到第一个有效元素当作初始值
				var hasV = 0;
				for (; i < len; i++) {
					if (i in arr) {
						initial = arr[i++];
						hasV = 1;
						break;
					}
				}
				if (!hasV) {throw new Error("No component to reduce"); }
			}
			for (; i < len; i++) {
				if (i in arr) {
					initial = callback(initial, arr[i], i, arr);
				}
			}
			return initial;
		},

		/** 
		 * 为数组元素进行逆向递推操作。
		 * @method reduceRight
		 * @static
		 * @param {Array} arr 待处理的数组.
		 * @param {Function} callback 需要执行的函数。
		 * @param {any} initial (Optional) 初始值，如果没有这初始，则从第一个有效元素开始。没有初始值，并且没有有效元素，会抛异常
		 * @return {any} 返回递推结果. 
		 * @example 
		 var arr=[1,2,3];
		 alert(reduceRight(arr,function(a,b){return Math.max(a,b);}));
		 */
		reduceRight: function(arr, callback, initial) {
			var len = arr.length;
			var i = len - 1;
			if (arguments.length < 3) { //逆向找到第一个有效元素当作初始值
				var hasV = 0;
				for (; i > -1; i--) {
					if (i in arr) {
						initial = arr[i--];
						hasV = 1;
						break;
					}
				}
				if (!hasV) {
					throw new Error("No component to reduceRight");
				}
			}
			for (; i > -1; i--) {
				if (i in arr) {
					initial = callback(initial, arr[i], i, arr);
				}
			}
			return initial;
		},

		/**
		 * 将一个数组扁平化
		 * @method expand
		 * @static
		 * @param arr {Array} 要扁平化的数组
		 * @return {Array} 扁平化后的数组
		 */
		expand: function(arr) {
			return [].concat.apply([], arr);
		},

		/** 
		 * 将一个泛Array转化成一个Array对象。
		 * @method toArray
		 * @static
		 * @param {Array} arr 待处理的Array的泛型对象.
		 * @return {Array}  
		 */
		toArray: function(arr) {
			var ret = [];
			for (var i = 0; i < arr.length; i++) {
				ret[i] = arr[i];
			}
			return ret;
		},


		/** 
		 * 对数组进行包装。
		 * @method wrap
		 * @static
		 * @param {Array} arr 待处理的数组.
		 * @param {Class} constructor 构造器
		 * @returns {Object}: 返回new constructor(arr)
		 */
		wrap: function(arr, constructor) {
			return new constructor(arr);
		}
	};

	QW.ArrayH = ArrayH;

}());


//	document.write('<script type="text/javascript" src="' + srcPath + 'core/hashset.h.js"><\/script>');

/*
	Copyright (c) Baidu Youa Wed QWrap
	version: $version$ $release$ released
	author: 月影
*/


/**
 * @class HashsetH HashsetH是对不含有重复元素的数组进行操作的Helper
 * @singleton 
 * @namespace QW
 * @helper 
 */

(function() {
	var contains = QW.ArrayH.contains;

	var HashsetH = {
		/** 
		 * 合并两个已经uniquelize过的数组，相当于两个数组concat起来，再uniquelize，不过效率更高
		 * @method union
		 * @static
		 * @param {Array} arr 待处理的数组.
		 * @param {Array} arr2 待处理的数组.
		 * @return {Array} 返回一个新数组
		 * @example 
		 var arr=["a","b"];
		 var arr2=["b","c"];
		 alert(union(arr,arr2));
		 */
		union: function(arr, arr2) {
			var ra = [];
			for (var i = 0, len = arr2.length; i < len; i++) {
				if (!contains(arr, arr2[i])) {
					ra.push(arr2[i]);
				}
			}
			return arr.concat(ra);
		},
		/** 
		 * 求两个已经uniquelize过的数组的交集
		 * @method intersect
		 * @static
		 * @param {Array} arr 待处理的数组.
		 * @param {Array} arr2 待处理的数组.
		 * @return {Array} 返回一个新数组
		 * @example 
		 var arr=["a","b"];
		 var arr2=["b","c"];
		 alert(intersect(arr,arr2));
		 */
		intersect: function(arr, arr2) {
			var ra = [];
			for (var i = 0, len = arr2.length; i < len; i++) {
				if (contains(arr, arr2[i])) {
					ra.push(arr2[i]);
				}
			}
			return ra;
		},
		/** 
		 * 求两个已经uniquelize过的数组的差集
		 * @method minus
		 * @static
		 * @param {Array} arr 待处理的数组.
		 * @param {Array} arr2 待处理的数组.
		 * @return {Array} 返回一个新数组
		 * @example 
		 var arr=["a","b"];
		 var arr2=["b","c"];
		 alert(minus(arr,arr2));
		 */
		minus: function(arr, arr2) {
			var ra = [];
			for (var i = 0, len = arr2.length; i < len; i++) {
				if (!contains(arr, arr2[i])) {
					ra.push(arr2[i]);
				}
			}
			return ra;
		},
		/** 
		 * 求两个已经uniquelize过的数组的补集
		 * @method complement
		 * @static
		 * @param {Array} arr 待处理的数组.
		 * @param {Array} arr2 待处理的数组.
		 * @return {Array} 返回一个新数组
		 * @example 
		 var arr=["a","b"];
		 var arr2=["b","c"];
		 alert(complement(arr,arr2));
		 */
		complement: function(arr, arr2) {
			return HashsetH.minus(arr, arr2).concat(HashsetH.minus(arr2, arr));
		}
	};

	QW.HashsetH = HashsetH;

}());


//	document.write('<script type="text/javascript" src="' + srcPath + 'core/date.h.js"><\/script>');

/*
	Copyright (c) Baidu Youa Wed QWrap
	version: $version$ $release$ released
	author: JK
*/

/**
 * @class DateH 核心对象Date的扩展
 * @singleton 
 * @namespace QW
 * @helper
 */

(function() {

	var DateH = {
		/** 
		 * 格式化日期
		 * @method format
		 * @static
		 * @param {Date} d 日期对象
		 * @param {string} pattern 日期格式(y年M月d天h时m分s秒)，默认为"yyyy-MM-dd"
		 * @return {string}  返回format后的字符串
		 * @example
		 var d=new Date();
		 alert(format(d," yyyy年M月d日\n yyyy-MM-dd\n MM-dd-yy\n yyyy-MM-dd hh:mm:ss"));
		 */
		format: function(d, pattern) {
			pattern = pattern || 'yyyy-MM-dd';
			var y = d.getFullYear().toString(),
				o = {
					M: d.getMonth() + 1, //month
					d: d.getDate(), //day
					h: d.getHours(), //hour
					m: d.getMinutes(), //minute
					s: d.getSeconds() //second
				};
			pattern = pattern.replace(/(y+)/ig, function(a, b) {
				return y.substr(4 - Math.min(4, b.length));
			});
			for (var i in o) {
				pattern = pattern.replace(new RegExp('(' + i + '+)', 'g'), function(a, b) {
					return (o[i] < 10 && b.length > 1) ? '0' + o[i] : o[i];
				});
			}
			return pattern;
		}
	};

	QW.DateH = DateH;

}());


//	document.write('<script type="text/javascript" src="' + srcPath + 'core/function.h.js"><\/script>');

/*
	Copyright (c) Baidu Youa Wed QWrap
	version: $version$ $release$ released
	author: 月影、JK
*/

/**
 * @class FunctionH 核心对象Function的扩展
 * @singleton 
 * @namespace QW
 * @helper
 */
(function() {

	var FunctionH = {
		/**
		 * 函数包装器 methodize，对函数进行methodize化，使其的第一个参数为this，或this[attr]。
		 * @method methodize
		 * @static
		 * @param {function} func要方法化的函数
		 * @param {string} attr (Optional) 属性
		 * @return {function} 已方法化的函数
		 */
		methodize: function(func, attr) {
			if (attr) {
				return function() {
					return func.apply(null, [this[attr]].concat([].slice.call(arguments)));
				};
			}
			return function() {
				return func.apply(null, [this].concat([].slice.call(arguments)));
			};
		},
		/** 对函数进行集化，使其第一个参数可以是数组
		 * @method mul
		 * @static
		 * @param {function} func
		 * @param {bite} opt 操作配置项，缺省表示默认，
		 1 表示getFirst将只操作第一个元素，
		 2 表示joinLists，如果第一个参数是数组，将操作的结果扁平化返回
		 * @return {Object} 已集化的函数
		 */
		mul: function(func, opt) {
			var getFirst = opt == 1,
				joinLists = opt == 2;

			if (getFirst) {
				return function() {
					var list = arguments[0];
					if (!(list instanceof Array)) {
						return func.apply(this, arguments);
					}
					if (list.length) {
						var args = [].slice.call(arguments, 0);
						args[0] = list[0];
						return func.apply(this, args);
					}
				};
			}

			return function() {
				var list = arguments[0];
				if (list instanceof Array) {
					var moreArgs = [].slice.call(arguments, 0),
						ret = [],
						i = 0,
						len = list.length,
						r;
					for (; i < len; i++) {
						moreArgs[0] = list[i];
						r = func.apply(this, moreArgs);
						if (joinLists) {
							if (r != null) {
								ret = ret.concat(r);
							}
						} else {
							ret.push(r);
						}
					}
					return ret;
				} else {
					return func.apply(this, arguments);
				}
			};
		},
		/**
		 * 函数包装变换
		 * @method rwrap
		 * @static
		 * @param {func} 
		 * @return {Function}
		 */
		rwrap: function(func, wrapper, idx) {
			idx |= 0;
			return function() {
				var ret = func.apply(this, arguments);
				if (idx >= 0) {
					ret = arguments[idx];
				}
				return wrapper ? new wrapper(ret) : ret;
			};
		},
		/**
		 * 绑定
		 * @method bind
		 * @via https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function/bind
		 * @compatibile ECMA-262, 5th (JavaScript 1.8.5)
		 * @static
		 * @param {func} 要绑定的函数
		 * @obj {object} this_obj
		 * @param {any} arg1 (Optional) 预先确定的参数
		 * @param {any} arg2 (Optional) 预先确定的参数
		 * @return {Function}
		 */
		bind: function(func, obj) {
			var slice = [].slice,
				args = slice.call(arguments, 2),
				nop = function() {},
				bound = function() {
					return func.apply(this instanceof nop ? this : (obj || {}), args.concat(slice.call(arguments)));
				};

			nop.prototype = func.prototype;

			bound.prototype = new nop();

			return bound;
		},
		/**
		 * 懒惰执行某函数：一直到不得不执行的时候才执行。
		 * @method lazyApply
		 * @static
		 * @param {Function} fun  调用函数
		 * @param {Object} thisObj  相当于apply方法的thisObj参数
		 * @param {Array} argArray  相当于apply方法的argArray参数
		 * @param {int} ims  interval毫秒数，即window.setInterval的第二个参数.
		 * @param {Function} checker  定期运行的判断函数。<br/>
			对于不同的返回值，得到不同的结果：<br/>
				返回true或1，表示需要立即执行<br/>
				返回-1，表示成功偷懒，不用再执行<br/>
				返回其它值，表示暂时不执行<br/>
		 * @return {int}  返回interval的timerId
		 */
		lazyApply: function(fun, thisObj, argArray, ims, checker) {
			checker = checker || function() {return true; };
			var timer = function() {
					var verdict = checker();
					if (verdict == 1) {
						fun.apply(thisObj, argArray || []);
					}
					if (verdict == 1 || verdict == -1) {
						clearInterval(timerId);
					}
				},
				timerId = setInterval(timer, ims);
			return timerId;
		}
	};


	QW.FunctionH = FunctionH;

}());


//	document.write('<script type="text/javascript" src="' + srcPath + 'core/class.h.js"><\/script>');

/*
	Copyright (c) Baidu Youa Wed QWrap
	version: $version$ $release$ released
	author: 月影
*/

/**
 * @class ClassH 为function提供强化的原型继承能力
 * @singleton 
 * @namespace QW
 * @helper
 */
(function() {
	var mix = QW.ObjectH.mix,
		create = QW.ObjectH.create;

	var ClassH = {
		/**
		 * <p>为类型动态创建一个实例，它和直接new的区别在于instanceof的值</p>
		 * <p><strong>第二范式：new T <=> T.apply(T.getPrototypeObject())</strong></p>
		 * @method createInstance
		 * @static
		 * @prarm {function} cls 要构造对象的类型（构造器）
		 * @return {object} 这个类型的一个实例
		 */
		createInstance: function(cls) {
			var p = create(cls.prototype);
			cls.apply(p, [].slice.call(arguments, 1));
			return p;
		},

		/**
		 * 函数包装器 extend
		 * <p>改进的对象原型继承，延迟执行参数构造，并在子类的实例中添加了$super引用</p>
		 * @method extend
		 * @static
		 * @param {function} cls 产生子类的原始类型
		 * @param {function} p 父类型
		 * @return {function} 返回以自身为构造器继承了p的类型
		 * @throw {Error} 不能对继承返回的类型再使用extend
		 */
		extend: function(cls, p) {

			var T = function() {}; //构造prototype-chain
			T.prototype = p.prototype;

			var cp = cls.prototype;

			cls.prototype = new T();
			cls.$super = p; //在构造器内可以通过arguments.callee.$super执行父类构造

			//如果原始类型的prototype上有方法，先copy
			mix(cls.prototype, cp, true);

			return cls;
		}
	};

	QW.ClassH = ClassH;

}());


//	document.write('<script type="text/javascript" src="' + srcPath + 'core/helper.h.js"><\/script>');

/*
	Copyright (c) Baidu Youa Wed QWrap
	version: $version$ $release$ released
	author: 月影、JK
*/

/**
 * Helper管理器，核心模块中用来管理Helper的子模块
 * @module core
 * @beta
 * @submodule core_HelperH
 */

/**
 * @class HelperH
 * <p>一个Helper是指同时满足如下条件的一个对象：</p>
 * <ol><li>Helper是一个不带有可枚举proto属性的简单对象（这意味着你可以用for...in...枚举一个Helper中的所有属性和方法）</li>
 * <li>Helper可以拥有属性和方法，但Helper对方法的定义必须满足如下条件：</li>
 * <div> 1). Helper的方法必须是静态方法，即内部不能使用this。</div>
 * <div> 2). 同一个Helper中的方法的第一个参数必须是相同类型或相同泛型。</div>
 * <li> Helper类型的名字必须以Helper或大写字母H结尾。 </li>
 * <li> 对于只满足第一条的JSON，也算是泛Helper，通常以“U”（util）结尾。 </li>
 * <li> 本来Util和Helper应该是继承关系，但是JavaScript里我们把继承关系简化了。</li>
 * </ol>
 * @singleton
 * @namespace QW
 * @helper
 */

(function() {

	var FunctionH = QW.FunctionH,
		create = QW.ObjectH.create,
		Methodized = function() {};

	var HelperH = {
		/**
		 * 对于需要返回wrap对象的helper方法，进行结果包装
		 * @method rwrap
		 * @static
		 * @param {Helper} helper Helper对象
		 * @param {Class} wrapper 将返回值进行包装时的包装器(WrapClass)
		 * @param {Object} wrapConfig 需要返回Wrap对象的方法的配置
		 * @return {Object} 方法已rwrap化的<strong>新的</strong>Helper
		 */
		rwrap: function(helper, wrapper, wrapConfig) {
			var ret = create(helper);
			wrapConfig = wrapConfig || 'operator';

			for (var i in helper) {
				var wrapType = wrapConfig,
					fn = helper[i];
				if(fn instanceof Function){
					if (typeof wrapType != 'string') {
						wrapType = wrapConfig[i] || '';
					}
					if ('queryer' == wrapType) { //如果方法返回查询结果，对返回值进行包装
						ret[i] = FunctionH.rwrap(fn, wrapper, -1);
					} else if ('operator' == wrapType || 'methodized' == wrapType) { //如果方法只是执行一个操作
						if (helper instanceof Methodized || 'methodized' == wrapType) { //如果是methodized后的,对this直接返回
							ret[i] = (function(fn) {
								return function() {
									fn.apply(this, arguments);
									return this;
								};
							}(fn));
						} else {
							ret[i] = FunctionH.rwrap(fn, wrapper, 0); //否则对第一个参数进行包装，针对getter系列
						}
					}
				}else{
					ret[i] = fn;
				}
			}
			return ret;
		},
		/**
		 * 根据配置，产生gsetter新方法，它根椐参数的长短来决定调用getter还是setter
		 * @method gsetter
		 * @static
		 * @param {Helper} helper Helper对象
		 * @param {Object} gsetterConfig 需要返回Wrap对象的方法的配置
		 * @return {Object} 方法已gsetter化的<strong>新的</strong>helper
		 */
		gsetter: function(helper, gsetterConfig) {
			var ret = create(helper);
			gsetterConfig = gsetterConfig || {};

			for (var i in gsetterConfig) {
				if (helper instanceof Methodized) {
					ret[i] = (function(config) {
						return function() {
							return ret[config[Math.min(arguments.length, config.length - 1)]].apply(this, arguments);
						};
					}(gsetterConfig[i]));
				} else {
					ret[i] = (function(config) {
						return function() {
							return ret[config[Math.min(arguments.length, config.length) - 1]].apply(null, arguments);
						};
					}(gsetterConfig[i]));
				}
			}
			return ret;
		},

		/**
		 * 对helper的方法，进行mul化，使其可以处理第一个参数是数组的情况
		 * @method mul
		 * @static
		 * @param {Helper} helper Helper对象
		 * @param {json|string} mulConfig 如果某个方法的mulConfig类型和含义如下：
		 getter 或getter_first_all //同时生成get--(返回fist)、getAll--(返回all)
		 getter_first	//生成get--(返回first)
		 getter_all	//生成get--(返回all)
		 queryer		//生成get--(返回concat all结果)
		 * @return {Object} 方法已mul化的<strong>新的</strong>Helper
		 */
		mul: function(helper, mulConfig) {
			var ret = create(helper);
			mulConfig = mulConfig || {};

			for (var i in helper) {
				var fn = helper[i];
				if (fn instanceof Function) {
					var mulType = mulConfig;
					if (typeof mulType != 'string') {
						mulType = mulConfig[i] || '';
					}

					if ("getter" == mulType || "getter_first" == mulType || "getter_first_all" == mulType) {
						//如果是配置成gettter||getter_first||getter_first_all，那么需要用第一个参数
						ret[i] = FunctionH.mul(fn, 1);
					} else if ("getter_all" == mulType) {
						ret[i] = FunctionH.mul(fn, 0);
					} else {
						ret[i] = FunctionH.mul(fn, 2); //operator、queryer的话需要join返回值，把返回值join起来的说
					}
					if ("getter" == mulType || "getter_first_all" == mulType) {
						//如果配置成getter||getter_first_all，那么还会生成一个带All后缀的方法
						ret[i + "All"] = FunctionH.mul(fn, 0);
					}
				}else{
					ret[i] = fn;
				}
			}
			return ret;
		},
		/**
		 * 对helper的方法，进行methodize化，使其的第一个参数为this，或this[attr]。
		 * @method methodize
		 * @static
		 * @param {Helper} helper Helper对象，如DateH
		 * @param {optional} attr (Optional)属性
		 * @return {Object} 方法已methodize化的对象
		 */
		methodize: function(helper, attr) {
			var ret = new Methodized(); //因为 methodize 之后gsetter和rwrap的行为不一样  

			for (var i in helper) {
				var fn = helper[i];

				if (fn instanceof Function) {
					ret[i] = FunctionH.methodize(fn, attr);
				}else{
					ret[i] = fn;
				}
			}
			return ret;
		}

	};

	QW.HelperH = HelperH;
}());


//	document.write('<script type="text/javascript" src="' + srcPath + 'core/custevent.js"><\/script>');

/*
	Copyright (c) Baidu Youa Wed QWrap
	version: $version$ $release$ released
	author: JK
*/


(function() {
	var mix = QW.ObjectH.mix,
		indexOf = QW.ArrayH.indexOf;

	//----------QW.CustEvent----------
	/**
	 * @class CustEvent 自定义事件
	 * @namespace QW
	 * @param {object} target 事件所属对象，即：是哪个对象的事件。
	 * @param {string} type 事件类型。备用。
	 * @param {object} eventArgs (Optional) 自定义事件参数
	 * @returns {CustEvent} 自定义事件
	 */
	var CustEvent = function(target, type, eventArgs) {
		this.target = target;
		this.type = type;
		mix(this, eventArgs || {});
	};

	mix(CustEvent.prototype, {
		/**
		 * @property {Object} target CustEvent的target
		 */
		target: null,
		/**
		 * @property {Object} currentTarget CustEvent的currentTarget，即事件派发者
		 */
		currentTarget: null,
		/**
		 * @property {String} type CustEvent的类型
		 */
		type: null,
		/**
		 * @property {boolean} returnValue fire方法执行后的遗留产物。(建议规则:对于onbeforexxxx事件，如果returnValue===false，则不执行该事件)。
		 */
		returnValue: undefined,
		/**
		 * 设置event的返回值为false。
		 * @method preventDefault
		 * @returns {void} 无返回值
		 */
		preventDefault: function() {
			this.returnValue = false;
		}
	});
	/**
	 * 为一个对象添加一系列事件，并添加on/un/fire三个方法，参见：QW.CustEventTarget.createEvents
	 * @static
	 * @method createEvents
	 * @param {Object} obj 事件所属对象，即：是哪个对象的事件。
	 * @param {String|Array} types 事件名称。
	 * @returns {void} 无返回值
	 */


	/**
	 * @class CustEventTargetH  CustEventTarget的Helper
	 * @singleton 
	 * @namespace QW
	 */

	var CustEventTargetH = {
		/**
		 * 添加监控
		 * @method on 
		 * @param {string} sEvent 事件名称。
		 * @param {Function} fn 监控函数，在CustEvent fire时，this将会指向oScope，而第一个参数，将会是一个CustEvent对象。
		 * @return {boolean} 是否成功添加监控。例如：重复添加监控，会导致返回false.
		 * @throw {Error} 如果没有对事件进行初始化，则会抛错
		 */
		on: function(target, sEvent, fn) {
			var cbs = (target.__custListeners && target.__custListeners[sEvent]) || QW.error("unknown event type", TypeError);
			if (indexOf(cbs, fn) > -1) {
				return false;
			}
			cbs.push(fn);
			return true;
		},
		/**
		 * 取消监控
		 * @method un
		 * @param {string} sEvent 事件名称。
		 * @param {Function} fn 监控函数
		 * @return {boolean} 是否有效执行un.
		 * @throw {Error} 如果没有对事件进行初始化，则会抛错
		 */
		un: function(target, sEvent, fn) {
			var cbs = (target.__custListeners && target.__custListeners[sEvent]) || QW.error("unknown event type", TypeError);
			if (fn) {
				var idx = indexOf(cbs, fn);
				if (idx < 0) {
					return false;
				}
				cbs.splice(idx, 1);
			} else {
				cbs.length = 0;
			}
			return true;

		},
		/**
		 * 事件触发。触发事件时，在监控函数里，this将会指向oScope，而第一个参数，将会是一个CustEvent对象，与Dom3的listener的参数类似。<br/>
		 如果this.target['on'+this.type],则也会执行该方法,与HTMLElement的独占模式的事件(如el.onclick=function(){alert(1)})类似.<br/>
		 如果createEvents的事件类型中包含"*"，则所有事件最终也会落到on("*").
		 * @method fire 
		 * @param {string | sEvent} sEvent 自定义事件，或事件名称。 如果是事件名称，相当于传new CustEvent(this,sEvent,eventArgs).
		 * @param {object} eventArgs (Optional) 自定义事件参数
		 * @return {boolean} 以下两种情况返回false，其它情况下返回true.
		 1. 所有callback(包括独占模式的onxxx)执行完后，custEvent.returnValue===false
		 2. 所有callback(包括独占模式的onxxx)执行完后，custEvent.returnValue===undefined，并且独占模式的onxxx()的返回值为false.
		 */
		fire: function(target, sEvent, eventArgs) {
			if (sEvent instanceof CustEvent) {
				var custEvent = mix(sEvent, eventArgs);
				sEvent = sEvent.type;
			} else {
				custEvent = new CustEvent(target, sEvent, eventArgs);
			}

			var cbs = (target.__custListeners && target.__custListeners[sEvent]) || QW.error("unknown event type", TypeError);
			if (sEvent != "*") {
				cbs = cbs.concat(target.__custListeners["*"] || []);
			}

			custEvent.returnValue = undefined; //去掉本句，会导致静态CustEvent的returnValue向后污染
			custEvent.currentTarget = target;
			var obj = custEvent.currentTarget;
			if (obj && obj['on' + custEvent.type]) {
				var retDef = obj['on' + custEvent.type].call(obj, custEvent); //对于独占模式的返回值，会弱影响event.returnValue
			}

			for (var i = 0; i < cbs.length; i++) {
				cbs[i].call(obj, custEvent);
			}
			return custEvent.returnValue !== false || (retDef === false && custEvent.returnValue === undefined);
		},
		/**
		 * 为一个对象添加一系列事件，并添加on/un/fire三个方法<br/>
		 * 添加的事件中自动包含一个特殊的事件类型"*"，这个事件类型没有独占模式，所有事件均会落到on("*")事件对应的处理函数中
		 * @static
		 * @method createEvents
		 * @param {Object} obj 事件所属对象，即：是哪个对象的事件。
		 * @param {String|Array} types 事件名称。
		 * @returns {any} target
		 */
		createEvents: function(target, types) {
			types = types || [];
			if (typeof types == "string") {
				types = types.split(",");
			}
			var listeners = target.__custListeners;
			if (!listeners) {
				listeners = target.__custListeners = {};
			}
			for (var i = 0; i < types.length; i++) {
				listeners[types[i]] = listeners[types[i]] || []; //可以重复create，而不影响之前的listerners.
			}
			listeners['*'] = listeners["*"] || [];
			return target;
		}
	};

	/**
	 * @class CustEventTarget  自定义事件Target，有以下序列方法：createEvents、on、un、fire；参见CustEventTargetH
	 * @namespace QW
	 */

	var CustEventTarget = function() {
		this.__custListeners = {};
	};
	var methodized = QW.HelperH.methodize(CustEventTargetH); 
	mix(CustEventTarget.prototype, methodized);

	CustEvent.createEvents = function(target, types) {
		CustEventTargetH.createEvents(target, types); 
		return mix(target, methodized);//尊重对象本身的on。
	};

	/*
	 * 输出到QW
	 */
	QW.CustEvent = CustEvent;
	QW.CustEventTargetH = CustEventTargetH;
	QW.CustEventTarget = CustEventTarget;

}());


//	document.write('<script type="text/javascript" src="' + srcPath + 'core/core_retouch.js"><\/script>');

(function() {
	var methodize = QW.HelperH.methodize,
		mix = QW.ObjectH.mix;
	/**
	 * @class Object 扩展Object，用ObjectH来修饰Object，特别说明，未对Object.prototype作渲染，以保证Object.prototype的纯洁性
	 * @usehelper QW.ObjectH
	 */
	mix(Object, QW.ObjectH);

	/**
	 * @class Array 扩展Array，用ArrayH/HashsetH来修饰Array
	 * @usehelper QW.ArrayH,QW.HashsetH
	 */
	mix(QW.ArrayH, QW.HashsetH);
	mix(Array, QW.ArrayH);
	mix(Array.prototype, methodize(QW.ArrayH));

	/**
	 * @class Function 扩展Function，用FunctionH/ClassH来修饰Function
	 * @usehelper QW.FunctionH
	 */
	mix(QW.FunctionH, QW.ClassH);
	mix(Function, QW.FunctionH);
	//	mix(Function.prototype, methodize(QW.FunctionH));

	/**
	 * @class Date 扩展Date，用DateH来修饰Date
	 * @usehelper QW.DateH
	 */
	mix(Date, QW.DateH);
	mix(Date.prototype, methodize(QW.DateH));


	/**
	 * @class String 扩展String，用StringH来修饰String
	 * @usehelper QW.StringH
	 */
	mix(String, QW.StringH);
	mix(String.prototype, methodize(QW.StringH));
}());

