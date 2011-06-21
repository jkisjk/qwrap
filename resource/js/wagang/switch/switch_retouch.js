(function() {
	var mix = QW.ObjectH.mix,
		NodeH = QW.NodeH,
		g = NodeH.g,
		Jss = QW.Jss,
		JssTargetH = QW.JssTargetH,
		getJss = JssTargetH.getJss;

	Jss.addRules({
		'.picslide':{
			tabSelector : '>.switch-nav>li',
			viewSelector : '>.switch-content>li',
			autoPlay: true,
			supportMouseenter: true,
			mouseenterSwitchTime: 300
		}
	});
	var SwitchElH = { 
		/* 淡入 */
		switchable: function(el, options) {
			el = g(el);
			var newOptions = {},
				props = 'tabSelector views viewSelector autoPlay autoPlayTime supportMouseenter mouseenterSwitchTime switchEvents onbeforeswitch onafterswitch'.split(' ');
			for(var i=0;i<props.length;i++){
				var value = getJss(el,props[i]);
				if(value != null) newOptions[props[i]] = value;
			}
			mix(newOptions, options);
			return new QW.TabView(el, newOptions);
		}
	};

	QW.NodeW.pluginHelper(SwitchElH, 'operator');
	if (QW.Dom) {
		QW.ObjectH.mix(QW.Dom, SwitchElH);
	}
	QW.DomU.ready(function(){
		QW.NodeW('div.switchable').switchable();
	});
}());