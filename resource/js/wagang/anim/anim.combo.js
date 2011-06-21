//	document.write('<script type="text/javascript" src="' + srcPath + 'wagang/anim/anim_base.js"></script>');

/*
	Copyright QWrap
	version: $version$ $release$ released
	author: JK
*/

(function() {
	var CustEvent = QW.CustEvent,
		mix = QW.ObjectH.mix;

	/**
	 * @class Anim 动画
	 * @namespace QW
	 * @constructor
	 * @param {function} animFun - 管理动画效果的闭包
	 * @param {int} dur - 动画效果持续的时间 
	 * @param {json} opts - 其它参数， 
		---目前只支持以下参数：
		{boolean} byStep (Optional) 是否按帧动画（即"不跳帧"）。如果为true，表示每一帧都走到，帧数为dur/frameTime
		{boolean} frameTime (Optional) 帧间隔时间。默认为28
		{boolean} per (Optional) 初始播放进度
		{function} onbeforeplay (Optional) onbeforeplay事件
		{function} onplay (Optional) onplay事件
		{function} onstep (Optional) onstep事件
		{function} onpause (Optional) onpause事件
		{function} onresume (Optional) onresume事件
		{function} onend (Optional) onend事件
		{function} onreset (Optional) onreset事件
	 * @returns {Anim} anim - 动画对象
	 */
	var Anim = function(animFun, dur, opts) {
		mix(this, opts);
		mix(this, {
			animFun: animFun,	//animFun，动画函数，
			dur: dur,	//动画时长
			byStep: false,	//是否按帧动画
			per: 0,	//播放进度
			frameTime: 28, //帧间隔时间
			_status: 0 //0－未播放，1－播放中，2－播放结束，4－被暂停，8－被终止
		});
		changePer(this, this.per);
		CustEvent.createEvents(this, Anim.EVENTS);
	};

	Anim.EVENTS = 'beforeplay,play,step,pause,resume,end,reset'.split(',');
	/*
	 * turnOn 打开动画定时器
	 * @param {Anim} anim Anim实例
	 * @returns {void}
	 */

	function turnOn(anim) {
		anim.step();
		if (anim.isPlaying()) {
			anim._interval = window.setInterval(function() {
				anim.step();
			}, anim.frameTime);
		}
	}
	/*
	 * turnOff 关闭动画定时器
	 * @param {Anim} anim Anim实例
	 * @returns {void}
	 */

	function turnOff(anim) {
		window.clearInterval(anim._interval);
	}
	/*
	 * changePer 调整播放进度，进度值
	 * @param {Anim} anim Anim实例
	 * @param {number} per 进度值，为[0,1]区间内的数值
	 * @returns {void}
	 */

	function changePer(anim, per) {
		anim.per = per;
		anim._startDate = new Date() * 1 - per * anim.dur;
		if (anim.byStep) {
			anim._totalStep = anim.dur / anim.frameTime;
			anim._currentStep = per * anim._totalStep;
		}
	}

	mix(Anim.prototype, {
		/**
		 * 判断是否正在播放
		 * @method isPlaying
		 * @returns {boolean}  
		 */
		isPlaying: function() {
			return this._status == 1;
		},
		/**
		 * 从0开始播放
		 * @method play
		 * @returns {boolean} 是否开始顺利开始。（因为onbeforeplay有可能阻止了play） 
		 */
		play: function() {
			var me = this;
			if (me.isPlaying()) me.pause();
			changePer(me, 0);
			if (!me.fire('beforeplay')) return false;
			me._status = 1;
			me.fire('play');
			turnOn(me);
			return true;
		},
		/**
		 * 播放一帧
		 * @method step
		 * @param {number} per (Optional) 进度值，为[0,1]区间内的数值
		 * @returns {void} 
		 */
		step: function(per) {
			var me = this;
			if (per != null) {
				changePer(me, per);
			} else {
				if (me.byStep) {
					per = me._currentStep++ / me._totalStep;
				} else {
					per = (new Date() - me._startDate) / me.dur;
				}
				this.per = per;
			}
			if (this.per > 1) {
				this.per = 1;
			}
			me.animFun(this.per);
			me.fire('step');
			if (this.per >= 1) {
				this.end();
				return;
			}
		},
		/**
		 * 播放到最后
		 * @method end
		 * @returns {void} 
		 */
		end: function() {
			changePer(this, 1);
			this.animFun(1);
			this._status = 2;
			turnOff(this);
			this.fire('end');
		},
		/**
		 * 暂停播放
		 * @method pause
		 * @returns {void} 
		 */
		pause: function() {
			this._status = 4;
			turnOff(this);
			this.fire('pause');
		},
		/**
		 * 继续播放
		 * @method resume
		 * @returns {void} 
		 */
		resume: function() {
			changePer(this, this.per);
			this._status = 1;
			this.fire('resume');
			turnOn(this);
		},
		/**
		 * 播放到最开始
		 * @method reset
		 * @returns {void} 
		 */
		reset: function() {
			changePer(this, 0);
			this.animFun(0);
			this.fire('reset');
		}
	});
	QW.provide('Anim', Anim);
}());


//	document.write('<script type="text/javascript" src="' + srcPath + 'wagang/anim/elanim.js"></script>');

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
	ElAnim.EVENTS = []; //'beforeplay,play,step,pause,resume,end,reset'.split(',');
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


//	document.write('<script type="text/javascript" src="' + srcPath + 'wagang/anim/easing.js"></script>');

/**
 * @fileoverview Easing
 * @author:Jerry(屈光宇)、JK（加宽）
 */

(function() {
	/**
	 * @class Easing 动画算子集合，例如easeNone、easeIn、easeOut、easeBoth等算子。
	 * @namespace QW
	 */
	var Easing = {
		easeNone: function(p) {
			return p;
		},
		easeIn: function(p) {
			return p * p;
		},
		easeOut: function(p) {
			return p * (2 - p);
		},
		easeBoth: function(p) {
			if ((p /= 0.5) < 1) return 1 / 2 * p * p;
			return -1 / 2 * ((--p) * (p - 2) - 1);
		},
		easeInStrong: function(p) {
			return p * p * p * p;
		},
		easeOutStrong: function(p) {
			return -((p -= 1) * p * p * p - 1);
		},
		easeBothStrong: function(p) {
			if ((p /= 0.5) < 1) return 1 / 2 * p * p * p * p;
			return -1 / 2 * ((p -= 2) * p * p * p - 2);
		},
		elasticIn: function(p) {
			if (p == 0) return 0;
			if (p == 1) return 1;
			var x = 0.3,
				y = 1,
				z = x / 4;
			return -(Math.pow(2, 10 * (p -= 1)) * Math.sin((p - z) * (2 * Math.PI) / x));
		},
		elasticOut: function(p) {
			if (p == 0) return 0;
			if (p == 1) return 1;
			var x = 0.3,
				y = 1,
				z = x / 4;
			return Math.pow(2, -10 * p) * Math.sin((p - z) * (2 * Math.PI) / x) + 1;
		},
		elasticBoth: function(p) {
			if (p == 0) return 0;
			if ((p /= 0.5) == 2) return 1;
			var x = 0.3 * 1.5,
				y = 1,
				z = x / 4;
			if (p < 1) return -0.5 * (Math.pow(2, 10 * (p -= 1)) * Math.sin((p - z) * (2 * Math.PI) / x));
			return Math.pow(2, -10 * (p -= 1)) * Math.sin((p - z) * (2 * Math.PI) / x) * 0.5 + 1;
		},
		backIn: function(p) {
			var s = 1.70158;
			return p * p * ((s + 1) * p - s);
		},
		backOut: function(p) {
			var s = 1.70158;
			return ((p = p - 1) * p * ((s + 1) * p + s) + 1);
		},
		backBoth: function(p) {
			var s = 1.70158;
			if ((p /= 0.5) < 1) return 1 / 2 * (p * p * (((s *= (1.525)) + 1) * p - s));
			return 1 / 2 * ((p -= 2) * p * (((s *= (1.525)) + 1) * p + s) + 2);
		},
		bounceIn: function(p) {
			return 1 - Easing.bounceOut(1 - p);
		},
		bounceOut: function(p) {
			if (p < (1 / 2.75)) {
				return (7.5625 * p * p);
			} else if (p < (2 / 2.75)) {
				return (7.5625 * (p -= (1.5 / 2.75)) * p + 0.75);
			} else if (p < (2.5 / 2.75)) {
				return (7.5625 * (p -= (2.25 / 2.75)) * p + 0.9375);
			}
			return (7.5625 * (p -= (2.625 / 2.75)) * p + 0.984375);
		},
		bounceBoth: function(p) {
			if (p < 0.5) return Easing.bounceIn(p * 2) * 0.5;
			return Easing.bounceOut(p * 2 - 1) * 0.5 + 0.5;
		}
	};

	QW.provide('Easing', Easing);
}());


//	document.write('<script type="text/javascript" src="' + srcPath + 'wagang/anim/anim_retouch.js"></script>');

/*
 *	Copyright (c) QWrap
 *	version: $version$ $release$ released
 *	author:Jerry(屈光宇)、JK（加宽）
 *  description: Anim推荐retouch....
*/

(function() {
	var NodeH = QW.NodeH,
		g = NodeH.g,
		show = NodeH.show,
		hide = NodeH.hide,
		setStyle = NodeH.setStyle;

	function newAnim(el, opt, callback, dur, type) {
		el = g(el);
		var ElAnim = QW.ElAnim;
		switch (type) {
		case "color":
			ElAnim = QW.ColorAnim;
			break;
		case "scroll":
			ElAnim = QW.ScrollAnim;
			break;
		}
		var anim = new ElAnim(el, opt, dur || 800);
		if (callback) {
			anim.on("end", function() {
				callback();
			});
		}
		anim.play();
		return anim;
	}

	var AnimElH = { 
		/* 淡入 */
		fadeIn: function(el, dur, callback) {
			el = g(el);
			show(el);
			return newAnim(el, {
				"opacity": {
					from: 0,
					to: 1
				}
			}, callback, dur);
		},
		/* 淡出 */
		fadeOut: function(el, dur, callback) {
			el = g(el);
			return newAnim(el, {
				"opacity": {
					from: 1,
					to: 0
				}
			}, callback || function() {
				hide(el);
			}, dur);
		},
		/* 淡入/淡出切换 */
		fadeToggle: function(el, dur) {
			AnimElH[el.offsetHeight ? 'fadeOut' : 'fadeIn'](el, dur);
		},
		/* 收起 */
		slideUp: function(el, dur, callback) {
			el = g(el);
			show(el);
			setStyle(el, "height", "auto");
			return newAnim(el, {
				"height": {
					from: el.offsetHeight,
					to: 0
				}
			}, callback || function() {
				hide(el);
			}, dur);
		},
		/* 展开 */
		slideDown: function(el, dur, callback) {
			el = g(el);
			show(el);
			setStyle(el, "height", "auto");
			var height = el.offsetHeight;
			setStyle(el, "height", "0");
			return newAnim(el, {
				"height": {
					from: 0,
					to: height
				}
			}, callback, dur);
		},
		/* 收起/展开切换 */
		slideToggle: function(el, dur) {
			el = g(el);
			AnimElH[el.offsetHeight ? 'slideUp' : 'slideDown'](el, dur);
		},
		/* 颜色渐变提醒注意 */
		shine4Error: function(el, dur, callback) {
			return newAnim(el, {
				"backgroundColor": {
					from: "#f33",
					to: "#fff",
					end: ""
				}
			}, callback, dur, "color");
		}
	};

	QW.NodeW.pluginHelper(AnimElH, 'operator');
	if (QW.Dom) {
		QW.ObjectH.mix(QW.Dom, AnimElH);
	}
}());

