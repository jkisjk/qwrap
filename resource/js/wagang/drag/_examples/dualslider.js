function DualSlider(opts) {
	ObjectH.mix(this, opts, 1);
	this.init();
};
(function() {
	DualSlider.EVENTS = ['drag', 'dragend'];

	DualSlider.prototype = {
			container : null, //容器
			width : 100, //拖动距离，单位px
			startValue : 0,
			endValue : 100,

			init : function() {
				if(this.container) {
					var holderLeft, holderRight, sliderLeft, sliderRight, container, startValue, endValue;
					this.container = W(this.container);
					container = this.container;
					holderLeft	= container.one('.arr1');
					holderRight	= container.one('.arr2');

					sliderLeft	= holderLeft.one('.arr');
					sliderRight	= holderRight.one('.arr');
					
					this.holders = [holderLeft, holderRight];
					this.sliders = [sliderLeft, sliderRight];

					this.minValue = startValue = this.startValue;
					this.maxValue = endValue = this.endValue;
					this.value = endValue - startValue;

					CustEvent.createEvents(this, DualSlider.EVENTS);
					this.render();
				}
			},
			
			render : function() {
				var holders, sliders, width, resize1, resize2, instance;
				holders = this.holders;
				sliders = this.sliders;
				width = this.width;
				instance = this;
				
				resize1 = new SimpleResize({
						oSrc:holders[0].core[0],
						oHdl:sliders[0].core[0],
						maxXAttr:width,
						yFixed:true
					});

				resize2 = new SimpleResize({
						oSrc:holders[1].core[0],
						oHdl:sliders[1].core[0],
						xAttr:'-width',
						maxXAttr:width,
						yFixed:true
					});

				resize1.on('dragend', function() {
					var el = this.oSrc;
					resize2.maxXAttr = width - parseInt(W(el).getCurrentStyle('width'));
					instance.fire('dragend');
				});

				resize1.on('drag', function() {
					var el = this.oSrc;
					var left  = parseInt(W(el).getCurrentStyle('width')),
						width = instance.width, 
						value = instance.value,
						startValue = instance.startValue;
					instance.minValue = Math.round((left / width) * value + startValue);
					instance.fire('drag');
				});

				resize2.on('dragend', function() {
					var el = this.oSrc;
					resize1.maxXAttr = width - parseInt(W(el).getCurrentStyle('width'));
					instance.fire('dragend');
				});

				resize2.on('drag', function() {
					var el = this.oSrc;
					var right  = parseInt(W(el).getCurrentStyle('width')),
						width = instance.width, 
						value = instance.value,
						startValue = instance.startValue;
					instance.maxValue = Math.round((1 - right / width) * value + startValue);
					instance.fire('drag');
				});

				this.resizes = [resize1, resize2];
			},
			setMinValue : function(min) {
				if(typeof min == 'undefined' || !/^\d+$/.test(min)) return;
				var resize, left, startValue;
				startValue = this.startValue;
				resize = this.resizes[0];
				min = Math.max(startValue, min | 0);
				min = Math.min(this.maxValue, min);
				this.minValue = min;
				left = Math.round((min - startValue) / this.value * this.width);
				W(resize.oSrc).css('width', left + 'px');
				resize.fire('dragend');
			},
			setMaxValue : function(max) {
				if(typeof max == 'undefined' || !/^\d+$/.test(max)) return;
				var resize, right, endValue;
				endValue = this.endValue;
				resize = this.resizes[1];
				max = Math.min(endValue, max | 0);
				max = Math.max(this.minValue, max);
				this.maxValue = max;
				right = Math.round((endValue - max) / this.value * this.width);
				W(resize.oSrc).css('width', right + 'px');
				resize.fire('dragend');
			},
			setValues : function(min, max) {
				this.setMinValue(min);
				this.setMaxValue(max);
			}
		};
})();