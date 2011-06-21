(function () {
	var indexOfArr = QW.ArrayH.indexOf,
		mix = QW.ObjectH.mix, 
		CustEvent = QW.CustEvent, 
		NodeH = QW.NodeH,
		hasClass = NodeH.hasClass,
		addClass = NodeH.addClass,
		removeClass = NodeH.removeClass,
		query = NodeH.query,
		EventTargetH = QW.EventTargetH,
		delegate = EventTargetH.delegate,
		on = EventTargetH.on;

	/**
	 * @class Switch 切换类，是一个虚拟类，没有真正的switchTo方法
	 * @param {json} options 构造参数，支持以下参数：
		{array} items switch明细
	 * @return {Switch} 
	 */
	var Switch = function (options) {
		mix(this,options||{},true);
		this.items = this.items || [];
		this.selectedIndex = -1;
		CustEvent.createEvents(this, Switch.EVENTS);
	};

	Switch.EVENTS = ['beforeswitch', 'afterswitch'];

	mix(Switch.prototype, {
		/**
		 * @method insert 插入元素
		 * @override
		 * @param	{item}	item	元素
		 * @param	{int}	index	下标
		 * @return	{item}
		 */
		insert : function (item, index) {
			index = Math.min(this.items.length,index);
			this.items.splice(index, 0, item);
			if (index < this.selectedIndex) {
				this.selectedIndex++;
			}
			return item;
		},

		/**
		 * @method remove 移除元素
		 * @override
		 * @param	{int}	index	下标
		 * @return	{item}
		 */
		remove : function (index) {
			if (!this.items.length) return;

			index = Math.min(this.items.length - 1,index);
			if (index > -1){
				var result = this.items[index];
				if (index < this.selectedIndex) {
					this.index--;
				} else if (index == this.selectedIndex) {
					this.switchTo(-1);
				}
				this.items.splice(index, 1);
				return result;
			}
		},

		/**
		 * @method switchTo 切换到
		 * @param	{int}	index	下标
		 * @return	{void}
		 */
		switchTo : function(index) {
			/*=======
			this.selectedIndex = index;
			=======*/
			alert('Switch to: '+ index);
		},

		/**
		 * @method switchTo 切换到
		 * @param	{any}	itemObj itemObj
		 * @return	{void}
		 */
		switchToItem : function(itemObj) {
			var index = this.indexOf(itemObj);
			return this.switchTo(index);
		},

		next : function() {
			var index = this.selectedIndex+1;
			if(index >= this.items.length) index = 0;
			this.switchTo(index);
		},

		previous : function() {
			var index = this.selectedIndex-1;
			if(index <0 ) index = this.items.length - 1;
			this.switchTo(index);
		},

		/**
		 * @method indexOf 根据元素查找下标
		 * @param	{item}	item	元素
		 * @return	{int}
		 */
		indexOf : function (item) {
			return indexOfArr(this.items, item);
		},

		/**
		 * @method item 根据下表找到元素
		 * @param	{int}	index	下标
		 * @return	{item}
		 */
		item : function (index) {
			return this.items[index];
		},

		/**
		 * @method getCurrent 获取当前选中元素
		 * @return	{item}
		 */
		getCurrent : function () {
			return this.item(this.selected);
		},

		/**
		 * @method getLast 获取最后的元素
		 * @return	{item}
		 */
		getLast : function () {
			return this.item(this.items.length - 1);
		},

		/**
		 * @method getFirst 获取开头的元素
		 * @return	{item}
		 */
		getFirst : function () {
			return this.item(0);
		}
	});


	/**
	 * @class TabView TabView类，提供“一组tabs节点来决定一组views节点的展现方式”的功能
	 * @param {Element} host TabView元素的容器节点：
	 * @param {json} options 构造参数，支持以下参数：
		{string}  tabSelector 用来获取tabs的selector。
		{Array}  views (Optional) view节点数组。
		{string}  viewSelector (Optional) 用来获取views的selector。
		{boolean} autoPlay (Optional) 是否自动轮播
		{boolean} autoPlayPausing (Optional) 自动轮播是否处于暂停状态。可以随时修改TabView的实体的autoPlayPausing，来决定是否暂停轮播。
		{int} autoPlayTime (Optional) 自动轮播的时间间隔，默认为3000ms
		{boolean} supportMouseenter (Optional) 是否支持鼠标移上tabs的效果
		{int} mouseenterSwitchTime (Optional) mouseenter到tab后达到自动切换的等候时间。如果为undefined，则不自动切换；如果为非负整数（包括0），表示有mouseenter的切换效果；
		{Array} switchEvents (Optional) 触发切换tab的dom事件，默认为['click']
		{function} onbeforeswitch (Optional) 事件
		{function} onafterswitch (Optional) 事件
	 * @return {TabView} 
	 */


	function TabView(host,options){
		var me=this;
		//构造Switch对象
		me.host = host;
		var newOptions = {
			items : query(host,options.tabSelector),
			views : options.views || options.viewSelector && query(host,options.viewSelector)
		};
		mix(newOptions, options);
		Switch.call(me, newOptions)
		var selectedIndex = -1,
			items=this.items;
		for(var i =0;i<items.length;i++){
			if (hasClass(items[i], this.selectedClass)) {
				selectedIndex = i;
				break;
			}
		}
		if(selectedIndex>-1) this.switchTo(selectedIndex);

		//初始化dom事件
		if (me.autoPlay) {//自动播放效果
			var playInterval = 0;
			function mouseoutFun() {
				clearInterval(playInterval);
				playInterval = setInterval(function(){
					if(host.offsetWidth && !me.autoPlayPausing) {//如果隐藏，或设置了autoPlaysing，则忽略自动播放。
						me.next();
					}
				},me.autoPlayTime || 3000);
			}
			mouseoutFun();
			on(host,'mouseenter',function(){clearInterval(playInterval)});
			on(host,'mouseleave',mouseoutFun);
		}
		if (me.supportMouseenter) { //mouseenter效果
			var mouseenterTimeout = 0;
			delegate(host,me.tabSelector,'mouseenter',function(){
				var tabEl=this;
				addClass(tabEl,me.preselectedClass);
				if(me.mouseenterSwitchTime != null){//mouseenter引发switch
					clearTimeout(mouseenterTimeout);
					mouseenterTimeout = setTimeout(function(){
						me.switchToItem(tabEl);
					}, me.mouseenterSwitchTime|0);
				}
			});
			delegate(host,me.tabSelector,'mouseleave',function(){
				removeClass(this,me.preselectedClass);
				clearTimeout(mouseenterTimeout);
			});
		}
		function switchHandler(e){
			me.switchToItem(this);
		}
		var switchEvents = this.switchEvents || this.defaultSwitchEvents;
		for (i=0;i<switchEvents.length;i++) {//添加立即切换对应的dom事件
			delegate(host,me.tabSelector,switchEvents[i],switchHandler);
		}
	}

	mix(TabView.prototype,[
		{
			selectedClass : 'selected',
			preselectedClass : 'preselected',
			selectedViewClass : 'selected',
			defaultSwitchEvents: ['click'],

			/**
			 * @method switchTo 切换到
			 * @param	{int}	index	下标
			 * @return	{void}
			 */
			switchTo : function (index) {
				var fromIndex = this.selectedIndex,
					fromItem = this.item(fromIndex),
					toItem = this.item(index);
					eventArgs = {
						fromIndex: fromIndex,
						toIndex: index,
						fromItem: fromItem,
						toItem: toItem
					};
				if(index == fromIndex) return;
				if (!this.fire('beforeswitch',eventArgs)) {
					return;
				}
				if(fromItem) {
					removeClass(fromItem,this.selectedClass);
					var fromView = this.views && this.views[fromIndex];
					if(fromView) removeClass(fromView,this.selectedViewClass);
				}
				if(toItem) {
					addClass(toItem,this.selectedClass);
					var toView = this.views && this.views[index];
					if(toView) addClass(toView,this.selectedViewClass);
				}
				this.selectedIndex = index;
				this.fire('afterswitch',eventArgs);
			}
		},
		Switch.prototype
	]);

	QW.provide({
		TabView: TabView
	});

}());