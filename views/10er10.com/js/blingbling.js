function crazySprite_zoom(img) {
	debug(img);
	if ( crazySprite != null ||
			img == null || !img.length ) {
		return ;
	}
	crazySprite = $('<img src="'+img.attr('src')+'">');
	var pos = img.position();
	crazySprite.css('position','absolute');
	crazySprite.css('top',pos.top);
	crazySprite.css('left',pos.left);
	crazySprite.css('z-index',100);
	crazySprite.show();
	$('body').append(crazySprite);
	crazySprite.animate( { 'width': '50', 'height':'50', 'opacity': 0 } , 500, function() {
	crazySprite.hide().remove();
	crazySprite=null;
});
}


function bounce_start(target) {
	var internal_bounce = function () {
		if ( !target.data('bounce_table') || target.data('bounce_table').length == 0 ) {
			target.data('bounce_table', [ 0,-3,-6,-8,-9,-10,-9,-8,-6,-3 ] );
		}
		target.css('-moz-transform','translateY('+target.data('bounce_table')[target.data('bounce_table').length-1]+'px)');
		var tmp=target.data('bounce_table');
		tmp.pop();
		target.data('bounce_table',tmp);
	};
	target.data('bounce_interval',window.setInterval(internal_bounce,80));
}

function bounce_stop(target) {
	clearInterval(target.data('bounce_interval'));
	target.css('-moz-transform','');
	target.removeData('bounce_interval');
	target.removeData('bounce_table');
}




function rotate_start(target) {
	var internal_bounce = function () {
		if ( !target.data('bounce_table') || target.data('bounce_table').length == 0 ) {
			target.data('bounce_table', [ 0,10,20,30,40,50,60,70,80,90,100,110,120,130,140,150,160,170,180,190,200,210,220,230,240,250,260,270,280,290,300,310,320,330,340,350 ] );
		}
		target.css('-moz-transform','rotate('+target.data('bounce_table')[target.data('bounce_table').length-1]+'deg)');
		var tmp=target.data('bounce_table');
		tmp.pop();
		target.data('bounce_table',tmp);
	};
	target.data('bounce_interval',window.setInterval(internal_bounce,30));
}


function ajax_feedback_start(target) {
// 	return rotate_start(target);
}

function ajax_feedback_stop(target) {
// 	return bounce_stop(target);
}


function scaleOut (elem,callback) {
	elem.data('scale',10);
	//$('body').css('-moz-transform-origin','bottom left');
	elem.data('scaleInterval', window.setInterval ( function (e) {
		var num=e.data('scale');
//		debug(num);
		if ( num == 0 ) {
			clearInterval(e.data('scaleInterval'));
			e.hide().css('-moz-transform','scale(1)');
			if ( callback ) {
				callback(elem);
			}
			return ;
		}
		num=num-0.5;
		e.css('-moz-transform','scale('+num/10+')');
		e.data('scale',num);
	},
	15,elem));
}

function scaleIn (elem,callback) {
	elem.data('scale',0);
	//$('body').css('-moz-transform-origin','bottom left');
	elem.data('scaleInterval', window.setInterval ( function (e) {
		var num=e.data('scale');
//		debug(num);
		if ( num == 10 ) {
			clearInterval(e.data('scaleInterval'));
			if ( callback ) {
				callback;
			}
			return ;
		} else if ( num == 0 ) {
			e.css('-moz-transform','scale(0.01)').show();
//			setTimeout(function () { e.show(); } , 20);
		}
		num=num+0.5;
		e.css('-moz-transform','scale('+num/10+')');
		e.data('scale',num);
	},
	15,elem));
}


function rotate (elem) {
elem.data('rotation',0);
//$('body').css('-moz-transform-origin','bottom left');
elem.data('rotationInterval', window.setInterval ( function (elem) {
	var angle=elem.data('rotation');
	if ( angle == 360 ) {
		clearInterval(elem.data('rotationInterval'));
		return ;
	}
	angle=angle+10;
	elem.css('-moz-transform','rotate('+angle+'deg)');
	elem.data('rotation',angle);
},
10,elem));
}


function startColor (elem) {
  
  elem.data('color',elem.css('color'));
  if ( elem.data('reverse') == true ) {
    elem.data('reverse',false);
    //elem.slideDown(3000);
    elem.animate({'color': '#086FA1'},1000);
  } else {
    elem.data('reverse',true);
    //elem.slideUp(3000);
    elem.animate({'color': '#BF9730'},1000);
  }
  elem.data('anim',
    setTimeout(  startColor  , 1000, elem)
  );
}

function stopColor(elem) {
  
  stopAnim(elem);
  //elem.css('background',''  );
  setTimeout(function(elem) {elem.css('color','')},1000,elem);
  //setTimeout(elem.css,2000,'background','');

}

function startBlink (elem) {
  //debug(span);
  startBlink_real(elem);

}

function startBlink_real (elem) {
  if ( elem.data('reverse') == true ) {
    elem.data('reverse',false);
    //elem.slideDown(3000);
    elem.animate({'opacity': 1},1000);
  } else {
    elem.data('reverse',true);
    //elem.slideUp(3000);
    elem.animate({'opacity': 0},1000);
  }
  elem.data('anim',
    setTimeout(  startBlink_real  , 1000, elem)
  );
}

function stopAnim(elem) {
  
  clearTimeout(elem.data('anim'));
  //span.slideDown(1000);
  elem.data('reverse',false).animate({'opacity': 1},1000);
}





