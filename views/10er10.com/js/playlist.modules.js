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
	"js/playlist.module.volume",
  "js/playlist.module.mix",
  'js/playlist.module.playbackRate'
], function() {

  var controls = $("#controls");
  var container = $("#container");

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

  function bindTabs() {
    var tabContainer = $("#player .playlistOptions");
    var disableAll = function() {
      tabContainer.children(".active").each(function() {
        var targetName = $(this).removeClass("active").attr("data-target");
        var target = container.children("."+targetName);
        target.removeClass("active");
      });
    };

    tabContainer.delegate("span","click",function() {
      var self = $(this);
      var enabled = $(this).hasClass("active");
      var targetName = $(this).attr("data-target");
      disableAll();
      if ( !enabled ) {
        self.addClass("active");
        var target = container.children("."+targetName);
        target.addClass("active");
      }
    });
  };

  bindTabs();


	debug("playlist modules loaded ! ");
});
