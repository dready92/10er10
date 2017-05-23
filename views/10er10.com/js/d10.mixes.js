define(["js/d10.mix"],function(d10mix) {
  var mixes = [];
  mixes.push (
    {
      label: "Very fast fade",
      description: "Very fast fade out/in (3 secs)",
      builder: function() {
        var steps = [];
        steps.push(
          new d10mix.mixStep(
            "currentTrack",
            0,
            3,
            "volume",
            0,
            {stopPlaybackOnEnd: true}
          )
        );
        steps.push(
          new d10mix.mixStep(
            "nextTrack",
            0,
            3,
            "volume",
            d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
            {
              propertyStartValue: 0,
              startPlaybackOnBegin: true
            }
          )
        );
        return new d10mix.mix([], steps);
      }
    }
  );

  mixes.push (
    {
      label: "Fast fade",
      description: "Fast fade out/in (5 secs)",
      builder: function() {
        var steps = [];
        steps.push(
          new d10mix.mixStep(
            "currentTrack",
            0,
            4,
            "volume",
            0,
            {stopPlaybackOnEnd: true}
          )
        );
        steps.push(
          new d10mix.mixStep(
            "nextTrack",
            1,
            5,
            "volume",
            d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
            {
              propertyStartValue: 0,
              startPlaybackOnBegin: true
            }
          )
        );
        return new d10mix.mix([], steps);
      }
    }
  );

  mixes.push (
    {
      label: "Medium fade",
      description: "Medium fade out/in (10 secs)",
      builder: function() {
        var steps = [];
        steps.push(
          new d10mix.mixStep(
            "currentTrack",
            0,
            9,
            "volume",
            0,
            {stopPlaybackOnEnd: true}
          )
        );
        steps.push(
          new d10mix.mixStep(
            "nextTrack",
            1,
            10,
            "volume",
            d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
            {
              propertyStartValue: 0,
              startPlaybackOnBegin: true
            }
          )
        );
        return new d10mix.mix([], steps);
      }
    }
  );

  mixes.push (
    {
      label: "Long fade",
      description: "Long fade out/in (15 secs)",
      builder: function() {
        var steps = [];
        steps.push(
          new d10mix.mixStep(
            "currentTrack",
            0,
            13,
            "volume",
            0,
            {stopPlaybackOnEnd: true}
          )
        );
        steps.push(
          new d10mix.mixStep(
            "nextTrack",
            1.7,
            15,
            "volume",
            d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
            {
              propertyStartValue: 0,
              startPlaybackOnBegin: true
            }
          )
        );
        return new d10mix.mix([], steps);
      }
    }
  );

  mixes.push (
    {
      label: "explosion",
      description: "An explosion ends up the current song, then the new song starts almost directly",
      builder: function() {
        var steps = [];
        steps.push(
          new d10mix.mixStep(
            "explosion",
            0,
            0,
            "volume",
            d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
            {
              propertyStartValue: d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
              startPlaybackOnBegin: true
            })
        );
        steps.push(
          new d10mix.mixStep(
            "currentTrack",
            0.1,
            0.1,
            "volume",
            0,
            {stopPlaybackOnEnd: true}
          )
        );
        steps.push(
          new d10mix.mixStep(
            "nextTrack",
            3,
            1,
            "volume",
            d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
            {
              propertyStartValue: 0,
              startPlaybackOnBegin: true
            }
          )
        );
        var assets = [{label: "explosion",url: "css/mix/Explosion_Ultra_Bass-Mark_DiAngelo-1810420658.ogg"}];
        return new d10mix.mix(assets, steps);
      }
    }
  );

  mixes.push (
    {
      label: "bombDrop",
      description: "A bomb is falling, an explosion ends up the current song, then the new song starts almost directly",
      builder: function() {
        var steps = [];
        steps.push(
          new d10mix.mixStep(
            "bombdrop",
            0,
            8,
            "volume",
            d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
            {
              propertyStartValue: d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
              startPlaybackOnBegin: true
            })
        );
        steps.push(
          new d10mix.mixStep(
            "explosion",
            8,
            0,
            "volume",
            d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
            {
              propertyStartValue: d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
              startPlaybackOnBegin: true
            })
        );
        steps.push(
          new d10mix.mixStep(
            "currentTrack",
            0.1,
            6,
            "volume",
            0,
            {stopPlaybackOnEnd: true}
          )
        );
        steps.push(
          new d10mix.mixStep(
            "nextTrack",
            12,
            1,
            "volume",
            d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
            {
              propertyStartValue: 0,
              startPlaybackOnBegin: true
            }
          )
        );
        var assets = [{label: "explosion",url: "/css/mix/Explosion_Ultra_Bass-Mark_DiAngelo-1810420658.ogg",},
          {label: "bombdrop",url: "/css/mix/Bomb_Drop-__-447768269.ogg",}
        ];
        return new d10mix.mix(assets, steps);
      }
    }
  );

  mixes.push (
    {
      label: "gunShot",
      description: "gun loaded, then three bullets fired",
      builder: function() {
        var steps = [];
        steps.push(
          new d10mix.mixStep(
            "guncock",
            0,
            0,
            "volume",
            d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
            {
              propertyStartValue: d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
              startPlaybackOnBegin: true
            })
        );
        steps.push(
          new d10mix.mixStep(
            "shot1",
            2,
            0,
            "volume",
            d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
            {
              propertyStartValue: d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
              startPlaybackOnBegin: true
            })
        );
        steps.push(
          new d10mix.mixStep(
            "shot2",
            2.6,
            0,
            "volume",
            d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
            {
              propertyStartValue: d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
              startPlaybackOnBegin: true
            })
        );
        steps.push(
          new d10mix.mixStep(
            "shot3",
            3.5,
            0,
            "volume",
            d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
            {
              propertyStartValue: d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
              startPlaybackOnBegin: true
            })
        );
        steps.push(
          new d10mix.mixStep(
            "currentTrack",
            2,
            1,
            "volume",
            0,
            {
              propertyStartValue: d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
              stopPlaybackOnEnd: true
            }
          )
        );
        steps.push(
          new d10mix.mixStep(
            "nextTrack",
            3,
            0,
            "volume",
            d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
            {
              propertyStartValue: d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
              startPlaybackOnBegin: true
            }
          )
        );
        var assets = [
          {label: "guncock",url: "/css/mix/90965-gun-cocking.ogg"},
          {label: "shot1",url: "/css/mix/gun-shot.ogg"},
          {label: "shot2",url: "/css/mix/gun-shot.ogg"},
          {label: "shot3",url: "/css/mix/gun-shot.ogg"}
        ];
        return new d10mix.mix(assets, steps);
      }
    }
  );

  mixes.push (
    {
      label: "switchingAlarm",
      description: "A kind of strange alarm rings",
      builder: function() {
        var steps = [];
        steps.push(
          new d10mix.mixStep(
            "alarm",
            0,
            1.5,
            "volume",
            d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
            {
              propertyStartValue: 0,
              startPlaybackOnBegin: true
            })
        );
        steps.push(
          new d10mix.mixStep(
            "currentTrack",
            0,
            3,
            "volume",
            0,
            {
              propertyStartValue: d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
              stopPlaybackOnEnd: true
            }
          )
        );
        steps.push(
          new d10mix.mixStep(
            "nextTrack",
            4,
            1,
            "volume",
            d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
            {
              propertyStartValue: 0,
              startPlaybackOnBegin: true
            }
          )
        );
        var assets = [
          {label: "alarm",url: "/css/mix/340950-alarm.ogg"}
        ];
        return new d10mix.mix(assets, steps);
      }
    }
  );

  mixes.push (
    {
      label: "increaseRate",
      description: "Increase next song rate",
      builder: function() {
        var steps = [];
        steps.push(
          new d10mix.mixStep(
            "currentTrack",
            1,
            5,
            "volume",
            0,
            {stopPlaybackOnEnd: true}
          )
        );
        steps.push(
          new d10mix.mixStep(
            "currentTrack",
            0,
            4,
            "playbackRate",
            0.7,
            {
              propertyStartValue: 1,
              stopPlaybackOnEnd: true
            }
          )
        );
        steps.push(
          new d10mix.mixStep(
            "nextTrack",
            2,
            3,
            "volume",
            d10mix.mixStep.PROPERTY_VALUE_CURRENT_VOLUME,
            {
              propertyStartValue: 0,
              startPlaybackOnBegin: true
            }
          )
        );
        steps.push(
          new d10mix.mixStep(
            "nextTrack",
            2,
            5,
            "playbackRate",
            1,
            {
              propertyStartValue: 0.7,
              startPlaybackOnBegin: true
            }
          )
        );
        return new d10mix.mix([], steps);
      }
    }
  );


  return mixes;

});