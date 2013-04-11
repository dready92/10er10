define(["js/domReady","js/d10.playlistModule", "js/playlist"], 
	   function(foo, playlistModule, playlist) {

    var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ;
    var cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame ;
    var animationFrameId = null;
    var push = 0;
    var lastPaint = 0;
    var currentDataCounter = 0;
    var onAnimationFrame = function() {
      animationFrameId = requestAnimationFrame(onAnimationFrame);
      if ( !fft || !fft.fft ) {
        debug("fft or fft.fft is not defined",fft);
        return ;
      }
      if ( !fft.fb ) {
        debug("ftt.fb is not defined");
        return ;
      }
      
      if ( currentDataCounter == lastPaint ) {
        return ;
      }
      
      if ( push ) {
        push--;
        return ;
      }
      push=5;
      lastPaint = currentDataCounter;
      var signal = new Float32Array(fft.fb.length / fft.channels);
      var magnitude, lastMagnitude;
      for (var i = 0, fbl = fft.frameBufferLength / 16; i < fbl; i++ ) {
        // Assuming interlaced stereo channels,
        // need to split and merge into a stero-mix mono signal
        signal[i] = (fft.fb[2*i] + fft.fb[2*i+1]) / 2;
      }

      fft.fft.forward(signal);
      // Clear the canvas before drawing spectrum
      var ctx = canvas.getContext('2d');
      ctx.clearRect(0,0, canvas.width, canvas.height);
      var baseColor = [70,103,155];
      var widthLimit = canvas.width / 2;
      for (var  i = 0; i < widthLimit; i++ ) {
        // multiply spectrum by a zoom value
        magnitude = fft.fft.spectrum[i] * 4000;
        ctx.fillStyle = 'rgb('+ baseColor.join(",")+')';
        baseColor[0] += 1;
        baseColor[1] += 1;
        baseColor[2] -= 1;
        var i2 = i*2;
        // Draw rectangle bars for each frequency bin
        ctx.fillRect(i2, canvas.height, 1, -magnitude);
        if ( i > 0 ) {
          ctx.fillRect(i2-1, canvas.height, 1, -(lastMagnitude + magnitude)/2);
        }
        lastMagnitude = magnitude;
      }
    };
    
	var ffSpectrum = function(audio,canvas) {
		var fft, rate;
        currentDataCounter = 0;
        var api = {
          removeListeners: function() {
            audio.removeEventListener('MozAudioAvailable', audioAvailable, false);
            audio.removeEventListener('loadedmetadata', loadedMetadata, false);
          },
          fft: null,
          channels: null,
          frameBufferLength: null,
          fb: null
        };
	// 	ctx.fillStyle = '#9A9A9A';
	// 	ctx.fillStyle = '#466777';
		function loadedMetadata() {
			api.channels          = audio.mozChannels;
			rate              = audio.mozSampleRate;
			api.frameBufferLength = audio.mozFrameBufferLength;
			api.fft = new FFT(api.frameBufferLength / api.channels, rate);
		}

		function audioAvailable(event) {
			if ( !api.channels ) {
				loadedMetadata();
				return ;
			}
            currentDataCounter++;
			api.fb = event.frameBuffer;
		}

		audio.addEventListener('MozAudioAvailable', audioAvailable, false);
		audio.addEventListener('loadedmetadata', loadedMetadata, false);
		return api;
	};

	// FFT from dsp.js, see below
	function FFT(bufferSize, sampleRate) {
		this.bufferSize   = bufferSize;
		this.sampleRate   = sampleRate;
		this.spectrum     = new Float32Array(bufferSize/2);
		this.real         = new Float32Array(bufferSize);
		this.imag         = new Float32Array(bufferSize);
		this.reverseTable = new Uint32Array(bufferSize);
		this.sinTable     = new Float32Array(bufferSize);
		this.cosTable     = new Float32Array(bufferSize);

		var limit = 1,
			bit = bufferSize >> 1;

		while ( limit < bufferSize ) {
			for ( var i = 0; i < limit; i++ ) {
				this.reverseTable[i + limit] = this.reverseTable[i] + bit;
			}

			limit = limit << 1;
			bit = bit >> 1;
		}

		for ( var i = 0; i < bufferSize; i++ ) {
			this.sinTable[i] = Math.sin(-Math.PI/i);
			this.cosTable[i] = Math.cos(-Math.PI/i);
		}
	};

	FFT.prototype.forward = function(buffer) {
		var bufferSize   = this.bufferSize,
			cosTable     = this.cosTable,
			sinTable     = this.sinTable,
			reverseTable = this.reverseTable,
			real         = this.real,
			imag         = this.imag,
			spectrum     = this.spectrum;

		if ( bufferSize !== buffer.length ) {
			throw "Supplied buffer is not the same size as defined FFT. FFT Size: " + bufferSize + " Buffer Size: " + buffer.length;
		}

		for ( var i = 0; i < bufferSize; i++ ) {
			real[i] = buffer[reverseTable[i]];
			imag[i] = 0;
		}

		var halfSize = 1,
			phaseShiftStepReal,	
			phaseShiftStepImag,
			currentPhaseShiftReal,
			currentPhaseShiftImag,
			off,
			tr,
			ti,
			tmpReal,	
			i;

		while ( halfSize < bufferSize ) {
			phaseShiftStepReal = cosTable[halfSize];
			phaseShiftStepImag = sinTable[halfSize];
			currentPhaseShiftReal = 1.0;
			currentPhaseShiftImag = 0.0;

			for ( var fftStep = 0; fftStep < halfSize; fftStep++ ) {
				i = fftStep;

				while ( i < bufferSize ) {
					off = i + halfSize;
					tr = (currentPhaseShiftReal * real[off]) - (currentPhaseShiftImag * imag[off]);
					ti = (currentPhaseShiftReal * imag[off]) + (currentPhaseShiftImag * real[off]);

					real[off] = real[i] - tr;
					imag[off] = imag[i] - ti;
					real[i] += tr;
					imag[i] += ti;

					i += halfSize << 1;
				}

				tmpReal = currentPhaseShiftReal;
				currentPhaseShiftReal = (tmpReal * phaseShiftStepReal) - (currentPhaseShiftImag * phaseShiftStepImag);
				currentPhaseShiftImag = (tmpReal * phaseShiftStepImag) + (currentPhaseShiftImag * phaseShiftStepReal);
			}

			halfSize = halfSize << 1;
		}

		i = bufferSize/2;
		while(i--) {
			spectrum[i] = 2 * Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) / bufferSize;
		}
	};

		   
		   
		   
		   
		   
		   
		   
		   
		   
		   
		   
		   
		   
		   
		   
		   
		   
		   
		   
	if ( "mozFrameBufferLength" in $("<audio />").get(0)  == false ) {
		debug("not initializong spectrum");
		return ;
	}
	
	if ( !requestAnimationFrame ) {
      return ;
    }
	
	var spectrumUI = $("#side .spectrumControl").removeClass("hidden");
    var spectrumCB = spectrumUI.find("input");
    if ( spectrumCB.prop("checked") ) {
      spectrumCB.removeProp("checked");
    }
	
	spectrumCB.bind("change",function() {	
      if ( enabled ) {
        enabled = false;
        clearFFT();
        $canvas.slideUp("fast");
      } else {
        enabled = true;
        $canvas.slideDown("fast");
        try {
          var a = playlist.driver().current().audio;
          if ( a ) {
            newFFT(a);
          }
        }catch(e) {debug("unable to get current song",e);}
      }
    });	
	
    var $canvas = spectrumUI.find("canvas");
	var canvas = $canvas.get(0);
	var enabled = false;
	var fft = null;
	
	var newFFT = function(audio) {
		clearFFT();
		fft = new ffSpectrum(audio, canvas);
        animationFrameId = requestAnimationFrame(onAnimationFrame);
	};
	
    var clearFFT = function() {
      if ( fft ) {
        fft.removeListeners();
        fft = null;
      }
      if ( animationFrameId ) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      var ctx = canvas.getContext('2d');
      ctx.clearRect(0,0, canvas.width, canvas.height);
    };
	
	var module = new playlistModule("spectrum",{
		"playlist:currentSongChanged": function() {
			if ( !enabled ) { return ; }
			newFFT(playlist.driver().current().audio);
		},
		"playlist:ended": function() {
			clearFFT();
		}
	},{});

	playlist.modules[module.name] = module;
	return module;
});

