/*
	Copyright (c) Baidu Youa Wed QWrap
	version: $version$ $release$ released
	author: 月影、JK
*/

/*
 * @class ObjectH 核心对象Array的扩展
 * @singleton 
 * @namespace QW
 * @helper
 */
(function() {
	var ObjectH = {
		/**
		 * 将一个扁平化的对象展“折叠”一个深层次对象，其中包含"."的属性成为深层属性
		 * @method fold
		 * @static
		 * @param obj {Object} 要折叠的对象
		 * @return {Object} 折叠后的对象
		 */
		fold: function(obj) {
			var ret = {};
			for (var prop in obj) {
				var keys = prop.split(".");

				for (var i = 0, o = ret, len = keys.length - 1; i < len; i++) {
					if (!(keys[i] in o)) {o[keys[i]] = {}; }
					o = o[keys[i]];
				}
				o[keys[i]] = obj[prop];
			}
			return ret;
		},
		/**
		 * 将一个对象扁平化，是fold的反向操作
		 * @method expand
		 * @static
		 * @param obj {Object} 要扁平化的对象
		 * @return {Object} 扁平化后的对象
		 */
		expand: function(obj) {
			var ret = {};
			var f = function(obj, profix) {
				for (var each in obj) {
					var o = obj[each];
					var p = profix.concat([each]);
					if (ObjectH.isPlainObject(o)) {
						f(o, p);
					} else {
						ret[p.join(".")] = o;
					}
				}
			};
			f(obj, []);
			return ret;
		}
	};

	QW.ObjectH.mix(QW.ObjectH, ObjectH);

}());