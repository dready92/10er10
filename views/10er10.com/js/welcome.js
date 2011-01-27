$(document).ready(function() {

var welcome = function  () {
	//self ref
	var that=this;
	//create UI
	var ui=$('#welcome');

//create listener
	$(document).bind('menuClick',function(e,data) {
		debug("welcome menuClick");
		//    debug(data);
	});

	var doSmooth = function (src, target) {
		src.css("z-index", 89);
		target.css("z-index", 90);
		src.animate({"opacity": 0},1000);
		target.animate({"opacity": 1},1000);
		if ( target.next().length ) {
			$("div.scrollContainer a.next",ui).show();
		} else {
			$("div.scrollContainer a.next",ui).hide();
		}
		if ( target.prev().length ) {
			$("div.scrollContainer a.prev",ui).show();
		} else {
			$("div.scrollContainer a.prev",ui).hide();
		}
	};

	var container = $("div.items",ui);
	$(">div:first-child",container).css({
		"opacity": 1,
		"z-index": 90
	});
	$("div.scrollContainer a.prev",ui).hide();
	$("div.scrollContainer a.next",ui).show();
	$("div.scrollContainer a.next",ui).click(function() {
		var actElem = $(">div",container).filter(function() { return $(this).css("opacity") == 1 ; });
	//     console.log(actElem);
		var nextElem = actElem.next();
		if( nextElem.length && actElem.length ) {
			doSmooth(actElem, nextElem);
		}
	});
	$("div.scrollContainer a.prev",ui).click(function() {
		var actElem = $(">div",container).filter(function() { return $(this).css("opacity") == 1 ; });
	//     console.log(actElem);
		var nextElem = actElem.prev();
		if( nextElem.length && actElem.length ) {
			doSmooth(actElem, nextElem);
		}
	});

	$("div.scrollContainer div.welcomeBox[data-target]").click(function() {
		window.location.hash = "#"+$(this).attr("data-target");
		return false;
	});


};

d10.welcome = new welcome();

delete welcome;

});