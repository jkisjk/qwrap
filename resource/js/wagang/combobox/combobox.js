(function() {
	var mix = QW.ObjectH.mix,
		DomU = QW.DomU,
		createElement = DomU.createElement,
		EventH = QW.EventH,
		target = EventH.getTarget,
		keyCode = EventH.getKeyCode,
		preventDefault = EventH.preventDefault,
		CustEvent = QW.CustEvent,
		NodeH = QW.NodeH,
		addClass = NodeH.addClass,
		removeClass = NodeH.removeClass,
		setStyle = NodeH.setStyle,
		getXY = NodeH.getXY,
		ancestorNode = NodeH.ancestorNode,
		on = QW.EventTargetH.addEventListener,
		isIe = (/msie/i).test(navigator.userAgent);

	function encode4Html(s) {
		var o = [/&/g, /"/g, /'/g, /</g, />/g];
		var n = ["&amp;", "&quot;", "&#039;", "&lt;", "&gt;"];
		for (var i = 0; i < o.length; i++) {
			s = s.replace(o[i], n[i]);
		}
		return s;
	}

	/**
	 *@class ComboBox 可输入下拉框 
	 */
	function ComboBox(opts) {
		mix(this, opts, 1);
		if (!this.lazyRender) this.render();
	}

	ComboBox.EVENTS = ["enter", "selectitem"];

	ComboBox.prototype = {
/*
		*参数
		*/
		width: 0,
		oText: null,
		//text-input对象
		itemsData: null,
		//items数据，array，需要在refreshData方法里进行设值
		minFilterLen: 1,
		//最小filter长度。当oText.value不小于此值时，才会有suggest效果
/*
		*开放的变量，readOnly的
		*/
		oMenu: null,
		oToolbar: null,
		//控制行，目前只有关闭按钮
		oWrap: null,
		selectedIndex: -1,
		//当前选中项
		filteredValue: "",
		//过滤值。过滤动作已完成
		filteringValue: "",
		//过滤值。过滤动作正在进行（因为有时过滤是异步的）
		acValue: "",
		//通过自动完成得到的值 
		disabled: false,
		//suggest是否处于禁止状态。－－由页面逻辑决定
		closed: false,
		//suggest是否处于关闭状态。－－由suggest自身决定
/*
		*方法
		*/
		show: function() {
			if (this.oMenu.rows.length) {
				var xy = getXY(this.oText);
				setStyle(this.oWrap, {
					top: xy[1] + this.oText.offsetHeight + "px",
					left: xy[0] + "px",
					display: ""
				});
			}
		},
		hide: function() {
			this.oWrap.style.display = "none";
		},
		refreshItems: function() {
			var me = this;
			var data = me.itemsData;
			if (data && !data.__isItemsDataRendered) { //加上属性“__isItemsDataRendered”以标志data是否已经render成html
				var html = [];
				for (var i = 0; i < data.length; i++) {
					var dataType = data[i].constructor;
					if (dataType == String) { //为String时，则字符串既是value，也是html
						html.push('<tr acValue="' + encode4Html(data[i]) + '"><td>' + encode4Html(data[i]) + '</td></tr>');
					} else if (dataType == Array) { //为Array时，则第一个元素为value，第二个元素为html
						html.push('<tr acValue="' + encode4Html(data[i][0]) + '"><td>' + data[i][1] + '</td></tr>');
					} else { //为Object时，则其格式为{value:"aaab",html:"<b>aaa</b>b"}
						html.push('<tr acValue="' + encode4Html(data[i].value) + '"><td>' + data[i].html + '</td></tr>');
					}
					html.push("</tr>");
				}
				me._setMenuInnerHtml(html.join("").replace(/(<\w+)/g, '$1 unselectable="on"'));
				if (data.length) me.show();
				else me.hide();
				me.filteredValue = me.filteringValue;
				me.acValue = "";
				me.selectedIndex = -1;
				data.__isItemsDataRendered = true;
			}
		},
		refreshData: function() {
			this.itemsData = ["refreshData一定要重写！"];
		},
		setSelectedIndex: function(idx, needBlur) {
			var me = this;
			var rows = me.oMenu.rows;
			if (rows.length) {
				if (me.selectedIndex > -1) removeClass(rows[me.selectedIndex], "selected");
				idx = (idx + rows.length + 1) % (rows.length + 1);
				if (idx == rows.length) {
					me.acValue = me.oText.value = me.filteringValue; //这里用filteringValue，而不用filteredValue，是因为有时itemsData是静态的（例如，不用过滤功能的单纯ComboBox）
					idx = -1;
				} else {
					me.acValue = me.oText.value = rows[idx].getAttribute("acValue");
					addClass(rows[idx], "selected");
				}
			} else {
				idx = -1;
			}
			me.selectedIndex = idx;
		},
		_setMenuInnerHtml: function(html) {
			var div = createElement("div", {
				innerHTML: "<table>" + html + "</table>"
			});
			var rows = div.firstChild.rows;
			var oMenu = this.oMenu;
			for (var i = oMenu.childNodes.length - 1; i >= 0; i--) oMenu.removeChild(oMenu.childNodes[i]);
			while (rows.length) {
				oMenu.appendChild(rows[0]);
			}
		},
		render: function() {
			var me = this;
			if (me._rendered) return;
			me._rendered = true;
			CustEvent.createEvents(me, ComboBox.EVENTS);
			var oWrap = createElement("div", {
				className: "ac_wrap",
				innerHTML: (isIe ? '<iframe class="ac_bgIframe"></iframe>' : '') + '<div class=ac_wrap_inner><div class=ac_menu_ctn><table cellspacing=0><tbody class=ac_menu></tbody></table></div><table><tbody class=ac_toolbar><tr><td><a href=# class=close>关闭</a></div></td></tr></tbody></table></div>'.replace(/(<\w+)/g, '$1 unselectable="on"')
			});
			var b = document.body;
			b.insertBefore(oWrap, b.firstChild);
			var els = oWrap.getElementsByTagName("tbody");
			var oText = me.oText,
				oToolbar = me.oToolbar = els[1],
				oMenu = me.oMenu = els[0];
			oText.setAttribute("autoComplete", "off"); //一定要用setAttrubute，否则会导致在firefox里半输入状态下执行oText.blur()时会抛出无法捕捉的异常。
			var w = (me.width || me.oText.offsetWidth) + "px";
			if (isIe) oWrap.style.width = w;
			else oWrap.style.minWidth = w;
			me.oWrap = oWrap;
			me.hide();
			on(me.oText, "dblclick", function(e) { //监控oText的事件
				if (me.disabled || oText.value.length < me.minFilterLen) return;
				if (me.closed = !me.closed) me.hide();
				else me.show();
			});
			on(me.oText, "keydown", function(e) { //监控oText的事件
				if (me.disabled) return;
				var kCode = keyCode(e);
				var dir = 0;
				switch (kCode) {
				case 40:
					dir = 1;
					break;
				case 38:
					dir = -1;
					break;
				case 27:
					if (!me.closed) {
						me.hide();
						me.closed = true;
						preventDefault(e);
					}
					break; //隐藏suggest
				case 13:
					me.hide();
					me.fire('enter');
					break; //隐藏suggest
				}
				if (dir && oText.value.length >= me.minFilterLen) {
					preventDefault(e);
					if (oWrap.style.display == "none") {
						me.show();
						me.closed = false;
					} else {
						me.setSelectedIndex(me.selectedIndex + dir);
					}
				}
			});
			on(me.oText, "focus", function(e) { //监控oText的事件
				if (me.disabled) return;
				if (me._refreshTimer) clearInterval(me._refreshTimer);
				me._refreshTimer = setInterval(function() {
					var val = oText.value;
					if (val.length < me.minFilterLen) {
						me.acValue = me.filteringValue = me.filteredValue = "";
						me.hide();
						me.closed = false; //吸收google suggest的策略：如果suggest被关闭，用户将oText清空，这时会将suggest打开。
					} else if (!me.closed) {
						if (val != me.filteredValue && val != me.filteringValue && val != me.acValue) {
							me.filteringValue = val;
							me.refreshData();
						}
						if (me.itemsData) {
							me.refreshItems();
						}
					}
				}, 100);
			});
			on(me.oText, "blur", function(e) { //监控oText的事件
				me.hide();
				clearInterval(me._refreshTimer);
			});
			oWrap.onmousedown = function(e) { //监控oWrap的事件
				if (isIe) {
					oText.setCapture();
					setTimeout(function() {
						oText.releaseCapture();
					}, 10);
				} //解决“IE下，半输入状态时不能点击选项”的问题
				preventDefault(e);
			};
			oMenu.onclick = function(e) { //监控oMenu的事件
				var el = target(e);
				var tr = ancestorNode(el, "TR");
				if (tr) {
					oText.blur(); //Firefox下半输入法输入时，选择item，console有错，无法catch，并且不影响运行。
					setTimeout(function() {
						oText.focus();
					}, 10); //解决“半输入状态时不能点击选项”的问题
					me.setSelectedIndex(tr.rowIndex, true);
					me.hide();
					me.fire('selectitem');
				}
			};
			oMenu.onmouseover = function(e) { //监控oMenu的事件
				var el = target(e);
				var tr = ancestorNode(el, "TR");
				if (tr) addClass(tr, "mouseover");
			};
			oMenu.onmouseout = function(e) { //监控oMenu的事件
				var el = target(e);
				var tr = ancestorNode(el, "TR");
				if (tr) removeClass(tr, "mouseover");
			};
			oToolbar.getElementsByTagName("a")[0].onclick = function(e) { //监控close按钮的事件
				me.closed = true;
				me.hide();
				preventDefault(e);
			};
		}
	};

	QW.provide('ComboBox', ComboBox);
}());