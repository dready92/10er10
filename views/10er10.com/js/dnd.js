define(function() {

	var dnd = function() {

		var dragging = null;

		var containers = [];

		this.setDragItem = function(item) { 
		// 	  debug("dnd start got ",item.length," items ");
			dragging = item; 
			dragging.addClass("dragging").toggleClass("selected",true).css("opacity",0.5);
		}
		this.getDragItem = function() { return dragging ; }
		this.removeDragItem = function() {
			if ( dragging == null ) {
		// 		  debug("dragging is null");
				return;
			}
		// 	  debug("dnd stop ",dragging.length," items ");
			dragging.removeClass("dragging").removeClass("selected").css("opacity",1); dragging = null ; 
		}

		this.onDragDefault = function(e) {
			var song = $(this);
			if ( $("span.review",this).length ) { return false; }
			song.toggleClass("selected",true);
			var dt = e.originalEvent.dataTransfer;
			dt.effectAllowed = "copy";
			dt.setData('text','playlist');
			dt.setDragImage( $('#songitem img')[0], 0, 0);
			d10.dnd.setDragItem( song.closest(".list").find(".song.selected") );
		};

		// options
		// copyDrop : song comes from another area than list
		// moveDrop : song comes from list
		// dragenter : other things to do on dragenter
		// dragleave : other things to do on dragleave
		this.dropTarget = function(container, list, options  ) {
			var settings = {
				"copyDrop": function(){},
				"moveDrop": function(){},
				"dragenter": function(){},
				"dragleave": function(){},
				"dropAllowed": function() {return true;},
				"containerHeight": function() { /*debug(container, container.height());*/return container.height(); }
			};
			$.extend(settings,options);

			var currentDnDposition = null;
			
			var onDnd = function (e) {
				if ( dragging == null ) { return ; }
				var song = $(e.target).closest('div.song');
				if ( !settings.dropAllowed({target: song, dragging: dragging}) ) {
					return true;
				}
				if ( dragging.includes(song) ) {
					$("div.song",list).removeClass("hover");
					return true;
				}
				
				if ( !song.length ) {
					$("div.song",list).removeClass("hover");
					var containerHeight = settings.containerHeight();
					if ( container.offset().top + (containerHeight  / 2) > e.pageY ) {
						$("div.song.hover",list).removeClass("hover");
						container.toggleClass("hovertop",true).toggleClass("hoverbottom",false);
		// 				debug("before");
					} else {
						container.toggleClass("hoverbottom",true).toggleClass("hovertop",false);
		// 				debug("after");
					}
					return false;
				} else {
					var othersongs = $("div.song", list).filter(function(index) {
						return this === song.get(0);
					});
					othersongs.toggleClass("hover",false);
					song.toggleClass("hover",true);
					container.toggleClass("hovertop hoverbottom",false);
					return false;
				}
			};


			container
			.bind("dragenter",onDnd)
			.bind("dragover",onDnd)
			.bind("dragleave",function(e) {
				debug("dragleave");
				
				if ( container.hasClass("hoverbottom") ) { currentDnDposition = "bottom"; } 
				else if ( container.hasClass("hovertop") ) { currentDnDposition = "top"; } 
				else { currentDnDposition = null; }
				
				$("div.song.hover",list).removeClass("hover");
				
				
				container.removeClass("hovertop hoverbottom");
			})
			.bind("drop",function(e) {
				debug("drop called");
				e.originalEvent.preventDefault();
				var target = $(e.target).closest('div.song');
				if ( !target.length ) target = container;
				if ( ! dragging || !dragging.length ) {
					return false;
				}
				
				

				var infos = {"wantedNode": null};
				
				if ( currentDnDposition == "bottom" && $("div.song",list).length ) {
					infos.wantedNode = $("div.song",list).last();
				} else if ( currentDnDposition == null &&  target.hasClass("song") ) {
					infos.wantedNode = target;
				}
				
				// chrome is buggy with dnd, do we have to unset special css styles here... :-(
				$("div.song.hover",list).removeClass("hover");
				container.removeClass("hovertop hoverbottom");
					
					// check if song is part of the own list
				
				if ( list.children().includes( dragging.get(0) ) ) {
					debug("in move",dragging,target,infos);
					if ( infos.wantedNode && dragging.includes( infos.wantedNode.get(0) ) ) {
						debug("move skipped : target is in dragging");
						// we're in a move drop but the target is in the dragged items
						return false;
					}
					return settings.moveDrop.call(list,dragging,target, infos);
				} else {
					debug("in copy",dragging,target,infos);
					return settings.copyDrop.call(list,dragging,target, infos);
				}
		// 				return true;
			});
		};

	};


	return new dnd();

});

