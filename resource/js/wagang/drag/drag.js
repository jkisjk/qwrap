/*
	Copyright QWrap
	version: $version$ $release$ released
	author: JK
*/


(function() {

	var mix = QW.ObjectH.mix,
		lazyApply = QW.FunctionH.lazyApply,
		DomU = QW.DomU,
		createElement = DomU.createElement,
		NodeH = QW.NodeH,
		EventTargetH = QW.EventTargetH,
		on = EventTargetH.addEventListener,
		un = EventTargetH.removeEventListener,
		delegate = EventTargetH.delegate,
		ancestorNode = NodeH.ancestorNode,
		getCurrentStyle = NodeH.getCurrentStyle,
		setStyle = NodeH.setStyle,
		getRect = NodeH.getRect,
		setRect = NodeH.setRect,
		addClass = NodeH.addClass,
		removeClass = NodeH.removeClass,
		marginWidth = NodeH.marginWidth,
		EventH = QW.EventH,
		target = EventH.getTarget,
		preventDefault = EventH.preventDefault,
		pageX = EventH.getPageX,
		pageY = EventH.getPageY,
		CustEvent = QW.CustEvent;

	/**
	 * @class DragManager 是一个全局的拖动管理器。
	 * 每次只能有一个拖动在进行。
	 * 这个拖动的对象：oDrag。
	 * DragManager只对oDrag的三个Drag方法进调用，这三个方法是：
	 * ----dragstart
	 * ----drag
	 * ----dragend
	 * 程序员可以通过startDrag(e,oDrag)来委托DragManager开始管理一个拖动，直到有mouseup时，DragManager会终止对这个oDrag的管理。
	 * 本文件已实现三种oDrag,即：
	 * ----SimpleDrag，简单拖动个体对象。（SimpleResize是SimpleDrag的延伸）
	 * ----RectSelector，方框选择器
	 * ----LayoutDrag，布局拖动
	 */
	var DragManager = {
		isDragging: false,
		oDrag: null,	//当前被拖动的Drag对象。
		startDate: null,	//拖动开始时间
		startX: 0,	//拖动X坐标
		startY: 0,	//拖动Y坐标
		pageX: 0,	//pageX
		pageY: 0,	//pageY
		deltaX: 0,	//相对于起始，X的变化
		deltaY: 0,	//相对于起始，Y的变化
		deltaDeltaX: 0,	//相对于上一次mousemove，X的变化。（例如，本值大于0,表示鼠标在向右移）
		deltaDeltaY: 0,	//相对于上一次mousemove，Y的变化
		mouseDownTarget: null,	//mouseDown的对象
		startDrag: function(e, oDrag) {} //把一个Drag对象委托给DragManager管理。
	};

	(function() {
		var mouseD = function(e) {//mouseDown
			var obj = DragManager.oDrag;
			if (DragManager.isDragging || !obj) return;
			DragManager.isDragging = true;
			on(document, 'mousemove', mouseM);
			on(document, 'mouseup', mouseU);
			DragManager.startDate = new Date();
			DragManager.deltaX = DragManager.deltaY = DragManager.deltaDeltaX = DragManager.deltaDeltaY = 0;
			DragManager.startX = DragManager.pageX = pageX(e);
			DragManager.startY = DragManager.pageY = pageY(e);
			DragManager.mouseDownTarget = target(e);
			preventDefault(e);
			obj.dragstart(e); //调用Drag对象的dragstart方法
		};
		var mouseU = function(e) {//mouseUp
			var obj = DragManager.oDrag;
			if (!DragManager.isDragging || !obj) return;
			obj.dragend(e); //调用Drag对象的dragend方法
			DragManager.isDragging = false;
			DragManager.oDrag = null;
			un(document, 'mousemove', mouseM);
			un(document, 'mouseup', mouseU);
		};
		var mouseM = function(e) {//mouseMove
			var obj = DragManager.oDrag;
			if (!DragManager.isDragging || !obj) return;
			var x = pageX(e);
			var y = pageY(e);
			DragManager.deltaDeltaX = x - DragManager.pageX;
			DragManager.deltaDeltaY = y - DragManager.pageY;
			DragManager.pageX = x;
			DragManager.pageY = y;
			DragManager.deltaX = x - DragManager.startX;
			DragManager.deltaY = y - DragManager.startY;
			obj.drag(e); //调用Drag对象的drag方法
		};
		DragManager.startDrag = function(e, oDrag) {
			DragManager.oDrag = oDrag;
			mouseD(e);
		};
	}());

	/**
	 * @class SimpleDrag 简单拖动
	 * @namespace QW
	 * @constructor
	 * @param {json} opts - 其它参数， 
		---目前只支持以下参数：
		{Element} oSrc 被拖动的节点对象
		{Element} oHdl 启动拖动事件的触发节点
		{Element} delegateContainer 代理拖动的容器。如果此属性为空，则为代理拖动。代理拖动情况下的oSrc与oHdl为即时获取。
		{string} oHdlSelector 代理拖动情况下，启动拖动事件的触发节点的selector
		{string} oSrcSelector 代理拖动情况下，通过oHdl找到oSrc。如果为空，则this.oSrc=this.oHdl；否则this.oSrc=ancestorNode(this.oHdl,selector)
		{Element} oProxy 拖动虚框节点
		{string} xAttr 拖动的x属性，默认为'left'
		{string} yAttr 拖动的y属性，默认为'top'
		{int} maxXAttr 最大x属性值
		{int} minXAttr 最小x属性值
		{int} maxYAttr 最大y属性值
		{int} minYAttr 最小y属性值
		{boolean} xFixed x属性固定，默认为false
		{boolean} yFixed x属性固定，默认为false
		{boolean} withProxy: false,
	 * @returns {SimpleDrag} 
	 */

	function SimpleDrag(opts) {
		mix(this, opts, 1);
		if (!this.lazyRender) this.render();
	}

	(function() {
		SimpleDrag.EVENTS = ['dragstart', 'drag', 'dragend'];
		var $F = function(s) {
			return parseFloat(s) || 0;
		};
		SimpleDrag.prototype = {
			oSrc: null,
			oHdl: null,
			oProxy: null,
			xAttr: 'left',
			yAttr: 'top',
			maxXAttr: null,
			minXAttr: null,
			maxYAttr: null,
			minYAttr: null,
			xFixed: false,
			yFixed: false,
			withProxy: false,
			getProxy: (function() {
				var proxy = null;
				return function() {
					var el = this.oProxy || proxy;
					if (!el) {
						el = createElement('div', {
							className: 'proxy-dd'
						});
						document.body.appendChild(el);
						el.style.display = 'none';
					}
					return this.oProxy = el;
				};
			}()),

			dragstart: function(e) {
				var me = this;
				if (me.oHdl.setCapture) me.oHdl.setCapture();
				me.startXAttr = $F(getCurrentStyle(me.oSrc, me.xAttr.replace(/^-/,'')));
				me.startYAttr = $F(getCurrentStyle(me.oSrc, me.yAttr.replace(/^-/,'')));
				if (me.withProxy) {
					var proxy = me.getProxy();
					var rect = getRect(me.oSrc);
					setRect(proxy, rect.left, rect.top, rect.width, rect.height, false);
					me.startXAttrProxy = $F(proxy.style[me.xAttr.replace(/^-/,'')]);
					me.startYAttrProxy = $F(proxy.style[me.yAttr.replace(/^-/,'')]);
					proxy.__deltaX = proxy.__deltaY = 0;
					lazyApply(
						function() {
							proxy.style.display = 'block';
						},
						null, 
						[], 
						20, 
						function() {
							if (me != DragManager.oDrag || proxy.style.display != 'none') return -1;
							if (DragManager.deltaX * DragManager.deltaX + DragManager.deltaY * DragManager.deltaY > 4 || (new Date() - DragManager.startDate) > 500) return 1;
							return 0;
						}
					);
				}
				me.fire('dragstart');
			},
			drag: function(e) {
				//修正delta. 
				var me = this,
					dirs = {
						X: 1,
						Y: 1
					};
				for (var i in dirs) {
					var iLow = i.toLowerCase();
					if (!me[iLow + 'Fixed']) {
						var delta = (me[iLow+'Attr'].indexOf('-') == 0 ? -1 : 1) * DragManager['delta' + i];
						if (me['max' + i + 'Attr'] != null) delta = Math.min(delta, me['max' + i + 'Attr'] - me['start' + i + 'Attr']);
						if (me['min' + i + 'Attr'] != null) delta = Math.max(delta, me['min' + i + 'Attr'] - me['start' + i + 'Attr']);
						if (me.withProxy) {
							try { //由于proxy带border,所以算出来的proxy宽度或高度有可能小于0，导致IE报错，所以try一下。
								setStyle(me.oProxy, me[iLow + 'Attr'], (me['start' + i + 'AttrProxy'] + delta) + 'px');
							} catch (ex) {}
							me.oProxy['__delta' + i] = delta;
						} else {
							setStyle(me.oSrc, me[iLow + 'Attr'].replace(/^-/,''), (me['start' + i + 'Attr'] + delta) + 'px');
						}
					}
				}
				me.fire('drag');
			},
			dragend: function(e) {
				var me = this;
				if (me.oHdl.releaseCapture) me.oHdl.releaseCapture();
				if (me.withProxy) {
					var proxy = me.oProxy;
					proxy.style.display = 'none';
					if (!me.xFixed) setStyle(me.oSrc, me.xAttr.replace(/^-/,''), (me.startXAttr + proxy.__deltaX) + 'px');
					if (!me.yFixed) setStyle(me.oSrc, me.yAttr.replace(/^-/,''), (me.startYAttr + proxy.__deltaY) + 'px');
				}
				me.fire('dragend');
			},
			render: function() {
				var me = this;
				if (me._rendered) return;
				CustEvent.createEvents(me, SimpleDrag.EVENTS);
				if (me.delegateContainer) {
					delegate(me.delegateContainer, me.oHdlSelector, 'mousedown', function(e) {
						me.oHdl = this;
						if(me.oSrcSelector){
							me.oSrc = ancestorNode(this, me.oSrcSelector);
						}
						else {
							me.oSrc = me.oHdl;
						}
						DragManager.startDrag(e, me);
					});
				}
				else {
					me.oHdl = me.oHdl || me.oSrc;
					on(me.oHdl, 'mousedown', function(e) {
						DragManager.startDrag(e, me);
					});
				}
				me._rendered = true;
			}
		};
	}());

	/**
	 * @class SimpleResize 简单大小调整
	 * @namespace QW
	 * @constructor
	 * @param {json} opts - 其它参数， 
		---参考SimpleDrap的相关参数，不同的是，以下四项的默认值有变化：
		{string} xAttr 拖动的x属性，默认为'width'
		{string} yAttr 拖动的y属性，默认为'height'
		{int} minXAttr 最小x属性值，默认为0
		{int} minYAttr 最小y属性值，默认为0
	 * @returns {SimpleResize} 
	 */
	function SimpleResize(opts) {
		SimpleDrag.call(this, opts);
	}

	(function() {
		SimpleResize.MENTOR_CLASS = SimpleDrag;
		SimpleResize.prototype = {
			xAttr: 'width',
			yAttr: 'height',
			minXAttr: 0,
			minYAttr: 0
		};
		mix(SimpleResize.prototype, SimpleDrag.prototype);
	}());


	/**
	 * @class RectSelector 方框选择器，用户需要在ondrag里处理真正的选择。
	 * @namespace QW
	 * @constructor
	 * @param {json} opts - 其它参数， 
		---目前只支持以下参数：
		{Element} oHdl 启动选择框的触发节点
		{Element} oProxy 拖动虚框节点，默认自动创建
	 * @returns {RectSelector} 
	 */

	function RectSelector(opts) {
		mix(this, opts, 1);
		if (!this.lazyRender) this.render();
	}

	(function() {
		RectSelector.EVENTS = ['dragstart', 'drag', 'dragend'];
		RectSelector.prototype = {
			oProxy: null,
			oHdl: null,
			getProxy: (function() {
				var proxy = null;
				return function() {
					var el = this.oProxy || proxy;
					if (!el) {
						el = createElement('div', {
							className: 'proxy-rectselector'
						});
						document.body.appendChild(el);
						el.style.display = 'none';
					}
					return this.oProxy = el;
				};
			}()),
			dragstart: function(e) {
				this.oProxy = this.getProxy();
				this.oProxy.style.display = "block";
				if (this.oHdl.setCapture) this.oHdl.setCapture();
				setRect(this.oProxy, DragManager.startX, DragManager.startY, 1, 1);
				this.fire('dragstart');
			},
			drag: function(e) {
				setRect(this.oProxy, Math.min(DragManager.startX, DragManager.pageX), Math.min(DragManager.startY, DragManager.pageY), Math.abs(DragManager.deltaX), Math.abs(DragManager.deltaY));
				this.fire('drag');
			},
			dragend: function(e) {
				if (this.oHdl.releaseCapture) this.oHdl.releaseCapture();
				this.oProxy.style.display = 'none';
				this.fire('dragend');
			},
			render: function() {
				var me = this;
				if (me._rendered) return;
				CustEvent.createEvents(me, RectSelector.EVENTS);
				on(me.oHdl, 'mousedown', function(e) {
					if (target(e) == me.oHdl) {
						DragManager.startDrag(e, me);
					}
				});
				me._rendered = true;
			}
		};
	}());


	/**
	 * @class LayoutDrag 布局拖动调整
	 * @namespace QW
	 * @constructor
	 * @param {json} opts - 其它参数， 
		---除了支持SimpleDrap的相关参数外，还支持支持以下参数：
		{boolean} isInline 是否是inline的模块，默认为false
		{array|collection} siblings “目的地”的参考位置对象，表示“目的地”是该对象的前面或后面
		{array|collection} containers “目的地”的容器对象，表示“目的地”是该对象里面。
	 * @returns {LayoutDrag} 
	 */
	function LayoutDrag(opts) {
		SimpleDrag.call(this, opts);
	}

	(function() {
		LayoutDrag.MENTOR_CLASS = SimpleDrag;
		LayoutDrag.prototype = {
			withProxy: true,
			isInline: false,
			//是否是inline的Layout.
			dragstart: function(e) {
				addClass(this.oSrc, 'dragingModule');
				SimpleDrag.prototype.dragstart.call(this, e);
			},
			dragend: function(e) {
				removeClass(this.oSrc, 'dragingModule');
				SimpleDrag.prototype.dragend.call(this, e);
			},
			/**
			 * adjustLayout(custEvent): 默认的调整模块位置函数，
			 */
			adjustLayout: function(custEvent) {
				var me = this,
					x = DragManager.pageX,
					y = DragManager.pageY,
					siblings = me.siblings,
					containers = me.containers,
					posAttr = me.isInline ? 'deltaDeltaX' : 'deltaDeltaY',
					rect;
				if (custEvent.type == 'dragstart') {
					if (me.__elAnim) { //如果有动画，则停止动画
						me.__elAnim.pause();
					}
				} else if (custEvent.type == 'drag') {
					if (containers || siblings) {
						var adjusted = false;
						//节约一点CPU
						rect = getRect(me.oSrc);
						var margins = marginWidth(me.oSrc);
						if (x >= rect.left - margins[3] && x <= rect.right + margins[1] && y >= rect.top - margins[0] && y <= rect.bottom + margins[2]) {
							return;
						}
						for (var i = 0; siblings != null && i < siblings.length; i++) {
							var obj = siblings[i];
							if (obj == me.oSrc) continue;
							rect = getRect(obj);
							margins = marginWidth(obj);
							if (x >= rect.left - margins[3] && x <= rect.right + margins[1] && y >= rect.top - margins[0] && y <= rect.bottom + margins[2]) {
								if (DragManager[posAttr] > 0) obj.parentNode.insertBefore(me.oSrc, obj.nextSibling);
								else if (DragManager[posAttr] < 0) obj.parentNode.insertBefore(me.oSrc, obj);
								adjusted = true;
								break;
							}
						}
						for (var i = 0; !adjusted && containers != null && i < containers.length; i++) {
							obj = containers[i];
							rect = getRect(obj);
							if (x > rect.left + 1 && x < rect.right - 1 && y > rect.top + 1 && y < rect.bottom - 1) {
								if (obj.lastChild != me.oSrc) {
									obj.appendChild(me.oSrc);
									adjusted = true;
								}
								break;
							}
						}
						if (adjusted && me.oHdl.setCapture) me.oHdl.setCapture();
					}
				}
				if (custEvent.type == 'dragend') {
					if (me.needAnim && QW.ElAnim) {
						rect = getRect(me.oSrc);
						me.oProxy.style.display = 'block';
						var elAnim = new QW.ElAnim(me.oProxy, {
								width: {
									to: rect.width
								},
								height: {
									to: rect.height
								},
								left: {
									to: rect.left
								},
								top: {
									to: rect.top
								}
							}, 300);
						elAnim.on('end', function() {
							me.oProxy.style.display = 'none';
						});
						elAnim.play();
						me.oProxy.__elAnim = elAnim;
					}
				}
			},
			render: function() {
				var me = this;
				SimpleDrag.prototype.render.call(me);
				var adjustLayout = me.adjustLayout;
				if (adjustLayout) {
					me.on('dragstart', adjustLayout);
					me.on('drag', adjustLayout);
					me.on('dragend', adjustLayout);
				}
			}
		};
		mix(LayoutDrag.prototype, SimpleDrag.prototype);

	}());


	QW.provide({
		DragManager: DragManager,
		SimpleDrag: SimpleDrag,
		SimpleResize: SimpleResize,
		LayoutDrag: LayoutDrag,
		RectSelector: RectSelector
	});

}()); 