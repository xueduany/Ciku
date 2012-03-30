var Lrc = function(config) {
	var defaultConfig = {
		// 视频，音频
		resource : undefined,
		// 时间线linkedHashMap对象，key为xx:xx.xx,value为对应字母li元素的id
		timeLine : new LinkedHashMap(),
		// 当前播放的段落
		currentKeyInTimeLine : 0,
		// 当前播放时间的xx:xx.xx格式字符串
		formattedCurrentTimeStr : 0,
		// 当前播放时间xx秒
		currentTime : 0,
		btnInsLrcRow : null, // $kit.el("#J_insrow"),
		// 字幕列表容器元素
		lrcList : $kit.el("#lrc-list"),
		// 字幕html模板
		htmlLrcRow : ['<li id="${rowDomId}">', //
		'<span class="begin-time-outer"><input class="${clsLiTimeBox}" size="4" type="text" value="${beginTimeStr}" title="可以直接编辑，也可以使用上下方向键修改时间，按住Ctrl+上下键修改分，按住Shift+上下键修改时"></span>', //
		'<textarea cols="47" class="${clsLiSubtitle}" title="可以直接编辑字幕内容">${lrcText}</textarea>', //
		// '<a onclick="lrc.delLrcRowFrom(\'${formattedCurrentTimeStr}\')">删除</a>', //
		'<div class="operate">', //
		'<span class="btns-single">', //
		'<button class="J_lrcDelete" title="撤销当前时间点以后之后所有字幕">撤销</button>', //
		'<button class="J_lrcParagraphEnd" title="标记段落结束">标记段落结束</button>', //
		'<button class="J_lrcModifyTime">校对时间</button>', //
		'</span>', //
		'<span class="btns-multiple">', //
		'<button class="J_lrcCombine" title="合并当前时间点以及后面一个字幕">合并</button>', //
		'</span>', //
		'</div>', //
		'</li>'//
		].join(""),
		// highlight className
		clsCurrentTimePoint : "playing",
		// 字幕来源
		lrcTextResource : $kit.el8id("J_lrcTextResourceInput"),
		// 选中行的样式
		clsSelected : "selected",
		clsOperate : "operate",
		clsOperateHidden : "operateHidden",
		clsOperateMultiple : "operateMultiple",
		clsOperateModifyTime : "operateModifyTime",
		clsBtnLrcDelete : "J_lrcDelete",
		clsBtnLrcCombine : "J_lrcCombine",
		clsBtnAddParagraph : "J_lrcParagraphEnd",
		clsBtnModifyTime : "J_lrcModifyTime",
		clsLiTimeBox : "begin-time",
		clsLiSubtitle : "subtitle",
		// 误差时间
		elTimeError : $kit.el("#J_timeError"),
		timeError : parseFloat($kit.el("#J_timeError").value),
		timeFormatRegExp : /^((\d{2}:){1,2})((\d){2})$/,
		//
		nowPlaying : false,
		nowPaused : false,
		nowEnded : false,
		clsSubTitleContainer : "J_lrcArea",
		clsCreaterContainer : "J_createArea",
		lrcSourceFile : null,
		joinStr : ' '
	}
	var me = this;
	me.config = $kit.join(defaultConfig, config);
	me.init();
}
Lrc.prototype = {
	/**
	 * 初始化
	 */
	init : function() {
		var me = this;
		var resource = me.config.resource;
		var subTitleContainer = $kit.el('.' + me.config.clsSubTitleContainer)[0];
		var createrContainer = $kit.el('.' + me.config.clsCreaterContainer)[0];
		/**
		 * 解析Lrc
		 */
		if(me.config.lrcSourceFile != null && me.config.lrcSourceFile.value.trim() != '') {
			var lrcText = me.config.lrcSourceFile.value;
			var subTitles = lrcText.split("\n");
			var lastLrcTimeStr, lastLrcStr = '';
			for(var i = 0; i < subTitles.length; i++) {
				var subtitle = subTitles[i];
				subtitle = subtitle.trim();
				rightBracketPos = subtitle.indexOf("]");
				leftBracketPos = subtitle.indexOf("[");
				var timeStr = "";
				if(leftBracketPos == 0 && rightBracketPos > leftBracketPos) {
					timeStr = subtitle.substring(leftBracketPos + 1, rightBracketPos - leftBracketPos);
				}
				if(/^(\d+:){0,2}\d{1,2}(\.\d{0,2}){0,1}$/.test(timeStr)) {
					me.insertLrcRow({
						lrcText : subtitle.substring(rightBracketPos + 1),
						lrcTimeStr : $kit.date.formatTime($kit.date.parseTime(timeStr))
					});
					lastLrcTimeStr = $kit.date.formatTime($kit.date.parseTime(timeStr));
				} else {
					// me.config.lrcTextResource.value += "\n" + subtitle;
					me.insertLrcRow({
						lrcText : subtitle,
						lrcTimeStr : lastLrcTimeStr
					});
				}
			}
			me.timeNow();
			//
			if(me.config.lrcTextResource.value.trim().length == 0 && me.config.lrcList.childNodes.length > 0) {
				// var lrcArea = $kit.el('.'+me.config.clsSubTitleContainer)[0];
				$kit.adCls($kit.el('.cue', $kit.el('.J_createArea')[0])[0], 'cue-success');
			}
			//
		}
		if(me.config.lrcTextResource.value.trim().length > 0) {
			// 如果cut区域有文本的话,cut区域高亮，显示双击开始创建字幕
			me.formatStr();
			me.config.lrcTextResource.focus();
		}
		//
		if(me.config.lrcList.childNodes.length == 0) {
			$kit.adCls($kit.el('.cue', $kit.el('.J_lrcArea')[0])[0], 'cue-empty');
		}
		//
		/**
		 * 参数设置
		 */
		$kit.ev({
			el : me.config.elTimeError,
			ev : "input",
			fn : function(ev, evCfg) {
				var me = this;
				me.config.timeError = ev.target.value;
			},
			scope : me
		});
		/**
		 * 分割字幕文本，每次点击，根据视频的当前时间，生成一个字幕
		 */
		$kit.ev({
			el : me.config.lrcTextResource,
			ev : 'click',
			fn : function(ev, evCfg) {
				var el = ev.target, me = this;
				//
				$kit.el('.tips', $kit.el('.J_createArea')[0])[0].style.display = 'none';
				$kit.rmCls($kit.el('.tips', $kit.el('.J_createArea')[0])[0], 'tips-show');
				if($kit.el('.connect-subtitle-and-text').length > 0) {
					$kit.el('.connect-subtitle-and-text')[0].style.display = 'none';
				}
				//
				if($kit.hsCls(el, "textarea_lrcTextResourceEditAble")) {
					return;
				}
				var endPos = el.selectionEnd;
				if(el.value.length == 0 || endPos == 0) {
					el.blur();
					return;
				}
				el.setSelectionRange(0, endPos);
				var selection = window.getSelection();
				var text = selection.toString();
				if($kit.isEmpty(text)) {
					return;
				}
				selection.removeAllRanges();
				/*
				 * $kit.insEl({ pos : "before", where : el, what : '<div class="cutted_lrc">' + text + '</div>' })
				 */
				var currentTime = me.config.currentTime == 0 ? 0 : me.config.currentTime + me.config.timeError;
				var currentTimeStr = $kit.date.formatTime(currentTime);
				if(me.config.formattedCurrentTimeStr == 0 || me.config.formattedCurrentTimeStr == "0") {
					me.config.formattedCurrentTimeStr = $kit.date.formatTime(me.config.formattedCurrentTimeStr);
				}
				me.insertLrcRow({
					lrcText : text,
					lrcTimeStr : currentTimeStr
				});
				me.timeNow();
				el.value = el.value.substr(endPos);
				el.blur();
				if(me.config.lrcTextResource.value.trim().length == 0 && me.config.lrcList.childNodes.length > 0) {
					$kit.adCls($kit.el('.cue', $kit.el('.J_createArea')[0])[0], 'cue-success');
				}
				ev.stopDefault();
			},
			scope : me
		});
		/**
		 * 只有当字幕来源处于可编辑状态时候，才能被编辑
		 */
		// $kit.ev({
		// el : me.config.lrcTextResource,
		// ev : "keydown",
		// fn : function(ev, evCfg) {
		// var el = ev.target;
		// if(!$kit.hsCls(el, "textarea_lrcTextResourceEditAble")) {
		// ev.stopDefault();
		// el.blur();
		// }
		// }
		// });
		/**
		 * 控制字幕来源是否可以编辑
		 */
		$kit.ev({
			el : '#J_editLrc_btn',
			ev : "click",
			fn : function(ev, evCfg) {
				$kit.toggleCls(ev.target, 'selected');
				var el = me.config.lrcTextResource;
				if(!$kit.hsCls(el, "textarea_lrcTextResourceEditAble")) {
					$kit.adCls(el, "textarea_lrcTextResourceEditAble");
					$kit.adCls($kit.el('#J_editLrc_btn'), "progress");
					$kit.attr(el, "readonly", null);
					el.focus();
					//
					$kit.rmCls($kit.el('.cue', $kit.el('.J_createArea')[0])[0], 'cue-success');
				} else {
					$kit.rmCls(el, "textarea_lrcTextResourceEditAble");
					$kit.rmCls($kit.el('#J_editLrc_btn'), "progress");
					$kit.attr(el, "readonly", "readonly");
					//
					if(me.config.lrcTextResource.value.trim().length == 0 && me.config.lrcList.childNodes.length > 0) {
						$kit.adCls($kit.el('.cue', $kit.el('.J_createArea')[0])[0], 'cue-success');
					} else if(me.config.lrcTextResource.value.trim().length == 0 && me.config.lrcList.childNodes.length == 0) {
						$kit.adCls($kit.el('.cue', $kit.el('.J_createArea')[0])[0], 'cue-failed');
					}
				}
			},
			scope : me
		});
		$kit.ev({
			el : me.config.lrcTextResource,
			ev : "blur input",
			fn : function(ev, evCfg) {
				var el = me.config.lrcTextResource;
				if(el.value.trim().length == 0 && me.config.lrcList.childNodes.length == 0) {
					$kit.adCls($kit.el('.cue', $kit.el('.J_createArea')[0])[0], 'cue-failed');
				} else {
					$kit.rmCls($kit.el('.cue', $kit.el('.J_createArea')[0])[0], 'cue-failed');
				}
			},
			scope : me
		});
		/**
		 * 告诉用户如何创建字幕
		 */
		$kit.ev({
			el : '#J_createrHelp_btn',
			ev : 'click',
			fn : function(ev, evCfg) {
				me.showHelp();
			},
			scope : me
		});
		// $kit.ev({
		// el : $kit.el('.tips',$kit.el('.audio')[0])[0],
		// ev : 'click',
		// fn : function(ev, evCfg) {
		// var me = this;
		// me.showHelp();
		// },
		// scope : me
		// });
		/**
		 * 帮助第一步
		 */
		$kit.ev({
			el : $kit.el('.tips-1', $kit.el('.audio')[0])[0],
			ev : 'click',
			fn : function(ev, evCfg) {
				var me = this, tips1 = $kit.el('.tips-1', $kit.el('.audio')[0])[0];
				//
				$kit.rmCls(tips1, 'tips-show');
				$kit.anim.motion({
					duration : 500,
					el : tips1,
					from : {
						zoom : 1,
						opacity : 1
					},
					to : {
						zoom : 0.01,
						opacity : 0,
						display : 'none'
					},
					fx : $kit.anim.Fx.easeOutQuart,
					then : function() {
						me.config.resource.currentTime = 0;
						me.config.resource.play();
						//
						var tips2 = $kit.el('.tips', $kit.el('.lrcTextEditArea')[0])[0];
						$kit.anim.motion({
							duration : 1000,
							el : tips2,
							from : {
								display : 'block',
								right : 0,
								top : 0,
								zoom : 0.01,
								opacity : 0
							},
							to : {
								right : '192px',
								top : '100px',
								zoom : 1,
								opacity : 1
							},
							fx : $kit.anim.Fx.easeOutQuart,
							then : function() {
								if($kit.el('.connect-subtitle-and-text').length == 0) {
									$kit.insEl({
										pos : 'last',
										where : $kit.el('.resource')[0],
										what : '<div class="connect-subtitle-and-text"></div>'
									});
								} else {
									$kit.el('.connect-subtitle-and-text')[0].style.display = 'block';
								}
								var textarea = me.config.lrcTextResource;
								textarea.setSelectionRange(0, 250);
								//
							},
							timeout : '_timeout_createrTipsShow'
						});
					},
					timeout : '_timeout_createrTipsShow'
				});
			},
			scope : me
		});
		/**
		 * 帮助第二步
		 */
		$kit.ev({
			el : $kit.el('.tips', createrContainer)[0],
			ev : 'click',
			fn : function(ev, evCfg) {
				var me = this;
				//
				if($kit.el('.connect-subtitle-and-text').length > 0) {
					$kit.el('.connect-subtitle-and-text')[0].style.display = 'none';
				}
				var tips2 = $kit.el('.tips', createrContainer)[0];
				$kit.rmCls(tips2, 'tips - show');
				$kit.anim.motion({
					duration : 500,
					el : tips2,
					from : {
						right : tips2.style.right,
						top : tips2.style.top,
						zoom : 1,
						opacity : 1
					},
					to : {
						right : 0,
						top : 0,
						zoom : 0.01,
						opacity : 0,
						display : 'none'
					},
					fx : $kit.anim.Fx.easeOutQuart,
					then : function() {
						//
						var textarea = me.config.lrcTextResource;
						var endPos = 250;
						textarea.setSelectionRange(0, endPos);
						var selection = window.getSelection();
						var text = selection.toString();
						selection.removeAllRanges();
						var currentTime = me.config.currentTime == 0 ? 0 : me.config.currentTime + me.config.timeError;
						var currentTimeStr = $kit.date.formatTime(currentTime);
						if(me.config.formattedCurrentTimeStr == 0 || me.config.formattedCurrentTimeStr == "0") {
							me.config.formattedCurrentTimeStr = $kit.date.formatTime(me.config.formattedCurrentTimeStr);
						}
						me.insertLrcRow({
							lrcText : text,
							lrcTimeStr : currentTimeStr
						});
						me.timeNow();
						textarea.value = textarea.value.substr(endPos);
						if(me.config.lrcTextResource.value.trim().length == 0 && me.config.lrcList.childNodes.length > 0) {
							$kit.adCls($kit.el('.cue', $kit.el('.J_createArea')[0])[0], 'cue-success');
						}
						//
						var tips3 = $kit.el('.tips', $kit.el('.audio')[0])[0];
						$kit.adCls(tips3, 'tips-show');
						$kit.anim.motion({
							duration : 1000,
							el : tips3,
							from : {
								display : 'block',
								right : 0,
								top : 0,
								zoom : 0.01,
								opacity : 0
							},
							to : {
								right : '255px',
								top : '-95px',
								zoom : 1,
								opacity : 1
							},
							fx : $kit.anim.Fx.easeOutQuart,
							then : function() {
								if($kit.el('.connect-subtitle-and-media').length == 0) {
									$kit.insEl({
										pos : 'last',
										where : $kit.el('.audio')[0],
										what : '<div class="connect-subtitle-and-media"></div>'
									});
									$kit.el('.connect-subtitle-and-media')[0].style.display = 'block';
								} else {
									$kit.el('.connect-subtitle-and-media')[0].style.display = 'block';
								}
							},
							timeout : '_timeout_createrTipsShow'
						});
					},
					timeout : '_timeout_createrTipsShow'
				});
			},
			scope : me
		});
		/**
		 * 帮助第三步
		 */
		$kit.ev({
			el : $kit.el('.tips', $kit.el('.audio')[0])[0],
			ev : 'click',
			fn : function(ev, evCfg) {
				var me = this, tips3 = $kit.el('.tips', $kit.el('.audio')[0])[0];
				//
				if($kit.el('.connect-subtitle-and-media').length > 0) {
					$kit.el('.connect-subtitle-and-media')[0].style.display = 'none';
				}
				$kit.rmCls(tips3, 'tips-show');
				$kit.anim.motion({
					duration : 500,
					el : tips3,
					from : {
						right : tips3.style.right,
						top : tips3.style.top,
						zoom : 1,
						opacity : 1
					},
					to : {
						right : 0,
						top : 0,
						zoom : 0.01,
						opacity : 0,
						display : 'none'
					},
					fx : $kit.anim.Fx.easeOutQuart,
					then : function() {
						//
						var currentTime = me.config.currentTime == 0 ? 0 : me.config.currentTime + me.config.timeError;
						var currentTimeStr = $kit.date.formatTime(currentTime);
						if(me.config.formattedCurrentTimeStr == 0 || me.config.formattedCurrentTimeStr == "0") {
							me.config.formattedCurrentTimeStr = $kit.date.formatTime(me.config.formattedCurrentTimeStr);
						}
						var createdLi = me.insertLrcRow({
							lrcText : "",
							lrcTimeStr : currentTimeStr
						});
						me.timeNow();
						me.elLrcTextFromLi(createdLi).focus();
						//
						me.config.resource.pause();
						$kit.rmCls($kit.el('#J_createrHelp_btn'), 'selected');
					},
					timeout : '_timeout_createrTipsShow'
				});
			},
			scope : me
		});
		/**
		 * 格式化字幕来源
		 */
		$kit.ev({
			el : '#J_formatLrc_btn',
			ev : "click",
			fn : function(ev, evCfg) {
				var el = ev.target;
				var me = this;
				me.formatStr();
			},
			scope : me
		})
		// 当播放时
		$kit.ev({
			el : resource,
			ev : "timeupdate",
			fn : me.evPlaying,
			scope : me
		});
		$kit.ev({
			el : resource,
			ev : "play",
			fn : function(ev, evCfg) {
				var me = this;
				me.config.nowPlaying = true;
				me.config.nowEnded = false;
				me.config.nowPaused = false;
			},
			scope : me
		});
		$kit.ev({
			el : resource,
			ev : "pause",
			fn : function(ev, evCfg) {
				var me = this;
				me.config.nowPaused = true;
				me.config.nowPlaying = false;
			},
			scope : me
		});
		$kit.ev({
			el : resource,
			ev : "ended",
			fn : function(ev, evCfg) {
				var me = this;
				me.config.nowEnded = true;
				me.config.nowPaused = false;
				me.config.nowPlaying = false;
			},
			scope : me
		});
		$kit.ev({
			el : resource,
			ev : "timeupdate",
			fn : me.evPlaying,
			scope : me
		});
		// 字幕列表点击
		$kit.ev({
			el : me.config.lrcList,
			ev : "click",
			fn : me.evLrcListClick,
			scope : me
		});
		// 控制误差时间
		$kit.ev({
			el : me.config.elTimeError,
			ev : "blur",
			fn : function(ev, evCfg) {
				var me = this;
				if(!/^\-{0,1}\d+$/.test(me.config.elTimeError.value)) {
					me.config.elTimeError.value = 0;
				}
			},
			scope : me
		});
		// 双击生成字幕
		$kit.ev({
			el : me.config.resource,
			ev : "dblclick",
			fn : function(ev, evCfg) {
				var me = this;
				var currentTime = me.config.currentTime == 0 ? 0 : me.config.currentTime + me.config.timeError;
				var currentTimeStr = $kit.date.formatTime(currentTime);
				if(me.config.formattedCurrentTimeStr == 0 || me.config.formattedCurrentTimeStr == "0") {
					me.config.formattedCurrentTimeStr = $kit.date.formatTime(me.config.formattedCurrentTimeStr);
				}
				var createdLi = me.insertLrcRow({
					lrcText : "",
					lrcTimeStr : currentTimeStr
				});
				me.timeNow();
				me.elLrcTextFromLi(createdLi).focus();
			},
			scope : me
		});
		$kit.ev({
			el : "zzzz",
			ev : "click",
			fn : function(ev, evCfg) {
				var me = this;
				me.revert();
			},
			scope : me
		});
	},
	/**
	 *
	 */
	formatStr : function() {
		var me = this;
		me.config.lrcTextResource.value = $kit.str.breakSentence(me.config.lrcTextResource.value);
	},
	/**
	 * 显示帮助
	 */
	showHelp : function(ev, evCfg) {
		//
		//return;
		var me = this;
		//
		me.config._FLAG_SHOW_HELP = true;
		//
		var subTitleContainer = $kit.el('.' + me.config.clsSubTitleContainer)[0];
		var createrContainer = $kit.el('.' + me.config.clsCreaterContainer)[0];
		// var tips = $kit.el('.tips',createrContainer)[0];
		// var tips2 = $kit.el('.tips',$kit.el('.audio')[0])[0];
		var tips3 = $kit.el('.tips-1', $kit.el('.audio')[0])[0];
		$kit.toggleCls($kit.el('#J_createrHelp_btn'), 'selected');
		if(!$kit.hsCls(tips3, 'tips-show')) {
			$kit.adCls(tips3, 'tips-show');
			//
			$kit.anim.motion({
				duration : 1000,
				el : tips3,
				from : {
					display : 'block',
					zoom : 0.01,
					opacity : 0
				},
				to : {
					zoom : 1,
					opacity : 1
				},
				fx : $kit.anim.Fx.easeOutQuart,
				then : function() {
					//

				},
				timeout : '_timeout_createrTipsShow'
			});
		} else {
			$kit.rmCls(tips, 'tips-show');
			$kit.rmCls(tips2, 'tips-show');
			$kit.rmCls(tips3, 'tips-show');
			if($kit.el('.connect-subtitle-and-media').length > 0) {
				$kit.el('.connect-subtitle-and-media')[0].style.display = 'none';
			}
			$kit.anim.motion({
				duration : 300,
				el : tips2,
				from : {
					right : tips2.style.right,
					top : tips2.style.top,
					zoom : 1,
					opacity : 1
				},
				to : {
					right : 0,
					top : 0,
					zoom : 0.01,
					opacity : 0,
					display : 'none'
				},
				fx : $kit.anim.Fx.easeOutQuart,
				then : function() {
					//
					if($kit.el('.connect-subtitle-and-text').length > 0) {
						$kit.el('.connect-subtitle-and-text')[0].style.display = 'none';
					}
					$kit.anim.motion({
						duration : 500,
						el : tips,
						from : {
							right : tips.style.right,
							top : tips.style.top,
							zoom : 1,
							opacity : 1
						},
						to : {
							right : 0,
							top : 0,
							zoom : 0.01,
							opacity : 0,
							display : 'none'
						},
						fx : $kit.anim.Fx.easeOutQuart,
						then : function() {
							//
							$kit.anim.motion({
								duration : 500,
								el : tips3,
								from : {
									zoom : 1,
									opacity : 1
								},
								to : {
									zoom : 0.01,
									opacity : 0,
									display : 'none'
								},
								fx : $kit.anim.Fx.easeOutQuart,
								then : function() {
									tips3.style.display = 'none';
								},
								timeout : '_timeout_createrTipsShow'
							});
						},
						timeout : '_timeout_createrTipsShow'
					});
				},
				timeout : '_timeout_createrTipsShow'
			});
		}
	},
	closeHelp : function() {
		var me = this, btn = $kit.el('#J_createrHelp_btn');
		if($kit.hsCls(btn, 'selected')) {
			me.showHelp();
		}
	},
	/**
	 * 播放时，或者改变当前播放时间时触发事件
	 */
	evPlaying : function(ev, evCfg) {
		var me = this;
		me.timeNow();
		// 修改选中单个字幕的时间，当唯一的字幕被选中后，拖动左侧时间轴，显示校对时间按钮
		/*
		* var selectedLiAry = $kit.els8cls(me.config.clsSelected, me.config.lrcList); if(selectedLiAry.length == 1) { var operate = $kit.el8cls(me.config.clsOperate, selectedLiAry[0]); $kit.adCls(operate, me.config.clsOperateModifyTime); }
		*/
		//
		if(me.config.nowPlaying) {
			var currentPlayingLi = $kit.el8cls(me.config.clsCurrentTimePoint, me.config.lrcList);
			var container = me.config.lrcList;
			// console.log(currentPlayingLi.offsetTop);
			// console.log(container.offsetHeight + " " + container.scrollTop);
			var doFlag = false;
			if(container.offsetHeight + container.scrollTop < currentPlayingLi.offsetTop + currentPlayingLi.offsetHeight) {
				doFlag = true;
			} else if(container.scrollTop > currentPlayingLi.offsetTop + currentPlayingLi.offsetHeight) {
				doFlag = true;
			}
			if(doFlag) {
				if(window.timeoutScrollSubtitleCurrentLi != currentPlayingLi) {
					window.timeoutScrollSubtitleCurrentLi = currentPlayingLi;
					me.scrollSubtitle(currentPlayingLi);
				}
			}
		}
	},
	/**
	 * 算当前时间，播放位置啥的
	 */
	timeNow : function() {
		var me = this;
		// 视频or声音
		var resource = me.config.resource;
		// 当前时间
		var currentTime = resource.currentTime.toFixed(2);
		me.config.currentTime = currentTime;
		me.config.formattedCurrentTimeStr = $kit.date.formatTime(currentTime);
		var timeLine = me.config.timeLine;
		var currentKeyInTimeLine = 0, flagHighLight = false;
		timeLine.each(function(key, value, i, array, map) {
			var key = key, value = value;
			var beginTime = value.beginTime, beginTimeStr = value.beginTimeStr;
			if(parseFloat(currentTime) >= parseFloat(beginTime)) {
				currentKeyInTimeLine = beginTimeStr;
			} else {
				return false;
			}
		}, me);
		me.config.currentKeyInTimeLine = currentKeyInTimeLine;
		if(me.config.timeLine.hs(currentKeyInTimeLine)) {
			var o1 = $kit.el8cls(me.config.clsCurrentTimePoint);
			var o2 = $kit.el8id(me.config.timeLine.get(currentKeyInTimeLine).rowDomId);
			if(o1 != o2) {
				$kit.rmCls(o1, me.config.clsCurrentTimePoint);
				if(me.config.nowPlaying) {
					$kit.adCls(o2, me.config.clsCurrentTimePoint);
				}
			}
		} else {
			var a = $kit.els8cls(me.config.clsCurrentTimePoint);
			while(a.length > 0) {
				var o1 = a[0];
				$kit.rmCls(o1, me.config.clsCurrentTimePoint);
			}
		}
	},
	/**
	 * lrc列表操作
	 */
	evLrcListOperation : function(ev, evCfg) {
		return;
		var target = ev.target;
		var me = this;
		if($kit.hsCls(target, "J_cancel")) {
			// 撤销当前的lrc
			var timeLine = me.config.timeLine;
			var flagBegin = false;
			for(var i = 0; i < timeLine.length; i++) {
				// if(timeLine[i]==)
			}
		}
	},
	/**
	 * 插入一行字幕
	 */
	insertLrcRow : function(subTitle) {
		var subTitle = subTitle || {
			lrcText : "",
			lrcTimeStr : $kit.date.formatTime(me.config.currentTime == 0 ? 0 : me.config.currentTime + me.config.timeError)
		};
		var me = this;
		/*
		 * var currentTime = me.config.currentTime == 0 ? 0 : me.config.currentTime + me.config.timeError; var currentTimeStr = $kit.date.formatTime(currentTime); if(me.config.formattedCurrentTimeStr == 0 || me.config.formattedCurrentTimeStr == "0") { me.config.formattedCurrentTimeStr =
		 * $kit.date.formatTime(me.config.formattedCurrentTimeStr); }
		 */
		var currentTime = $kit.date.parseTime(subTitle.lrcTimeStr);
		var currentTimeStr = subTitle.lrcTimeStr;
		var idLi = "";
		var lrcText = subTitle.lrcText.trim();
		var hasParagraphEnd = false;
		if(lrcText.indexOf("\\n") + 2 == lrcText.length) {
			lrcText = lrcText.substring(0, lrcText.indexOf("\\n"));
			hasParagraphEnd = true;
		}
		lrcText = lrcText.replace(/\n+/g, ' ');
		if(!me.config.timeLine.hs(currentTimeStr)) {
			idLi = $kit.onlyId();
			var newTimeObject = {
				beginTime : currentTime,
				beginTimeStr : currentTimeStr.trim(),
				lrcText : lrcText,
				rowDomId : idLi
			};
			$kit.insEl({
				pos : me.config.timeLine.size() && me.config.currentKeyInTimeLine != 0 ? "after" : "first",
				what : $kit.tpl(me.config.htmlLrcRow, $kit.join(me.config, newTimeObject)),
				where : me.config.timeLine.size() && me.config.currentKeyInTimeLine != 0 ? $kit.el8id(me.config.timeLine.get(me.config.currentKeyInTimeLine).rowDomId) : me.config.lrcList
			});
			new $kit.ui.Form.TextArea({
				el : $kit.el("textarea", $kit.el8id(idLi))[0]
			});
			new $kit.ui.Form.TimeInput({
				el : $kit.el("input", $kit.el8id(idLi))[0],
				then : function(timeInput) {
					var me = this;
					if(timeInput.value != timeInput.oldValue) {
						me.modifyTime(me.elParentLi(timeInput), timeInput.value, timeInput.oldValue);
						me.timeNow();
					}
				},
				thenScope : me
			});
			me.config.timeLine.ad(newTimeObject.beginTimeStr, newTimeObject);
			me.config.timeLine.sort(function(left, right) {
				return $kit.date.parseTime(left) - $kit.date.parseTime(right);
			});
			me.config.currentKeyInTimeLine = currentTimeStr;
		} else {
			idLi = me.config.timeLine.get(me.config.currentKeyInTimeLine).rowDomId;
			var lrcTextarea = $kit.el8tag("textarea", $kit.el8id(idLi));
			// lrcTextarea.value = lrcTextarea.value + subTitle.lrcText;
			lrcTextarea.kitFormTextArea.setValue(lrcTextarea.value + me.config.joinStr + subTitle.lrcText);
		}
		if(hasParagraphEnd) {
			$kit.adCls($kit.el8id(idLi), "hasParagraphEnd");
		}
		//
		$kit.rmCls($kit.el('.cue', $kit.el('.J_lrcArea')[0])[0], 'cue-empty');
		//
		if(!$kit.isEmpty(idLi)) {
			return $kit.el8id(idLi);
		}
	},
	/**
	 * 取消已编辑好的lrcrow
	 */
	evCancelLrcRow : function(ev, evCfg) {
		var me = this;
		delLrcRowFrom(evCfg.currentKeyInTimeLine);
	},
	delLrcRowFrom : function(currentKeyInTimeLine) {
		var me = this;
		var currentRowDomId = me.config.timeLine.get(currentKeyInTimeLine).rowDomId;
		var rowList = $kit.el("li", me.config.lrcList);
		var cancelTextAry = [];
		for(var i = 0; i < rowList.length; i++) {
			if(rowList[i].id == currentRowDomId) {
				var currentLi = $kit.prevEl(li, function(li) {
					if(li.tagName && li.tagName == "li") {
						return true;
					}
				});
				if(!$kit.isEmpty(currentLi)) {
					me.config.currentKeyInTimeLine = me.getLrcTimeFromLi(currentLi);
				} else {
					me.config.currentKeyInTimeLine = 0;
				}
				while(rowList.length > i) {
					var li = rowList[i];
					var text = me.getLrcTextFromLi(li);
					cancelTextAry.push(text);
					$kit.rmEl(li);
					me.config.timeLine.rmFrom(currentKeyInTimeLine);
				}
			}
		}
		if(cancelTextAry.length) {
			me.setLrcSourceText(cancelTextAry.join("") + me.getLrcSourceText());
		}
	},
	/**
	 * 字幕列表点击
	 */
	evLrcListClick : function(ev, evCfg) {
		var me = this;
		/*
		* condition1
		*/
		// 判断点了哪个按钮
		// 点击了删除按钮
		var btnDel = ev.target;
		if(btnDel.tagName && btnDel.tagName.toLowerCase() == "button" && $kit.hsCls(btnDel, me.config.clsBtnLrcDelete)) {
			var liAry = $kit.el("li", me.config.lrcList), strBufferAry = [], flagStart = false, currentEvLi = me.elParentLi(btnDel), backTime;
			for(var i = 0; i < liAry.length; i++) {
				var li = liAry[i];
				// if($kit.hsCls(li, me.config.clsSelected) || flagStart) {
				if(li == currentEvLi || flagStart) {
					flagStart = true;
					var deleteLrcText = me.getLrcTextFromLi(li);
					var deleteKeyInTimeLine = me.getLrcTimeFromLi(li);
					me.config.timeLine.rm(deleteKeyInTimeLine);
					strBufferAry.push(deleteLrcText);
					$kit.rmEl(li);
					i--;
				} else {
					continue;
				}
			}
			if(strBufferAry.length) {
				me.setLrcSourceText(strBufferAry.join("") + me.getLrcSourceText());
				me.formatStr();
				//
				var lastLi = liAry[liAry.length - 1];
				backTime = $kit.date.parseTime(me.getLrcTimeFromLi(lastLi));

				me.config.resource.currentTime = backTime;
			}
			me.timeNow();
			//
			if(me.config.lrcList.childNodes.length == 0) {
				$kit.adCls($kit.el('.cue', $kit.el('.J_lrcArea')[0])[0], 'cue-empty');
			}
			if(me.config.lrcTextResource.value.trim().length > 0) {
				$kit.rmCls($kit.el('.cue', $kit.el('.J_createArea')[0])[0], 'cue-success');
			}
			//
			return;
		}
		// 点击了合并
		var btnCombine = ev.target;
		if(btnCombine.tagName && btnCombine.tagName.toLowerCase() == "button" && $kit.hsCls(btnCombine, me.config.clsBtnLrcCombine)) {
			// var selectedLiAry = $kit.els8cls(me.config.clsSelected, me.config.lrcList);
			var currentEvLi = me.elParentLi(btnCombine), nextEvLi = $kit.nextEl(currentEvLi, function(el) {
				return el.tagName && el.tagName.toLowerCase() == 'li';
			});
			var selectedLiAry = [currentEvLi, nextEvLi];
			var strBufferAry = [];
			while(selectedLiAry.length > 1) {
				var lastSelectedLi = selectedLiAry[selectedLiAry.length - 1];
				var deleteKeyInTimeLine = me.getLrcTimeFromLi(lastSelectedLi);
				var deleteLrcText = me.getLrcTextFromLi(lastSelectedLi);
				strBufferAry.push(deleteLrcText);
				me.config.timeLine.rm(deleteKeyInTimeLine);
				// $kit.rmCls(selectedLiAry[selectedLiAry.length - 1], me.config.clsSelected);
				$kit.rmEl(selectedLiAry[selectedLiAry.length - 1]);
				selectedLiAry.pop();
			}
			var combinedLrcTextarea = me.elLrcTextFromLi(selectedLiAry[0]);
			if(combinedLrcTextarea) {
				combinedLrcTextarea.kitFormTextArea.setValue(combinedLrcTextarea.value + me.config.joinStr + strBufferAry.join(""));
				$kit.rmCls(selectedLiAry[0], me.config.clsSelected);
			}
			me.timeNow();
			return;
		}
		// 点击了添加段落
		var btnAddPara = ev.target;
		if(btnAddPara.tagName && btnAddPara.tagName.toLowerCase() == "button" && $kit.hsCls(btnAddPara, me.config.clsBtnAddParagraph)) {
			var currentEvLi = me.elParentLi(btnCombine), nextEvLi = $kit.nextEl(currentEvLi, function(el) {
				return el.tagName && el.tagName.toLowerCase() == 'li';
			});
			if($kit.hsCls(currentEvLi, 'hasParagraphEnd')) {
				$kit.rmCls(currentEvLi, 'hasParagraphEnd');
			} else {
				$kit.adCls(currentEvLi, 'hasParagraphEnd');
			}
		}
		// 点击了校对时间
		/*
		* var btnModifyTime = ev.target; if(btnModifyTime.tagName && btnModifyTime.tagName.toLowerCase() == "button" && $kit.hsCls(btnModifyTime, me.config.clsBtnModifyTime)) { var selectedLiAry = $kit.els8cls(me.config.clsSelected, me.config.lrcList); if(selectedLiAry.length == 1) { var li =
		* selectedLiAry[0]; me.modifyTime(li, $kit.date.formatTime(me.config.currentTime), me.elLrcTimeFromLi(li).value); } me.timeNow(); return; }
		*/

		/*
		* condition2
		*/
		// 判断是否点击的是当前行
		/*
		 * var li = ev.target; if(li.tagName && li.tagName.toLowerCase() == "li") { } else { li = me.elParentLi(li); } if(li != null) { if($kit.hsCls(li, me.config.clsSelected)) { $kit.rmCls(li, me.config.clsSelected); while($kit.els8cls(me.config.clsSelected, me.config.lrcList).length > 0) {
		 * $kit.rmCls($kit.els8cls(me.config.clsSelected, me.config.lrcList)[0], me.config.clsSelected); } } else { var selectedLiAry = $kit.els8cls(me.config.clsSelected, me.config.lrcList); if(selectedLiAry.length > 0) { var liAry = $kit.el("li", me.config.lrcList);
		 * if(selectedLiAry[selectedLiAry.length - 1].compareDocumentPosition(li) == $kit.CONSTANTS.DOCUMENT_POSITION_FOLLOWING) { var flagStart = false; for(var i = 0; i < liAry.length; i++) { if(liAry[i] == selectedLiAry[selectedLiAry.length - 1]) { flagStart = true; } if(flagStart) {
		 * $kit.adCls(liAry[i], me.config.clsSelected); } if(liAry[i] == li) { flagStart = false; break; } } } else if(selectedLiAry[selectedLiAry.length - 1].compareDocumentPosition(li) == $kit.CONSTANTS.DOCUMENT_POSITION_PRECEDING) { var flagStart = false; for(var i = 0; i < liAry.length; i++) {
		 * if(liAry[i] == li) { flagStart = true; } if(flagStart) { $kit.adCls(liAry[i], me.config.clsSelected); } if(liAry[i] == selectedLiAry[selectedLiAry.length - 1]) { flagStart = false; break; } } } } else { $kit.adCls(li, me.config.clsSelected); } } var operateAry = $kit.el("." +
		 * me.config.clsOperate, me.config.lrcList); for(var i = 0; i < operateAry.length; i++) { var el = operateAry[i]; $kit.adCls(el, me.config.clsOperateHidden); } var operateMultipleAry = $kit.el("." + me.config.clsOperateMultiple, me.config.lrcList); for(var i = 0; i <
		 * operateMultipleAry.length; i++) { var el = operateMultipleAry[i]; $kit.rmCls(el, me.config.clsOperateMultiple); } var selectedLiAry = $kit.el("." + me.config.clsSelected, me.config.lrcList); if(selectedLiAry.length > 0) { var lastSelectedLi = selectedLiAry[selectedLiAry.length - 1]; var
		 * operate = $kit.el("." + me.config.clsOperate, lastSelectedLi)[0]; $kit.rmCls(operate, me.config.clsOperateHidden); if(selectedLiAry.length > 1) { $kit.adCls(operate, me.config.clsOperateMultiple); } } }
		 */
	},
	evLrcListKeyDown : function(ev, evCfg) {
		var me = this;
		// 时间修改
		var timeInput = ev.target;
		if($kit.hsCls(timeInput, me.config.clsLiTimeBox)) {
			if(ev.keyCode == $kit.event.KEYCODE_UP || ev.keyCode == $kit.event.KEYCODE_ADD) {
				timeInput.oldValue = timeInput.oldValue || timeInput.value;
				var _t = $kit.date.parseTime(timeInput.value) + 1;
				if(_t > 359999) {
					_t = 359999;
				}
				timeInput.value = $kit.date.formatTime(_t);
			} else if(ev.keyCode == $kit.event.KEYCODE_DOWN || ev.keyCode == $kit.event.KEYCODE_SUB) {
				var _t = $kit.date.parseTime(timeInput.value) - 1;
				if(_t < 0) {
					_t = 0;
				}
				timeInput.value = $kit.date.formatTime(_t);
			}
		}
	},
	evLrcListKeyUp : function(ev, evCfg) {
		var me = this;
		// 时间修改
		var timeInput = ev.target;
		if($kit.hsCls(timeInput, me.config.clsLiTimeBox)) {
			timeInput.oldValue = timeInput.oldValue || timeInput.value;
			if(me.config.timeFormatRegExp.test(timeInput.old)) {
				timeInput.value = $kit.date.formatTime($kit.date.parseTime(timeInput.value));
				if(ev.keyCode == $kit.event.KEYCODE_UP) {
					me.modifyTime(me.elParentLi(timeInput), timeInput.value, timeInput.oldValue);
					me.timeNow();
				}
			} else {
				alert("时间格式不对!")
				if(timeInput.oldValue) {
					timeInput.value = timeInput.oldValue;
				}
			}
			if(timeInput.oldValue) {
				delete timeInput.oldValue;
			}
		}
	},
	elLrcTextFromLi : function(li) {
		return $kit.el8tag("textarea", li);
	},
	elLrcTimeFromLi : function(li) {
		return $kit.el8tag("input", li);
	},
	elParentLi : function(el) {
		var me = this;
		return $kit.parentEl(el, function(li) {
			if(li == me.config.lrcList) {
				return false;
			} else if(li.tagName && li.tagName.toLowerCase() == "li") {
				return true;
			}
		});
	},
	getLrcTextFromLi : function(li) {
		var me = this;
		var textarea = $kit.el8tag("textarea", li);
		return textarea.value;
	},
	getLrcTimeFromLi : function(li) {
		var me = this;
		var input = $kit.el8tag("input", li);
		return input.value;
	},
	setLrcSourceText : function(text) {
		var me = this;
		me.config.lrcTextResource.value = text;
	},
	getLrcSourceText : function() {
		var me = this;
		return me.config.lrcTextResource.value;
	},
	onPause : function(ev, evCfg) {

	},
	onPaly : function(ev, evCfg) {
		// $kit.log(evCfg.el.currentTime);
	},
	onSeeking : function(ev, evCfg) {
		// $kit.log("1a1" + evCfg.el.currentTime);
	},
	onSeeked : function(ev, evCfg) {
		// $kit.log("2a2" + evCfg.el.currentTime);
	},
	/**
	 * 修改时间
	 */
	modifyTime : function(li, newTimeStr, oldTimeStr) {
		var me = this;
		var elTime = me.elLrcTimeFromLi(li);
		// var formattedCurrentTimeStr = newTimeStr;
		var newTime = $kit.date.parseTime(newTimeStr);
		if(newTimeStr != 0 && me.config.timeLine.hs(newTimeStr) && li != $kit.el8id(me.config.timeLine.get(newTimeStr).rowDomId)) {
			if(confirm("发现当前的时间线上，有一个与您选中字幕开始时间吻合的另一个字幕，你确认合并吗？")) {
				//
				var text = me.elLrcTextFromLi(li);
				var targetLiId = me.config.timeLine.get(newTimeStr).rowDomId;
				var targetLi = $kit.el8id(targetLiId);
				var targetElText = me.elLrcTextFromLi(targetLi);
				var targetElTime = me.elLrcTimeFromLi(targetLi);
				if($kit.date.parseTime(targetElTime.value) > newTime) {
					targetElText.kitFormTextArea.setValue(text.value + targetElText.value);
				} else {
					targetElText.kitFormTextArea.setValue(targetElText.value + text.value);
				}
				me.config.timeLine.rm(oldTimeStr);
				$kit.rmEl(li);
			} else {
				// do nothing
			}
		} else {
			me.config.timeLine.each(function(key, value, i, array, map) {
				var oldKey = oldTimeStr;
				if(value.beginTimeStr == oldKey) {
					var newValue = $kit.join(value, {
						beginTime : newTime,
						beginTimeStr : newTimeStr
					});
					me.config.timeLine.rm(oldKey);
					me.config.timeLine.ad(newTimeStr, newValue);
					me.config.timeLine.sort(function(left, right) {
						return $kit.date.parseTime(left) - $kit.date.parseTime(right);
					});
					//
					var liAry = $kit.el("li", me.config.lrcList);
					var targetLi = null;
					for(var i = 0; i < liAry.length; i++) {
						var li1 = liAry[i];
						if(li1 != li) {
							if($kit.date.parseTime(me.getLrcTimeFromLi(li1)) < me.config.currentTime) {
								targetLi = li1;
							} else {
								break;
							}
						}
					}
					if(targetLi != null) {
						$kit.insEl({
							pos : "after",
							where : targetLi,
							what : li
						});
					}
				}
			});
			elTime.value = newTimeStr;
		}
		var operate = $kit.el8cls(me.config.clsOperate, li);
		$kit.rmCls(operate, me.config.clsOperateModifyTime);
	},
	revert : function() {
		var me = this;
		var liAry = $kit.el("li", me.config.lrcList);
		if(liAry.length == 0) {
			return;
		}
		var lastLi = liAry[liAry.length - 1];
		var time = me.getLrcTimeFromLi(lastLi);
		me.config.timeLine.rm(time);
		$kit.rmEl(lastLi);
		me.config.resource.currentTime = $kit.date.parseTime(time);
		//
	},
	scrollSubtitle : function(li) {
		var me = this;
		var container = me.config.lrcList;
		/*
		 * if(li.offsetTop >= container.scrollTop && li.offsetTop <= container.scrollTop + container.scrollHeight) { } else {
		 */
		$kit.anim.motion({
			timeSeg : 17,
			duration : 500,
			el : container,
			from : {
				scrollTop : container.scrollTop
			},
			to : {
				scrollTop : li.offsetTop - container.offsetHeight / 2 + li.offsetHeight / 2
			},
			fx : $kit.anim.Fx.swing,
			then : function() {
			},
			timeout : window.timeoutScrollSubtitle
		});
		// }
	}
}

/**
 * 初始化
 */
$kit.$(function() {
	/**
	 * 添加页面
	 */
	if($kit.el('#subtitleAddForm')) {
		if($kit.el("#J_Ihavesub")) {
			var radioSubtitle = $kit.el('#J_Ihavesub');
			var radioTextarea = $kit.el('#J_Ihavenosub');
			var textarea = $kit.el('.subtitleFile-textarea')[0];
			var subtitle = $kit.el('.subtitleFile-upload')[0];
			$kit.ev({
				el : [radioTextarea, radioSubtitle],
				ev : "click",
				fn : function(ev, evCfg) {
					// var checkbox = $kit.el('#J_Ihavesub');
					// checkbox.checked = !checkbox.checked;
					switchSubtitlePanel();
					// if(checkbox.checked) {
					// $kit.adCls($kit.el("#J_Ihavesub").parentNode, 'checked');
					// } else {
					// $kit.rmCls($kit.el("#J_Ihavesub").parentNode, 'checked');
					// }
				}
			});
			function switchSubtitlePanel() {
				var validateMsgs = $kit.el('.validate-result', $kit.el('.subtitle-field')[0]);
				var thisValidateMsg = validateMsgs[validateMsgs.length - 1];
				$kit.rmCls(thisValidateMsg, 'validate-result-failed');
				$kit.attr(thisValidateMsg, 'title', null);
				//
				var textarea = $kit.el(".subtitleFile-textarea")[0];
				var subtitle = $kit.el(".subtitleFile-upload-area")[0];
				var radioSubtitle = $kit.el('#J_Ihavesub');
				var radioTextarea = $kit.el('#J_Ihavenosub');
				if(!radioSubtitle.checked) {
					if($kit.isChrome()) {
						$kit.el('textarea', textarea)[0].style.overflow = 'hidden';
					}
					subtitle.style.display = 'none';
					$kit.anim.motion({
						duration : 500,
						el : textarea,
						from : {
							opacity : 0,
							display : 'block',
							'-webkit-transform' : 'scaleY(0.01)',
							'-webkit-transform-origin' : 'top'
						},
						to : {
							opacity : 1,
							'-webkit-transform' : 'scaleY(1)'
						},
						fx : $kit.anim.easeInQuad,
						then : function() {
							if($kit.isChrome()) {
								$kit.el('textarea', textarea)[0].style.overflow = 'auto';
							}
							$kit.el('textarea', textarea)[0].focus();
							// $kit.anim.motion({
							// duration : 300,
							// el : subtitle,
							// from : {
							// opacity : 0,
							// display : 'block'
							// },
							// to : {
							// opacity : 1
							// },
							// fx : $kit.anim.easeOutQuad,
							// then : function() {
							// }
							// });

						}
					});
				} else {
					textarea.style.display = 'none';
					$kit.anim.motion({
						duration : 500,
						el : subtitle,
						from : {
							opacity : 0,
							display : 'block',
							'-webkit-transform' : 'scaleY(0.01)',
							'-webkit-transform-origin' : 'top',
						},
						to : {
							opacity : 1,
							'-webkit-transform' : 'scaleY(1)'
						},
						fx : $kit.anim.easeInQuad,
						then : function() {

							// if($kit.isChrome()) {
							// $kit.el('textarea',textarea)[0].style.overflow = 'hidden';
							// }
							// $kit.anim.motion({
							// duration : 300,
							// el : textarea,
							// from : {
							// opacity : 0,
							// display : 'block'
							// },
							// to : {
							// opacity : 1
							// },
							// fx : $kit.anim.easeOutQuad,
							// then : function() {
							// if($kit.isChrome()) {
							// $kit.el('textarea',textarea)[0].style.overflow = 'auto';
							// }
							// //
							// }
							// });

						}
					});
				}
			}

			// default
			var textarea = $kit.el(".subtitleFile-textarea")[0];
			var subtitle = $kit.el(".subtitleFile-upload-area")[0];
			if($kit.el("#J_Ihavesub").checked) {
				textarea.style.display = 'none';
				subtitle.style.display = 'block';
			} else if($kit.el("#J_Ihavenosub").checked) {
				textarea.style.display = 'block';
				subtitle.style.display = 'none';
			}
		}
		/**
		 * 图片上传
		 */
		if($kit.el("#photo-uploader")) {
			var uploader = new $kit.Upload({
				element : $kit.el("#photo-uploader"),
				allowedExtensions : ['jpg', 'jpeg', 'png', 'gif', 'bmp'],
				action : CikuWeb.loc + 'upload',
				onSubmit : function(id, fileName) {
					var photo = $kit.el(".photo-field")[0];
					$kit.el(".qq-upload-list", photo)[0].innerHTML = '';
				},
				onComplete : function(id, fileName, responseJSON) {
					var photo = $kit.el(".photo-field")[0];
					// $kit.anim.motion({
					// duration : 2000,
					// el : $kit.el('li',$kit.el(".qq-upload-list", photo)[0])[0],
					// from : {
					// opacity : 1
					// },
					// to : {
					// opacity : 0
					// },
					// then : function() {
					// $kit.el(".qq-upload-list", photo)[0].innerHTML = '';
					// }
					// });
					if(responseJSON.success != true) {
						return;
					}
					$kit.rmEl($kit.el(".tips", photo));
					$kit.rmEl($kit.el(".img-preview", photo));
					photo.appendChild($kit.newHTML('<div class="img-preview"><img src="' + CikuWeb.staticResLoc + 'temp/' + responseJSON.savefile + '"/></div>'));
					$kit.el("@photoFileName")[0].value = responseJSON.savefile;
					$kit.rmCls($kit.el('.validate-result', photo)[0], 'validate-result-failed');
					$kit.adCls($kit.el('.validate-result', photo)[0], 'validate-result-success');
				}
			});
			$kit.attr($kit.el('input', $kit.el("#photo-uploader"))[0], {
				accept : 'text/*'
			});
		}
		/**
		 * 视频/音频上传
		 */
		if($kit.el("#media-uploader")) {
			var uploader = new $kit.Upload({
				element : $kit.el("#media-uploader"),
				allowedExtensions : ['wmv', 'asf', 'rm', 'rmvb', 'mov', 'avi', 'dat', 'mpg', 'mpeg', 'mp4', //
				'mp3', 'wav', 'ogg', 'ape', 'wma', 'flac', 'ra'],
				action : CikuWeb.loc + 'upload',
				onSubmit : function(id, fileName) {
					$kit.el(".qq-upload-list", $kit.el(".media-field")[0])[0].innerHTML = '';
				},
				onComplete : function(id, fileName, responseJSON) {

					// $kit.anim.motion({
					// duration : 2000,
					// el : $kit.el('li',$kit.el(".qq-upload-list", $kit.el(".media-field")[0])[0])[0],
					// from : {
					// opacity : 1
					// },
					// to : {
					// opacity : 0
					// },
					// then : function() {
					// $kit.el(".qq-upload-list", $kit.el(".media-field")[0])[0].innerHTML = '';
					// }
					// });

					if(responseJSON.success != true) {
						return;
					}
					$kit.el("@mediaFileName")[0].value = responseJSON.savefile;
					$kit.rmCls($kit.el('.validate-result', $kit.el('.media-field')[0])[0], 'validate-result-failed');
					$kit.adCls($kit.el('.validate-result', $kit.el('.media-field')[0])[0], 'validate-result-success');
				}
			});
			$kit.attr($kit.el('input', $kit.el("#media-uploader"))[0], {
				accept : 'audio/*,video/*'
			});
		}
		/**
		 * 字幕上传
		 */
		if($kit.el("#subtitle-uploader")) {
			var uploader = new $kit.Upload({
				element : $kit.el("#subtitle-uploader"),
				action : CikuWeb.loc + 'upload',
				allowedExtensions : ['lrc', 'srt', 'ssa', 'sub', 'smi', 'simi', 'ass', 'idx', 'txt'],
				onSubmit : function(id, fileName) {
					$kit.el(".qq-upload-list", $kit.el(".subtitle-field")[0])[0].innerHTML = '';
				},
				onComplete : function(id, fileName, responseJSON) {

					// $kit.anim.motion({
					// duration : 2000,
					// el : $kit.el('li',$kit.el(".qq-upload-list", $kit.el(".subtitle-field")[0])[0])[0],
					// from : {
					// opacity : 1
					// },
					// to : {
					// opacity : 0
					// },
					// then : function() {
					// $kit.el(".qq-upload-list", $kit.el(".subtitle-field")[0])[0].innerHTML = '';
					// }
					// });

					if(responseJSON.success != true) {
						return;
					}
					$kit.el("@subtitleFileName")[0].value = responseJSON.savefile;
					$kit.rmCls($kit.el('.validate-result', $kit.el('.subtitleFile-upload')[0])[0], 'validate-result-failed');
					$kit.adCls($kit.el('.validate-result', $kit.el('.subtitleFile-upload')[0])[0], 'validate-result-success');
				}
			});
			$kit.attr($kit.el('input', $kit.el("#subtitle-uploader"))[0], {
				// accept : 'text/*.lrc,text/*.srt,text/*.ssa,text/*.sub,text/*.smi,text/*.simi,text/*.ass,text/*.idx'
				accpet : 'text/*'
			});
		}
		/**
		 * 绑定添加页面验证
		 */
		if($kit.el('#subtitleAddForm')) {
			$kit.el('#subtitleAddForm').onsubmit = function() {
				try {
					var canSubmit = true;
					$kit.each($kit.el('.validate-result'), function(el) {
						if(($kit.el('#J_Ihavesub').checked && $kit.attr(el, 'for') == 'content') || ($kit.el('#J_Ihavenosub').checked && $kit.attr(el, 'for') == 'subtitleFileName')) {
							return;
						}
						// if ($kit.el('#J_Ihavesub').checked && $kit.attr(el, 'for') == 'subtitleFileName' && $kit.el('@subtitleFileName')[0].value.trim().length == 0) {
						// canSubmit = false;
						// }
						// if ($kit.el('#J_Ihavenosub').checked && $kit.attr(el, 'for') == 'content' && $kit.el('@content')[0].value.trim().length == 0) {
						// canSubmit = false;
						// }
						if($kit.attr(el, 'for') == 'lrcready') {
							var a = $kit.el('@lrcready');
							var hasChecked = false;
							for(var i = 0; i < a.length; i++) {
								if(a[i].checked) {
									hasChecked = true;
									break;
								}
							}
							if(hasChecked) {
								$kit.rmCls(el, 'validate-result-failed');
								$kit.attr(el, 'title', null);
								$kit.adCls(el, 'validate-result-success');
							} else {
								$kit.rmCls(el, 'validate-result-success');
								$kit.adCls(el, 'validate-result-failed');
								$kit.attr(el, 'title', $kit.el('.error', el)[0].innerHTML);
								canSubmit = false;
							}
							return;
						}
						var checkFormEl = $kit.el('@' + $kit.attr(el, 'for'))[0];
						if(!$kit.isEmpty(checkFormEl.value)) {
							$kit.rmCls(el, 'validate-result-failed');
							$kit.attr(el, 'title', null);
							$kit.adCls(el, 'validate-result-success');
						} else {
							$kit.rmCls(el, 'validate-result-success');
							$kit.adCls(el, 'validate-result-failed');
							$kit.attr(el, 'title', $kit.el('.error', el)[0].innerHTML);
							canSubmit = false;
						}
					});
					//
					if(canSubmit) {
						return true;
					}
					return false;
				} catch (e) {
					alert(e);
					return false;
				}
			}
		}
		/**
		 * 添加页面标题验证
		 */
		if($kit.el('#subtitleAddForm') && $kit.el('@title')) {
			$kit.ev({
				el : $kit.el('@title')[0],
				ev : 'input blur',
				fn : function(ev, evCfg) {
					var ipt = ev.target;
					var el = $kit.el('.validate-result', $kit.el('.title-field')[0])[0];
					if(!$kit.isEmpty(ipt.value)) {
						$kit.rmCls(el, 'validate-result-failed');
						$kit.attr(el, 'title', null);
						$kit.adCls(el, 'validate-result-success');
					} else {
						$kit.rmCls(el, 'validate-result-success');
						$kit.adCls(el, 'validate-result-failed');
						$kit.attr(el, 'title', $kit.el('.error', el)[0].innerHTML);
					}
				}
			})
		}
		if($kit.el('#subtitleAddForm') && $kit.el('@content')) {
			$kit.ev({
				el : $kit.el('@content')[0],
				ev : 'input blur',
				fn : function(ev, evCfg) {
					var ipt = ev.target;
					var el = $kit.el('.validate-result', $kit.el('.subtitleFile-textarea')[0])[0];
					if(!$kit.isEmpty(ipt.value)) {
						$kit.rmCls(el, 'validate-result-failed');
						$kit.attr(el, 'title', null);
						// $kit.adCls(el, 'validate-result-success');
					} else {
						// $kit.rmCls(el, 'validate-result-success');
						$kit.adCls(el, 'validate-result-failed');
						$kit.attr(el, 'title', $kit.el('.error', el)[0].innerHTML);
					}
				}
			})
		}
	}
	/**
	 * 编辑页面
	 */
	if($kit.el("#J_media")) {
		/**
		 * 初始化LRC
		 */
		var lrc = new Lrc({
			resource : $kit.el("#J_media"),
			lrcSourceFile : $kit.el8id("J_LrcSourceFile")
		});
		window.lrc = lrc;
		if(1 == 1) {
			// $kit.ev({
			// el : '#J_createrHelp_btn',
			// ev : 'click'
			// });
			$kit.ev({
				el : '#J_editLrc_btn',
				ev : 'click'
			});

		}
		// var lrcText = new $kit.ui.Form.TextArea({
		// el : $kit.el("#J_lrcTextResourceInput"),
		// minRows : 3,
		// textIsEmptyFn : function() {
		// $kit.log("Current is empty!");
		// },
		// textNotEmptyFn : function() {
		// //current is not empty
		// }
		// });
	}
});
//
function submitLrc() {
	$kit.el8name("contentSourceText").value = $kit.el8cls("textarea_lrcTextResource").value;
	var subtitleBeginTimeAry = $kit.els8cls("begin-time");
	var subtitleTextAry = $kit.els8cls("subtitle");
	for(var i = 0; i < subtitleBeginTimeAry.length; i++) {
		var li = window.lrc.elParentLi(subtitleTextAry[i]), lrcText = subtitleTextAry[i].value.replace(/\n+/g, "");
		if($kit.hsCls(li, 'hasParagraphEnd')) {
			lrcText += '\\n';
		}
		$kit.el8name("subtitleText").value += "[" + subtitleBeginTimeAry[i].value + "] " + lrcText + "\n";
	}
	document.forms[0].submit();
}