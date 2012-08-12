define([
	"js/playlist.module.controls",
	"js/playlist.module.fade",
	"js/playlist.module.highlight",
	"js/playlist.module.image",
	"js/playlist.module.radio",
	"js/playlist.module.rpl",
	"js/playlist.module.spectrum",
	"js/playlist.module.time",
	"js/playlist.module.title",
	"js/playlist.module.topinfos",
	"js/playlist.module.volume"
], function() {
  
  var controls = $("#controls");
  
  var disableAll = function() {
    controls.find(".optionsTab > div.on").each(function() {
      var targetName = $(this).removeClass("on").attr("data-target");
      controls.find(".optionsPanel > ."+targetName).slideUp();
    });
  };
  
  controls.delegate(".optionsTab > div", "click", function() {
    var self = $(this);
    var enabled = self.hasClass("on");
    var targetName = self.attr("data-target");
    var target = controls.find(".optionsPanel > ."+targetName);
    if ( enabled ) {
      target.slideUp();
      self.removeClass("on");
    } else {
      disableAll();
      target.slideDown();
      self.addClass("on");
    }
  });
  
  
  
	debug("playlist modules loaded ! ");
});
