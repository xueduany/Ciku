/**
 * 编辑页面
 */
CikuWeb.Lrc = function(config) {
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
		'<div class="lrc-row-cap">', //
		'<span class="begin-time-outer">[<input class="${clsLiTimeBox}" size="4" type="text" value="${beginTimeStr}" title="可以直接编辑，也可以使用上下方向键修改时间，按住Ctrl+上下键修改分，按住Shift+上下键修改时">]</span>', //
		'</div>', //
		'<textarea class="${clsLiSubtitle}" title="可以直接编辑字幕内容">${lrcText}</textarea>', //
		// '<a onclick="lrc.delLrcRowFrom(\'${formattedCurrentTimeStr}\')">删除</a>', //
		'<div class="operate">', //
		//'<span class="btns-single">', //
		'<button class="J_lrcCombine" title="合并当前时间点以及后面一个字幕">合并</button>', //
		'<button class="J_lrcParagraphEnd" title="标记段落结束">加段落</button>', //
		'<button class="J_lrcDelete" title="撤销当前时间点以后之后所有字幕">撤销</button>', //
		'<button class="J_lrcSkipTo" title="播放进度跳到当前字幕的时间">跳转到</button>', //
		//'<button class="J_lrcModifyTime">校对时间</button>', //
		//'</span>', //
		//'<span class="btns-multiple">', //
		//'</span>', //
		'</div>', //
		'<div class="paragraph-end-tips">-----------------------------------------段落分割线-----------------------------------------</div>', //
		'</li>'//
		].join(""),
		// highlight className
		clsCurrentTimePoint : "lrc-playing",
		// 字幕来源
		lrcTextResource : $kit.el8id("J_lrcTextResourceInput"),
		// 选中行的样式
		clsSelected : "selected",
		clsOperate : "operate",
		clsOperateHidden : "operateHidden",
		clsOperateMultiple : "operateMultiple",
		clsOperateModifyTime : "operateModifyTime",
		clsBtnLrcDelete : "J_lrcDelete",
		clsBtnLrcSkipTo : "J_lrcSkipTo",
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
		//clsSubTitleContainer : "J_lrcArea",
		subTitleContainer : $kit.el('#J_lrcArea'),
		//clsCreaterContainer : "J_createArea",
		createrContainer : $kit.el('#J_createrArea'),
		lrcSourceFile : null,
		joinStr : ' ',
		lrcAreaCue : $kit.el('#J_lrcArea_cue'),
		createrAreaCue : $kit.el('#J_createrArea_cue')
	}
	var me = this;
	me.config = $kit.join(defaultConfig, config);
	me.init();
}
CikuWeb.Lrc.prototype = {
	/**
	 * 初始化
	 */
	init : function() {
		var me = this;
		var resource = me.config.resource;
		var subTitleContainer = me.config.subTitleContainer;
		var createrContainer = me.config.createrContainer;
		//保存用户自己滚动鼠标的标记
		window._flag_lrcList_scrollUserMove = false;
		//
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
				//$kit.el('.tips', $kit.el('div.J_createArea')[0])[0].style.display = 'none';
				//$kit.rmCls($kit.el('.tips', $kit.el('div.J_createArea')[0])[0], 'tips-show');
				// if($kit.el('.connect-subtitle-and-text').length > 0) {
				// $kit.el('.connect-subtitle-and-text')[0].style.display = 'none';
				// }
				//
				if($kit.hsCls(el, "textarea_lrcTextResourceEditAble")) {
					return;
				}
				// var endPos = el.selectionEnd;
				// if(el.value.length == 0 || endPos == 0) {
				// el.blur();
				// return;
				// }
				// el.setSelectionRange(0, endPos);
				// var selection = window.getSelection();
				// var text = selection.toString();
				var endPos = $kit.selection.getCaretPos(el);
				var text = el.value.substr(0, endPos);
				if($kit.isEmpty(text)) {
					return;
				}
				//selection.removeAllRanges();
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
					lrcTimeStr : me.lrcBeginTimeStr ? me.lrcBeginTimeStr : $kit.date.formatTime(0)
				});
				me.lrcBeginTimeStr = currentTimeStr;
				me.timeNow();
				el.value = el.value.substr(endPos);
				el.blur();
				if(me.config.lrcTextResource.value.trim().length == 0 && me.config.lrcList.childNodes.length > 0) {
					$kit.adCls(me.config.createrAreaCue, 'cue-success');
				}
				ev.stopDefault();
			},
			scope : me
		});
		/**
		 * 控制字幕来源是否可以编辑
		 */
		$kit.ev({
			el : '#J_editLrc_btn',
			ev : "click",
			fn : function(ev, evCfg) {
				$kit.toggleCls(ev.target, 'selected');
				var btn = ev.target;
				var el = me.config.lrcTextResource;
				if(!$kit.hsCls(el, "textarea_lrcTextResourceEditAble")) {
					$kit.adCls(el, "textarea_lrcTextResourceEditAble");
					$kit.adCls($kit.el('#J_createrArea'), "edit-mode");
					$kit.attr(el, "readonly", null);
					btn.innerHTML = '切换到[字幕制作]模式';
					el.focus();
					//
					$kit.rmCls(me.config.createrAreaCue, 'cue-success');
				} else {
					$kit.rmCls(el, "textarea_lrcTextResourceEditAble");
					$kit.rmCls($kit.el('#J_editLrc_btn'), "progress");
					$kit.rmCls($kit.el('#J_createrArea'), "edit-mode");
					$kit.attr(el, "readonly", "readonly");
					btn.innerHTML = '切换到[编辑原文]模式';
					//
					if(me.config.lrcTextResource.value.trim().length == 0 && me.config.lrcList.childNodes.length > 0) {
						$kit.adCls(me.config.createrAreaCue, 'cue-success');
					} else if(me.config.lrcTextResource.value.trim().length == 0 && me.config.lrcList.childNodes.length == 0) {
						$kit.adCls(me.config.createrAreaCue, 'cue-failed');
					} else if(me.config.lrcTextResource.value.trim().length > 0) {
						$kit.rmCls(me.config.createrAreaCue, 'cue-failed');
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
					$kit.adCls(me.config.createrAreaCue, 'cue-failed');
				} else {
					if(me.config.lrcList.childNodes.length > 0) {
						$kit.rmCls(me.config.createrAreaCue, 'cue-failed');
					}
					if(el.value.trim().length > 0) {
						$kit.rmCls(me.config.createrAreaCue, 'cue-success');
					}
				}
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
		});
		// 当播放时
		/*
		 $kit.ev({
		 el : resource,
		 ev : "timeupdate",
		 fn : me.evPlaying,
		 scope : me
		 });
		 */
		resource.ev({
			ev : 'timeupdate',
			fn : function() {
				me.evPlaying();
			}
		});
		/*
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
		 */
		resource.ev({
			ev : 'play',
			fn : function() {
				me.config.nowPlaying = true;
				me.config.nowEnded = false;
				me.config.nowPaused = false;
			}
		});
		resource.ev({
			ev : 'skipTo',
			fn : function() {
				me.lrcBeginTimeStr = $kit.date.formatTime(me.config.resource.currentTime);
			}
		});
		/*
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
		 */
		resource.ev({
			ev : 'pause',
			fn : function() {
				me.config.nowPaused = true;
				me.config.nowPlaying = false;
			}
		});
		/*
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
		*/
		/**
		 * 当播放时，滚动滚动条，缓冲一下scroll移动的时间
		 */
		$kit.ev({
			el : me.config.lrcList,
			ev : 'scroll',
			fn : function(e) {
				clearTimeout(window._timeOut_lrcList_scrollUserMove);
				window._flag_lrcList_scrollUserMove = true;
				window._timeOut_lrcList_scrollUserMove = setTimeout(function() {
					window._flag_lrcList_scrollUserMove = false;
				}, 1000);
			},
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
		/*
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
		 */
	},
	handleData : function() {
		/**
		 * 解析Lrc
		 */
		var me = this;
		if(me.config.lrcSourceFile != null && me.config.lrcSourceFile.value.trim() != '') {
			var lrcText = me.config.lrcSourceFile.value;
			var subTitles = lrcText.split("\n");
			var lastLrcTimeStr, lastLrcStr = '';
			for(var i = 0; i < subTitles.length; i++) {
				var subtitle = subTitles[i];
				//subtitle = subtitle.trim();
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
				} else if(!$kit.isEmpty(lastLrcTimeStr)) {
					// me.config.lrcTextResource.value += "\n" + subtitle;
					me.insertLrcRow({
						lrcText : subtitle,
						lrcTimeStr : lastLrcTimeStr
					});
				} else {
					me.config.lrcTextResource.value = me.config.lrcTextResource.value + subtitle + '\n';
				}
			}
			me.timeNow();
			//
			if(me.config.lrcTextResource.value.trim().length == 0 && me.config.lrcList.childNodes.length > 0) {
				// var lrcArea = $kit.el('.'+me.config.clsSubTitleContainer)[0];
				$kit.adCls(me.config.createrAreaCue, 'cue-success');
			}
			//
		}
		if(me.config.lrcTextResource.value.trim().length > 0) {
			// 如果cut区域有文本的话,cut区域高亮，显示双击开始创建字幕
			//me.formatStr();
			me.config.lrcTextResource.focus();
		}
		//
		if(me.config.lrcList.childNodes.length == 0) {
			$kit.adCls(me.config.lrcAreaCue, 'cue-empty');
		}
	},
	/**
	 *
	 */
	formatStr : function() {
		var me = this;
		me.config.lrcTextResource.value = $kit.str.breakSentence(me.config.lrcTextResource.value);
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
		if(1 == 1 || me.config.nowPlaying) {
			//var currentPlayingLi = $kit.el8cls(me.config., me.config.lrcList);
			var currentPlayingLi = me.currentPlayingLi;
			var container = me.config.lrcList;
			// console.log(currentPlayingLi.offsetTop);
			// console.log(container.offsetHeight + " " + container.scrollTop);
			var doFlag = false;
			if(!$kit.isEmpty(currentPlayingLi)) {
				if(container.offsetHeight + container.scrollTop < currentPlayingLi.offsetTop + currentPlayingLi.offsetHeight) {
					doFlag = true;
				} else if(container.scrollTop > currentPlayingLi.offsetTop + currentPlayingLi.offsetHeight) {
					doFlag = true;
				}
			}
			if(doFlag && !window._flag_lrcList_scrollUserMove) {
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
			if(i == 0 && parseFloat(currentTime) < parseFloat(beginTime)) {
				return false;
			}
			if(parseFloat(currentTime) >= parseFloat(beginTime)) {
				currentKeyInTimeLine = beginTimeStr;
			} else {
				return false;
			}
		}, me);
		me.config.currentKeyInTimeLine = currentKeyInTimeLine;
		if(currentKeyInTimeLine != 0 && me.config.timeLine.hs(currentKeyInTimeLine)) {
			//var o1 = $kit.el8cls(me.config.clsCurrentTimePoint);
			var o1 = me.currentPlayingLi;
			var o2 = $kit.el8id(me.config.timeLine.get(currentKeyInTimeLine).rowDomId);
			if(o1 != o2) {
				$kit.rmCls(o1, me.config.clsCurrentTimePoint);
				if(me.config.nowPlaying) {
					$kit.adCls(o2, me.config.clsCurrentTimePoint);
					me.currentPlayingLi = o2;
				}
			}
		} else {
			var a = $kit.el('li.' + me.config.clsCurrentTimePoint, me.config.lrcList);
			while(a && a.length > 0) {
				var o1 = a[0];
				$kit.rmCls(o1, me.config.clsCurrentTimePoint);
				a = $kit.el('li.' + me.config.clsCurrentTimePoint, me.config.lrcList);
				me.currentPlayingLi = null;
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
		//lrcText = lrcText.replace(/\n+/g, ' ');
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
				//return $kit.date.parseTime(left) - $kit.date.parseTime(right);
				return me.config.timeLine.get(left).beginTime - me.config.timeLine.get(right).beginTime;
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
			$kit.el8cls('J_lrcParagraphEnd', $kit.el8id(idLi)).innerHTML = '删段落';
		}
		//
		$kit.rmCls(me.config.lrcAreaCue, 'cue-empty');
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
					rowList = $kit.el("li", me.config.lrcList);
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
		//点击了跳转
		var btnSkipTo = ev.target;
		if(btnSkipTo.tagName && btnSkipTo.tagName.toLowerCase() == "button" && $kit.hsCls(btnSkipTo, me.config.clsBtnLrcSkipTo)) {
			var currentEvLi = me.elParentLi(btnSkipTo), elTime = me.elLrcTimeFromLi(currentEvLi);
			me.config.resource.skipTo($kit.date.parseTime(elTime.value) / me.config.resource.duration);
			me.config.resource.play();
			return;
		}
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

				me.config.resource.skipTo(backTime / me.config.resource.duration);
				me.lrcBeginTimeStr = $kit.date.formatTime(backTime);
			}
			me.timeNow();
			//
			if(me.config.lrcList.childNodes.length == 0) {
				$kit.adCls(me.config.createrAreaCue, 'cue-empty');
			}
			if(me.config.lrcTextResource.value.trim().length > 0) {
				$kit.rmCls(me.config.createrAreaCue, 'cue-success');
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
			if($kit.isEmpty(nextEvLi)) {
				return;
			}
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
				btnAddPara.innerHTML = '加段落';
			} else {
				$kit.adCls(currentEvLi, 'hasParagraphEnd');
				btnAddPara.innerHTML = '删段落';
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
	/*
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
	 */
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
				elTime.value = oldTimeStr;
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
							if($kit.date.parseTime(me.getLrcTimeFromLi(li1)) < newTime) {
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
		me.config.resource.skipTo($kit.date.parseTime(time), me.config.resource);
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
	},
	/**
	 * 自动保存
	 */
	autoSave : function() {
		var me = this;
		me.processSubmitData();
		var body = "id=" + $kit.el('@guid')[0].value//
		+ "&subtitleFinish=" + encodeURIComponent($kit.el8id("J_SubtitleText").value)//
		+ "&subtitleDraft=" + encodeURIComponent($kit.el8id("J_SubtitleLeft").value);
		me.saveTips(0);
		$kit.io.ajax({
			url : '/api/v2/media/save',
			params : undefined,
			method : 'post',
			async : true,
			head : undefined,
			body : body,
			onSuccess : function(res) {
				me.saveTips(1);
			},
			onError : function() {
				me.saveTips(2);
			}
		});
	},
	saveTips : function(status) {
		var saveTips = $kit.el('#J_autoSaveTips');
		var saveTipsContent = $kit.el('#J_autoSaveTipsContent');
		if($kit.isEmpty($kit.el('#J_autoSaveTips'))) {
			$kit.el('div.mainboard')[0].appendChild($kit.newHTML([//
			'<div id="J_autoSaveTips">', //
			'<div id="J_autoSaveTipsContent">', //
			'自动保存ing，请不要关闭浏览器', //
			'</div>', //
			'</div>'//
			].join('')));
			saveTips = $kit.el('#J_autoSaveTips');
			saveTipsContent = $kit.el('#J_autoSaveTipsContent');
		}
		if(status == 0) {
			//正在自动保存
			saveTips.display = 'block';
			$kit.rmCls(saveTips, 'sucess');
			saveTipsContent.innerHTML = '自动保存ing，请不要关闭浏览器'
			$kit.anim.motion({
				el : saveTipsContent,
				duration : 300,
				from : {
					display : 'block',
					opacity : 1,
					top : '-30px'
				},
				to : {
					display : 'block',
					opacity : 1,
					top : '0px'
				},
				then : function() {
					// saveTips.style.display = 'none';
					// saveTipsContent.style.display = 'none';
				},
				timeout : '_timeout_autoSaveTips'
			});
		} else if(status == 1) {
			$kit.adCls(saveTips, 'sucess');
			saveTipsContent.innerHTML = '保存成功!'
			setTimeout(function() {
				$kit.anim.motion({
					el : saveTipsContent,
					duration : 300,
					from : {
						display : 'block',
						opacity : 1,
						top : '0px'
					},
					to : {
						display : 'block',
						opacity : 0,
						top : '-30px'
					},
					then : function() {
						saveTips.style.display = 'none';
						saveTipsContent.style.display = 'none';
					},
					timeout : '_timeout_autoSaveTips'
				});
			}, 1000);
		} else if(status == 2) {
			$kit.adCls(saveTips, 'error');
			saveTipsContent.innerHTML = '保存失败!'
			setTimeout(function() {
				$kit.anim.motion({
					el : saveTipsContent,
					duration : 300,
					from : {
						display : 'block',
						opacity : 1,
						top : '0px'
					},
					to : {
						display : 'block',
						opacity : 0,
						top : '-30px'
					},
					then : function() {
						saveTips.style.display = 'none';
						saveTipsContent.style.display = 'none';
					},
					timeout : '_timeout_autoSaveTips'
				});
			}, 1000);
		}
	},
	/**
	 * 处理提交数据
	 */
	processSubmitData : function() {
		var subtitleBeginTimeAry = $kit.els8cls("begin-time");
		var subtitleTextAry = $kit.els8cls("subtitle");
		$kit.el8id("J_SubtitleText").value = '';
		for(var i = 0; !$kit.isEmpty(subtitleBeginTimeAry) && i < subtitleBeginTimeAry.length; i++) {
			var li = window.lrc.elParentLi(subtitleTextAry[i]), //
			//lrcText = subtitleTextAry[i].value.replace(/\n+/g, "");
			lrcText = subtitleTextAry[i].value;
			if($kit.hsCls(li, 'hasParagraphEnd')) {
				lrcText += '\\n';
			}
			$kit.el8id("J_SubtitleText").value += "[" + subtitleBeginTimeAry[i].value + "] " + lrcText + "\n";
		}
		$kit.el8id("J_SubtitleLeft").value = $kit.el('#J_lrcTextResourceInput').value;
	}
}

/**
 * 初始化
 */
$kit.$(function() {
	/**
	 * 编辑页面
	 */
	if(!$kit.isEmpty($kit.el('#J_media_edit_form'))) {
		if($kit.isEmpty($kit.el('#float-tips'))) {
			document.body.appendChild($kit.newHTML('<div id="float-tips"><s></s><span></span></div>"'));
		}
		var floatTips = $kit.el('#float-tips');
		floatTips.childNodes[1].innerHTML = '正在处理数据，请耐心等待...';
		floatTips.display = 'block';
		/**
		 * 初始化LRC
		 */
		var audioPlayer = new $kit.ui.Audio({
			el : $kit.el('#J_media'),
			swfLocation : 'http://xueduany.github.com/KitJs/KitJs/src/js/widget/Audio/audiojs.swf'
		});
		audioPlayer.ready(function() {
			var player = audioPlayer;
			var playerWrapper = player.wrapper;
			var playerWrapper = player.wrapper;
			var timeBoard = $kit.el8cls('time', playerWrapper);
			var timeProgressBar = $kit.el8tag('i', $kit.el8cls('progress', playerWrapper));
			var lrc = new CikuWeb.Lrc({
				resource : player,
				lrcSourceFile : $kit.el8id("J_LrcFinish") && $kit.el8id("J_LrcFinish").value.length > 0 ? $kit.el8id("J_LrcFinish") : $kit.el8id("J_LrcOrigin")
			});
			window.lrc = lrc;
			//
			setTimeout(function() {
				window.lrc.handleData();
				$kit.anim.motion({
					el : floatTips,
					from : {
						opacity : 1
					},
					to : {
						opacity : 0,
						display : 'none'
					},
					duration : 500,
					fx : $kit.anim.Fx.easeInQuad,
					then : function() {
						//
					}
				});
			}, 0);
			if(1 == 2) {
				// $kit.ev({
				// el : '#J_createrHelp_btn',
				// ev : 'click'
				// });
				$kit.ev({
					el : '#J_editLrc_btn',
					ev : 'click'
				});
			}
		});
		$kit.ev({
			el : '#J_media_edit_form',
			ev : 'submit',
			fn : function(e, cfg) {
				var el = e.target;

				el.submit();
			}
		});
		/**
		 * 字幕上传按钮
		 */
		$kit.ev({
			el : '#J_submitLrc',
			ev : 'click',
			fn : function(e) {
				var btn = e.target;
				if(!$kit.hsCls(btn, 'J_clicked')) {
					clearInterval(window._autoSave);
					window.lrc.config.resource.pause();
					window.lrc.processSubmitData();
					$kit.el('#J_media_edit_form').submit();
					//window.lrc.autoSave();
					$kit.adCls(btn, 'J_clicked');
					setTimeout(function() {
						$kit.rmCls(btn, 'J_clicked');
					}, 2000);
				} else {
					alert('请不要重复提交，谢谢配合！')
				}
			}
		});
		/**
		 * 字幕预览按钮
		 */
		$kit.ev({
			el : '#J_previewLrc',
			ev : 'click',
			fn : function(e) {
				var btn = e.target;
				if(!$kit.hsCls(btn, 'J_clicked')) {
					window.lrc.config.resource.pause();
					window.lrc.autoSave();
					window.open('/media/play/' + $kit.el('@guid')[0].value);
					$kit.adCls(btn, 'J_clicked');
					setTimeout(function() {
						$kit.rmCls(btn, 'J_clicked');
					}, 2000);
				} else {
					alert('请不要重复提交，谢谢配合！')
				}
			}
		});
		/**
		 * 自动保存
		 */
		window._autoSave = setInterval(function() {
			window.lrc.autoSave();
		}, 60000);
	};
});
