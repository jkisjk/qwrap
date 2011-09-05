/*
 *	Copyright (c) QWrap
 *	version: $version$ $release$ released
 *	author: JK
 *  description: ajax推荐retouch....
*/

(function() {
	var Ajax = QW.Ajax,
		NodeW = QW.NodeW,
		g = QW.NodeH.g;

	Ajax.Delay = 1000;
	/*
	 * Youa项目中处理json格式response的推荐方法
	 * @method opResults 
	 * 例如，以下这句会处通一些通用的错误：Ajax.post(oForm,function(e){var status=this.opResults();})
	 */
	Ajax.prototype.opResults = function(url) {
		var ajax = this;
		if (ajax.isSuccess()) {
			var responseText = ajax.requester.responseText;
			try {
				var status = new Function('return (' + responseText + ');')();
			} catch (ex) {
				alert("系统错误，请稍后再试。");
				return {
					isop: true,
					err: "inter"
				};
			}
		} else {
			alert("系统错误，请稍后再试。");
			return {
				isop: true,
				err: "inter"
			};
		}

		status.isop = true; //记录是否已经作过处理
		var Valid_fail = window.Valid && Valid.fail || function(el, msg, needFocus) {
				alert(msg);
				el.focus();
			};
		switch (status.err) {
		case "mcphp.ok":
			if (url != false) {
				if (url) {
					if (url === true) {
						setTimeout(function() {
							location.reload(true);
						}, Ajax.Delay);
					} else {
						setTimeout(function() {
							location.href = url;
						}, Ajax.Delay);
					}
				} else {
					if (status.data && status.data.url) {
						setTimeout(function() {
							location.href = status.data.url;
						}, Ajax.Delay);
					} else {
						setTimeout(function() {
							location.reload(true);
						}, Ajax.Delay);
					}
				}
			} else {
				status.isop = false;
			}
			break;
		case "gmap.internal":
			alert("验证码过期，请刷新页面后重试！");
			break;
		case "mcphp.u_vcode":
			var els = document.getElementsByName('_vcode'),
				elKeys = document.getElementsByName('_vcode_key');
			if (els.length > 0 && elKeys.length > 0) {
				var el = els[0],
					elKey = elKeys[0];
				Valid_fail(el, "请检查您输入的验证码。", true);
				if (g('_vcode_img')) {
					g('_vcode_img').src = '/vcode?k=' + elKey.value + '&random=' + Math.random();
				}
			}
			break;
		case "mcphp.u_input":
			for (var i in status.data) {
				var tempEl = document.getElementsByName(i);
				try {
					if (tempEl.length > 0) {
						if (tempEl.length == 1) {
							Valid_fail(tempEl[0], "您输入的内容格式不对或超长，请检查是否包含特殊字符。", true);
						} else {
							for (var x = 0; x < tempEl.length; x++) {
								if (status.fields[i] == tempEl[x].value.encode4Html()) {
									Valid_fail(tempEl[x], "您输入的内容格式不对或超长，请检查是否包含特殊字符。", true);
									break;
								}
							}
						}
					}
				} catch (e) {
					alert("您输入的内容格式不对或超长，请检查是否包含特殊字符。");
				}
			}
			break;
		case "mcphp.u_notfound":
			alert("您请求的页面不存在！");
			break;
		case "mcphp.u_antispam":
			alert("您提交的内容包含敏感词汇，请检查后重新提交！");
			break;
		case "mcphp.u_deny":
			alert("您的操作不允许！");
			break;
		case "mcphp.u_bfilter":
			alert("您的操作太频繁！");
			break;
		case "login":
		case "mcphp.u_login":
			try {
				User.Login.show();
				User.Login.hint("您需要登录后才能继续刚才的操作");
			} catch (e) {
				try {
					top.User.Login.show();
					top.User.Login.hint("您需要登录后才能继续刚才的操作");
				} catch (e1) {
					alert('您需要登录后才能继续刚才的操作！');
				}
			}
			break;
		case "mcphp.u_power":
			window.location = "http://co.youa.baidu.com/content/misc/err/nopower/index.html";
			break;
		case "mcphp.fatal":
		case "mar.sys_inter":
			alert("系统错误，请稍后再试。");
			break;
		default:
			status.isop = false;
		}
		return status;
	};

	/*
	 * Youa项目中处理javascript格式response的推荐方法
	 * @method execJs 
	 * 例如，以下这句会执行返回结果：Ajax.post(oForm,function(e){var status=this.execJs();})
	 */
	Ajax.prototype.execJs = function() {
		QW.StringH.execJs(this.requester.responseText);
	};

	/*
	 * 扩展NodeW
	 * @method ajaxForm 
	 * @example W('#formId').ajaxForm();
	 */
	var FormH = {
		ajaxForm: function(oForm, opts) {
			var o = {
				data: oForm,
				url: oForm.action,
				method: oForm.method
			};
			if (typeof opts == 'function') {
				o.oncomplete = function() {
						opts.call(this, this.requester.responseText);
				};
			} else {
				o.oncomplete = Ajax.opResults;
				QW.ObjectH.mix(o, opts || {}, true);
			}
			new Ajax(o).send();
		}
	};

	NodeW.pluginHelper(FormH, 'operator');
}());