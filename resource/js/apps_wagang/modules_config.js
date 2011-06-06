/*Lib Module*/
QW.ModuleH.addConfig({
	Ajax: {
		url: '//wagang/ajax/ajax_retouched.combo.js'
	},
	jQuery: {
		url: 'http://common.cnblogs.com/script/jquery.js',
		loadedChecker:function(){
			return !!(window.jQuery && window.jQuery.fn);
		}
	}
}); 
