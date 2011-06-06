/*
 * @fileoverview Anim
 * @author:Jerry Qu、JK
 */

(function() {
	var mix = QW.ObjectH.mix,
		mixMentor = mix, //顾问模式
		NodeH = QW.NodeH,
		CustEvent = QW.CustEvent,
		g = NodeH.g,
		Anim = QW.Anim;

	/**
	 *@class ElAnim 元素动画，只是针对单个元素的动画
	 *@namespace QW
	 */
	var ElAnim = function(el, attrs, dur, easing) {
		this.el = g(el);
		this.attrs = attrs;
		dur = dur || ElAnim.DefaultDur;
		this.easing = typeof easing == "function" ? easing : ElAnim.DefaultEasing;
		var anim = new Anim(function(per) {
			this.onTween(per);
		}, dur);
		mixMentor(this, anim); //
		CustEvent.createEvents(this, ElAnim.EVENTS);
		this.initData();
	};

	ElAnim.MENTOR_CLASS = Anim;

	/**
	 * 默认的动画算子
	 * @public
	 * @static
	 */
	ElAnim.DefaultEasing = function(p) {
		return p;
	};

	/**
	 * 默认的动画时长
	 * @public
	 * @static
	 */
	ElAnim.DefaultDur = 500;
	/**
	 * 事件，承继承Anim的所有事件
	 * @public
	 * @static
	 */
	ElAnim.EVENTS = []; //["play", "beforeplay", "stop", "pause", "resume", "suspend", "reset"];
	ElAnim.UNIT_PATTERNS = {
		'': /opacity|padding/i,
		'px': /width|height|top$|bottom$|left$|right$/i
	};

	mix(ElAnim.prototype, {
		initData: function() {
			for (var attr in this.attrs) {
				var opts = this.attrs[attr];
				if (opts.from == null) {
					opts.finish = opts.start = this.getAttr(attr);
				} else {
					opts.finish = opts.start = opts.from;
				}
				if (opts.to != null) {
					opts.finish = opts.to;
				}
				if (opts.by != null) {
					opts.finish = opts.start + opts.by;
				}
				opts.dis = opts.finish - opts.start;

				if (typeof opts.units == "undefined") {
					opts.units = this.getUnits(attr);
				}

				if (typeof opts.easing == "undefined") {
					opts.easing = this.easing;
				}
			}
		},

		/**
		 * 得到css属性的默认单位
		 * 
		 * @mathod getUnits
		 * @public
		 * @param {string}  属性名
		 * @return {string} 尺寸单位
		 */
		getUnits: function(attr) {
			var unit = '',
				tatterns = ElAnim.UNIT_PATTERNS;
			for (var i in tatterns) {
				if (tatterns[i].test(attr)) {
					return i;
				}
			}
			return "";
		},

		/**
		 * 获取CSS属性值
		 * 
		 * @mathod getAttr
		 * @public
		 * @param {string} 属性名
		 * @return {number} 数值
		 */
		getAttr: function(attr) {
			return parseFloat(NodeH.getCurrentStyle(this.el, attr));
		},

		/**
		 * 设置css属性值
		 * 
		 * @mathod setAttr
		 * @public
		 * @param {string} 属性名
		 * @param {number} 数值
		 * @param {string} 单位
		 * @return void
		 */
		setAttr: function(attr, value, units) {
			NodeH.setStyle(this.el, attr, value + units);
		},

		/**
		 * 动画每一帧的处理
		 * 
		 * @mathod onTween
		 * @public
		 * @param {number} 动画运行的百分比
		 * @return void
		 */
		onTween: function(per) {
			for (var attr in this.attrs) {
				var opts = this.attrs[attr];
				var value = opts.start + opts.easing(per) * opts.dis;
				this.setAttr(attr, value, this.getUnits(attr));

				if (typeof opts.end != "undefined" && per == 1) {
					this.setAttr(attr, opts.end, opts.units);
				}
			}
		}
	});

	/**
	 *@class ScrollAnim ScrollAnim
	 *@namespace QW
	 */

	var ScrollAnim = function(el, attrs, dur, easing) {
		var anim = new ElAnim(el, attrs, dur, easing);
		mixMentor(this, anim);
		this.initData();
	};
	ScrollAnim.MENTOR_CLASS = ElAnim;

	mix(ScrollAnim.prototype, {
		/**
		 * 获取element属性值
		 * 
		 * @mathod getAttr
		 * @public
		 * @param {string} 属性名
		 * @return {number} 数值
		 */
		getAttr: function(attr) {
			return this.el[attr] | 0;
		},

		/**
		 * 设置element属性值
		 * 
		 * @mathod setAttr
		 * @public
		 * @param {string} 属性名
		 * @param {number} 数值
		 * @return void
		 */
		setAttr: function(attr, value) {
			this.el[attr] = Math.round(value);
		}
	});

	/**
	 *@class ColorAnim ColorAnim
	 *@namespace QW
	 */
	var ColorAnim = function(el, attrs, dur, easing) {
		var anim = new ElAnim(el, attrs, dur, easing);
		mixMentor(this, anim);
		this.initData();
	};
	ColorAnim.MENTOR_CLASS = ElAnim;

	/**
	 * @property {Json} COLOR_PATTERNS 用到的一些正则
	 * @static
	 */
	ColorAnim.COLOR_PATTERNS = {
		rgb: /^rgb\(([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\)$/i,
		hex: /^#?([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})$/i,
		hex3: /^#?([0-9A-F]{1})([0-9A-F]{1})([0-9A-F]{1})$/i
	};
	/**
	 * 处理颜色
	 * @mathod parseColor
	 * @static
	 * @param {string} 颜色值，支持三种形式：#000/#000000/rgb(0,0,0)
	 * @return {array} 包含r、g、b的数组
	 */
	ColorAnim.parseColor = function(s) {
		if (s.length == 3) {
			return s;
		}
		var patterns = ColorAnim.COLOR_PATTERNS;
		var c = patterns.hex.exec(s);
		if (c && c.length == 4) {
			return [parseInt(c[1], 16), parseInt(c[2], 16), parseInt(c[3], 16)];
		}

		c = patterns.rgb.exec(s);
		if (c && c.length == 4) {
			return [parseInt(c[1], 10), parseInt(c[2], 10), parseInt(c[3], 10)];
		}

		c = patterns.hex3.exec(s);
		if (c && c.length == 4) {
			return [parseInt(c[1] + c[1], 16), parseInt(c[2] + c[2], 16), parseInt(c[3] + c[3], 16)];
		}
		return [0, 0, 0];
	};

	mix(ColorAnim.prototype, {
		/**
		 * 初始化数据
		 * @mathod initData
		 * @public
		 * @return void
		 */
		initData: function() {
			for (var attr in this.attrs) {
				var opts = this.attrs[attr];
				if (typeof opts.from == "undefined") {
					opts.finish = opts.start = ColorAnim.parseColor(this.getAttr(attr));
				} else {
					opts.finish = opts.start = ColorAnim.parseColor(opts.from);
				}
				if (typeof opts.to != "undefined") {
					opts.finish = ColorAnim.parseColor(opts.to);
				}
				if (typeof opts.easing == "undefined") {
					opts.easing = this.easing;
				}

				opts.dis = [];
				opts.finish.forEach(function(d, i) {
					opts.dis.push(d - opts.start[i]);
				});
			}
		},

		/**
		 * 获取CSS属性值
		 * 
		 * @mathod getAttr
		 * @public
		 * @param {string} 属性名
		 * @return {number} 数值
		 */
		getAttr: function(attr) {
			return NodeH.getCurrentStyle(this.el, attr);
		},

		/**
		 * 设置CSS颜色
		 * 
		 * @mathod setAttr
		 * @public
		 * @param {string} 属性名
		 * @param {string} 值
		 * @return void
		 */
		setAttr: function(attr, values) {
			if (typeof values == "string") {
				NodeH.setStyle(this.el, attr, values);
			} else {
				NodeH.setStyle(this.el, attr, "rgb(" + values.join(",") + ")");
			}
		},

		/**
		 * 动画每一帧的处理
		 * 
		 * @mathod onTween
		 * @public
		 * @param {number} 动画运行的百分比
		 * @return void
		 */
		onTween: function(per) {
			for (var attr in this.attrs) {
				var opts = this.attrs[attr];
				var values = [];
				var me = this;
				opts.start.forEach(function(s, i) {
					var value = s + opts.easing(per) * opts.dis[i];
					values.push(Math.max(Math.floor(value), 0));
				});

				this.setAttr(attr, values);

				if (typeof opts.end != "undefined" && per == 1) {
					this.setAttr(attr, opts.end);
				}
			}
		}
	}, true);

	QW.provide({
		ElAnim: ElAnim,
		ScrollAnim: ScrollAnim,
		ColorAnim: ColorAnim
	});
}());