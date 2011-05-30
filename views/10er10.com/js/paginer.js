(function($){

d10.fn.paginer = function (
  url, // url of the ws to get the pagination
  data, // data to send with url
  songs_url,	// url to get the songs list
  html_template, // html template to put display results
  html_nocontent,// html template when there is no result
  html_container, // html template is append to this container
  callback // fn called this this = html template, once jqueryfied, and before being displayed, 
	) {

	var indexCache = null, indexCacheLastUpdate = 0, pagesCache = {};
	
	var getUniqId = function () {
		if ( data != null ) { return url+'?'+$.d10param(data); }
		return url;
	};

	var getPageCache = function (page_id) {
		if ( isNaN(page_id) ) page_id = 1;
		if ( pagesCache[page_id] ) {
			return pagesCache[page_id];
		}
	};

	var setPageCache = function (page_id,cached) {
		if ( isNaN(page_id) ) page_id = 1;
		pagesCache[page_id] = cached;
	};

	var eventEmitter = d10.fn.eventEmitter();
	var bind = this.bind = eventEmitter.bind;
	var trigger = this.trigger = eventEmitter.trigger;
	var unbind = this.unbind = eventEmitter.unbind;
	var unbindAll = this.unbindAll = eventEmitter.unbindAll;
	var one = this.one = function(selector, callback) {
		var proxy = function() {
			unbind(selector,proxy);
			callback.apply(this,arguments);
		};
		this.bind(selector,proxy);
	};
	
	var loadCache = function (cb) {
		var options = {
		'url': url,
		'dataType': 'json',
		'data': data,
		'success': function (response) {
						if ( response.status == 'success' ) {
							cb.call(this,response.data);
						}
					}
		};
		d10.bghttp.get(options);
	};
	
	var getCache = function () { 
// 		if ( isCacheExpired() ) {
// 			debug("cache expired");
// 			indexCache = null;
// 			pagesCache = {};
// 		}
		if ( isCacheExpired() ) {
			debug("checking cache index...");
			checkCache(function(newCache) {
				debug("cache index changed");
				setCache(newCache);
				pagesCache = {};
// 				indexCacheLastUpdate = new Date().getTime();
			});
		}
		return indexCache; 
	};

	var setCache = function (cache) { debug("setting cache"); indexCache = cache; indexCacheLastUpdate = new Date().getTime() };

	var isCacheExpired = function () {
		return (indexCacheLastUpdate + $("body").data("cache_ttl") < new Date().getTime()) ;
	}
	
	var load_page = function(page_id,index_data,cb) {
		var index = page_id - 1 ;
// 		debug(index, index_data);
		var get_data = { 'startkey': index_data.key[index], 'startkey_docid':  index_data.id[index] };
		if ( data ) {
			for ( var i in data ) { get_data[i] = data[i]; } 
		}
		var options = {
		'url': songs_url,
		'dataType': 'json',
		'data' : get_data,
		'callback': function (response) {
						if ( response.status == 'success' && response.data.status == 'success' ) {
						var html = htmlizer(page_id, response.data.data.rows, index_data);
						setPageCache(page_id, $('<div>').append(html.clone()).remove().html() );
						cb.call(this,html);
						}
					}
		};
		d10.bghttp.get(options);
	};


	var htmlizer = function (page_id, data, index_data) {
	//     debug("format html, page_id = "+page_id+" and data = ",data);
		page_id=parseInt(page_id);
		if ( index_data.key.length == 0 ) {
		var html = $(html_nocontent);
		html.attr('page',page_id);
		return html;
		}
		var html = $(html_template);
		html.attr('page',page_id);

		for ( var index in data ) {
		$('div.list',html).append( d10.song_template ( data[index].doc ) );
		}

		$('div.pagination',html).append( format_pagination(page_id,index_data) );
		return html;
	};

	var add_binding = function (html) {
		callback.call(html);
		$('div.pagination .active',html).click(function() { display_page($(this).html()); });
		if ( $('div.list',html).children().length ) {
			$('div.pushAll',html).show().click(function() {
				d10.playlist.append($('div.list',html).children().clone());
			});
		} else {
			$('div.pushAll',html).hide();
		}
		return html;
	};

	var format_pagination = function ( current_page, index_data ) {
		current_page=parseInt(current_page);
		var pagination=$('<ul class="nomark"></ul>');
		if ( index_data.key.length <= 1 ) return false;
		var total_pages = index_data.key.length;
		if ( current_page > 2 ) {
			pagination.append('<li class="active">1</li>');
			if ( current_page > 3 )
				pagination.append('<li class="separator">...</li>');
		}
		if ( current_page > 1 ) {
			var p=current_page-1;
			pagination.append('<li class="active">'+p+'</li>');
		}
		pagination.append('<li class="inactive">'+current_page+'</li>');
		if ( current_page < total_pages ) {
			var p  = current_page+1;
			if ( current_page < total_pages -1 ) {
				pagination.append('<li class="active">'+p+'</li>');
			}
			if ( current_page < total_pages-2 ) {
				pagination.append('<li class="separator">...</li>');
			}
			pagination.append('<li class="active">'+total_pages+'</li>');
		}
		return pagination;
	}

	//var pleaseWaitTimeout = null;
	var display_page = this.display_page = function (page_id, index_data) {
		html_container.children('article').remove();
		//pleaseWaitTimeout = setTimeout( function() {
			//debug("showing pl", pleaseWaitTimeout);
			$("div.pleaseWait",html_container).show();
		//},500);
		var rmPleaseWait = function() {
			//if ( pleaseWaitTimeout ) {
				//debug("clearing pltimeout",pleaseWaitTimeout);
				//clearTimeout(pleaseWaitTimeout);
				//pleaseWaitTimeout = null;
			//}
			
			$("div.pleaseWait",html_container).hide();
		};
		page_id = parseInt(page_id,10);
	//     debug("display_page: "+page_id);
		
		if ( !index_data ) { index_data = getCache() ; }
		if ( !index_data ) {
// 			debug("loading cache");
			loadCache(function(cache) { setCache(cache); display_page(page_id,cache); });
			return ;
		}
		var html = getPageCache(page_id);
		if ( html ) {
// 			$("div.pleaseWait",html_container).hide();
			rmPleaseWait();
			add_binding($(html)).appendTo(html_container).show();
			trigger("display_page",html_container);
			trigger("display_page/"+page_id,html_container);
			
		} else {
			load_page(page_id, index_data, function ( html ) {
// 				$("div.pleaseWait",html_container).hide();
				rmPleaseWait();
				add_binding(html).appendTo(html_container).show();
				trigger("display_page",html_container);
				trigger("display_page/"+page_id,html_container);
				
			});
		}
	};

	var checkCache = this.checkCache = function (dataChanged) {
		
		var isCacheDifferent = function(newCache) {
			if ( indexCache.count != newCache.count ) {
				return true;
			}
			if ( indexCache.id.length != newCache.id.length || indexCache.key.length != newCache.key.length ) {
				return true;
			}
			for ( var index in indexCache.id ) {
				if ( indexCache.id[index] != newCache.id[index] ) {
					return true;
				}
			}
		};
		
		if ( !indexCache || !indexCache.id || !indexCache.key ) {
			return dataChanged();
		}
		if ( isCacheExpired() ) {
			loadCache(function(newCache) {
// 				debug(indexCache,newCache);
				if ( isCacheDifferent(newCache) ) {
					setCache(newCache);
					pagesCache = {};
					dataChanged(newCache);
				}
				indexCacheLastUpdate = new Date().getTime();
			});
		}
	};
  
};


})(jQuery);