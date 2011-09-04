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