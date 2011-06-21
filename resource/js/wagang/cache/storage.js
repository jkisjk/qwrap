/*
	Copyright (c) Baidu Youa Wed QWrap
	version: $version$ $release$ released
	author: Jerry(屈光宇)、JK(部分修改)
*/


/**
 * @class Storage Storage类
 * @namespace QW
 */
 (function() { 
	var ready = QW.DomU.ready,
		g = QW.NodeH.g;

	var FlashStorage =(function() {
		var flashId = '_Flash_Storage_',
			flashEl = null,
			flashPath = QW.PATH + 'wagang/cache/assets/cache.swf', //更多信息，参见：http://www.imququ.com/post/74.html
			//flashPath = 'http://co.youa.baidu.com/picture/r/mall/js/cache.swf',
			flashStatus = 0, //0还未添加、1还未loaded、2已成功能加载
			flashCallbacks = [];

		try {
			if (external.max_language_id != undefined){  //解决遨游bug，参见http://www.imququ.com/post/52.html
				flashPath += "?random=" + Math.random();
			}
		} catch (ex){}
		function insertFlash() { //添加flash
			var container = document.createElement("div"), html = [];
			if(QW.Browser.ie){
				html.push('<object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000"',
					'codebase="http://download.macromedia.com/pub/shockwave/cabs',
					'/flash/swflash.cab#version=10,0,0,0" width="1" height="1" id="',flashId,'">',
					'<param name="allowScriptAccess" value="always" />',
					'<param name="movie" value="',flashPath,'" /></object>');
			}else{
				html.push('<embed src="',flashPath,'" width="1" height="1" id="',flashId,'" ',
					'align="middle" allowScriptAccess="always" type="application/x-shockwave-flash" ',
					'pluginspage="http://www.adobe.com/go/getflashplayer_cn"/>');
			}
			var style = container.style;
			style.position = "absolute";
			style.top = "-9999px";
			var body=document.body;
			body.insertBefore(container,body.firstChild);
			container.innerHTML = html.join("");
			flashEl = g(flashId);
			document.title=document.title.split("#")[0]; //IE下flash会导致浏览器title加很多#
		}
		function periodicalExecuter(callback) {//执行器
			switch (flashStatus)
			{
			case 0: //还未添加falsh元素
				flashStatus=1;
				ready(insertFlash); 
				var flashInterval = setInterval(function(){
					//alert(flashEl.set)
					if (flashEl.set) {
						clearInterval(flashInterval);
						flashInterval= 0;
						flashStatus = 2;
						for(var i=0;i<flashCallbacks.length;i++){
							try{
								flashCallbacks[i]();
							}
							catch(ex) {
								continue;
							}
						}
						flashCallbacks.length = 0;
					}
				}, 20);
			case 1: //flash未加载完成
				flashCallbacks.push(callback);
				break;
			case 2: //flash已成功加载
				callback();
				break;
			}
		}

		return {
			storageType: 'flash',
			test: function(){
				var f = 0, n = navigator;
				if(n.plugins && n.plugins.length) {
					for (var ii = 0; ii < n.plugins.length; ii++) {
						if (n.plugins[ii].name.indexOf("Shockwave Flash") != -1) {
							f = n.plugins[ii].description.split("Shockwave Flash")[1];
							break;
						}
					}
				}else if (window.ActiveXObject) {
					for (var ii = 15; ii > 7; ii--) {
						try{
							if (new ActiveXObject("ShockwaveFlash.ShockwaveFlash." + ii)) {
								f = parseInt(ii);
								break;
							}
						}catch(ex){}
					}
				}
				return parseInt(f) > 7;
			},
			set: function(key, value){
				periodicalExecuter(function(){
					flashEl.set(key,value);
				});
			},
			get: function(key, callback){
				if (callback) {
					periodicalExecuter(function(){
						callback && callback(flashEl.get(key));
					});
				}
				if (flashStatus == 2) return flashEl.get(key); //如果能即时返回get值的话，也即时返回get值，满足同步的要求
			},
			remove: function(key){
				periodicalExecuter(function(){
					flashEl.remove(key);
				});
			}
		};
		
	}());
	
	var localStorage = window.localStorage;
	var LocalStorage = {
		storageType: 'local',
		test: function(){
			return !!localStorage;
		},
		set : function(key, value){
			localStorage.setItem(key, value);
		},
		get: function(key, callback){
			var val = localStorage.getItem(key);
			if (callback) {
				callback(val);
			}
			return val;
		},
		remove: function(key){
			localStorage.removeItem(key);
		}
	};

	var Storage = null,
		list = [LocalStorage,FlashStorage];
	for(var i = 0; i < list.length; i++) {
		if(list[i].test()){
			Storage = list[i];
			break;
		}
	}
	QW.provide({
		'Storage':Storage,
		'FlashStorage': FlashStorage,
		'LocalStorage': LocalStorage
	});

 })();