/*
 * 防重复点击
*/
(function() {
	var F = function(el, e) {
		var ban = (el.getAttribute && el.getAttribute('data--ban')) | 0;
		if (ban) {
			if (!el.__BAN_preTime || (new Date() - el.__BAN_preTime) > ban) {
				el.__BAN_preTime = new Date() * 1;
				return true;
			}
			QW.EventH.preventDefault(e);
			return;
		}
		return true;
	};
	QW.EventTargetH._DelegateHooks.click = QW.EventTargetH._EventHooks.click = {
		'click': F
	};
	QW.EventTargetH._EventHooks.submit = {
		'submit': F
	};
}());

/*
 * 增加别名
*/
QW.g = QW.NodeH.g;
QW.W = QW.NodeW;

/*
 * 将直属于QW的方法与命名空间上提一层到window
*/
QW.ObjectH.mix(window, QW);

/*
 * 增加provide的产出
*/
QW.ModuleH.provideDomains.push(window);