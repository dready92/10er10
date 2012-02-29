"use strict";
define(["js/d10.templates", "js/user"], function(tpl, user) {
    var body = $("body");
    var reviewReminder = $("#reviewReminder");
    var reviewHelper = $(tpl.mustacheView("my.reviewHelper.bubble"));
    var reviewHelperBody = $(tpl.mustacheView("my.reviewHelper"));
  	var showReviewHelper = function () {
	  reviewHelper.css({visibility: "hidden"}).appendTo(body);
	  var startOverlay = function () {
		reviewHelper.ovlay(
		  {
			closeOnClick: false, 
			closeOnMouseOut: false, 
			closeOnEsc: false, 
			align:{position: "top", reference: reviewReminder, topOffset: -9}, 
			family: "reviewHelper",
            onClose: function() {reviewHelper.detach();}
		  }
		);
	  };
	  startOverlay();
	};
    

    reviewHelper.find(".close").click(function() {
      reviewHelper.ovlay().close();
      user.set_preference("hiddenReviewHelper", true);
    });
    reviewHelper.find(".link").click(function() {
      if ( reviewHelperBody.ovlay() ) { 
        reviewHelperBody.ovlay().close(); 
      } else {
        reviewHelperBody.find(".close").click(function() { reviewHelperBody.ovlay().close(); });
        reviewHelperBody.find("button").click(function() { reviewHelperBody.ovlay().close(); });
        reviewHelperBody.fullOvlay(
          {
            closeOnClick: true, 
            closeOnMouseOut: false, 
            closeOnEsc: true,
            family: "reviewHelper",
            onClose: showReviewHelper,
            onDomInsert: function(overlay) {setTimeout(function() {overlay.addClass("on");},20);},
            onDomRemove: function(overlay, then) {overlay.removeClass("on"); setTimeout(then,300);}
          }
        );
      }
    });
    
	var onData = function(data) {
        
	  	var count = data.count;
		if ( count ) {
			reviewReminder.find("strong").html(count);
			reviewReminder.attr("title",tpl.mustacheView("side.review_reminder",{count: count}));
			if ( reviewReminder.is(":visible") ) {
				reviewReminder.whoobee();
			} else {
				reviewReminder.slideDown(function() {
					reviewReminder.flipflap();
					if ( !user.get_preferences() || !user.get_preferences().hiddenReviewHelper ) {
					  setTimeout(function() { showReviewHelper(); }, 500);
					}
				});
			}
		} else if ( reviewReminder.is(":visible") ) {
			reviewReminder.slideUp("fast");
            var overlay = reviewHelper.ovlay();
            if ( overlay ) { overlay.close(); }
		}
	};
	
	return onData;
	
});