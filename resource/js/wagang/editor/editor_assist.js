/*本文件是以下几个文件的综合，以方便页面调用。
*EditorHistory.js
*EditorCommand.js
*EditorEvent.js


*/

(function() {
	var mix = QW.ObjectH.mix,
		arrContains = QW.ArrayH.contains,
		Browser = QW.Browser,
		NodeH = QW.NodeH,
		getRect = NodeH.getRect,
		addClass = NodeH.addClass,
		removeClass = NodeH.removeClass,
		hasClass = NodeH.hasClass,
		EventH = QW.EventH,
		Editor = QW.Editor,
		lazyApply = QW.FunctionH.lazyApply;


	/**
	 * @class EditorSelection Editor的Selection Helper
	 * @singleton
	 * @namespace QW.Editor
	 */
	var EditorSelection = {
		/** 
		 * 获取Control元素: 获取富文本iframe里选中的ctrl对象，例如img，如果当前不是ctrl状态，则返回空
		 * @method getCtrlElement
		 * @param {Editor} editor Editor实例
		 * @return {Element}
		 */
		getCtrlElement: function(editor) {
			if (Browser.ie) {
				var selection = editor.doc.selection;
				if ("Control" == selection.type) {
					var range = selection.createRange();
					return range(0);
				}
			} else {
				selection = editor.win.getSelection();
				range = selection.getRangeAt(0);
				var nodes = range.cloneContents().childNodes;
				if (nodes.length == 1 && nodes[0].nodeType == 1) {
					var oAnc = selection.anchorNode;
					//JK：加Math.min的原因:safari没有点击选中img的功能，而只能扫中选中，所以要取最小的offset.
					//JK：另外，safari下，如果img一旦设为float:left，便很难选中它，以进行其它的操作，晕。
					var el = oAnc.childNodes[Math.min(selection.anchorOffset, selection.focusOffset)];
					if (el && el.nodeType == 1) return el;
				}
			}
			return null;
		},

		/** 
		 * 获取选中范围内的第一个某tagName的元素
		 * @method get1stSelectedNode
		 * @param {Editor} editor Editor实例
		 * @param {string} tagName tagName
		 * @return {Element}
		 */
		get1stSelectedNode: function(editor, tagName) {
			var node, doc = editor.doc, range, els;
			if (Browser.ie) {
				range = doc.selection.createRange();
				if (range.type == "Control") {
					node = range[0];
					if (node.tagName == tagName) return node;
				} else {
					node = range.parentElement();
					els = node.getElementsByTagName(tagName);
					var range2 = doc.body.createTextRange();
					try { //JK:IE下有时会抛异常
						for (var i = 0; i < els.length; i++) {
							range2.moveToElementText(els[i]);
							if (range2.inRange(range)) return els[i];
						}
					} catch (ex) {}
				}
			} else {
				var selection = editor.win.getSelection();
				range = selection.getRangeAt(0);
				node = range.commonAncestorContainer;
				if (node.nodeType == 3) node = node.parentNode;
				els = node.getElementsByTagName(tagName);
				for (var i = 0; i < els.length; i++) {
					if (selection.containsNode(els[i], true)) return els[i];
				}
			}
			return null;
		},
		// 获取选中的tagName=A的元素
		getAncestorNode: function(editor, tagName) {
			var node, range, doc = editor.doc,
				win = editor.win;
			if (Browser.ie) {
				range = doc.selection.createRange();
				if (doc.selection.type == "Control") {
					node = range[0];
				} else {
					node = range.parentElement();
				}
			} else {
				node = EditorSelection.getCtrlElement(editor) || win.getSelection().getRangeAt(0).startContainer;
			}
			while (node) {
				if (node.tagName == tagName) return node;
				node = node.parentNode;
			}
			return null;
		},
		/** 
		 * 完善选中区域至某tagName的元素
		 * @method moveToAncestorNode
		 * @param {Editor} editor Editor实例
		 * @param {string} tagName tagName
		 * @return {Element}
		 */
		moveToAncestorNode: function(editor, tagName) {
			var el = EditorSelection.getAncestorNode(editor, tagName);
			if (el) {
				if (Browser.ie) {
					var range = editor.doc.body.createTextRange();
					range.moveToElementText(el);
					range.select();
				} else {
					var selection = editor.win.getSelection();
					selection.selectAllChildren(el)
				}
			}
		}

	};


	//---------------EditorHistory.js

	//---------------EditorHistory.js

	/**
	 * @class EditorHistory 接管undo/redo功能，返回一个EditorHistory的实例
	 * @namespace QW.Editor
	 * @param {Editor} editor Editor实例
	 */

	function EditorHistory(editor) {
		this.editor = editor;
		this.saveData = [];
		this.currentIndex = 0;
	}

	(function() {

		EditorHistory.prototype = {
			/** 
			 * undo到上一个状态
			 * @method undo
			 * @return {boolean} 如果已经是第一个状态，则返回false
			 */
			undo: function() {
				if (!Browser.ie) return false;
				// 已经回退到最开始保存的数据了
				if (this.currentIndex == 0) return true;
				// 如果当前位置是数组的最后一个，CTRL_Z的时候，应该回退到
				// 数组的倒数第二个位置，但是有可能编辑器中的内容已经和数组最后存储的内容
				// 也就是currentIndex指向的内容不相符合了
				// 所以需要调用一下saveUndoStep()
				// 如果编辑器中的内容和数组最后的内容相符合的话，saveUndoStep其实并没有什么作用
				var scene = this.saveData[--this.currentIndex];
				if (scene) {
					this.editor.doc.body.innerHTML = scene.innerHTML;
					this.restoreScene(scene);
					return true;
				} else {
					return false;
				}
			},

			/** 
			 * redo到下一个状态
			 * @method redo
			 * @return {boolean} 如果已经是最后一个状态，则返回false
			 */
			redo: function() {
				if (!Browser.ie) return false;

				// 已经前进到最后保存的数据了
				if (this.currentIndex == this.saveData.length - 1) return true;

				// 没有数据
				if (this.saveData.length == 0) return true;

				var scene = this.saveData[++this.currentIndex];
				if (scene) {
					this.editor.doc.body.innerHTML = scene.innerHTML;
					this.restoreScene(scene);
					return true;
				} else {
					return false;
				}
			},

			/** 
			 * 存一个状态至状态堆栈
			 * @method saveUndoStep
			 * @return {void}
			 */
			saveUndoStep: function() {
				if (!Browser.ie) return;
				if (this.saveData[this.currentIndex] && this.saveData[this.currentIndex].innerHTML == this.editor.doc.body.innerHTML) return;
				// 如果this.currentIndex == this.saveData.length - 1, saveData并不发生变化
				this.saveData = this.saveData.slice(0, this.currentIndex + 1);

				var scene = this.getScene();
				scene.innerHTML = this.editor.doc.body.innerHTML;

				var old = this.saveData[this.saveData.length - 1];
				if (old && old.innerHTML == scene.innerHTML) return;

				this.saveData.push(scene);

				var len = this.saveData.length;
				if (len > 2000) this.saveData = this.saveData.slice(len - 2000, len);
				this.currentIndex = this.saveData.length - 1;
			},

			/** 
			 * 得到当前编辑器的场景
			 * @method getScene
			 * @return {Scene}
			 */
			getScene: function() {
				var selection = this.editor.doc.selection;
				var range = selection.createRange();
				var scene = {
					type: selection.type.toLowerCase()
				};
				if ("control" == scene.type) {
					scene.control = range(0);
				} else {
					scene.bookmark = range.getBookmark();
				}
				return scene;
			},

			/** 
			 * 复现编辑器的场景
			 * @method restoreScene
			 * @param {Scene} scene 场景
			 * @return {void}
			 */
			restoreScene: function(scene) {
				if (typeof scene != "object") return;
				try {
					this.editor.win.focus();
					var body = this.editor.doc.body,
						range;
					if ("control" == scene.type) {
						range = body.createControlRange();
						range.addElement(scene.control);
					} else {
						range = body.createTextRange();
						range.moveToBookmark(scene.bookmark);
					}
					range.select();
				} catch (e) {}
			}
		};
	}());


	//---------------EditorCommand.js
	/**
	 本文件集中处理编辑器里需要自写的ToolItem的click事件，以及ti的status返馈。
	 */

	//---------------EditorCommand.js
/*
本文件集中处理编辑器里需要自写的ToolItem的click事件，以及ti的status返馈。
*/
	/**
	 * @class EditorCmd 编辑器命令集合，集中处理编辑器里需要自写的ToolItem的click事件，以及ti的status返馈。
	 * @singleton
	 * @namespace QW.Editor
	 */
	var EditorCmd = {};

	(function() {

		function _focusEnd(el) {
			try {
				el.focus();
				if (Browser.ie) {
					var range = el.createTextRange();
					range.moveStart('character', el.value.length);
					range.select();
				}
			} catch (e) {}
		}

		mix(EditorCmd, {
			/** 
			 * 根据命令结果显示toobarItem的状态是否是active(例如，是否是粗体状态).
			 * @method _tistate
			 * @param {string} cmd queryCommandState的参数
			 * @param {Element} el ToolbarItem的handle元素
			 * @param {Editor} editor Editor实例
			 * @return {void}
			 */
			/**
			 _tistate(cmd,el,editor): 根据命令结果显示toobarItem的状态是否是active.
			 */
			_tistate: function(cmd, el, editor) {
				//try{
				var state = editor.doc.queryCommandState(cmd);
				if (state) addClass(el, "active");
				else removeClass(el, "active");
				//}catch(ex){}
			},
			/** 
			 * 根据命令结果显示toobarItem的状态是否是enable(例如，是否可以进行删除链接).
			 * @method _tienable
			 * @param {string} cmd queryCommandEnabled的参数
			 * @param {Element} el ToolbarItem的handle元素
			 * @param {Editor} editor Editor实例
			 * @return {void}
			 */
			_tienable: function(cmd, el, editor) {
				//try{
				var state = editor.doc.queryCommandEnabled(cmd);
				if (state) removeClass(el, "disabled");
				else addClass(el, "disabled");
				//}catch(ex){}
			},
			/** 
			 * 设置粗体.
			 * @method tiBold
			 * @param {Event} e Event
			 * @param {Element} el ToolbarItem的handle元素
			 * @param {Editor} editor Editor实例
			 * @return {void}
			 */
			tiBold: function(e, el, editor) {
				editor.exec('Bold');
			},
			/** 
			 * 粗体状态返馈.
			 * @method tistatusBold
			 * @param {Event} e Event
			 * @param {Element} el ToolbarItem的handle元素
			 * @param {Editor} editor Editor实例
			 * @return {void}
			 */
			tistatusBold: function(e, el, editor) {
				EditorCmd._tistate("Bold", el, editor);
			},
			/** 
			 * 设置斜体.
			 * @method tiItalic
			 * @param {Event} e Event
			 * @param {Element} el ToolbarItem的handle元素
			 * @param {Editor} editor Editor实例
			 * @return {void}
			 */
			tiItalic: function(e, el, editor) {
				editor.exec('Italic');
			},
			/** 
			 * 斜体状态返馈.
			 * @method tistatusItalic
			 * @param {Event} e Event
			 * @param {Element} el ToolbarItem的handle元素
			 * @param {Editor} editor Editor实例
			 * @return {void}
			 */
			tistatusItalic: function(e, el, editor) {
				EditorCmd._tistate("Italic", el, editor);
			},
			/** 
			 * 设置下划线.
			 * @method tiUnderline
			 */
			tiUnderline: function(e, el, editor) {
				editor.exec('Underline');
			},
			tistatusUnderline: function(e, el, editor) {
				EditorCmd._tistate("Underline", el, editor);
			},
			/** 
			 * 设置orderedlist.
			 * @method tiOrderedList
			 */
			tiOrderedList: function(e, el, editor) {
				editor.exec('InsertOrderedList');
			},
			tistatusOrderedList: function(e, el, editor) {
				EditorCmd._tistate("InsertOrderedList", el, editor);
			},
			/** 
			 * 设置unorderedlist.
			 * @method tiUnorderedList
			 */
			tiUnorderedList: function(e, el, editor) {
				editor.exec('InsertUnorderedList');
			},
			tistatusUnorderedList: function(e, el, editor) {
				EditorCmd._tistate("InsertUnorderedList", el, editor);
			},
			/** 
			 * undo.
			 * @method tiUndo
			 */
			tiUndo: function(e, el, editor) {
				if (Browser.ie) {
					editor.editorHistory.saveUndoStep();
					editor.editorHistory.undo();
				} else {
					editor.doc.execCommand("Undo", false, null);
				}
				editor.fireSelectionChange();
			},
			tistatusUndo: function(e, el, editor) {
				if (Browser.ie) {
					var eh = editor.editorHistory;
					if (eh.currentIndex == 0 && (eh.saveData[0].innerHTML == editor.doc.body.innerHTML)) addClass(el, "disabled");
					else removeClass(el, "disabled");
				} else {
					EditorCmd._tienable("Undo", el, editor);
				}
			},
			/** 
			 * redo.
			 * @method tiRedo
			 */
			tiRedo: function(e, el, editor) {
				if (Browser.ie) {
					editor.editorHistory.saveUndoStep();
					editor.editorHistory.redo();
				} else {
					editor.doc.execCommand("Redo", false, null);
				}
				editor.fireSelectionChange();
			},
			tistatusRedo: function(e, el, editor) {
				if (Browser.ie) {
					var eh = editor.editorHistory;
					if (eh.currentIndex >= eh.saveData.length - 1) addClass(el, "disabled");
					else removeClass(el, "disabled");
				} else {
					EditorCmd._tienable("Redo", el, editor);
				}
			},
			_tiFontNameConfig: '宋体,楷体_GB2312,黑体,隶书,Times New Roman,Arial'.split(","),
			_tiFontNamePopup: null,
			/** 
			 * 设置fontname.
			 * @method tiFontName
			 */
			tiFontName: function(e, el, editor) {
				var pop = EditorCmd._tiFontNamePopup;
				if (!pop) {
					var html = [];
					var fontFace = EditorCmd._tiFontNameConfig;
					for (var i = 0; i < fontFace.length; i++) {
						html.push('<div unselectable="on" class="cell" onmouseover="this.style.borderColor=\'#FF0000\'" onmouseout="this.style.borderColor=\'#DDDDDD\'" fontName="' + fontFace[i] + '" >' + '<font unselectable="on" style="font-size:12px;" face="' + fontFace[i] + '">' + fontFace[i] + '</font></div>');
					}
					pop = EditorCmd._tiFontNamePopup = new QW.LayerPopup({
						body: '<div class="js-editor-ti-fontname">' + html.join('') + '</div>'
					});
					var els = pop.oBody.firstChild.childNodes;
					var fun = function(e) {
						pop.hide();
						Editor.activeInstance.exec('FontName', this.getAttribute("fontName"));
					};
					for (var i = 0; i < els.length; i++) {
						els[i].onclick = fun;
					}
				}
				pop.show(0, el.offsetHeight, 130, null, el);
			},
			tistatusFontName: function(e, el, editor) {
				var val = editor.doc.queryCommandValue("FontName");
				if (val && arrContains(EditorCmd._tiFontNameConfig, val)) el.firstChild.innerHTML = val;
				else el.firstChild.innerHTML = "字体";
			},
			_tiFontSizeConfig: '2:小,3:标准,4:大,5:特大,6:极大'.split(","),
			_tiFontSizePopup: null,
			/** 
			 * 设置fontsize.
			 * @method tiFontSize
			 */
			tiFontSize: function(e, el, editor) {
				var pop = EditorCmd._tiFontSizePopup;
				if (!pop) {
					var html = [],
						fontSize = EditorCmd._tiFontSizeConfig;
					for (var i = 0; i < fontSize.length; i++) {
						var size = fontSize[i].split(':')[0],
							text = fontSize[i].split(':')[1];
						html.push('<div unselectable="on" class="cell" onmouseover="this.style.borderColor=\'#FF0000\'" onmouseout="this.style.borderColor=\'#DDDDDD\'" fontSize="' + size + '"> ' + '<font unselectable="on" size="' + size + '" >' + text + '</font></div>');
					}
					pop = EditorCmd._tiFontSizePopup = new QW.LayerPopup({
						body: '<div class="js-editor-ti-fontsize">' + html.join('') + '</div>'
					});
					var els = pop.oBody.firstChild.childNodes,
						fun = function(e) {
							pop.hide();
							Editor.activeInstance.exec('FontSize', this.getAttribute("fontSize"));
						};
					for (var i = 0; i < els.length; i++) {
						els[i].onclick = fun;
					}
				}
				pop.show(0, el.offsetHeight, 130, null, el);
			},
			tistatusFontSize: function(e, el, editor) {
				var fontSize = EditorCmd._tiFontSizeConfig;
				var val = editor.doc.queryCommandValue("FontSize");
				for (var i = 0; i < fontSize.length; i++) {
					var a = fontSize[i].split(":");
					if (a[0] == val) {
						el.firstChild.innerHTML = a[1];
						return;
					}
				}
				el.firstChild.innerHTML = "字号";
			},
			_colorsPopup1: null,
			_showColors1: function(e, el, colorBackfill, defaultColor) {
				var pop = EditorCmd._colorsPopup1;
				if (!pop) {
					var html = ['<div class="js-editor-ti-color1"><table cellpadding="2" cellspacing="0" border="0" style="width:100%">'];
					var colors = '000000,993300,333300,003300,003366,000080,333399,333333,800000,FF6600,808000,808080,008080,0000FF,666699,808080,FF0000,FF9900,99CC00,339966,33CCCC,3366FF,800080,999999,FF00FF,FFCC00,FFFF00,00FF00,00FFFF,00CCFF,993366,C0C0C0,FF99CC,FFCC99,FFFF99,CCFFCC,CCFFFF,99CCFF,CC99FF,FFFFFF'.split(',');
					var rc = 8;
					var cl = colors.length;
					var cc = Math.ceil(cl / rc);
					html.push('<tr><td colspan="' + rc + '" class="cell"><span class="colorBox-big"></span><span class="colortext">&nbsp自动</span></td></tr>');
					for (var i = 0, j = 0; i < cc; i++) {
						html.push('<tr>');
						for (j = 0; j < rc; j++) {
							if (i * rc + j >= cl) break;
							html.push('<td class="cell" colorValue="#' + colors[i * rc + j] + '" ><div class="colorbox" style="background-color:#' + colors[i * rc + j] + '"></div></td>');
						}
						html.push('</tr>');
					}
					html.push('<tr><td colspan="' + rc + '" class="cell" ><span>其它颜色...</span></td></tr>');
					html.push('</table></div>');
					pop = EditorCmd._colorsPopup1 = new QW.LayerPopup({body: html.join("").replace(/(<\w+)/ig, '$1  unselectable="on"')});
					var els = pop.oBody.getElementsByTagName("td");
					var _msOver = function(e) {
							addClass(this, "cell-over");
						},
						_msOut = function(e) {
							removeClass(this, "cell-over");
						},
						_msClick = function() {
							pop.hide();
							pop._colorBackfill(this.getAttribute("colorValue"));
						};
					for (var i = 0; i < els.length; i++) {
						els[i].onmouseover = _msOver;
						els[i].onmouseout = _msOut;
						els[i].onclick = _msClick;
					}
				}
				pop._colorBackfill = colorBackfill;
				var els = pop.oBody.getElementsByTagName("td");
				els[0].setAttribute("colorValue", defaultColor);
				els[0].childNodes[0].style.backgroundColor = defaultColor;
				els[els.length - 1].onclick = function(e) {
					pop.hide();
					EditorCmd._showColors2(e, el, colorBackfill, defaultColor);
				};
				pop.show(0, el.offsetHeight, 163, null, el);
			},
			_colorPopup2: null,
			_showColors2: function(e, el, colorBackfill, defaultColor) {
				var pop = EditorCmd._colorsPopup2;
				if (!pop) {
					var colorCell = function(c) {
						return '<td class="cell" colorValue="#' + c + '" style="background-color:#' + c + ';border:1px solid #' + c + '" title="#' + c + '">&nbsp;</td>';
					};
					var rgb = ["00", "33", "66", "99", "CC", "FF"];
					var aColors = "000000,333333,666666,999999,CCCCCC,FFFFFF,FF0000,00FF00,0000FF,FFFF00,00FFFF,FF00FF".split(",");
					var html = ['<div class="js-editor-ti-color2"><table class=colors-hd cellSpacing=1 border=0 ><tr><td><span class="colorbox-big"></span><span class="colortext">&nbsp;预览</span></td></tr></table>'];
					html.push('<table class=colors-bd cellSpacing=1 border=0 >');
					for (var i = 0; i < 12; i++) {
						html.push('<tr>' + colorCell(aColors[i]) + colorCell('000000'));
						for (var j = 0; j < 18; j++) {
							var c = rgb[(i - i % 6) / 2 + (j - j % 6) / 6] + rgb[j % 6] + rgb[i % 6];
							html.push(colorCell(c));
						}
						html.push('</tr>');
					}
					html.push('</table></div>');
					pop = EditorCmd._colorsPopup2 = new LayerPopup({
						body: html.join("").replace(/(<\w+)/ig, '$1  unselectable="on"')
					});
					var els = pop.oBody.getElementsByTagName("td");
					pop._previewCell = els[0];
					pop._previewFun = function(colorValue) {
						pop._previewCell.setAttribute("colorValue", colorValue);
						pop._previewCell.childNodes[0].style.backgroundColor = colorValue;

					};
					var _msOver = function(e) {
						this.style.border = "1px solid #FFF";
						pop._previewFun(this.getAttribute("colorValue"));
					};
					var _msOut = function(e) {
						this.style.border = "1px solid " + this.getAttribute("colorValue");
						pop._previewFun(pop._defaultColor);
					};
					var _msClick = function() {
						pop.hide();
						pop._colorBackfill(this.getAttribute("colorValue"));
					};
					for (var i = 0; i < els.length; i++) {
						if (i > 0) {
							els[i].onmouseover = _msOver;
							els[i].onmouseout = _msOut;
						}
						els[i].onclick = _msClick;
					}
				}
				pop._colorBackfill = colorBackfill;
				pop._defaultColor = defaultColor;
				pop._previewFun(defaultColor);
				pop.show(0, el.offsetHeight, 274, null, el);
			},
			/** 
			 * 设置fontcolor.
			 * @method tiForeColor
			 */
			tiForeColor: function(e, el, editor) {
				EditorCmd._showColors1(e, el, function(a) {
					Editor.activeInstance.exec('ForeColor', a);
				}, "#000");
			},
			/** 
			 * 设置backcolor.
			 * @method tiBackColor
			 */
			tiBackColor: function(e, el, editor) {
				EditorCmd._showColors1(e, el, function(a) {
					Editor.activeInstance.exec(Browser.ie && "BackColor" || "HiliteColor", a);
				}, "#FFF");
			},
			/** 
			 * 清空格式设置.
			 * @method tiRemoveFormat
			 */
			tiRemoveFormat: function(e, el, editor) {
				if (Browser.ie) { //JK:Add these code for :IE can not remove format of <span style="..."> 待完善
					var doc = editor.doc;
					if (doc.selection.type.toLowerCase() == "text") {
						editor.exec('RemoveFormat', null, false, true);
						var r = doc.selection.createRange();
						var tags = r.htmlText.match(/<\w+(\s|>)/ig);
						if (!tags || tags.length > 0 && (/span/ig).test(tags.join("")) && (tags.join("_") + "_").toLowerCase().replace(/[<>\s]/g, "").replace(/(font|strong|em|u|span|p|br|wbr)_/g, "") == "") {
							var len = r.text.replace(/(\r\n)|/ig, "1").length;
							r.text = r.text + "";
							r.moveStart("character", -len);
							r.select();
						}
						editor.exec('RemoveFormat', null, true, false);
						return;
					}
				}
				editor.exec('RemoveFormat');
			},
			_tiJustify: function(e, el, editor, justifyType) {
				var oImg = EditorSelection.getCtrlElement(editor);
				if (oImg && oImg.tagName == 'IMG') {
					var sf = justifyType.toLowerCase();
					if (sf == "center") sf = "none";
					//JK：非IE浏览器，直接设style，不会添加undo步骤
					var curSf = oImg.style[Browser.ie ? "styleFloat" : "cssFloat"];
					oImg.style[Browser.ie ? "styleFloat" : "cssFloat"] = (curSf == sf ? "none" : sf);
					editor.exec(0, 0, true, false);
				} else {
					if (hasClass(el, "active")) {
						editor.exec(Browser.firefox ? "JustifyLeft" : "JustifyNone");
					} else editor.exec("Justify" + justifyType);
				}
			},
			_tistatusJustify: function(e, el, editor, oCtrl, justifyType) {
				if (oCtrl && oCtrl.tagName == "IMG") {
					var sf = oCtrl.style[Browser.ie && "styleFloat" || "cssFloat"];
					var bl = (justifyType.toLowerCase() == sf) || (justifyType == "Center" && (!sf || sf == "none"));
					if (bl) addClass(el, "active");
					else removeClass(el, "active");
				} else EditorCmd._tistate("Justify" + justifyType, el, editor);
			},
			/** 
			 * tiJustifyLeft.
			 * @method tiJustifyLeft
			 */
			tiJustifyLeft: function(e, el, editor) {
				EditorCmd._tiJustify(e, el, editor, "Left");
			},
			tistatusJustifyLeft: function(e, el, editor, oCtrl) {
				EditorCmd._tistatusJustify(e, el, editor, oCtrl, "Left");
			},
			/** 
			 * tiJustifyCenter.
			 * @method tiJustifyCenter
			 */
			tiJustifyCenter: function(e, el, editor) {
				EditorCmd._tiJustify(e, el, editor, "Center");
			},
			tistatusJustifyCenter: function(e, el, editor, oCtrl) {
				EditorCmd._tistatusJustify(e, el, editor, oCtrl, "Center");
			},
			/** 
			 * tiJustifyRight.
			 * @method tiJustifyRight
			 */
			tiJustifyRight: function(e, el, editor) {
				EditorCmd._tiJustify(e, el, editor, "Right");
			},
			tistatusJustifyRight: function(e, el, editor, oCtrl) {
				EditorCmd._tistatusJustify(e, el, editor, oCtrl, "Right");
			},
			_tiLinkDialog: null,
			/** 
			 * 设置链接.
			 * @method tiLink
			 */
			tiLink: function(e, el, editor) {
				var dlg = EditorCmd._tiLinkDialog;
				if (!dlg) {
					dlg = EditorCmd._tiLinkDialog = QW.Panel.getSysDialog("prompt", "添加/修改链接", function() {
						var editor = Editor.activeInstance;
						var v = dlg.returnValue;
						if (v == null) return editor._focus(); //未修改
						editor.exec('UnLink'); //断开原有的链接
						if (v.toLowerCase() != "http://") {
							if (Browser.ie && editor.doc.selection.type == "None" || !Browser.ie && editor.win.getSelection().isCollapsed) {
								editor.pasteHTML('<a href="' + v + '" target="_blank">' + v + '</a>');
							} else editor.exec('CreateLink', v);
						}
					}, {
						withMask: 1
					});
					dlg.un('aftershow');
					dlg.on('aftershow', function() {
						_focusEnd(dlg.dialogInput);
					});
				}
				var oLink = EditorSelection.getAncestorNode(editor, "A") || EditorSelection.get1stSelectedNode(editor, "A");
				var sHref = oLink && oLink.href || "http://";
				dlg.dialogInput.value = sHref;
				dlg.returnValue = undefined;
				var rect = getRect(el);
				dlg.show(null, rect.top + rect.height + 10, 300);
			},
			/** 
			 * 移除链接.
			 * @method tiUnLink
			 */
			tiUnLink: function(e, el, editor) {
				if (!Browser.ie && editor.win.getSelection().isCollapsed) EditorSelection.moveToAncestorNode(editor, "A");
				editor.exec('UnLink');
			},
			tistatusUnLink: function(e, el, editor) {
				if (Browser.ie || Browser.opera) EditorCmd._tienable("UnLink", el, editor);
				else {
					if (EditorSelection.getAncestorNode(editor, "A") || EditorSelection.get1stSelectedNode(editor, "A")) removeClass(el, "disabled");
					else addClass(el, "disabled");
				}
			},
			_tiImageUrl: "",
			_tiImageDialog: null,
			_tiImageIfmWin: null,
			/** 
			 * 插入图片.
			 * @method tiImage
			 */
			tiImage: function(e, el, editor) {
				// 检查选种的部分是否含有图像
				var dlg = EditorCmd._tiImageDialog;
				if (!dlg) {
					var url4TiImage = editor.insertImgUrl; //这个里面用了iframe，有可能编辑器要立即上传图片，所以需要相应的反台支持。在这里留一个入口。
					var html = '<div class="js-editor-ti-image"><iframe frameBorder=0 id="EditorInsertImgIfm" name="EditorInsertImgIfm"' + (url4TiImage ? ' src="' + url4TiImage + '"' : "") + '/></div>';
					var opts = {
						title: '插入图片',
						body: html,
						posCenter: 1,
						withMask: 1,
						dragable: !!QW.SimpleDrag,
						keyEsc: 1
					};
					dlg = EditorCmd._tiImageDialog = new QW.LayerDialog(opts);
					dlg.on('afterhide', function() {
						Editor.activeInstance.focus();
					});
					EditorCmd._tiImageIfmWin = g("EditorInsertImgIfm").contentWindow;
					if (!url4TiImage) {
						var doc = EditorInsertImgIfm.document;
						doc.write("<html><head><title>Image</title><meta http-equiv='Content-Type' content='text/html; charset=GB2312' /><link rel=stylesheet href='" + Editor.editorPath + "/tifiles/tiimage/TiImage.css' ></link>" + "</head><body >aaaa</body><script language=javascript src='" + Editor.editorPath + "/tifiles/tiimage/TiImage.js' ><\/script></html>");
						doc.close();
					}
					//window.editorImageDialogInt=window.setInterval(function(){try{if(ifmWin.isInitialized) {window.clearInterval(window.editorImageDialogInt);dlg.show();ifmWin.initImg(imgUrl,imgFloat);}}catch(e){;}},20);
				}
				var rect = getRect(el);
				dlg.show(null, rect.top + rect.height + 10, 516);
				var oImg = EditorSelection.getCtrlElement(editor);
				var imgUrl = "";
				var cssFloat = "";
				if (oImg && oImg.tagName == 'IMG') {
					imgUrl = oImg.src;
					cssFloat = oImg.style[Browser.ie && "styleFloat" || "cssFloat"];
					if ("none" == (cssFloat || "none").toLowerCase()) cssFloat = oImg.style.textAlign;
				}
				lazyApply(function() {
					EditorCmd._tiImageIfmWin.initImg(imgUrl, cssFloat);
				}, null, [], 10, function() {
					return !!EditorCmd._tiImageIfmWin.initImg;
				});
			},
			_tiImageExec: function(img_url, img_float) {
				var editor = Editor.activeInstance;
				if (!img_float) {
					editor.pasteHTML('<img src="' + img_url + '"/>');
				} else if (img_float == "center") {
					editor.pasteHTML('<img src="' + img_url + '" style="margin:auto;display:block;text-align:center;" />');
				} else {
					editor.pasteHTML('<img src="' + img_url + '" style="margin:0px 5px 0px 5px;float:' + img_float + '" />');
				}
				EditorCmd._tiImageDialog.hide();
			},
			//TiFace
			_tiFaceDialog: null,
			/** 
			 * 插入表情.
			 * @method tiFace
			 */
			tiFace: function(e, el, editor) {
				var dlg = EditorCmd._tiFaceDialog;
				if (!dlg) {
					var html = ["<div class='js-editor-ti-face' id=editor_faces_wraper><div>loading...</div>"];
					var opts = {
						title: '插入表情图标',
						body: html.join(""),
						posCenter: 1,
						withMask: 1,
						dragable: !!QW.SimpleDrag,
						keyEsc: 1
					};
					dlg = EditorCmd._tiFaceDialog = new QW.LayerDialog(opts);
					dlg.on('afterhide', function() {
						Editor.activeInstance.focus();
					});
					var oScript = QW.loadJs(Editor.editorPath + "tifiles/tiface/TiFace.js?v=1.2.js");
					//return false;
				}
				var rect = getRect(el);
				dlg.show(null, rect.top + rect.height + 10, 400);
			},
			_tiFaceExec: function(src, alt) {
				Editor.activeInstance.pasteHTML('<img src="' + src + '"' + (alt ? ' alt="' + alt + '"' : '') + '/>');
				EditorCmd._tiFaceDialog.hide();
			},


			_tiCharacterDialog: null,
			/** 
			 * 插入特殊字符.
			 * @method tiCharacter
			 */
			tiCharacter: function(e, el, editor) {
				var chars = "§№☆★○●◎◇◆□■△▲※→←↑↓＝¤＃＆＠＼????∑∏℃‰。Ф＿￣－?∪∩≮≯∨∧≤≥?♀♂⊙".split("");
				var dlg = EditorCmd._tiCharacterDialog;
				if (!dlg) {
					var len = chars.length;
					var cols = 10;
					var rows = Math.ceil(len / cols);
					var html = ["<div class='js-editor-ti-character'><table cellpadding='0' cellspacing='0' border='1' >"];
					for (var i = 0; i < len; i++) {
						if (i % cols == 0) html.push("<tr>");
						html.push("<td align='center' onclick='Editor.EditorCmd._tiCharacterExec(this.innerHTML);' onmouseover='this.className=\"active\"' onmouseout='this.className=\"\"'>" + chars[i] + "</td>");
						if (i % cols == cols - 1) html.push("</tr>");
					}
					html.push("</table></div>");
					var opts = {
						title: '插入特殊字符',
						body: html.join(""),
						posCenter: 1,
						withMask: 1,
						dragable: !!QW.SimpleDrag,
						keyEsc: 1
					};
					dlg = EditorCmd._tiCharacterDialog = new QW.LayerDialog(opts);
					dlg.on('afterhide', function() {
						Editor.activeInstance.focus();
					});
				}
				var rect = getRect(el);
				dlg.show(null, rect.top + rect.height + 10, 400);
			},
			_tiCharacterExec: function(c) {
				Editor.activeInstance.pasteHTML(c);
				EditorCmd._tiCharacterDialog.hide();
			}
		});

		Editor.EditorCmd = EditorCmd;

	}());


	Editor.EditorHistory = EditorHistory;
	Editor.EditorCmd = EditorCmd;
	Editor.EditorSelection = EditorSelection;

}());