(function($)  {
	
	
	var waitImage = new Image();
	waitImage.src = '/css/64x64/apps/kalarm.png';
	
	var uploadImage = new Image();
	uploadImage.src = '/css/64x64/actions/arrow-up.png';
	
	var okImage = new Image();
	okImage.src = '/css/64x64/actions/dialog-ok.png';
	
	function getImageFromReader(e) {
		return $("<img />").attr("src",e.target.result);
	};
	
	// should async this one bc on chrome it's async
	function getImageSize(img, then) {
		img.css(
			{
				"visibility":"none",
				"position": "absolute",
				"top": 0,
				"left": -10000
			}
		);
		$("body").append(img);
		setTimeout(function() {
			var w = img.width(), h = img.height();
			img.detach().css({
				"visibility":"",
				"position": "",
				"top": null,
				"left": null
			});
			return then(w, h);
		},200);
	};
	
	function getDynamicImageSize(w,h, sideSize) {
		if ( w > h ) {
			h = Math.round(h / w * sideSize);
			w = sideSize;
		} else {
			w = Math.round(w / h * sideSize);
			h = sideSize;
		}
		return { width:w, height:h };
	};
	
	$.fn.loadImage = function(e, options) {
		var img = getImageFromReader(e),
		that = this,
		sideSize = parseInt(d10.config.img_size,10),
		newSize,
		xStart,
		yStart,
		ctx = this.get(0).getContext("2d");;
		var settings = {
			onReady: function() {},
			onSize: function() { return true;}
		};		
		$.extend(settings,options);
		var update = function(pc, image) {
			image = image || waitImage;
			if ( pc == 100 ) {
				image = okImage;
			}
// 			debug(xStart,yStart,newSize.width, newSize.height);
			ctx.clearRect(0,0,sideSize,sideSize);
			ctx.drawImage(img.get(0),xStart,yStart,newSize.width, newSize.height);
			ctx.fillStyle = "rgba(200,200,200,0.3)";
			var h = Math.floor(sideSize / 100 * (100-pc));
			var hStart = sideSize - h;
			ctx.fillRect  (0,   0, sideSize, h);
			ctx.drawImage(image,32,32);
		};
		getImageSize(img, function(w,h) {
			if( settings.onSize(w,h) !== true ) {
				return ;
			}
			newSize = getDynamicImageSize(w,h, sideSize);
			debug(newSize);
			xStart = Math.floor((sideSize - newSize.width) / 2);
			yStart = Math.floor((sideSize - newSize.height) / 2);
			update(0, waitImage);
			settings.onReady.call(that,api);
		});
		var api = {
			loadProgress: update
		};

		return api;
	};
	
})(jQuery);
