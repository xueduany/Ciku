$kit.$(function() {
	if(!$kit.isEmpty($kit.el('#J_media_play'))) {
		/**
		 * 初始化LRC
		 */
		var audioPlayer = new $kit.ui.Audio({
			el : $kit.el('#J_media_play'),
			swfLocation : 'http://static.cikuapp.com/Ciku/js/audiojs.swf'
		});
		audioPlayer.ready(function() {
			window.lockScroll = false;
			$kit.ev({
				el : window,
				ev : 'scroll',
				fn : function(e, cfg) {
					clearTimeout(window._dislock_scroll);
					window.lockScroll = true;
					window._dislock_scroll = setTimeout(function() {
						window.lockScroll = false;
					}, 300);
				}
			});
			audioPlayer.ev({
				ev : 'timeupdate',
				fn : function(e) {
					if(!audioPlayer.playing) {
						return;
					}
					if($kit.isIE()) {
						if(window._flag_performance_optimize == true) {
							return;
						}
						window._flag_performance_optimize = true;
						setTimeout(function() {
							window._flag_performance_optimize = false;
						}, 300)
					}
					var timeRange = $kit.el('#J_CIKU_sentence_time_range').value;
					var aryTimeRange = $kit.array.parse(timeRange);
					var old;
					$kit.each(aryTimeRange, function(o, i, ary) {
						var t1 = $kit.date.parseTime(o);
						if(i == 0 && audioPlayer.currentTime < t1) {
							$kit.rmCls($kit.el8cls('current_playing_sentence', $kit.el('#article')), 'current_playing_sentence');
							return false;
						}
						if(Math.round(audioPlayer.currentTime) < t1 || i == ary.length - 1) {
							if(i == ary.length - 1) {
								old = o;
							}
							var currentSentence = $kit.el('#J_' + old);
							if(!old || $kit.el8cls('current_playing_sentence', $kit.el('#article')) == currentSentence) {
								return false;
							}
							if(!$kit.hsCls(currentSentence, 'currentSentence')) {
								var offset = $kit.offset(currentSentence), viewport = $kit.viewport(currentSentence);
								var from = $kit.viewport(document.body).scrollTop;
								var distance = 50;
								var moveTo = offset.top - distance;
								//alert(from + '   ' + moveTo);
								// console.log(offset.bottom);
								// console.log(viewport.scrollTop);
								if(offset.bottom + distance > viewport.scrollTop + viewport.clientHeight || offset.top - distance < viewport.scrollTop) {
									//currentSentence.scrollIntoView();
									//console.log(window.lockScroll);
									//console.log('move');
									if(!window.lockScroll) {
										$kit.anim.motion({
											el : document.body,
											duration : 300,
											from : {
												scrollTop : from
											},
											to : {
												scrollTop : moveTo
											},
											timeout : '_scrollMove'
										});
										//alert(document.body.scrollTop);
									}
								}
								$kit.rmCls($kit.el8cls('current_playing_sentence', $kit.el('#article')), 'current_playing_sentence');
								$kit.adCls(currentSentence, 'current_playing_sentence');
							}
							return false;
						}
						old = o;
					});
				}
			});
			audioPlayer.ev({
				ev : 'play',
				fn : function(e) {
					$kit.adCls($kit.el('#J_startPlayButton'), 'startPauseButton');
				}
			});
			audioPlayer.ev({
				ev : 'pause',
				fn : function(e) {
					$kit.rmCls($kit.el('#J_startPlayButton'), 'startPauseButton');
				}
			});
			window.slideBar = new $kit.ui.SlideBar({
				slideBar : $kit.el('#J_slideBarForPlay'),
				slideContainer : $kit.el('#article'),
				slideAnimDuration : 500,
				locateElement : function(e) {
					var re = $kit.dom.parentEl8cls(e.target, 'sentence', $kit.el('#article'));
					if(re) {
						if(!$kit.isEmpty($kit.attr(re, 'data-startTime'))) {
							return re;
						}
					}
					return null;
				}
			});
			$kit.ev({
				el : '#J_slideBarForPlay',
				ev : 'click',
				fn : function(e, cfg) {
					if(window.slideBar.currentMoveTarget) {
						var el = window.slideBar.currentMoveTarget;
						var startTime = $kit.date.parseTime($kit.attr(el, 'data-starttime'));
						if(startTime) {
							// console.log(parseFloat($kit.date.parseTime($kit.attr(el, 'data-starttime')) / audioPlayer.duration));
							// console.log(audioPlayer.duration * parseFloat($kit.date.parseTime($kit.attr(el, 'data-starttime')) / audioPlayer.duration));
							audioPlayer.skipTimeTo($kit.date.parseTime($kit.attr(el, 'data-starttime')));
							audioPlayer.play();
						}
					}
				}
			});
			$kit.ev({
				el : '#J_startPlayButton',
				ev : 'click',
				fn : function() {
					audioPlayer.playPause();
					audioPlayer.skipTo(0);
				}
			});
		});
	}
});
