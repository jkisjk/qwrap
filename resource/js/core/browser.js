/*
	Copyright (c) Baidu Youa Wed QWrap
	version: $version$ $release$ released
	author: JK
*/


/**
 * @class Browser js的运行环境，浏览器以及版本信息。（Browser仅基于userAgent进行嗅探，存在不严谨的缺陷。）移动的useragent信息参考自http://mo.wed.ivershuo.com/。
 * @singleton 
 * @namespace QW 
 */
QW.Browser = (function() {
	var na = window.navigator,
		ua = na.userAgent.toLowerCase(),
		browserTester = /(msie|webkit|gecko|presto|opera|safari|firefox|chrome|maxthon|android|ipad|iphone|webos|hpwos)[ \/os]*([\d_.]+)/ig,
		Browser = {
			platform: na.platform
		};
	ua.replace(browserTester, function(a, b, c) {
		var bLower = b.toLowerCase();
		if (!Browser[bLower]) {
			Browser[bLower] = c; 
		}
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
}