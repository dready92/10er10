(function($){

d10.fn.paginer = function  ( url_arg, data_arg, songs_url_arg, html_template_arg, html_nocontent_arg, 
										html_container_arg, ttl_arg, bounce_target_arg, callback_arg ) {
	var pagination_url = url_arg;
	var pagination_data = data_arg;
	var songs_url = songs_url_arg;
	var core_ttl = ttl_arg;
	var ts = null;
	var that = this;
	var html_template  = html_template_arg;
	var html_nocontent  = html_nocontent_arg;
	var html_container = html_container_arg;
	var bounce_target = bounce_target_arg;
	var callback = callback_arg;

	this.init = function (page_id) {
		ajax_feedback_start(bounce_target);
    var options = {
      'url': pagination_url,
      'dataType': 'json',
      'data': pagination_data,
      'page_id': page_id,
      'context': this,
      'callback': function (response) {
        ajax_feedback_stop(bounce_target);
        if ( response.status == 'success' && response.data.status == 'success' ) {
          setCache(response.data.data);
          that.load_page(response.request.page_id, true);
        }
      }
    };
    d10.bghttp.get(options);
	}

	this.load_page = function (page_id, from_init) {
		page_id=parseInt(page_id);
    var index_data = getCache();
		if ( index_data == null ) {
			if ( from_init == true )	return false;
			that.init(page_id);
			return ;
		}


    if ( page_id > index_data.id.length ) {
			html_container.append(that.format_html(page_id,{}));
			that.display_page(page_id);
			return ;
		}
		var index = page_id - 1 ;

		var get_data = { 'startkey': index_data.key[index], 'startkey_docid':  index_data.id[index] };
		if ( pagination_data ) {
			for ( var index in pagination_data ) {
				get_data[index] = pagination_data[index];
			} 
		}
		ajax_feedback_start(bounce_target);

    var options = {
      'url': songs_url,
      'dataType': 'json',
      'data' : get_data,
      'context': this,
      'page_id': page_id,
//      'callback': function(response) {
//        debug(response);
//        response.request.sender.load_page_response(response);
//      }
      'callback': function (response) {
                    ajax_feedback_stop(bounce_target);
                    if ( response.status == 'success' && response.data.status == 'success' ) {
                      html_container.append(that.format_html(response.request.page_id,response.data.data.rows));
                      that.display_page(response.request.page_id);
                    }
                  }
    };
    d10.bghttp.get(options);
	}

  /**
   *
   * takes page_id and page data (as object) and send back
   * the html, with event binders
   *
   */
	this.format_html = function (page_id, data) {
		debug("format html, page_id = "+page_id+" and data = ",data);
// 		debug(data);
		page_id=parseInt(page_id);
    var index_data = getCache();
		if ( index_data.key.length == 0 ) {
			var html = $(html_nocontent);
			html.attr('page',page_id);

      setPageCache(page_id,
      $('<div>').append(html.clone()).remove().html(),
			true);

			return html;
		}
		var html = $(html_template);
		html.attr('page',page_id);

		for ( var index in data ) {
			$('div.list',html).append( d10.song_template ( data[index].doc ) );
		}

		$('div.pagination',html).append( that.format_pagination(page_id) );

    /*
     * record html to cache
     */
    setPageCache(page_id,$('<div>').append(html.clone()).remove().html());

		return add_binding(html);
	}

  var add_binding = function (html) {
    callback.call(html);
    $('div.pagination .active',html).click(function() {
			that.display_page($(this).html());
		});
		return html;
  }

	this.format_pagination = function ( current_page ) {
		current_page=parseInt(current_page);
    var index_data = getCache();
		var pagination=$('<ul class="nomark"></ul>');

		if ( index_data.key.length <= 1 )	return false;
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

	this.display_page = function (page_id) {
		page_id = parseInt(page_id);

    debug("display_page: "+page_id);


    var html = getPageCache(page_id);
    if ( html ) {
      //debug("display_page found in cache ");
      html_container.children('article').remove();
      add_binding($(html)).appendTo(html_container).show();
    } else {
      //debug("display_page not found in cache ");
      that.load_page(page_id);
    }
	}

  var getUniqId = function () {
    if ( data_arg != null ) {
      return pagination_url+'?'+$.param(data_arg);
    }
    return pagination_url;
  }

	this.clearCache = function () {
			//index_data = null;
      d10.sessioncache.unset('paginer.'+getUniqId());
			html_container.children('article').remove();
	}

  var getCache = function () {
//    debug("getting cache for "+getUniqId());
    return d10.sessioncache.getJSON('paginer.'+getUniqId());
  }

  var setCache = function (cache) {
//    debug("setting cache for "+pagination_url);
// 		debug(cache);
    d10.sessioncache.setJSON('paginer.'+getUniqId(),cache,true);
  }


  this.clearPageCache = function () {
			//index_data = null;
      d10.sessioncache.unset('paginer.pages.'+getUniqId());
	}

  var getPageCache = function (page_id) {
		if ( isNaN(page_id) )	page_id = 1;
// 		debug(getUniqId());
    //debug("getting page cache for "+pagination_url+" "+page_id);

    var cache = d10.sessioncache.getJSON('paginer.pages.'+getUniqId());
//    debug('pagecache: ');
//    debug(cache);
    if ( cache != null && typeof cache == 'object' && cache[page_id] ) {
      return cache[page_id];
    }
  }

  var setPageCache = function (page_id,cached) {
		if ( isNaN(page_id) )	page_id = 1;
    debug("setting page cache for "+pagination_url+' '+page_id+':');
//		debug(cached);
    var cache = d10.sessioncache.getJSON('paginer.pages.'+getUniqId());

    if ( cache == null || typeof cache != 'object' ) {
      cache = {};
    }
    cache[page_id] = cached;
    //debug("setting cache :");
    //debug(cache);
    d10.sessioncache.setJSON('paginer.pages.'+getUniqId(),cache,true);
  }
}

})(jQuery);