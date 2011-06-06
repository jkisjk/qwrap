/*
	Copyright (c) Baidu Youa Wed QWrap
	version: $version$ $release$ released
	author: JK
*/

/**
 * UnitTest 单元测试
 * @static 
 * @class UnitTest
 */

var UnitTest = (function() {
/*
 *TestU:一个辅助类
*/

	var TestU = (function() {
		var TestU = {};
		TestU.analyse = function(value) {
/*
	解析一个变量
	@param {String} value 变量名 
	@returns {Json} 返回分析结果，分析结果包括：
		{Object} value 返回其值
		{boolean} hasChildren 是否有children
		{String} type 数据类型，包括：null/undefined/number/string/boolean/object/function，另外多一个error
		{String} sConstructor 构造函数：null/undefined/number/string/boolean
				/Object/Array/String/Number...
				/Element/Event
		{String} summary 主要信息 
				对于Array，返回前三个对象的sConstructor,以及总长度
				对于Object，返回前三个对象的key,sConstructor,以及总长度
				对于Element，返回tagName#id.className,
				对于其它，返回toString的前50个字符(里面没有回车)
	*/
			try {
				var hasChildren = false,
					type,
					sConstructor = "缩主内部对象",
					summary;
				if (value === null) type = "null"; //ECMS里，typeof null返回object。
				else type = typeof value;
				switch (type) {
				case "null":
				case "undefined":
				case "number":
				case "string":
				case "boolean":
					sConstructor = type;
					summary = (value + "").substr(0, 50).replace(/\s+/g, " ");
					break;
				case "function":
				case "object":
					//得到sConstructor
					var constructor = value.constructor;
					var nodeType = value.nodeType + "";
					if (!constructor) { //例如，window.external，它没有counstructor属性
						if (!sConstructor) sConstructor = 'Unknown Constructor';
					} else {
						sConstructor = trim((constructor + "").split("(")[0].replace("function", ""));
					}

					//得到summary
					if (nodeType == "1") { //HTML Element
						summary = value.tagName + (value.id ? "#" + value.id : "") + (value.className ? "." + value.className : "");
					} else if (trim("" + value.item).substr(0, 8) == "function" //typeof(document.all.item)在IE下的结果为object，而不是function
					&& value.length !== undefined) //Collection
					{
						summary = "[].length = " + (value.length || 0);
						sConstructor = "Collection";
					} else if (sConstructor == "Array") { //Array
						summary = "[].length = " + value.length;
					} else if (constructor == Object) { //Json对象
						var count = 0;
						for (var i in value) count++;
						summary = "{}.propertyCount = " + count;
					} else if (type == "function") { //函数
						summary = trim((value + "").split("{")[0]);
					} else {
						summary = (value + "").substr(0, 50).replace(/\s+/g, " ");
					}
					break;
				}
				if ("object".indexOf(type) > -1) {
					for (var i in value) {
						hasChildren = true;
						break;
					}
				}
				if ("function" == type) {
					var pro = value.prototype;
					for (var i in pro) {
						if (pro.hasOwnProperty(i)) {
							hasChildren = true;
							break;
						}
					}
					for (var i in value) {
						if (i != "prototype") {
							hasChildren = true;
							break;
						}
					}
				}
				return {
					value: value,
					hasChildren: hasChildren,
					type: type,
					sConstructor: sConstructor,
					summary: summary
				};
			} catch (ex) {
				return {
					value: "AnalyseError " + ex,
					hasChildren: false,
					type: "error",
					sConstructor: "AnalyseError",
					summary: ("AnalyseError " + ex).substr(0, 50)
				};

			}
		};

		TestU.stringify = function(val) {
/*
	* 返回对val的描述。
	* @param {any} val 分析对象 
	* @returns {string} 返回分析结果
	*/
			var info = TestU.analyse(val);
			switch (info.type) {
			case "null":
			case "undefined":
			case "number":
			case "boolean":
				return val + "";
			case "string":
				return '"' + val + '"';
			}
			var s = [];
			s.push((info.sConstructor || info.type) + ": " + info.summary + "\n" + info.value);
			if (info.hasChildren) {
				s.push("-----------------");
				var value = info.value;
				var num = 0;
				for (var i in value) {
					if (num++ > 300) {
						s.push("...");
						break;
					}
					try {
						var infoI = TestU.analyse(value[i]); //有时value[i]会抛错，例如firefox下的window.sessionStorage，所以要try一下。
						s.push(i + " 	" + (infoI.sConsturctor || infoI.type) + " 	" + infoI.summary);
					} catch (ex) {
						s.push(i + " 	无法解析" + ex);
					}
				}
			}
			return s.join("\n");
		};
		//一些内部函数

		function trim(s) {
			return s.replace(/^[\s\xa0\u3000]+|[\u3000\xa0\s]+$/g, "");
		}
		return TestU;
	})();


	/**
	 * UnitTest 单元测试
	 * @static 
	 * @class UnitTest
	 */

	var UnitTest = {};
	UnitTest.specs = [];
	var stringify = TestU.stringify,
		mix = function(obj, src) {
			for (var i in src) if (!(i in obj)) obj[i] = src[i];
		},
		g = function(id) {
			return document.getElementById(id);
		},
		createEl = function() {
			var div = document.createElement("div");
			return function(html) {
				div.innerHTML = html;
				return div.firstChild;
			};
		}(),
		target = function(e) {
			e = e || event;
			return e.srcElement || e.target;
		},
		encode4Html = function(s) {
			var el = document.createElement('pre'); //这里要用pre，用div有时会丢失换行，例如：'a\r\n\r\nb'
			var text = document.createTextNode(s);
			el.appendChild(text);
			return el.innerHTML;
		},
		tmpl = function(sTmpl, opts) {
			return sTmpl.replace(/\{\$(\w+)\}/g, function(a, b) {
				return opts[b] == undefined ? "-" : encode4Html(opts[b])
			});
		};


	var setSpecClass = function(specId, cn) {
		var el = g("spec_" + specId)
		if (el) {
			el.className = cn;
			g("spec_" + specId + "_list").className = cn;
		}
	};
	/**
	 * 浏览器属性
	 * @static 
	 * @class Browser
	 * @namespace UnitTest
	 */

	var Browser = UnitTest.Browser = {
		// By Rendering Engines
		Trident: navigator.appName === "Microsoft Internet Explorer",
		Webkit: navigator.userAgent.indexOf('AppleWebKit/') > -1,
		Gecko: navigator.userAgent.indexOf('Gecko') > -1 && navigator.userAgent.indexOf('KHTML') === -1,
		KHTML: navigator.userAgent.indexOf('KHTML') !== -1,
		Presto: navigator.appName === "Opera"
	};
	var increasingId = 1,
		//自增id
		currentSpec = null,
		currentCaseStatus = 0,
		//当前case的status
		currentCaseName = null,
		//当前case的name
		currentShouldInfo = null; //当前的ShouldInfo
	currentErrorMsg = null; //当前的ShouldInfo
	/**
	 * 单元测试中展示部分
	 * @static 
	 * @class Logger
	 * @namespace UnitTest
	 */
	var Logger = UnitTest.Logger = {
		titleTmpl: ['<h1>JSSpec</h1><ul>', '<li>[<a href="?" class="rerun">Rerun all specs</a>]</li>', '<li><span id="total_examples">{$total}</span> examples</li>', '<li><span id="total_failures">{$fails}</span> failures</li>', '<li><span id="total_errors">{$errors}</span> errors</li>', '<li><span id="progress">{$per}</span>% done</li>', '<li><span id="total_elapsed">{$secs}</span> secs</li>', '</ul>', '<p><a href="http://hi.baidu.com/jkisjk">JK</a>: Thanks: <a href="http://jania.pe.kr/aw/moin.cgi/JSSpec">JSSpec homepage</a></p>', ].join(""),
		specListTmpl: '<li id="spec_{$id}_list"><h3><a href="#spec_{$id}">{$context}</a> [<a href="#" class="rerun" specId="{$id}">rerun</a>]</h3></li>',
		specTmpl: ['<li id="spec_{$id}">', '<h3><a href="#spec_{$id}" class="spec_hd" specId="{$id}" onclick="return false;">{$context}</a> [<a href="#spec_{$id}" class="rerun" specId="{$id}">rerun</a>]</h3>', '<ul id="spec_{$id}_examples" class="examples" style="display:none"></ul>', '</li>'].join(""),
		exampleTmpl: '<li id="example_{$id}"><h4>{$name}</h4><pre class="examples-code"><code>{$code}</code></pre></li>',
		codeTmpl: '<pre class="examples-code"><code>{$code}</code></pre>',
		init: function() {
			var container = g("jsspec_container");
			if (!container) {
				container = createEl("<div id=jsspec_container></div>");
				document.body.appendChild(container);
			}
			container.innerHTML = ['<div id="title">title</div>', '<div id="list"><h2>List</h2><ul class="specs" id="specs_list"></ul></div>', '<div id="log"><h2>Log</h2><ul class="specs" id="specs_log"></ul></div>'].join("");
			container.onclick = function(e) {
				var el = target(e);
				if (el.className == "rerun") { //rerun
					var specId = el.getAttribute("specId");
					var specs = UnitTest.specs;
					for (var i = 0; i < specs.length; i++) {
						if (!specId || specId == specs[i].id) {
							specs[i].status = -1;
							specs[i].caseStatus = {};
							g("spec_" + specs[i].id + "_examples").innerHTML = "";
						}
					}
					UnitTest.startExec();
				} else if (el.className == "spec_hd") {
					var specId = el.getAttribute("specId");
					var examplesEl = g("spec_" + specId + "_examples");
					if (examplesEl) {
						examplesEl.style.display = examplesEl.style.display == "none" ? "" : "none";
					}
				}
			};
			Logger.o_title = g("title");
			Logger.o_specs_list = g("specs_list");
			Logger.o_specs_log = g("specs_log");
			Logger.o_title.innerHTML = tmpl(Logger.titleTmpl, {});
			for (var i = 0; i < UnitTest.specs.length; i++) {
				var spec = UnitTest.specs[i];
				var specInfo = {
					id: spec.id,
					context: spec.context
				};
				Logger.o_specs_list.appendChild(createEl(tmpl(Logger.specListTmpl, specInfo)));
				Logger.o_specs_log.appendChild(createEl(tmpl(Logger.specTmpl, specInfo)));
			}
		},
		initForCase: function() {
			if (currentSpec) {
				var specId = currentSpec.id;
				if (!g('spec_' + specId)) {
					var specInfo = {
						id: specId,
						context: currentSpec.context
					};
					Logger.o_specs_list.appendChild(createEl(tmpl(Logger.specListTmpl, specInfo)));
					Logger.o_specs_log.appendChild(createEl(tmpl(Logger.specTmpl, specInfo)));
				}
				if (currentSpec && currentSpec.caseMap[currentCaseName]) {
					if (!currentSpec.caseId[currentCaseName]) {
						currentSpec.caseId[currentCaseName] = increasingId++;
					}
					var caseId = currentSpec.caseId[currentCaseName];
					if (!g('example_' + caseId)) {
						var el = createEl(tmpl(Logger.exampleTmpl, {
							id: caseId,
							name: currentCaseName,
							code: currentSpec.caseMap[currentCaseName]
						}));
						g('spec_' + specId + '_examples').appendChild(el);
					}
				}
			}

		},
		log: function(self, message) {
			if (currentSpec && currentCaseName && currentSpec.caseMap[currentCaseName]) {
				var caseId = currentSpec.caseId[currentCaseName],
					el = g('example_' + caseId),
					infoEl = createEl("<div></div>"),
					html = (message || '') + tmpl(Logger.codeTmpl, {
						code: stringify(self)
					});
				//alert(html);
				try {
					infoEl.innerHTML = html;
				} catch (ex) {
					alert(html);
				}
				el.appendChild(infoEl);
				return;
			}
			alert(message + "\n" + stringify(self));
		},
		refreshSpecs: function() {
			var total = 0,
				fails = 0,
				errors = 0,
				overs = 0;
			for (var i = 0; i < UnitTest.specs.length; i++) {
				var spec = UnitTest.specs[i],
					specId = spec.id;
				caseMap = spec.caseMap, caseStatus = spec.caseStatus;
				var specClass = "";
				if (spec.status == 0) specClass = "ongoing";
				else if (spec.status == 1) specClass = "success";
				for (var j in caseMap) {
					total++;
					var status = caseStatus[j];
					if (status) overs++;
					if (status & 4) fails++;
					if (status & 2) errors++;
					if (status > 1) specClass = "exception";
				}
				setSpecClass(specId, specClass);
			}
			Logger.o_title.innerHTML = tmpl(Logger.titleTmpl, {
				total: total,
				errors: errors,
				fails: fails,
				per: (100 * overs / (total || 1)).toFixed(0),
				secs: (new Date() - executeStartDate) / 1000
			});
			if (executeTimer) clearTimeout(executeTimer);
			executeTimer = setTimeout(executor, 50);

		},
		renderResult: function(ex) {
			var spec = currentSpec;
			Logger.refreshSpecs();
			var id = spec.caseId[currentCaseName],
				status = spec.caseStatus[currentCaseName];
			var el = g("example_" + id);
			if (status == 1) {
				el.className = "success";
			} else if (status > 1) {
				g('spec_' + spec.id + '_examples').style.display = "";
				el.className = "exception";
				var infoEl = createEl("<div></div>"),
					html = [];
				if (currentShouldInfo) {
					html.push('<p>matcher: ', tmpl(Logger.codeTmpl, {
						code: currentShouldInfo.sFun
					}), '</p>', '<p>actual(self): ', tmpl(Logger.codeTmpl, {
						code: stringify(currentShouldInfo.self)
					}), '</p>', currentShouldInfo.self != null && currentShouldInfo.property != null ? '<p>self.' + currentShouldInfo.property + ': ' + tmpl(Logger.codeTmpl, {
						code: stringify(currentShouldInfo.self[currentShouldInfo.property])
					}) + '</p>' : '', '<p>value: ', tmpl(Logger.codeTmpl, {
						code: stringify(currentShouldInfo.value)
					}), '</p>');
				}
				html.push('<p>', currentErrorMsg || ex && ex.message || '', '</p>')
				if (ex) {
					if (Browser.Webkit) html.push('<p> at ', ex.sourceURL, ', line ', ex.line, '</p>');
					else
					html.push('<p> at ', ex.fileName, ', line ', ex.lineNumber, '</p>');
				}
				infoEl.innerHTML = html.join("");
				el.appendChild(infoEl);
			}
		}
	};
	/**
	 * UnitTest的CaseSuit
	 * @static 
	 * @class Spec
	 * @namespace UnitTest
	 */
	var Spec = UnitTest.Spec = function(context, caseMap, base) {
		this.id = increasingId++;
		this.context = context;
		this.caseMap = caseMap;
		this.base = base;
		this.caseStatus = {}; //json，其key为caseName,其值为status: 0:未运行, 1:通过, 2:运行异常, 4,不通过
		this.caseId = {}; //json，其key为caseId,
		this.status = -1; //status: -1:未运行, 0: 运行中, 1:运行完毕
	};

	mix(Spec.prototype, {});

	/**
	 * 主语
	 * @static 
	 * @class Subject
	 * @namespace UnitTest
	 */

	var Subject = UnitTest.Subject = function(self) {
		this.self = self;
	};

	mix(Subject.prototype, {
		_should: function(property, value, op, selfPre, selfTail, valuePre, valueTail, isReverse) {
			var selfDesc = [
			selfPre, property == null ? "self" : "self[property]", selfTail],
				valueDesc = [
				valuePre, "value", valueTail];
			var desc = [].concat(isReverse ? valueDesc : selfDesc, op, isReverse ? selfDesc : valueDesc);
			var sFun = desc.join(" ");
			//alert([sFun,this.self,property,value]);
			var tempCur = {
				self: this.self,
				property: property,
				value: value,
				sFun: sFun
			};
			try {
				var fun = new Function("self", "property", "value", "return (" + sFun + ");");
			} catch (ex) { //错误的调用了_should方法，造成matcher不合法
				currentCaseStatus |= 2;
				currentErrorMsg = "Matcher is illegle: " + ex.message;
				currentShouldInfo = tempCur;
				return;
			}
			try {
				var result = fun(this.self, property, value);
			} catch (ex) { //运行matcher时抛错
				currentCaseStatus |= 4;
				currentErrorMsg = "Not match: " + ex.message;
				currentShouldInfo = tempCur;
				return;
			}
			if (result !== true) { //Not Match
				currentCaseStatus |= 4;
				currentErrorMsg = "Not match";
				currentShouldInfo = tempCur;
				return;
			}
			currentCaseStatus |= 1; //Match
			return result;
		},
		should: function(op, value) {
			return this._should(null, value, op);
		},
		should_be: function(value) {
			return this._should(null, value, "===");
		},
		should_not_be: function(value) {
			return this._should(null, value, "!==");
		},
		should_have_method: function(methodName) {
			return this._should(methodName, "function", "==", "typeof");
		},
		should_have_property: function(property) {
			return this._should(null, property, "in", null, null, null, null, true);
		},
		should_contains: function(value) {
			return this._should(null, value, ".contains", null, null, "(", ")");
		},
		property_should: function(property, op, value) {
			return this._should(property, value, op);
		},
		property_should_be: function(property, value) {
			return this._should(property, value, "===");
		},
		property_should_not_be: function(property, value) {
			return this._should(property, value, "!==");
		},

		log: function(message) {
			Logger.log(this.self, message);
		}
	});

	/**
	 * 单元测试中展示部分
	 * @static 
	 * @class UnitTest
	 */

	UnitTest.describe = function(context, caseMap, base) {
		UnitTest.specs.push(new Spec(context, caseMap, base));
	};

	//定时运行case,
	var executeTimer = 0,
		executeStartDate = 0;
	executor = function() {
		for (var i = 0; i < UnitTest.specs.length; i++) {
			var spec = UnitTest.specs[i],
				caseStatus = spec.caseStatus,
				caseMap = spec.caseMap;
			currentSpec = spec;
			if (spec.status < 1) {
				spec.status = 0;
				for (var j in caseMap) {
					var currentCase = caseMap[j];
					if (!caseStatus[j]) {
						currentCaseName = j;
						currentCaseStatus = 0;
						currentErrorMsg = null;
						currentShouldInfo = null;
						Logger.initForCase();
						if (Browser.Trident) { //抛出
							caseMap[j]();
							caseStatus[j] = currentCaseStatus || 1; //有时，一个Case里没有should判断，所以需要 "||1"
							Logger.renderResult();
						} else {
							try {
								caseMap[j]();
								caseStatus[j] = currentCaseStatus || 1;
								Logger.renderResult();
							} catch (ex) {
								caseStatus[j] = currentCaseStatus & 6 || 2; //在测试报告里需要显示该错误数
								Logger.renderResult(ex);
							}
						}
						return; //每次只run一个case
					}
				}
				spec.status = 1;
				Logger.refreshSpecs();
			}
		}
	};
	UnitTest.startExec = function() {
		executeStartDate = new Date();
		if (executeTimer) clearTimeout(executeTimer);
		executeTimer = setTimeout(executor, 50);
	}


	mix(window, { //export
		value_of: function(self) {
			return new Subject(self);
		},
		describe: UnitTest.describe
	});

	if (Browser.Trident) {
		window.onerror = function(message, fileName, lineNumber) {
			try {
				currentSpec.caseStatus[currentCaseName] = currentCaseStatus & 6 || 2; //在测试报告里需要显示该错误数
			} catch (ex) {;
			}
			Logger.renderResult({
				message: currentErrorMsg || message,
				fileName: fileName,
				lineNumber: lineNumber
			});
			return true;
		};

	}
	window.onload = function() {
		Logger.init();
		UnitTest.startExec();
	}
	return UnitTest;
})();