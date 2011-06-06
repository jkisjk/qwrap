/*
Editor改版说明(2008-12-03)：
1.添加对Safari,Opera,Chrome的支持
2.强化tab的配置，强化toobaritem的配置
3.调整editor的html dom结构，修改部分className
4.去掉popupLayer，改用Panel.js里的LayerPopup
5.部分代码调整
6.其它
*/




(function() {
	var Browser = QW.Browser,
		DomU = QW.DomU,
		getDocRect = DomU.getDocRect,
		createElement = DomU.createElement,
		NodeH = QW.NodeH,
		on = QW.EventTargetH.addEventListener,
		un = QW.EventTargetH.removeEventListener,
		fire = QW.EventTargetH.fire,
		getElementsByClass = NodeH.getElementsByClass,
		hasClass = NodeH.hasClass,
		addClass = NodeH.addClass,
		removeClass = NodeH.removeClass,
		hide = NodeH.hide,
		show = NodeH.show,
		contains = NodeH.contains,
		getRect = NodeH.getRect,
		EventH = QW.EventH,
		target = EventH.getTarget,
		preventDefault = EventH.preventDefault,
		keyCode = EventH.getKeyCode;

	/**
	 * @class Editor 编辑器
	 * @constructor
	 * @namespace QW
	 * @param  {Json} opts, 编辑器的其它配置属性，目前只支持：
	 container: {HTMLElement}, 编辑器的外部容器
	 textarea: {Textarea HTMLElement} 编辑器的源文件textarea, 用来初始化／显示编辑内容的源代码
	 height: {int} 高度px值.
	 insertImgUrl,指定添加图片的对话框URL，默认为空，为空时只能外链图片;
	 tiConfig,数组或字符串，用于配置编辑器的功能按钮。如果是字符串，则把它当key，来从Editor.tiConfigs里取对应的tiConfig的数组;
	 * @return {Editor} 返回Editor实例
	 */

	function Editor(options) {
		this.options = options;
		if (!this.lazyRender) this.render();
	}
	/**
	 *@static activeInstance: 当前活跃的实例。
	 */
	Editor.activeInstance = null;
	Editor.editorPath = QW.PATH + 'wagang/editor/';

	var _enable = function(el) {
		removeClass(el, 'disabled');
	},
		_disable = function(el) {
			removeClass(el, 'active');
			removeClass(el, 'mouseover');
			addClass(el, 'disabled');
		},
		_activate = function(el) {
			addClass(el, 'active');
		},
		_deactivate = function(el) {
			removeClass(el, 'active');
		},
		_tiUp = function(e, el) {
			el = el || this;
			removeClass(el, 'mousedown');
		},
		_tiDown = function(e, el) {
			el = el || this;
			if (!hasClass(el, 'disabled')) addClass(el, 'mousedown');
		},
		_tiOut = function(e, el) {
			el = el || this;
			removeClass(el, 'mouseover');
			removeClass(el, 'mousedown');
		},
		_tiOver = function(e, el) {
			el = el || this;
			if (!hasClass(el, 'disabled')) addClass(el, 'mouseover');
		},
		_tiClick = function(e, el, editor) {
			Editor.activeInstance = editor;
			if (!hasClass(el, 'disabled')) {
				var tiKey = el.getAttribute('tiKey');
				Editor.EditorCmd['ti' + tiKey](e, el, editor);
			}
		};
	/**
	 *TiConfigs: 一些常用ToolbarItem配置
	 */
	Editor.TiConfigs = {
		full: 'Undo,Redo,,Bold,Italic,Underline,FontName,FontSize,ForeColor,BackColor,RemoveFormat,,JustifyLeft,JustifyCenter,JustifyRight,,OrderedList,UnorderedList,,Link,UnLink,Image,Face,Character',
		youa: 'Undo,Redo,,Bold,Italic,Underline,FontName,FontSize,ForeColor,BackColor,RemoveFormat,,JustifyLeft,JustifyCenter,JustifyRight,,OrderedList,UnorderedList,,Image,Face,Character',
		jk: 'Undo,Redo,,Bold,Italic,Underline,FontName,FontSize,ForeColor,BackColor,RemoveFormat,,Face,Character'
	};

	/**
	 *_editorHeadHtml: 编辑器里面的header.
	 */
	Editor._editorHeadHtml = '<head><style type="text/css">body{background-color:#FFFFFF; font:16px Geneva,Arial,sans-serif; margin:2px;} p{margin:0px;}</style></head>';

	/**
	 *ToolbarItems: {Json} ToolbarItem数组
	 */
	Editor.ToolbarItems = {
		//['className','title',disabled,'innerHTML',accessKey,needCtrlStatus]
		Undo: ['Undo', '撤消', 1, , 'z', 1],
		Redo: ['Redo', '重做', 1, , 'y', 1],
		Bold: ['Bold', '加粗', , , 'b', 1],
		Italic: ['Italic', '斜体', , , 'i', 1],
		Underline: ['Underline', '下划线', , , 'u', 1],
		FontName: ['FontName', '字体', , '<span class=img>字体</span>', , 1],
		FontSize: ['FontSize', '字号', , '<div class=img>字号</div>', , 1],
		ForeColor: ['ForeColor', '文本颜色'],
		BackColor: ['BackColor', '背景颜色'],
		RemoveFormat: ['RemoveFormat', '清除格式'],
		JustifyLeft: ['AlignLeft', '左对齐', , , , 1],
		JustifyCenter: ['AlignCenter', '居中对齐', , , , 1],
		JustifyRight: ['AlignRight', '右对齐', , , , 1],
		OrderedList: ['NList', '编号列表', , , , 1],
		UnorderedList: ['BList', '符号列表', , , , 1],
		Link: ['Link', '添加/修改超链接'],
		UnLink: ['UnLink', '删除超链接', 1, , , 1],
		Image: ['Image', '插入/编辑图片'],
		Face: ['Face', '插入表情'],
		Character: ['Character', '插入特殊字符']
	};
	var _tiHtml = function(key) {
		if (!key) return '<div class="divider"><div class="img">&nbsp;</div></div>';
		var ti = Editor.ToolbarItems[key];
		return '<div title="' + ti[1] + '" class="ti ' + ti[0] + (ti[2] ? ' disabled' : '') + '" tiKey="' + key + '" >' + (ti[3] || '<div class="img">&nbsp;</div>') + '</div>';
	};

	Editor.prototype = {
		oCtn: null,
		oTxt: null,
		oIfm: null,
		oTabCtn: null,
		oSrcCtn: null,
		oDsnCtn: null,
		oToolbarCtn: null,
		tiMap: {},
		//记录当前Editor实例支持哪些tiKey。
		accessKeyMap: {},
		//记录accessKeyMap，事实上可以通过遍历得到，但是为效率考考虑，单独加一个map。
		statusTis: [],
		//记录哪些toolbarItem需要状态控制。
		_curMode: 'design',
		/**
		 * @method _switchMode: 切换编辑状态
		 * @return void 
		 */
		_switchMode: function(mode) {
			var me = this,
				doc = me.doc;
			if (mode == me._curMode) return;
			var tabs = this.oTabCtn.childNodes;
			if (mode == 'design') {
				doc.body.innerHTML = me.oTxt.value || Browser.firefox && '<br/>' || '';
				hide(me.oSrcCtn);
				show(me.oDsnCtn);
				addClass(tabs[0], 'selected');
				removeClass(tabs[1], 'selected');
			} else {
				var val = doc.body.innerHTML;
				if ((/^(((<p|<\/p|<br)[^>]*>)*(&nbsp;)*)*$/).test(val.replace(/&nbsp;\s*/, ''))) val = '';
				me.oTxt.value = val;
				hide(me.oDsnCtn);
				show(me.oSrcCtn);
				addClass(tabs[1], 'selected');
				removeClass(tabs[0], 'selected');
			}
			window.setTimeout(function() {
				me._focus();
			}, 10);
			me._curMode = mode;
		},
		/**
		 * @method _preview: 预览
		 * @return void 
		 */
		_preview: function() {
			var me = this;
			me.prepare4Submit();
			var win = window.open('about:blank');
			var doc = win.document;
			doc.open();
			var html = '<html>' + Editor._editorHeadHtml + '<body>' + me.oTxt.value + '</body></html>';
			doc.write(html);
			doc.close();
		},
		/**
		 * @method render: render
		 * @return void 
		 */
		render: function() {
			var me = this;
			var opts = me.options;
			if (me._rendered) return;
			//render editor structure
			{
				var oCtn = me.oCtn = g(opts.container);
				var oTxt = me.oTxt = g(opts.textarea);
				if (contains(oCtn, oTxt)) oCtn.parentNode.insertBefore(oTxt, oCtn); //如果ctn包含txt，则先把txt移到外面去;
				var html = ['<div class="js-editor">', '<div class="ctn-tab">', '<div class="tab-design tab selected">编辑文本</div>', '<div class="tab-source tab">编辑源文件</div>', '<div class="tab-preview">预览</div>', '</div>', '<div class="ctn-src" style="display:none">', '<div class="hd">', '<a class="back">返回编辑文本</a>', '</div>', '<div class="bd">', '</div>', '</div>', '<div class="ctn-dsn">', '<div class="hd">', '</div>', '<div class="bd">', '</div>', '</div>', '</div>'].join('').replace(/(<\w+)/ig, '$1  unselectable="on"');
				oCtn.innerHTML = html;
				me.oWrap = oCtn.childNodes[0];
				var els = me.oWrap.childNodes;
				me.oTabCtn = els[0];
				me.oSrcCtn = els[1];
				me.oDsnCtn = els[2];
			}
			//初始化iframe和textarea
			{
				me.oIfm = createElement('iframe', {
					frameBorder: 'no'
				});
				me.oDsnCtn.childNodes[1].appendChild(me.oIfm);
				me.win = me.oIfm.contentWindow;
				var doc = me.doc = me.win.document;
				doc.designMode = 'on';
				doc.write('<html>' + Editor._editorHeadHtml + '<body ></body></html>');
				doc.close();
				me.oSrcCtn.childNodes[1].appendChild(me.oTxt);
				show(me.oTxt);
				me.oIfm.style.height = me.oTxt.style.height = (me.options.width || 300) + 'px';
				doc.body.innerHTML = me.oTxt.value || (Browser.firefox && '<br/>') || ''; //解决FF下光标初始位置不正确的bug;
				me.prepare4Submit();
				me.defaultEditorHtml = me.oTxt.value; //记下初始值。
			}
			//初始化 tabs
			{
				var tabs = me.oTabCtn.childNodes;
				tabs[0].onclick = function(e) {
					me._switchMode('design');
				};
				tabs[1].onclick = function(e) {
					me._switchMode('source');
				};
				tabs[2].onclick = function(e) {
					me._preview();
				};
				getElementsByClass(me.oSrcCtn, 'back')[0].onclick = function(e) {
					me._switchMode('design');
				};
			}
			//初始化ToolbarItems
			{
				var tiKeys = (me.options.tiConfig || Editor.TiConfigs.full).split(',');
				var html = ['<div class="js-editor-toolbar">'];
				for (var i = 0; i < tiKeys.length; i++) {
					html.push(_tiHtml(tiKeys[i]));
				}
				html.push('</div>');
				me.oDsnCtn.childNodes[0].innerHTML = html.join('').replace(/(<\w+)/ig, '$1  unselectable="on"');
				var tiEls = getElementsByClass(me.oDsnCtn, 'ti');
				me.tiMap = {};
				me.accessKeyMap = {};
				me.statusTis = [];
				for (var i = 0; i < tiEls.length; i++) {
					var el = tiEls[i];
					el.onmousedown = _tiDown;
					el.onmouseup = _tiUp;
					el.onmouseover = _tiOver;
					el.onmouseout = _tiOut;
					el.onclick = function(e) {
						_tiClick(e, this, me);
					};
					var tiKey = el.getAttribute('tiKey');
					var ti = Editor.ToolbarItems[tiKey];
					if (ti[4]) me.accessKeyMap[ti[4]] = tiKey;
					if (ti[5]) me.statusTis.push(tiKey);
					me.tiMap[tiKey] = {
						tiKey: tiKey,
						tiEl: el
					};
				}
			}
			//初始化History,KeyDown事件等
			{
				me.editorHistory = new Editor.EditorHistory(me);
				me.editorHistory.saveUndoStep();
				initDomEvents(me);
			}
			me._rendered = true;
		},
		fireSelectionChange: function() {
			fire(this.doc, 'mouseup');
		},
		_focus: function() {
			//try{
			var me = this;
			if (me._curMode == 'design') me.win.focus();
			else me.oTxt.focus();
			//}
			//catch(e){};
		},
		focus: function() {
			//try{
			var me = this;
			me._focus();
			var p = getRect(me.oWrap);
			var rect = getDocRect();
			if (p.top < rect.scrollTop || p.bottom > rect.height + rect.scrollTop) {
				this.oWrap.scrollIntoView();
			}
			//}
			//catch(e){}
		},
		/**
		 * @method prepareToSubmit - 为提交作准备
		 * @return void 
		 */
		prepare4Submit: function() {
			var me = this;
			if (me._curMode != 'design') {
				me.doc.body.innerHTML = me.oTxt.value;
			}
			var val = me.doc.body.innerHTML;
			if ((/^((<p|<\/p|<br)[^>]*>)*$/).test(val.replace(/&nbsp;\s*/, ''))) val = '';
			me.oTxt.value = val;
		},
		setInnerHTML: function(s) {
			this.oTxt.value = s;
			this.doc.body.innerHTML = s;
		},
		isChanged: function(s) {
			this.prepare4Submit();
			return this.defaultEditorHtml != this.oTxt.value;
		},
		/**
		 * @method exec - 执行编辑器execCommand
		 * @param {string} sCommand - 命令名。
		 * @param {string} vValue - 命令值。
		 * @param {boolean} ignoreBeginHistory - 是否忽略执行命令前一刻的历史。（有时命令是由几个组合而成时会用到）
		 * @param {boolean} ignoreEndHistory - 是否忽略执行命令后一刻的历史。
		 * @return void 
		 */
		exec: function(sCommand, vValue, ignoreBeginHistory, ignoreEndHistory) {
			this._focus();
			if (!ignoreBeginHistory) this.editorHistory.saveUndoStep();
			if (sCommand) this.doc.execCommand(sCommand, false, vValue);
			if (!ignoreEndHistory) this.editorHistory.saveUndoStep();
			this.fireSelectionChange();
		},
		/**
		 * @method pasteHTML - 往编辑器里贴一段HTML
		 * @param {string} htmlStr - HTML字符串。
		 * @param {boolean} ignoreBeginHistory - 是否忽略执行命令前一刻的历史。（有时命令是由几个组合而成时会用到）
		 * @param {boolean} ignoreEndHistory - 是否忽略执行命令后一刻的历史。
		 * @return void 
		 */
		pasteHTML: function(htmlStr, ignoreBeginHistory, ignoreEndHistory) {
			this._focus();
			if (!ignoreBeginHistory) this.editorHistory.saveUndoStep();
			var doc = this.doc;
			if (Browser.ie) {
				var range = doc.selection.createRange(); //将选中文本赋值给SelTxt；
				if (doc.selection.type == 'Control') { //JK: controlRange不能执行pasteHTML
					var range2 = doc.body.createTextRange();
					range2.moveToElementText(range.item(0));
					range2.select();
					range = range2;
				}
				range.pasteHTML(htmlStr);
			} else {
				doc.execCommand('insertHTML', false, htmlStr);
			}
			if (!ignoreEndHistory) this.editorHistory.saveUndoStep();
			this.fireSelectionChange();
		}
	};


/*
	*监控Editor里的键盘/鼠标事件
	*/
	var initDomEvents = (function() {
		var CTRL = 1000,
			CTRL_X = CTRL + 88,
			CTRL_C = CTRL + 67,
			CTRL_A = CTRL + 65,
			KEY_TAB = 9,
			KEY_BACKSPACE = 8,
			KEY_ENTER = 13;

		var _keyDown = function(e, editor) {
			e = e || editor.win.event;
			// Get the key code.
			var keyCombination = keyCode(e);
			var ctrlKey = e.ctrlKey || e.metaKey;
			if (ctrlKey) {
				var sKey = String.fromCharCode(keyCombination).toLowerCase();
				var tiKey = editor.accessKeyMap[sKey];
				if (tiKey) {
					Editor.EditorCmd["ti" + tiKey](e, editor.tiMap[tiKey].tiEl, editor);
					preventDefault(e);
					return;
				}
				keyCombination += CTRL;
			}
			switch (keyCombination) {
			case KEY_TAB:
				editor.pasteHTML("&nbsp;&nbsp;&nbsp;&nbsp;");
				preventDefault(e);
				return;
			case KEY_BACKSPACE:
				if (Browser.ie) { //JK：IE下，用backspace不能删除control选中状态下的img。
					var oImg = Editor.EditorSelection.getCtrlElement(editor);
					if (oImg && oImg.tagName) {
						editor.exec('Delete');
						preventDefault(e);
					}
				}
				break;
			case KEY_ENTER:
			case CTRL_X:
			case CTRL_C:
			case CTRL_A:
			case KEY_ENTER:
				if (Browser.ie) {
					editor.editorHistory.saveUndoStep();
					editor.fireSelectionChange();
				}
				break;
			default:
				if (Browser.ie) {
					var ti = editor.tiMap["Undo"];
					if (ti) _rc(ti.tiEl, "disabled");
				}
			}
		};
		var _selectionChange = function(e, editor) {
			var tiMap = editor.tiMap,
				statusTis = editor.statusTis;
			oCtrl = Editor.EditorSelection.getCtrlElement(editor);
			for (var i = 0; i < statusTis.length; i++) {
				var tiKey = statusTis[i];
				Editor.EditorCmd["tistatus" + tiKey](e, tiMap[tiKey].tiEl, editor, oCtrl)
			}
			fire(document.body, "keyup"); //JK：触发外部document的事件，以使popup关闭。opera下，用mousedown会影响外部的以后的mousedown，所以用keyup.
		};

/*
		* 初始化Editor实例的dom对象的事件
		*/
		return function(editor) {
			var doc = editor.doc;
			var keydownHdl = function(e) {
				_keyDown(e, editor);
			};
			var selectionChangeHdl = function(e) {
				Editor.activeInstance = editor;
				_selectionChange(e, editor);
			};
			on(doc, "keydown", keydownHdl);
			on(doc, "keyup", selectionChangeHdl);
			on(doc, "mouseup", selectionChangeHdl);
			if (Browser.ie) {
				var beforedeactivateHdl = function(e) {
					var el = target(e);
					if (el && el.tagName == "MARQUEE") return; //防止IE下的死循环:<marquee><marquee>a</marquee></marquee><marquee><marquee>a</marquee></marquee>
					var selection = doc.selection;
					var range = selection.createRange();
					var selectionType = selection.type.toLowerCase();
					if ("control" == selectionType) {
						doc.ieSelectionControl = range(0);
					} else {
						doc.ieSelectionBookmark = range.getBookmark();
					}
					doc.ieSelectionType = selectionType;
				};
				on(doc, "beforedeactivate", beforedeactivateHdl);
				var activateHdl = function(e) {
					var range;
					try {
						if ("control" == doc.ieSelectionType) {
							range = doc.body.createControlRange();
							range.add(doc.ieSelectionControl);
						} else {
							range = doc.body.createTextRange();
							range.moveToBookmark(doc.ieSelectionBookmark);
						}
						range.select();
						doc.ieSelectionControl = doc.ieSelectionBookmark = null;
					} catch (ex) {}
				};
				on(doc, "activate", activateHdl);
				var unloadHdl = function() { //去除事件，以解决IE下的内存泄漏问题
					un(doc, "keydown", keydownHdl);
					un(doc, "mouseup", selectionChangeHdl);
					un(doc, "keyup", selectionChangeHdl);
					un(doc, "beforedeactivate", beforedeactivateHdl);
					un(doc, "activate", activateHdl);
					un(window, "unload", unloadHdl);
					doc = null;
				};
				on(window, "unload", unloadHdl);
			}
		};
	}());

	QW.provide('Editor', Editor);
}());