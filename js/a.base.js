var CikuWeb = {
	loc : "http://localhost:8080/web/",
	// loc : "http://www.cikuapp.com:10004/",
	//loc : "http://cikuapp.com:8080/web/",
	// loc : "http://test.cikuapp.com/",
	staticResLoc : "http://static.cikuapp.com/uploadMedia/"
}
/**
 * 登陆模块
 */
CikuWeb.Login = function() {
	//
}
CikuWeb.Login.prototype = {
	init : function() {
		var me = this;
		if(!$kit.isEmpty($kit.cookie.get('sid'))) {
			$kit.adCls($kit.el('#login'), 'hasLogin');
			$kit.el('#loginInfo').innerHTML = '欢迎,' + $kit.cookie.get('sid');
			$kit.el('#login').innerHTML = '注销';
		} else {
			$kit.rmCls($kit.el('#login'), 'hasLogin');
			$kit.el('#login').innerHTML = '登陆';
		}
		var div = document.createElement('div');
		div.id = "J_loginWindow";
		var redirectUrl = window.location.href;
		if(redirectUrl.indexOf('ticket=') > 0) {
			redirectUrl = redirectUrl.substring(0, redirectUrl.indexOf('ticket='));
		}
		var bodyHTML = '<iframe scrolling="no" frameborder="0" src="' + CikuWeb.loc + 'login?redirectUrl=' + redirectUrl + '"></iframe>';
		bodyHTML += '<div class="btn-closeWin"></div>';
		div.innerHTML = bodyHTML;
		document.body.appendChild(div);
		this.loginWindow = div;
		//
		$kit.ev({
			el : '#login',
			ev : 'click',
			fn : function(ev, evCfg) {
				if($kit.el('#login').innerHTML == '注销') {
					location.href = CikuWeb.loc + 'login/quit?redirectUrl=' + location.href;
				} else {
					me.toggle();
				}
			},
			scope : me
		});
		$kit.ev({
			el : $kit.el('div.btn-closeWin'),
			ev : 'click',
			fn : function(ev, evCfg) {
				me.hide();
			},
			scope : me
		});
	},
	show : function() {
		var box = this.loginWindow;
		$kit.adCls(box, 'loginWindow_show');
		$kit.anim.motion({
			duration : 500,
			el : box,
			from : {
				opacity : 0,
				display : 'block',
				zoom : 0.01,
				left : '100%',
				top : '0%'
			},
			to : {
				opacity : 1,
				zoom : 1,
				left : '50%',
				top : '50%'
			},
			fx : $kit.anim.easeInQuad,
			then : function() {

			},
			timeout : '_timeout_loginWindowShow'
		});
		// this.loginWindow.style.display = 'block';
	},
	hide : function() {
		var box = this.loginWindow;
		if($kit.hsCls(box, 'loginWindow_show')) {
			$kit.rmCls(box, 'loginWindow_show');
			$kit.anim.motion({
				duration : 500,
				el : box,
				from : {
					opacity : 1,
					display : 'block',
					zoom : 1,
					left : box.style.left,
					top : box.style.top
				},
				to : {
					opacity : 0,
					zoom : 0.01,
					left : '100%',
					top : '0%'
				},
				fx : $kit.anim.easeInQuad,
				then : function() {
					$kit.css(box, 'display', 'none');
				},
				timeout : '_timeout_loginWindowShow'
			});
		}
	},
	toggle : function() {
		var box = this.loginWindow, me = this;
		if($kit.hsCls(box, 'loginWindow_show')) {
			me.hide();
		} else {
			me.show();
		}
	}
}
$kit.$(function() {
	var login = new CikuWeb.Login();
	window.login = login;
	login.init();
});
