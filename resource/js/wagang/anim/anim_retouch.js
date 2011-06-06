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
			anim.on("suspend", function() {
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

	NodeW.pluginHelper(AnimElH, 'operator');
	QW.ObjectH.mix(QW.Dom, AnimElH);
}());