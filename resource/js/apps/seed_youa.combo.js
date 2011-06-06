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


//	document.write('<script type="text/javascript" src="' + srcPath + 'apps/youa_modules_config.js"><\/script>');

/*Lib Module*/
QW.ModuleH.addConfig({
	YouaCore: {
		url: '//apps/core_dom_youa_lazy.combo.js',
		loadedChecker:function(){
			return !!(QW.W);
		}
	},
	Ajax: {
		url: '//components/ajax/ajax.youa.js',
		requires: 'YouaCore'
	},
	Anim: {
		url: '//components/animation/anim.js',
		requires: 'YouaCore'
	},
	Cookie: {
		url: '//components/cache/cache.js',
		requires: 'YouaCore'
	},
	Storage: {
		url: '//components/cache/cache.js',
		requires: 'YouaCore'
	},
	Drag: {
		url: '//components/drag/drag.js',
		requires: 'YouaCore'
	},
	Editor: {
		url: '//components/editor/editor.js',
		requires: 'YouaCore,Panel'
	},
	Panel: {
		url: '//components/panel/panel.js',
		requires: 'YouaCore'
	},
	Suggest: {
		url: '//components/suggest/suggest.js',
		requires: 'YouaCore'
	},
	"Switch": {
		url: '//components/switch/switch.js',
		requires: 'YouaCore'
	},
	Tree: {
		url: '//components/tree/tree.js',
		requires: 'YouaCore'
	},
	Valid: {
		url: '//components/valid/valid.js',
		requires: 'YouaCore'
	}
}); 

/*Logic Module*/
QW.ModuleH.addConfig({
	"User": {
		url: '//global/userv3.js',
		requires: 'YouaCore',
		loadedChecker: function() {
			return !!window.topbar;
		}
	},
	ShopMap: {
		url: '//sp/map/shopmap.js',
		requires: 'YouaCore'
	}
});

