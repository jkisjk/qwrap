function G(id){return document.getElementById(id);}
function H(id){G(id).style.display = 'none';}
function S(id){G(id).style.display = '';}
function Q(str, key){
	var reg = new RegExp("(^|&|\\?|#)"+key+"=([^&]*)(&|$)","i"), r;
	if (r=str.match(reg)) return r[2]; return null;
}
var current_selected_tab;
function selectThisTab(a, tab_id){
	H('tab1');H('tab2');S('tab' + tab_id);
	current_selected_tab.className = 'tab lk'
	current_selected_tab = a;
	current_selected_tab.className = 'selected_tab';
	return false;
}

function checkSelectedFile(input){
	var file_name = input.value, file_ext = file_name.substring(file_name.lastIndexOf(".") + 1).toLowerCase();
	var isOk=0;
	if(file_name.length <= 4 ){ 
		alert("\u8BF7\u68C0\u67E5\u60A8\u9009\u62E9\u7684\u56FE\u7247\u6587\u4EF6\u8DEF\u5F84\uFF0C\u53EA\u652F\u6301jpg\u3001jpeg\u3001png\u3001gif\u3001tif\u3001bmp\u683C\u5F0F\u3002");
		isOk=0;
	}
	else if(file_name.length <= 0){
		alert("\u4F60\u672A\u9009\u62E9\u4EFB\u4F55\u7167\u7247,\u8BF7\u9009\u62E9\u540E\u4E0A\u4F20\u3002");
		isOk=0;
	}
	else if(file_ext == "jpg" ||
	   file_ext == "jpeg" ||
	   file_ext == "png" ||
	   file_ext == "bmp" ||
	   file_ext == "gif" ||
	   file_ext == "tif" ){
		isOk=1;
		if(/*@cc_on!@*/false){
			var img = document.createElement("IMG");
			img.src = file_name;
			img.style.display = 'none';
			img.onreadystatechange = function(){
				if(img.readyState != "complete") return;
				if(img.fileSize > (512 * 1024) /* 3145728 */) {
					alert("\u56FE\u7247\u6700\u5927512K\u3002");
					G("isImgFile").value=0;
				}
			}
			document.body.appendChild(img);
			//document.body.removeChild(img);
		}
	}
	else{
		alert("\u8BF7\u68C0\u67E5\u60A8\u9009\u62E9\u7684\u56FE\u7247\u6587\u4EF6\u8DEF\u5F84\uFF0C\u53EA\u652F\u6301jpg\u3001jpeg\u3001png\u3001gif\u3001tif\u3001bmp\u683C\u5F0F\u3002");
		isOk=0;
	}
	G("isImgFile").value=isOk;

}

function cancelFun()
{
	parent.QW.Editor.EditorCmd._tiImageDialog.hide();
}

function okFun()
{
	var w = window , d = w.document;
	var isInsertLocalImage = (d.getElementById('tab1').style.display == 'none');
	var spImgAlign = d.linkForm.spImgAlign, imgFloat = spImgAlign[0].checked ? "" : (
		spImgAlign[1].checked ? "left" : (
			spImgAlign[2].checked ? "center" : (
				spImgAlign[3].checked ? "right" : ""
			)
		)
	);
	if(isInsertLocalImage){   // 添加本机图片
		if(G("isImgFile").value!="1"){
			alert("\u8BF7\u68C0\u67E5\u60A8\u7684\u7167\u7247\u8DEF\u5F84\u3002");
			return false;
		}
		return uploadImgFun(imgFloat);
	}
	if(true){  // 添加网上图片
		// 检查是否输入的图片地址
		var img_url = G('img_url'), img_url_value = img_url.value;
		if(img_url_value.length < 2 || img_url_value == "http://"){
			return alert("\u4F60\u672A\u9009\u62E9\u4EFB\u4F55\u7167\u7247,\u8BF7\u9009\u62E9\u540E\u4E0A\u4F20!");
		}
		parent.QW.Editor.EditorCmd._tiImageExec(img_url_value, imgFloat);
	}

}

function initPage(){
	var bodyHtml='<br />\
<div id="tabs"><span onclick="return selectThisTab(this, 1)" class="selected_tab">\u6DFB\u52A0\u7F51\u4E0A\u56FE\u7247</span><span onclick="return selectThisTab(this, 2);" class="tab lk" style="display:none;">\u6DFB\u52A0\u672C\u673A\u56FE\u7247</span></div>\
<div id="tabContainer">\
	<div class="tab_body">\
	<form name="linkForm" id="linkForm" method="post" enctype="multipart/form-data" onsubmit="okFun();return false;">\
		<input type=hidden name="fr" value="">\
		<div id="tab1">\
			<b class="title">\u7F51\u5740\uFF1A</b><br />\
			<input type="text" value="http://" id="img_url" size="40"><br /><br /><br />\
		</div>\
		<div id="tab2" style="display:none">\
			<b class="title">\u9009\u62E9\u6587\u4EF6\uFF1A</b><br />\
			<div style="position:relative">\
				<span id="fileCtn" >\
				<input type="file" id="uploadFile" name="userfile[]" size="40" dataType="" onchange="checkSelectedFile(this);" class="bb-file-uploader">\
				</span>\
				<input type="hidden" id="isImgFile" value="0">\
			</div>\
			<div class="tip">\u4E0D\u8D85\u8FC7512K\uFF0C\u652F\u6301JPG/JPEG/GIF/TIF/PNG/BMP\u683C\u5F0F\u3002</div><br />\
		</div>\
		<b class="title">\u56FE\u7247\u4F4D\u7F6E\uFF1A</b><br />\
		<table width="100%" cellpadding="0" cellspacing="0" border="0">\
		<tr>\
			<td width="24.9%" align="left">\
				<span class="img_pos img_pos_default" onclick="G(\'float_default\').checked=true;"></span>&nbsp;&nbsp;&nbsp;<input id="float_default" name="spImgAlign" type="radio" checked="checked"><label for="float_default">\u9ED8\u8BA4</label>\
			</td>\
			<td width="24.9%" align="left">\
				<span class="img_pos img_pos_left" onclick="G(\'float_left\').checked=true;"></span>&nbsp;&nbsp;&nbsp;<input id="float_left" name="spImgAlign" type="radio"><label for="float_left">\u5C45\u5DE6</label>\
			</td>\
			<td width="24.9%" align="left">\
				<span class="img_pos img_pos_center" onclick="G(\'float_center\').checked=true;"></span>&nbsp;&nbsp;&nbsp;<input id="float_center" name="spImgAlign" type="radio"><label for="float_center">\u5C45\u4E2D</label>\
			</td>\
			<td width="24.9%" align="left">\
				<span class="img_pos img_pos_right" onclick="G(\'float_right\').checked=true;"></span>&nbsp;&nbsp;&nbsp;<input id="float_right" name="spImgAlign" type="radio"><label for="float_right">\u5C45\u53F3</label>\
			</td>\
		</tr>\
		</table><br />\
	</form>\
	</div>\
</div>\
<div id="ctrlButtonContainer" >\
	<input type="button" class="ok" value="\u786E\u5B9A" onclick="okFun()" >\
	<input type="button" class="cancel" value="\u53D6\u6D88" onclick="cancelFun();">\
</div>';
	document.body.innerHTML=bodyHtml;
	current_selected_tab = G('tabs').firstChild;
	window.isInitialized=true;

}

initPage();

function initImg(imgUrl,imgFloat){
	G("fileCtn").innerHTML+=" ";
	G("isImgFile").value=0;
	var frm=document.linkForm;
	selectThisTab(G('tabs').firstChild,1);
	frm.img_url.value    = imgUrl || "http://";
	var idx={"":0, left:1, center:2, right:3}[imgFloat || ""];
	if(!idx) idx=0;
	frm.spImgAlign[idx].checked = true;
	try{parent.QW.Editor.EditorCmd._focusEnd(G("img_url"));}catch(e){;}
}

