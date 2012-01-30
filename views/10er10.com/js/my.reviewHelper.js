"use strict";
define(["js/d10.templates", "js/user"], function(tpl, user) {
  
  	var showReviewHelper = function (reference) {
	  var reviewHelper = $(tpl.mustacheView("my.reviewHelper.bubble"));
	  var reviewHelperBody = $(tpl.mustacheView("my.reviewHelper"));
	  var startOverlay = function () {
		reviewHelper.ovlay(
		  {
			closeOnClick: false, 
			closeOnMouseOut: false, 
			closeOnEsc: false, 
			align:{position: "top", reference: reference, topOffset: -9}, 
			family: "reviewHelper"
		  }
		);
	  };
	  
	  reviewHelper.find(".close").click(function() {
		reviewHelper.ovlay().close();
		user.set_preference("hiddenReviewHelper", true);
	  });
	  reviewHelper.find(".link").click(function() {
		if ( reviewHelperBody.is(":visible") ) {
		  reviewHelperBody.ovlay().close();
		} else {
		  reviewHelperBody.find(".close").click(function() { reviewHelperBody.ovlay().close(); });
		  reviewHelperBody.find("button").click(function() { reviewHelperBody.ovlay().close(); });
		  reviewHelperBody.fullOvlay(
			{
			  closeOnClick: true, 
			  closeOnMouseOut: false, 
			  closeOnEsc: true, 
			  align:{position: "bottom", reference: reference}, 
			  family: "reviewHelper",
			  onClose: startOverlay,
			  onDomInsert: function(overlay) {setTimeout(function() {overlay.addClass("on");},20);},
			  onDomRemove: function(overlay, then) {overlay.removeClass("on"); setTimeout(then,300);}
			}
		  );
		}
	  });
	  startOverlay();
	};

	var onData = function(data) {
	  	var count = data.count;
		var rr = $("#reviewReminder");
		if ( count ) {
			$("strong",rr).html(count);
			rr.attr("title",tpl.mustacheView("side.review_reminder",{count: count}));
			if ( rr.is(":visible") ) {
				rr.whoobee();
			} else {
				rr.slideDown(function() {
					rr.flipflap();
					if ( !user.get_preferences() || !user.get_preferences().hiddenReviewHelper ) {
					  setTimeout(function() { showReviewHelper(rr); }, 500);
					}
				});
			}
		} else if ( rr.is(":visible") ) {
			rr.slideUp("fast");
		}
	};
	
	return onData;
	
});