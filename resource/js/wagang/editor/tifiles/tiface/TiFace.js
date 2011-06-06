(function(){
	var faceScts=[
		{
			id:"pao",
			name:"泡泡",
			path:Editor.editorPath+'tifiles/tiface/pao/',
			files:'f01,f02,f03,f04,f05,f06,f07,f08,f09,f10,f11,f12,f13,f14,f15,f16,f17,f18,f19,f20,f21,f22,f23,f24,f25,f26,f27,f28,f29,f30,f31,f32,f33,f34,f35,f36,f37,f38,f39,f40,f41,f42,f43,f44,f45,f46,f47,f48,f49,f50'.split(","),
			alts:[],
			width:25
		},
		{
			id:"youa",
			name:"有啊",
			path:Editor.editorPath+'tifiles/tiface/youa/',
			files:'f01,f02,f03,f04,f05,f06,f07,f08,f09,f10,f11,f12,f13,f14,f15,f16,f17,f18,f19,f20,f21,f22,f23,f24,f25,f26,f27,f28,f29,f30,f31,f32,f33,f34,f35,f36,f37,f38,f39,f40'.split(","),
			alts:'男兜,女兜'.split(","),
			width:35
		}
	];

	function td_mouseover(e){
		this.className='activeTd';
		var imgsrc=this.getAttribute('imgsrc');
		if(!imgsrc) return;
		var reviewEl=g('face-sct-review');
		reviewEl.getElementsByTagName('img')[0].src=imgsrc;
		var stl=reviewEl.style;
		stl.display='';
		if(this.cellIndex>4){
			stl.left='2px';
			stl.right='auto';
		}
		else{
			stl.left='auto';
			stl.right='2px';
		}
	};
	function td_mouseout(e){
		this.className='';
		g('face-sct-review').style.display='none';
	};
	function td_click(e){
		var imgsrc=this.getAttribute('imgsrc');
		if(imgsrc){
			Editor.EditorCmd._tiFaceExec(imgsrc,this.title);
		}
	};
	function a_click(e){
		QW.EventH.preventDefault(e);
		var pEl=this.parentNode;
		var els=pEl.parentNode.getElementsByTagName("li");
		for(var i=0;i<els.length;i++){
			els[i].className=(els[i]==pEl?"selected":"");
		}
		var tblId=pEl.id.replace('-hd-','-main-');
		var els=g('face-sct-main').getElementsByTagName("li");
		for(var i=0;i<els.length;i++){
			els[i].style.display=(els[i].id==tblId?"":"none");
		}
	};

	var html1=['<ul class="sct-hd" id="face-sct-hd" >'],html2=['<div style="position:relative;"><div id="face-sct-review" style="position:absolute;padding:2px 5px;border:solid #cccccc 2px;text-align:center;top:2px;background-color:#fff;display:none;"><img aaa/></div><ul class="face-sct-main" id="face-sct-main">'];
	for (var i=0;i<faceScts.length;i++)
	{
		var sct=faceScts[i];
		html1.push('<li id="face-sct-hd-'+sct.id+'" '+(i?'':'class="selected"')+'><a href="#">'+sct.name+'</a></li>'.format(sct.id,sct.name));
		html2.push('<li id="face-sct-main-'+sct.id+'" '+(i?' style="display:none;"':'')+'><table class="faceTable" cellpadding=0 cellspacing=0 border=1>');
		for(var j=0;j<sct.files.length;j++){
			if(j%10==0) html2.push("<tr>");
			html2.push('<td align="center" imgsrc="' + sct.path + sct.files[j] + '.gif" '+(sct.alts[j]?'title="'+sct.alts[j]+'"':'')+'><span style="cursor:pointer;display:block;width:'+sct.width+'px;height:'+sct.width+'px;background:url('+sct.path+'faces.gif) no-repeat 0 -'+(j*sct.width)+'px" border="0"/></td>');
			if(j%10==9) html2.push('</tr>');
		}
		for(;j%10;j++){
			html2.push('<td align="center"  >&nbsp;</td>');
			if(j%10==9) html2.push('</tr>');
		}
		html2.push('</table></li>');
	}
	html1.push('</ul>');
	html2.push('</ul></div>');
	g("editor_faces_wraper").innerHTML=html1.join('')+html2.join('');
	var els=g("editor_faces_wraper").getElementsByTagName('td');
	for(var i=0;i<els.length;i++){
		els[i].onmouseover=td_mouseover;
		els[i].onmouseout=td_mouseout;
		els[i].onclick=td_click;
	}
	var els=g("face-sct-hd").getElementsByTagName('a');
	for(var i=0;i<els.length;i++){
		els[i].onclick=a_click;
	}
})();
