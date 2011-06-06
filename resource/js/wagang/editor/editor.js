(function() {
	var els = document.getElementsByTagName('script'),
		srcPath = '';
	for (var i = 0; i < els.length; i++) {
		var src = els[i].src.split(/wagang[\\\/]/g);
		if (src[1]) {
			srcPath = src[0];
			break;
		}
	}
	document.write('<script type="text/javascript" src="' + srcPath + 'wagang/editor/editor_base.js"><\/script>');
	document.write('<script type="text/javascript" src="' + srcPath + 'wagang/editor/editor_assist.js"><\/script>');
}());