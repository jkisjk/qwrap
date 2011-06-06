/*
	Copyright (c) Baidu Youa Wed QWrap
	version: $version$ $release$ released
	author: WC(好奇)、JK(加宽)
*/

/** 
 * @class EventTargetH EventTarget Helper，处理和事件触发目标有关的兼容问题
 * @singleton
 * @helper
 * @namespace QW
 */

(function() {

	var g = QW.NodeH.g,
		mix = QW.ObjectH.mix;


	/*
	 *Cache的格式：
		{
			"el.__QWETH_id":{
				'eventType+handler.__QWETH_id': realHandler,
				'eventType+handler.__QWETH_id+selector': realHandler
			}
		}
	 */
	var Cache = function() {
		var cacheSeq = 0,
			seqProp = '__QWETH_id';
		return {
			get: function(el, eventName, handler, selector) {
				var data = el[seqProp] && this[el[seqProp]];
				if (data && handler[seqProp]) {
					return data[eventName + handler[seqProp] + (selector || '')];
				}
			},
			add: function(realHandler, el, eventName, handler, selector) {
				if (!el[seqProp]) el[seqProp] = cacheSeq++;
				if (!handler[seqProp]) handler[seqProp] = cacheSeq++;
				var data = this[el[seqProp]] || (this[el[seqProp]] = {});
				data[eventName + handler[seqProp] + (selector || '')] = realHandler;
			},
			remove: function(el, eventName, handler, selector) {
				var data = el[seqProp] && this[el[seqProp]];
				if (data && handler[seqProp]) {
					delete data[eventName + handler[seqProp] + (selector || '')];
				}
			}
		};
	}();


	/* 
	 * 监听方法
	 * @method	listener
	 * @private
	 * @param	{Element}	el		元素
	 * @param	{string}	sEvent	事件名称
	 * @param	{function}	handler	委托函数
	 * @param	{string}	userEventName	原事件名称（被hook的事件）
	 * @return	{object}	委托方法执行结果
	 */

	function listener(el, sEvent, handler, userEventName) {
		return Cache.get(el, sEvent, handler) || function(e) {
			if (!userEventName || userEventName && EventTargetH._EventHooks[userEventName][sEvent](el, e)) {
				return fireHandler(el, e, handler, sEvent);
			}
		};
	}

	/* 
	 * delegate监听方法
	 * @method	delegateListener
	 * @private
	 * @param	{Element}	el		监听目标
	 * @param	{string}	selector	选择器
	 * @param	{string}	sEvent		事件名称
	 * @param	{function}	handler		委托函数
	 * @param	{string}	userEventName	原事件名称（被hook的事件）
	 * @return	{object}	委托方法执行结果
	 */

	function delegateListener(el, selector, sEvent, handler, userEventName) {
		return Cache.get(el, sEvent, handler, selector) || function(e) {
			var elements = [],
				node = e.srcElement || e.target;
			if (!node) {
				return;
			}
			if (node.nodeType == 3) {
				node = node.parentNode;
			}
			while (node && node != el) {
				elements.push(node);
				node = node.parentNode;
			}
			elements = QW.Selector.filter(elements, selector, el);
			for (var i = 0, l = elements.length; i < l; ++i) {
				if (!userEventName || userEventName && EventTargetH._DelegateHooks[userEventName][sEvent](elements[i], e || window.event)) {
					return fireHandler(elements[i], e, handler, sEvent);
				}
				if (elements[i].parentNode && elements[i].parentNode.nodeType == 11) { //fix remove elements[i] bubble bug
					if (e.stopPropagation) {
						e.stopPropagation();
					} else {
						e.cancelBubble = true;
					}
					break;
				}
			}
		};
	}

	/* 
	 * 事件执行入口
	 * @method	fireHandler
	 * @private
	 * @param	{Element}	el			触发事件对象
	 * @param	{event}		event		事件对象
	 * @param	{function}	handler		事件委托
	 * @param	{string}	sEvent		处理前事件名称
	 * @return	{object}	事件委托执行结果
	 */

	function fireHandler(el, e, handler, sEvent) {
		return EventTargetH.fireHandler.apply(null, arguments);
	}


	var EventTargetH = {
		_EventHooks: {},
		_DelegateHooks: {},

		/** 
		 * 事件执行入口
		 * @method	fireHandler
		 * @private
		 * @param	{Element}	el			触发事件对象
		 * @param	{event}		event		事件对象
		 * @param	{function}	handler		事件委托
		 * @param	{string}	sEvent		处理前事件名称
		 * @return	{object}	事件委托执行结果
		 */
		fireHandler: function(el, e, handler, sEvent) {
			var ew = new QW.EventW(e);
			return handler.call(el, ew);
		},

		/**
		 * 添加事件监听
		 * @method	addEventListener
		 * @param	{Element}	el	监听目标
		 * @param	{string}	sEvent	事件名称
		 * @param	{function}	handler	事件处理程序
		 * @param	{bool}		capture	(Optional)是否捕获非ie才有效
		 * @return	{void}
		 */
		addEventListener: (function() {
			if (document.addEventListener) {
				return function(el, sEvent, handler, capture) {
					el.addEventListener(sEvent, handler, capture || false);
				};
			} else {
				return function(el, sEvent, handler) {
					el.attachEvent('on' + sEvent, handler);
				};
			}
		}()),

		/**
		 * 移除事件监听
		 * @method	removeEventListener
		 * @private
		 * @param	{Element}	el	监听目标
		 * @param	{string}	sEvent	事件名称
		 * @param	{function}	handler	事件处理程序
		 * @param	{bool}		capture	(Optional)是否捕获非ie才有效
		 * @return	{void}
		 */
		removeEventListener: (function() {
			if (document.removeEventListener) {
				return function(el, sEvent, handler, capture) {
					el.removeEventListener(sEvent, handler, capture || false);
				};
			} else {
				return function(el, sEvent, handler) {
					el.detachEvent('on' + sEvent, handler);
				};
			}
		}()),

		/** 
		 * 添加对指定事件的监听
		 * @method	on
		 * @param	{Element}	el	监听目标
		 * @param	{string}	sEvent	事件名称
		 * @param	{function}	handler	事件处理程序
		 * @return	{boolean}	事件是否监听成功
		 */
		on: function(el, sEvent, handler) {
			el = g(el);
			var hooks = EventTargetH._EventHooks[sEvent];
			if (hooks) {
				for (var i in hooks) {
					var _listener = listener(el, i, handler, sEvent);
					EventTargetH.addEventListener(el, i, _listener);
					Cache.add(_listener, el, i, handler);
				}
			} else {
				_listener = listener(el, sEvent, handler);
				EventTargetH.addEventListener(el, sEvent, _listener);
				Cache.add(_listener, el, sEvent, handler);
			}
		},

		/** 
		 * 移除对指定事件的监听
		 * @method	un
		 * @param	{Element}	el	移除目标
		 * @param	{string}	sEvent	(Optional)事件名称
		 * @param	{function}	handler	(Optional)事件处理程序
		 * @return	{boolean}	事件监听是否移除成功
		 */
		un: function(el, sEvent, handler) {
			el = g(el);
			var hooks = EventTargetH._EventHooks[sEvent];
			if (hooks) {
				for (var i in hooks) {
					var _listener = listener(el, i, handler, sEvent);
					EventTargetH.removeEventListener(el, i, _listener);
					Cache.remove(el, i, handler);
				}
			} else {
				_listener = listener(el, sEvent, handler);
				EventTargetH.removeEventListener(el, sEvent, _listener);
				Cache.remove(el, sEvent, handler);
			}
		},

		/** 
		 * 添加事件委托
		 * @method	delegate
		 * @param	{Element}	el		被委托的目标
		 * @param	{string}	selector	委托的目标
		 * @param	{string}	sEvent		事件名称
		 * @param	{function}	handler		事件处理程序
		 * @return	{boolean}	事件监听是否移除成功
		 */
		delegate: function(el, selector, sEvent, handler) {
			el = g(el);
			var hooks = EventTargetH._DelegateHooks[sEvent];
			if (hooks) {
				for (var i in hooks) {
					var _listener = delegateListener(el, selector, i, handler, sEvent);
					EventTargetH.addEventListener(el, i, _listener, true);
					Cache.add(_listener, el, i, handler, selector);
				}
			} else {
				_listener = delegateListener(el, selector, sEvent, handler);
				EventTargetH.addEventListener(el, sEvent, _listener, true);
				Cache.add(_listener, el, sEvent, handler, selector);
			}
		},

		/** 
		 * 移除事件委托
		 * @method	undelegate
		 * @param	{Element}	el		被委托的目标
		 * @param	{string}	selector	(Optional)委托的目标
		 * @param	{string}	sEvent		(Optional)事件名称
		 * @param	{function}	handler		(Optional)事件处理程序
		 * @return	{boolean}	事件监听是否移除成功
		 */
		undelegate: function(el, selector, sEvent, handler) {
			el = g(el);
			var hooks = EventTargetH._DelegateHooks[sEvent];
			if (hooks) {
				for (var i in hooks) {
					var _listener = delegateListener(el, selector, i, handler, sEvent);
					EventTargetH.removeEventListener(el, i, _listener);
					Cache.remove(el, i, handler, selector);
				}
			} else {
				_listener = delegateListener(el, selector, sEvent, handler);
				EventTargetH.removeEventListener(el, sEvent, _listener);
				Cache.remove(el, sEvent, handler, selector);
			}
		},

		/** 
		 * 触发对象的指定事件
		 * @method	fire
		 * @param	{Element}	el	要触发事件的对象
		 * @param	{string}	sEvent	事件名称
		 * @return	{void}
		 */
		fire: function(el, sEvent) {
			el = g(el);
			if (el.fireEvent) {
				return el.fireEvent('on' + sEvent);
			} else {
				var evt = null,
					doc = el.ownerDocument || el;
				if (/mouse|click/i.test(sEvent)) {
					evt = doc.createEvent('MouseEvents');
					evt.initMouseEvent(sEvent, true, true, doc.defaultView, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
				} else {
					evt = doc.createEvent('Events');
					evt.initEvent(sEvent, true, true, doc.defaultView);
				}
				return el.dispatchEvent(evt);
			}
		}
	};

	EventTargetH._defaultExtend = function() {
		var extend = function(types) {
			function extendType(type) {
				EventTargetH[type] = function(el, handler) {
					if (handler) {
						EventTargetH.on(el, type, handler);
					} else {
						(el[type] && el[type]()) || EventTargetH.fire(el, type);
					}
				};
			}
			for (var i = 0, l = types.length; i < l; ++i) {
				extendType(types[i]);
			}
		};

		/** 
		 * 绑定对象的click事件或者执行click方法
		 * @method	click
		 * @param	{Element}	el	要触发事件的对象
		 * @param	{function}	handler	(Optional)事件委托
		 * @return	{void}
		 */


		/** 
		 * 绑定对象的submit事件或者执行submit方法
		 * @method	submit
		 * @param	{Element}	el	要触发事件的对象
		 * @param	{function}	handler	(Optional)事件委托
		 * @return	{void}
		 */

		/** 
		 * 绑定对象的focus事件或者执行focus方法
		 * @method	focus
		 * @param	{Element}	el	要触发事件的对象
		 * @param	{function}	handler	(Optional)事件委托
		 * @return	{void}
		 */

		/** 
		 * 绑定对象的blur事件或者执行blur方法
		 * @method	blur
		 * @param	{Element}	el	要触发事件的对象
		 * @param	{function}	handler	(Optional)事件委托
		 * @return	{void}
		 */

		extend('submit,reset,click,focus,blur,change'.split(','));
		EventTargetH.hover = function(el, enter, leave) {
			el = g(el);
			EventTargetH.on(el, 'mouseenter', enter);
			EventTargetH.on(el, 'mouseleave', leave || enter);
		};


		var UA = navigator.userAgent;
		if (/firefox/i.test(UA)) {
			EventTargetH._EventHooks.mousewheel = EventTargetH._DelegateHooks.mousewheel = {
				'DOMMouseScroll': function(e) {
					return true;
				}
			};
		}
		mix(EventTargetH._EventHooks, {
			'mouseenter': {
				'mouseover': function(el, e) {
					var relatedTarget = e.relatedTarget || e.fromElement;
					if (!relatedTarget || !(el.contains ? el.contains(relatedTarget) : (el.compareDocumentPosition(relatedTarget) & 17))) {
						//relatedTarget为空或不被自己包含
						return true;
					}
				}
			},
			'mouseleave': {
				'mouseout': function(el, e) {
					var relatedTarget = e.relatedTarget || e.toElement;
					if (!relatedTarget || !(el.contains ? el.contains(relatedTarget) : (el.compareDocumentPosition(relatedTarget) & 17))) {
						//relatedTarget为空或不被自己包含
						return true;
					}
				}
			}
		});
		mix(EventTargetH._DelegateHooks, EventTargetH._EventHooks);
		if (!document.addEventListener) {
			function getElementVal(el) {
				switch (el.type) {
				case 'checkbox':
				case 'radio':
					return el.checked;
				case "select-multiple":
					var vals = [],
						opts = el.options;
					for (var j = 0; j < opts.length; ++j) {
						if (opts[j].selected) {vals.push(opts[j].value); }
					}
					return vals.join(',');
				default:
					return el.value;
				}
			}
			function specialChange(el, e) {
				var target = e.target || e.srcElement;
				//if(target.tagName == 'OPTION') target = target.parentNode;
				if (' INPUT TEXTAREA SELECT BUTTON'.indexOf(target.tagName)) {
					if (getElementVal(target) != target.__QWETH_pre_val) {
						return true;
					}
				}
			}
			mix(EventTargetH._DelegateHooks, {
				'change': {
					'focusin': function(el, e) {
						var target = e.target || e.srcElement;
						//if(target.tagName == 'OPTION') target = target.parentNode;
						if (' INPUT TEXTAREA SELECT BUTTON'.indexOf(target.tagName)) {
							target.__QWETH_pre_val = getElementVal(target);
						}
					},
					'deactivate': specialChange,
					'focusout': specialChange,
					'click': specialChange
				},
				'focus': {
					'focusin': function(el, e) {
						var target = e.target || e.srcElement;
						if (' INPUT TEXTAREA SELECT BUTTON'.indexOf(target.tagName)) {
							return true;
						}
					}
				},
				'blur': {
					'focusout': function(el, e) {
						var target = e.target || e.srcElement;
						if (' INPUT TEXTAREA SELECT BUTTON'.indexOf(target.tagName)) {
							return true;
						}
					}
				}
			});
		}
	};

	EventTargetH._defaultExtend(); //JK: 执行默认的渲染。另：solo时如果觉得内容太多，可以去掉本行进行二次solo
	QW.EventTargetH = EventTargetH;

}());