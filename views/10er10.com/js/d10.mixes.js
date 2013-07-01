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

  return mixes;
  
});