/* eslint-disable import/no-amd */
// eslint-disable-next-line no-undef
define(['js/domReady', 'js/user', 'js/d10.rest', 'js/d10.templates', 'js/d10.dnd', 'js/playlist', 'js/d10.restHelpers',
  'js/d10.router', 'js/d10.toolbox', 'js/d10.osd', 'js/d10.imageUtils', 'js/config', 'js/d10.events', 'js/d10.widgetHelpers',
  'js/d10.artistTokenizer'],
(foo, user, rest, tpl, dnd, playlist, restHelpers, router, toolbox, osd, imageUtils, config, pubsub, widgetHelpers,
  artistTokenizer) => {
  function myCtrl(ui) {
    //
    // reminder click
    //
    $('#reviewReminder').click(() => { router.navigateTo(['my', 'review']); });

    pubsub.topic('review.count').subscribe((data) => {
      // eslint-disable-next-line import/no-dynamic-require,global-require
      require(['js/my.reviewHelper'], (helper) => {
        helper(data);
      });
    });


    pubsub.topic('user.infos').one(() => {
      if (!user.get_invites_count()) { $('ul li[action=invites]', ui).hide(); }
    });

    ui.delegate('div.song', 'dragstart', dnd.onDragDefault)
      .delegate('div.song', 'dragend', dnd.removeDragItem)
      .delegate('div.song', 'click', function songclick(e) {
        const target = $(e.target);
        if (target.closest('.add').length == 0 && target.closest('.artist').length == 0 && target.closest('.album').length == 0) { $(this).toggleClass('selected'); }
      })
      .delegate('div.song', 'dblclick', function songdblclick(e) {
        if ($('span.review', this).length) { return false; }
        const toAppend = $(this).clone();
        playlist.appendToCurrent(toAppend);
        return playlist.driver().play(playlist.getTrackParameters(toAppend));
      });


    function display(label, sublabel) {
      const saneSublabel = sublabel ? [sublabel] : [];
      routeAction(label, saneSublabel);
    };

    function routeAction(label, segments) {
      // eslint-disable-next-line no-undef
      debug('routeAction starts', label, segments);
      let topicdiv = $(`div[name=${label}]`, ui);
      if (!topicdiv.length) {
        topicdiv = $(`<div name="${label}"></div>`);
        ui.append(topicdiv);
        if (label == 'likes' || label == 'songs') {
          topicdiv.append(tpl.mustacheView('loading'));
        }
      }
      if (label === 'review') {
        debug('my', label, segments);
        if (segments.length) init_topic_songreview(topicdiv, segments[0]);
        else init_topic_review(topicdiv, null);
      } else if (label === 'songs') {
        init_topic_songs(topicdiv, segments);
      } else if (label === 'likes') {
        init_topic_likes(topicdiv, segments);
      } else if (label === 'invites') {
        init_topic_invites(topicdiv, segments);
      }
    };

    function selectVisible(categorydiv) {
      const list = categorydiv.find('.list');
      const parent = list.parent();
      const songs = list.children();
      const coutHeight = parent.outerHeight();
      const ctop = parent.position().top;

      songs.removeClass('selected');
      // eslint-disable-next-line no-plusplus
      for (let i = 0, last = songs.length; i < last; i++) {
        const song = songs.eq(i);
        const postop = song.position().top - ctop;
        const outheight = song.outerHeight();
        const delta = outheight * 0.1;
        if (postop >= -delta) {
          if ((postop + outheight - delta) < coutHeight) {
            song.addClass('selected');
          } else {
            break;
          }
        }
      }
    };


    const bindControls = function (endpoint, topicdiv, section, parseResults) {
      topicdiv.find('.pushAll').click(() => {
        playlist.append(topicdiv.find('.song').clone().removeClass('selected'));
      });
      topicdiv.find('.selectVisible').click(() => {
        selectVisible(topicdiv);
      });
      topicdiv.find('.refresh').click(() => {
        topicdiv.find('.song').remove();
        const is = section.data('infiniteScroll');
        if (is && 'remove' in is) {
          is.remove();
        }
        createInfiniteScroll(endpoint, topicdiv, section, parseResults);
      });
    };

    var createInfiniteScroll = function (endpoint, topicdiv, section, parseResults) {
      const cursor = new restHelpers.mongoPagedCursor(endpoint);
      const callbacks = {
        onFirstContentPreCallback(length) {
          topicdiv.find('.pleaseWait').remove();
          topicdiv.find('.songlist').removeClass('hidden');
          if (!length) {
            topicdiv.find('article').hide();
            topicdiv.find('.noResult').removeClass('hidden');
            return false;
          }
        },
      };
      if (parseResults) { callbacks.parseResults = parseResults; }
      section.data('infiniteScroll', widgetHelpers.createInfiniteScroll(topicdiv, cursor, callbacks));
    };

    var init_topic_likes = function (topicdiv, args) {
      let section = topicdiv.find('section');
      if (!section.length) {
        topicdiv.append(tpl.mustacheView('library.content.simple'));
        section = topicdiv.find('section');
        const list = section.find('.list');
        const endpoint = rest.user.likes;
        list.delegate('div.song .edit, div.song .review', 'click', function () {
          router.navigateTo(['my', 'review', $(this).closest('.song').attr('name')]);
          return false;
        });
        bindControls(endpoint, topicdiv, section);
        createInfiniteScroll(endpoint, topicdiv, section);
      }
    };

    var init_topic_songs = function (topicdiv, args) {
      let section = topicdiv.find('section');
      if (!section.length) {
        topicdiv.append(tpl.mustacheView('library.content.simple'));
        section = topicdiv.find('section');
        const list = section.find('.list');
        // 			var url = "/api/list/s_user";
        const endpoint = rest.user.songs;
        const parseResults = function (rows) {
          const html = $(tpl.song_template(rows));
          html.each(function () {
            if ($(this).attr('data-reviewed') == 'true') {
              $(this).append(tpl.mustacheView('my.song_template_trailer'));
            } else {
              $(this).append(tpl.mustacheView('my.song_template_review_trailer'));
              $('span.add', this)
                .after(tpl.mustacheView('my.song_template_review_header'))
                .remove();
            }
          });
          // 				debug("parseResults: ",html);
          return html;
        };
        list.delegate('div.song .edit, div.song .review', 'click', function () {
          router.navigateTo(['my', 'review', $(this).closest('.song').attr('name')]);
          // 				window.location.hash = "#/my/review/"+encodeURIComponent($(this).closest('.song').attr('name'));
          return false;
        });
        bindControls(endpoint, topicdiv, section, parseResults);
        createInfiniteScroll(endpoint, topicdiv, section, parseResults);
      }
    };


    const sendInvite = function (topicdiv, email) {
      rest.user.invites.send(email, {
        load(err, data) {
          if (err) {
            topicdiv.find('article.invites').hide();
            topicdiv.find('article.notsent').fadeIn();
          } else {
            topicdiv.find('article.invites').hide();
            topicdiv.find('article.sent').fadeIn();
          }
        },
      });
    };

    var init_topic_invites = function (topicdiv, args) {
      rest.user.invites.count({
        load(err, count) {
          if (err) return;
          if (count) {
            topicdiv.html(tpl.mustacheView('my.invites.invites', { count, ttl: config.invites.ttl }));
            const button = $('button', topicdiv);
            const invalidLabel = $('span[name=invalidEmail]', topicdiv);
            $('input[name=email]', topicdiv).keyup(function () {
              //           debug("email reg testing ",$(this).val());
              if (toolbox.isValidEmailAddress($(this).val())) {
                if (invalidLabel.is(':visible')) invalidLabel.hide();
                if (button.not(':visible')) button.fadeIn();
              } else {
                if (invalidLabel.not(':visible')) invalidLabel.show();
                if (button.is(':visible')) button.hide();
              }
            });
            button.click(() => { sendInvite(topicdiv, $('input[name=email]', topicdiv).val()); });
          } else {
            topicdiv.html(tpl.mustacheView('my.invites.invites.none', { count, ttl: config.invites.ttl }));
          }
        },
      });
    };


    var init_topic_review = function (topicdiv, arg) {
      rest.user.review.list({
        load(err, songs) {
          if (err) {
            // mainerror_json_client("textStatus", 'review', null);
            return;
          }
          if (songs.length) {
            topicdiv.empty().append(tpl.mustacheView('review.list', { rows: songs }));
            $('ul > li', topicdiv).click(function () {
              // 			window.location.hash = "#/my/review/"+$(this).attr('arg');
              router.navigateTo(['my', 'review', $(this).attr('arg')]);
            });
          } else {
            topicdiv.empty().append(tpl.mustacheView('review.list.none', {}));
          }
        },
      });
    };

    const postSongReview = function (topicdiv, success, complete) {
      const songMetaArray = $('form', topicdiv).serializeArray();
      const formData = {};
      songMetaArray.forEach((meta) => {
        formData[meta.name] = meta.value;
      });
      const songMeta = {
        _id: formData._id,
        title: formData.title,
        artist: formData.artist,
        album: formData.album,
        tracknumber: formData.tracknumber,
        genre: formData.genre,
        date: formData.date,
      };
      rest.user.review.post(
        $('input[name=_id]', topicdiv).val(),
        songMeta,
        {
          load(err, data) {
            complete.call();
            if (err) {
              if (err == 412) {
                for (const k in data) {
                  $(`.form_error[name=${k}]`, topicdiv).html(data[k]).slideDown();
                }
                $('span.uploading', topicdiv).hide();
                $('button[name=remove]', topicdiv).show();
                $('button[name=review]', topicdiv).show();
                $('button[name=reviewNext]', topicdiv).show();
              } else {
                osd.send('info', 'Unable to record song...');
              }
            } else {
              success.call();
            }
          },
        },
      );
    };

    const init_songreview_imagesbox = function (topicdiv, song_id) {
      const dropbox = topicdiv.find('.uploadDropBox');
      dropbox.get(0).addEventListener('dragenter', dragenter, false);
      dropbox.get(0).addEventListener('dragleave', dragleave, false);
      dropbox.get(0).addEventListener('dragover', dragover, false);
      dropbox.get(0).addEventListener('drop', drop, false);

      function dragenter(e) {
        dropbox.addClass('hover');
        e.stopPropagation();
        e.preventDefault();
      }

      function dragover(e) {
        e.stopPropagation();
        e.preventDefault();
      }

      function dragleave(e) {
        dropbox.removeClass('hover');
      }

      function drop(e) {
        e.stopPropagation();
        e.preventDefault();
        dropbox.removeClass('hover');
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
      }


      const sendImageToServer = function (file, api, canvas, cb) {
        rest.song.uploadImage(song_id, file, file.name, file.size, {
          load(err, headers, body) {
            if (err || !body || !body.filename) {
              debug('image upload failed', err, body);
              osd.send('error', tpl.mustacheView('my.review.error.filetransfert'));
              canvas.remove();
              cb(false);
              return;
            }
            osd.send('info', tpl.mustacheView('my.review.success.filetransfert', { filename: file.name }));
            canvas.remove();
            dropbox.find('.images').append(
              tpl.mustacheView('my.image.widget', { url: imageUtils.getImageUrl(body.filename) }),
            );
            cb();
          },
          progress(e) {
            if (e.lengthComputable) {
              const percentage = Math.round((e.loaded * 100) / e.total);
              api.loadProgress(percentage);
            }
          },
          end(e) {
            api.loadProgress(100);
          },
        });
      };

      function readImage(file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          const canvas = $('<canvas />')
            .attr('width', `${config.img_size}px`)
            .attr('height', `${config.img_size}px`)
            .css({ width: config.img_size, height: config.img_size, border: '1px solid #7F7F7F' });
          var api = canvas.loadImage(e,
            {
              onReady() {
                debug('ready ! ');
                dropbox.find('.images').append(canvas);
                jobs.queue.push((cb) => {
                  sendImageToServer(file, api, canvas, cb);
                });
                jobs.run();
              },
              onSize(w, h) {
                debug('got onSize', w, h);
                const ratio = imageUtils.getImageRatio(w, h);
                if (ratio > 1.5) {
                  osd.send('error', `${file.name}: ${tpl.mustacheView('my.review.error.imagesize')}`);
                  canvas.remove();
                  return false;
                }
                return true;
              },
            });
        };
        reader.readAsDataURL(file);
      }

      var jobs = {
        running: 0,
        queue: [],
        run() {
          if (!this.queue.length) {
            return;
          }
          if (this.running) {
            return;
          }

          const next = this.queue.shift(); let
            that = this;
          this.running += 1;
          next(() => {
            that.running -= 1;
            that.run();
          });
        },
      };

      function handleFiles(files) {
        debug('handling file upload, nr of files: ', files.length);
        for (let i = 0; i < files.length; i++) {
          debug('reading ', i);
          const file = files[i];
          if (!imageUtils.isImage(file)) {
            continue;
          }
          readImage(file);
        }
      }
    };

    const init_reviewImage_remove = function (topicdiv, song_id) {
      topicdiv.delegate('img.remove', 'click', function () {
        const img = $(this);
        const filename = img.siblings().eq(0).attr('src').split('/')
          .pop();
        if (!filename || !filename.length) {
          return;
        }

        rest.song.removeImage(song_id, filename, {
          load(err, data) {
            if (err) { osd.send('error', `${err} ${resp}`); } else { img.closest('div.imageReview').remove(); }
          },
        });
      });
    };


    const deleteSong = function (id, then) {
      rest.song.remove(id, { load: then });
    };

    var init_topic_songreview = function (topicdiv, song_id) {
      topicdiv.html(tpl.mustacheView('loading'));
      rest.song.getForReview(song_id, {
        load(err, doc) {
          debug('init_topic_songreview: ', doc);
          if (err) {
            topicdiv.html(tpl.mustacheView('review.song.error', { id: song_id }));
            return;
          }
          const images = doc.images ? doc.images : [];
          doc.images = [];
          doc.download_link = `audio/download/${  doc._id}`;
          $.each(images, (k, v) => {
            doc.images.push(
              tpl.mustacheView('my.image.widget', { url: imageUtils.getImageUrl(v.filename) }),
            );
          });
          topicdiv.html(tpl.mustacheView('review.song', doc));
          init_songreview_imagesbox(topicdiv, song_id);
          init_reviewImage_remove(topicdiv, song_id);
          $('button[name=my]', topicdiv).click(() => {
            router.navigateTo(['my', 'review']);
          });
          $('button[name=upload]', topicdiv).click(() => {
            router.navigateTo(['upload']);
          });

          $('input[name=album]', topicdiv).permanentOvlay(
            rest.album.list,
            $('input[name=album]', topicdiv).parent().find('.overlay'),
            {
              autocss: true,
              varname: 'start',
              minlength: 1,
            },
          );

          $('input[name=artist]', topicdiv).permanentOvlay(
            rest.artist.list,
            $('input[name=artist]', topicdiv).parent().find('.overlay'),
            {
              autocss: true,
              varname: 'start',
              minlength: 1,
            },
          );

          $('input[name=genre]', topicdiv).permanentOvlay(
            rest.genre.list,
            $('input[name=genre]', topicdiv).parent().find('.overlay'),
            {
              autocss: true,
              varname: 'start',
              minlength: 1,
            },
          );

          $('button[name=remove]', topicdiv).click((e) => {
            topicdiv.find('div[name=form]').hide();
            topicdiv.find('div[name=delete]').show();
            return false;
          });

          topicdiv.find('button[name=cancelDelete]').click(() => {
            topicdiv.find('div[name=delete]').hide();
            topicdiv.find('div[name=form]').show();
            return false;
          });

          topicdiv.find('button[name=doDelete]').click(function () {
            $(this).attr('disabled', 'true');
            deleteSong(song_id, (err) => {
              topicdiv.find('div[name=delete]').hide();
              if (err) {
                topicdiv.find('div[name=deleteError]').show();
              } else {
                topicdiv.find('div[name=deleteSuccess]').show();
              }
            });
            return false;
          });


          $('button[name=review]', topicdiv).click(function () {
            // disappear
            $(this).hide();
            $('button[name=remove]', topicdiv).hide();
            $('button[name=reviewNext]', topicdiv).hide();
            $('span.uploading', topicdiv).show();
            $('.form_error', topicdiv).hide();

            const validate_interval = window.setInterval(() => {
              $('span.uploading', topicdiv).animate({ opacity: 0 }, 1500,
                function () { $(this).animate({ 'opacity': 1 }, 1500); },);
            }, 3100);

            postSongReview(topicdiv, () => {
              $('div[name=ok] span[name=artist]', topicdiv).html($('input[name=artist]', topicdiv).val());
              $('div[name=ok] span[name=title]', topicdiv).html($('input[name=title]', topicdiv).val());
              $('div[name=form]', topicdiv).slideUp(() => {
                $('div[name=ok]',topicdiv).slideDown();
              });
            }, () => {
              clearInterval(validate_interval);
            } );
            return false;
          });


          rest.user.review.list({
            load(err, rows) {
              if (err)	return;
              for (var index in rows) {
                if (rows[index]._id != song_id) {
                  debug('should show the alternative button');
                  $('button[name=reviewNext]', topicdiv).fadeIn(function () {
                    $(this).removeClass('hidden').click(function () {
                      $(this).hide();
                      $('button[name=review]', topicdiv).hide();
                      $('span.uploading', topicdiv).show();
                      $('.form_error', topicdiv).hide();

                      let validate_interval = window.setInterval(() => {
                      $('span.uploading',topicdiv).animate ( { "opacity": 0 }, 1500,
                        function() { $(this).animate ( { "opacity": 1 }, 1500); }
                      );
                    }, 3100);

                      postSongReview(topicdiv, () => {
                      init_topic_songreview (topicdiv, rows[index]._id );
                    }, () => {
                      clearInterval(validate_interval);
                    });
                      return false;
                    });
                  });
                  return;
                }
                $('button[name=reviewNext]', topicdiv).addClass('hidden');
              }
            },
          });

          function ucwords(str) {
            // originally from :
            // discuss at: http://phpjs.org/functions/ucwords    // +   original by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
            // +   improved by: Waldo Malqui Silva
            // +   bugfixed by: Onno Marsman
            // +   improved by: Robin
            // +      input by: James (http://www.james-bell.co.uk/)    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
            // *     example 1: ucwords('kevin van  zonneveld');
            // *     returns 1: 'Kevin Van  Zonneveld'
            // *     example 2: ucwords('HELLO WORLD');
            // *     returns 2: 'HELLO WORLD'
            return (`${str }`).replace(/^([a-z])|[\s\[\(\.0-9-]+([a-z])/g, ($1) => $1.toUpperCase());
          }

          function sanitizeString(s) {
            return ucwords(s.replace(/^\s+/, '').replace(/\s+$/, '').replace(/</g, '').replace(/>/g, '')
              .toLowerCase());
          }

          topicdiv.find('input[name=title], input[name=artist]').bind('input', tokenize);
          const tokenContainer = topicdiv.find('[data-content=artists]');
          function tokenize() {
            const doc = {
              title: sanitizeString(topicdiv.find('input[name=title]').val()),
              artist: sanitizeString(topicdiv.find('input[name=artist]').val()),
            };
            const artists = artistTokenizer(doc, true);
            const tplData = {
              artists: artists[0] || [],
              title: artists[1] || '',
            };
            tokenContainer.html(tpl.mustacheView('review.tokens', tplData));
            tokenContainer.find('.summary').click(function () {
              const that = $(this);
              that.toggleClass('open');
              that.next().slideToggle();
            });
          }
          tokenize();
        },
      });
    };

    return {
      display,
    };
  }

  const
    my = new myCtrl($('#my'));


  const myRouteHandler = function (topic, id) {
    if (!topic) {
      if (this._containers.my.currentActive) {
        this._activate('main', 'my', this.switchMainContainer);
        return;
      }
      topic = 'songs';
    }

    my.display(topic, id);
    this._activate('main', 'my', this.switchMainContainer);
    if (topic) { this._activate('my', topic); }
  };
  router._containers.my =	{
    tab: $('#my > nav > ul'),
    container: $('#my'),
    select(name) { return this.container.children(`div[name=${  name  }]`); },
    lastActive: null,
    currentActive: null,
  };
  router.route('my', 'my', myRouteHandler);
  router.route('my/likes', 'my', function () { myRouteHandler.call(this, 'likes'); });
  router.route('my/songs', 'my', function () { myRouteHandler.call(this, 'songs'); });
  router.route('my/invites', 'my', function () { myRouteHandler.call(this, 'invites'); });
  router.route('my/review', 'my', function () { myRouteHandler.call(this, 'review'); });
  router.route('my/review/:id', 'my', function (id) { myRouteHandler.call(this, 'review', id); });
  router._containers.my.tab.delegate('[action]', 'click', function () {
    const elem = $(this); const
      action = elem.attr('action');
    if (!elem.hasClass('active')) { router.navigate(`my/${action}`, true); }
  });
});
