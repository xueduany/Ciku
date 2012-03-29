$kit.$(function() {
	/**
	 * 添加页面
	 */
	if(!$kit.isEmpty($kit.el('#subtitleAddForm'))) {
		/**
		 * 图片上传
		 */
		if($kit.el("#photo-uploader")) {
			var uploader = new qq.FileUploader({
				element : $kit.el("#photo-uploader"),
				allowedExtensions : ['jpg', 'jpeg', 'png', 'gif', 'bmp'],
				action : CikuWeb.mediaUploadLoc,
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
					photo.appendChild($kit.newHTML('<div class="img-preview"><img src="' + responseJSON.url + '"/></div>'));
					$kit.el("@photoFile")[0].value = responseJSON.serverfile;
					//$kit.rmCls($kit.el('.validate-result', photo)[0], 'validate-result-failed');
					//$kit.adCls($kit.el('.validate-result', photo)[0], 'validate-result-success');
				}
			});
			$kit.attr($kit.el('input', $kit.el("#photo-uploader"))[0], {
				accept : 'image/*'
			});
		}
		/**
		 * 视频/音频上传
		 */
		if($kit.el("#media-uploader")) {
			var uploader = new qq.FileUploader({
				element : $kit.el("#media-uploader"),
				allowedExtensions : ['wmv', 'asf', 'rm', 'rmvb', 'mov', 'avi', 'dat', 'mpg', 'mpeg', 'mp4', //
				'mp3', 'wav', 'ogg', 'ape', 'wma', 'flac', 'ra'],
				action : CikuWeb.mediaUploadLoc,
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
					var form = $kit.el('#subtitleAddForm');
					$kit.el("@mediaFile")[0].value = responseJSON.serverfile;
					$kit.rmCls($kit.el('.validate-result', $kit.el('.media',form)[0])[0], 'validate-result-failed');
					$kit.adCls($kit.el('.validate-result', $kit.el('.media',form)[0])[0], 'validate-result-success');
				}
			});
			$kit.attr($kit.el('input', $kit.el("#media-uploader"))[0], {
				accept : 'audio/*'
			});
		}
		/**
		 * 绑定添加页面验证
		 */
		if($kit.el('#subtitleAddForm')) {
			$kit.el('#subtitleAddForm').onsubmit = function() {
				try {
					var canSubmit = true, form = $kit.el('#subtitleAddForm');
					$kit.each($kit.el('.validate-result', form), function(el) {
						// if(($kit.el('#J_Ihavesub').checked && $kit.attr(el, 'for') == 'subtitleOrigin') || ($kit.el('#J_Ihavenosub').checked && $kit.attr(el, 'for') == 'subtitleFile')) {
						// return;
						// }
						// if ($kit.el('#J_Ihavesub').checked && $kit.attr(el, 'for') == 'subtitleFile' && $kit.el('@subtitleFile')[0].value.trim().length == 0) {
						// canSubmit = false;
						// }
						// if ($kit.el('#J_Ihavenosub').checked && $kit.attr(el, 'for') == 'subtitleOrigin' && $kit.el('@subtitleOrigin')[0].value.trim().length == 0) {
						// canSubmit = false;
						// }
						// if($kit.attr(el, 'for') == 'hasSubtitleFile') {
						// var a = $kit.el('@hasSubtitleFile');
						// var hasChecked = false;
						// for(var i = 0; i < a.length; i++) {
						// if(a[i].checked) {
						// hasChecked = true;
						// break;
						// }
						// }
						// if(hasChecked) {
						// $kit.rmCls(el, 'validate-result-failed');
						// $kit.attr(el, 'title', null);
						// $kit.adCls(el, 'validate-result-success');
						// } else {
						// $kit.rmCls(el, 'validate-result-success');
						// $kit.adCls(el, 'validate-result-failed');
						// $kit.attr(el, 'title', $kit.el('.error', el)[0].innerHTML);
						// canSubmit = false;
						// }
						// return;
						// }
						var checkFormEl = $kit.el('@' + $kit.attr(el, 'for'))[0];
						if(!$kit.isEmpty(checkFormEl.value)) {
							$kit.rmCls(el, 'validate-result-failed');
							//$kit.attr(el, 'title', null);
							$kit.adCls(el, 'validate-result-success');
						} else {
							$kit.rmCls(el, 'validate-result-success');
							$kit.adCls(el, 'validate-result-failed');
							//$kit.attr(el, 'title', $kit.el('.error', el)[0].innerHTML);
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
					var el = $kit.el('.validate-result', $kit.el('.title', $kit.el('#subtitleAddForm'))[0])[0];
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
		if($kit.el('#subtitleAddForm') && $kit.el('@subtitleOrigin')) {
			$kit.ev({
				el : $kit.el('@subtitleOrigin')[0],
				ev : 'input blur',
				fn : function(ev, evCfg) {
					var ipt = ev.target;
					var el = $kit.el('.validate-result', $kit.el('.subtitle', $kit.el('#subtitleAddForm'))[0])[0];
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
		window.tagInput = new $kit.ui.TagInput({
			el : $kit.el('#J_tagInput')
		});
		window._flag_tagInputSuggest = true;
		window.tagInput.ev({
			ev : 'input',
			fn : function(e) {
				if(window._flag_tagInputSuggest == true) {
					clearTimeout(window._timeout_tagInputSuggest);
					window._timeout_tagInputSuggest = setTimeout(function() {
						window.tagInput.lastInputStr = window.tagInput.lastInputStr || '';
						if(window.tagInput.tagInput.value == window.tagInput.lastInputStr) {
							var ul = $kit.el8tag('ul', window.tagInput.tagInputWrapper);
							if(ul.childNodes.length) {
								ul.style.display = 'block';
							}
							return;
						} else {
							window.tagInput.lastInputStr = window.tagInput.tagInput.value;
						}
						$kit.attr(window.tagInput.tagInput, 'autocomplete', 'off');
						$kit.io.ajax({
							url : '/api/v2/mediatags/find/' + window.tagInput.tagInput.value + '?$top=5',
							method : 'get',
							async : true,
							onSuccess : function(res) {
								try {
									res = eval(res);
									var tagInputWrapper = window.tagInput.tagInputWrapper;
									var ul = $kit.el8tag('ul', tagInputWrapper);
									if($kit.isEmpty(ul)) {
										var ul = document.createElement('ul');
										tagInputWrapper.appendChild(ul);
										$kit.ev({
											el : ul,
											ev : 'mousedown', //因为click会出blur事件，导致click失效，所以选用mousedown事件
											fn : function(e) {
												if(e.target.tagName && e.target.tagName.toLowerCase() == 'li') {
													window.tagInput.tagInput.value = e.target.innerHTML + ',';
													alert(window.tagInput.tagInput.value);
													ul.style.display = 'none';
													window.tagInput.handleInput();
													window._flag_tagInputSuggest = false;
													setTimeout(function() {
														window._flag_tagInputSuggest = true;
													}, 300);
												}
											}
										});
										$kit.ev({
											el : ul,
											ev : 'mouseover',
											fn : function(e) {
												if(e.target.tagName && e.target.tagName.toLowerCase() == 'li') {
													var currentLi = e.target;
													var selectedLi = $kit.el8cls('selected', ul);
													if(selectedLi != currentLi) {
														$kit.rmCls(selectedLi, 'selected');
														$kit.adCls(currentLi, 'selected');
													}
												}
											}
										});
									}
									if(res != null && res.length) {
										if(window.tagInput._flag_focus == true) {
											ul.style.display = 'block';
										}
										ul.innerHTML = '';
										for(var i = 0; i < res.length; i++) {
											var li = document.createElement('li');
											li.innerHTML = res[i].name;
											ul.appendChild(li);
										}
									} else {
										ul.style.display = 'none';
									}
								} catch(e) {

								}
							},
							onError : function() {
								//
								console && console.log('error autoSuggest');
							}
						});
					}, 300);
				}
			}
		});
		$kit.ev({
			el : window.tagInput.tagInput,
			ev : 'blur',
			fn : function() {
				window.tagInput._flag_focus = false;
				var ul = $kit.el8tag('ul', window.tagInput.tagInputWrapper);
				if(ul) {
					ul.style.display = 'none';
				}
			}
		});
		$kit.ev({
			el : window.tagInput.tagInput,
			ev : 'focus',
			fn : function() {
				window.tagInput._flag_focus = true;
				var ul = $kit.el8tag('ul', window.tagInput.tagInputWrapper);
				if(ul && ul.childNodes.length) {
					ul.style.display = 'block';
				}
			}
		});
		$kit.ev({
			el : window.tagInput.tagInput,
			ev : 'keydown',
			fn : function(e) {
				if($kit.event.KEYCODE_DOWN == e.keyCode || $kit.event.KEYCODE_UP == e.keyCode || $kit.event.KEYCODE_ENTER == e.keyCode) {
					var ul = $kit.el8tag('ul', window.tagInput.tagInputWrapper);
					var selectedLi = $kit.el8cls('selected', ul);
					if($kit.event.KEYCODE_DOWN == e.keyCode && ul.childNodes.length) {
						ul.style.display = 'block';
						if($kit.isEmpty(selectedLi)) {
							$kit.adCls(ul.childNodes[0], 'selected');
						} else {
							$kit.rmCls(selectedLi, 'selected');
							if(selectedLi.nextSibling) {
								$kit.adCls(selectedLi.nextSibling, 'selected');
							} else {
								$kit.adCls(ul.childNodes[0], 'selected');
							}
						}
					} else if($kit.event.KEYCODE_UP == e.keyCode && ul.childNodes.length) {
						ul.style.display = 'block';
						if($kit.isEmpty(selectedLi)) {
							$kit.adCls(ul.childNodes[0], 'selected');
						} else {
							$kit.rmCls(selectedLi, 'selected');
							if(selectedLi.previousSibling) {
								$kit.adCls(selectedLi.previousSibling, 'selected');
							} else {
								$kit.adCls(ul.childNodes[ul.childNodes.length - 1], 'selected');
							}
						}
					} else if($kit.event.KEYCODE_ENTER == e.keyCode && ul.style.display == 'block' && ul.childNodes.length) {
						ul.style.display = 'none';
						window.tagInput.tagInput.value = selectedLi.innerHTML + ',';
						window.tagInput.handleInput();
					}
					e.stopDefault();
				}
			}
		});
	}
});
