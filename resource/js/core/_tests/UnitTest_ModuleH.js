(function() {
	var ModuleH = QW.ModuleH;
	var useTimes = 0;

	describe('ModuleH', {
		'ModuleH Members': function() {
			value_of(ModuleH).log();
		},
		'provide': function() {
			ModuleH.provide("testtest1", 'value1');
			value_of(QW.testtest1).should_be("value1");
			ModuleH.provide({
				testtest2: 'value2'
			});
			value_of(QW.testtest2).should_be("value2");
		},
		'addConfig': function() {
			value_of(ModuleH).should_have_method('addConfig');
			ModuleH.addConfig("JSON", {
				url: '//core/dev/json.js',
				requires: 'ArrayH,ClassH'
			});
		},
		'use': function() {
			value_of(ModuleH).should_have_method('use');
			ModuleH.use("JSON", function() {
				if (useTimes) {
					alert('已运行过');
					return;
				}
				describe('ModuleH2', {
					'use is ok': function() {
						if (useTimes) {
							alert('已运行过.');
							return;
						}
						useTimes = 1;
						value_of(window.JSON).should_have_method('stringify');
						QW.loadJs(QW.PATH + 'core/_tests/UnitTest_JSON.js');
					}
				});
			});
		}

	});

}());