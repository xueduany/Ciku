var CikuWeb = {
	loc : "http://localhost:8080/web/",
	// loc : "http://www.cikuapp.com:10004/",
	//loc : "http://cikuapp.com:8080/web/",
	// loc : "http://test.cikuapp.com/",
	staticResLoc : "http://static.cikuapp.com/uploadMedia/",
	mediaUploadLoc : '/media/upload'
}
//fix html5
document.createElement("article");
document.createElement("footer");
document.createElement("header");
document.createElement("hgroup");
document.createElement("nav");
document.createElement('d');
document.createElement('w');

$kit.$(function() {
	if(!$kit.isEmpty($kit.el('#loginLink')) && !$kit.isEmpty($kit.el('#login-popWindow'))) {
		$kit.ev({
			el : '#loginLink',
			ev : 'click',
			fn : function(e) {
				if($kit.hsCls(e.currentTarget, 'active')) {
					$kit.rmCls($kit.el('#loginLink'), 'active');
					$kit.el('#login-popWindow').style.display = '';
				} else {
					showLoginPop();
				}
				e.stopDefault();
			}
		});
		$kit.ev({
			el : '#loginLink',
			ev : 'mouseover',
			fn : function(e) {
				if($kit.hsCls(e.currentTarget, 'active')) {
					showLoginPop();
				}
			}
		});
		$kit.ev({
			el : '#loginLink',
			ev : 'mouseout',
			fn : function(e) {
				if(!$kit.contains($kit.el('#loginLink'), e.relatedTarget)) {
					window._hide_loginPop = setTimeout(function() {
						$kit.rmCls($kit.el('#loginLink'), 'active');
						$kit.el('#login-popWindow').style.display = '';
					}, 300);
				}
			}
		});
		$kit.ev({
			el : '#login-popWindow',
			ev : 'mouseout',
			fn : function(e) {
				if(!$kit.contains($kit.el('#login-popWindow'), e.relatedTarget)) {
					window._hide_loginPop = setTimeout(function() {
						$kit.rmCls($kit.el('#loginLink'), 'active');
						$kit.el('#login-popWindow').style.display = '';
					}, 300);
				}
			}
		});
		$kit.ev({
			el : '#login-popWindow',
			ev : 'mouseover',
			fn : function(e) {
				showLoginPop();
			}
		});
		$kit.el('#loginForm').onsubmit = function(e) {
			var body = "UserName=" + encodeURIComponent($kit.el('@UserName')[0].value)//
			+ "&Password=" + encodeURIComponent($kit.el('@Password')[0].value)//
			+ "&RememberMe=" + encodeURIComponent($kit.val($kit.el('@RememberMe')));
			$kit.io.ajax({
				url : '/Account/JsonLogin?' + body,
				method : 'post',
				async : true,
				//body : body,
				onSuccess : function(res) {
					var form = $kit.el('#loginForm');
					eval('res=' + res);
					if(res.errors && res.errors.length) {

						var _re = $kit.el('#loginFormAjaxReturn');
						var html = '';
						$kit.each(res.errors, function(o) {
							html += '<div>' + o + '</div>';
						});
						if($kit.isEmpty(_re)) {
							html = '<div id="loginFormAjaxReturn">' + html + '</div>';
							$kit.el('#login-popWindow').appendChild($kit.newHTML(html));
							_re = $kit.el('#loginFormAjaxReturn');
						} else {
							_re.innerHTML = html;
						}
					} else if(res.success == true || res.success == 'true') {
						var html = ['<div id="loginComplete">', //
						'你好, ', //
						$kit.el('@UserName')[0].value, '<s></s>', //
						'<ul class="menu" style="display:none">', //
						'<li><a href="/Account/ChangePassword">修改密码</a></li>', //
						'<li><a href="/Account/LogOff">退出登陆</a></li>', //
						'</ul>', //
						'</div>'//
						].join('');
						$kit.el('#login').innerHTML = html;
						if(!$kit.isEmpty($kit.el('#loginComplete'))) {
							$kit.ev({
								el : $kit.el('#loginComplete'),
								ev : 'click',
								fn : function(e) {
									var ul = $kit.el8cls('menu', $kit.el('#loginComplete'));
									if(ul.style.display != 'none') {
										ul.style.display = 'none';
										$kit.rmCls($kit.el('#loginComplete'), 'active');
									} else {
										ul.style.display = '';
										$kit.adCls($kit.el('#loginComplete'), 'active');
									}
								}
							})
						}
					}
				}
			});
			return false;
		}
	}
	function showLoginPop() {
		clearTimeout(window._hide_loginPop);
		$kit.adCls($kit.el('#loginLink'), 'active');
		if($kit.el('#login-popWindow').style.display != 'block') {
			var a = $kit.el('span.kitjs-validator', $kit.el('#login-popWindow'));
			$kit.each(a, function(o) {
				$kit.rmCls(o, 'validator-show');
			});
		}
		$kit.el('#login-popWindow').style.display = 'block';
	}

	if(!$kit.isEmpty($kit.el('#loginForm')) || !$kit.isEmpty($kit.el('#registForm'))) {
		$kit.$(function() {
			$kit.widgetInstance = {};
			var defaultConfig = $kit.ui.Validator.defaultConfig;
			$kit.each($kit.els8cls(defaultConfig.validatorCls), function(currentOne, idx, array) {
				$kit.widgetInstance[defaultConfig.kitWidgetName] = $kit.widgetInstance[defaultConfig.kitWidgetName] || [];
				var rules = eval($kit.attr(currentOne, 'rules')), cfg;
				if($kit.isEmpty(rules)) {
					cfg = {
						el : currentOne
					};
				} else {
					cfg = {
						el : currentOne,
						rules : rules
					};
				}
				$kit.widgetInstance[defaultConfig.kitWidgetName].push(new $kit.ui.Validator(cfg));
			});
		});
	}
	if(!$kit.isEmpty($kit.el('#loginComplete'))) {
		$kit.ev({
			el : $kit.el('#loginComplete'),
			ev : 'click',
			fn : function(e) {
				var ul = $kit.el8cls('menu', $kit.el('#loginComplete'));
				if(ul.style.display != 'none') {
					ul.style.display = 'none';
					$kit.rmCls($kit.el('#loginComplete'), 'active');
				} else {
					ul.style.display = '';
					$kit.adCls($kit.el('#loginComplete'), 'active');
				}
			}
		})
	}
});
