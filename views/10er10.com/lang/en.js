// in templates :
// ((website_title)) => escaped
// (({website_title})) => unescaped

exports.langName = "English";

exports.server = {
	"login.html": {
		title: "Login",
		form_label: "Please login",
		form_username: "Username",
		form_password: "Password",
		form_submit: "Go !"
	},
	"homepage.html": {
		website_title: "Welcome",
		website_loading_message: "Loading in progress<br><span class=\"count\"></span> / <span class=\"total\"></span>",
		err_browser_not_supported: "Your browser doesn't implement the latest and greatest HTML features. <BR> This website is known to work on <a href=\"http://getfirefox.com\">Mozilla Firefox</a> and <a href=\"http://www.google.com/chrome\">Google Chrome</a>. If you need more informations regarding web browsers, <a href=\"http://www.whatbrowser.org/\">click here</a>.",
		website_teaser: "Turn me on",
		search_placeholder: "Find...",
		search_label: "Search : ",
		search_teaser: "Search songs by title, artist...",
		upload_title: " Upload",
		upload_teaser: "Add songs to the catalog",
		my_title: " Personnal Space",
		my_teaser: "My  playlists, songs I uploaded, songs I like...",
		library_title: " Catalog",
		library_teaser: "Sorting by genre, popularity...",
		welcome_title: " Welcome",
		welcome_teaser: "The welcome screen",
		side_review_reminder: "You got <strong></strong> song(s) to review !",
		side_likes_tooltip: "<p>I like this song</p>This song will appear in <br>\"Personnal Space / Songs I like\"",
		side_tooltip_dislikes: "<p>I don't like this song</p>Tells the server you don't like this song.",
		side_previous_title: "Previous song",
		side_play_title: "Music ! Play the playlist songs",
		side_pause_title: "Pause the playback",
		side_next_title: "Next song",
		side_options_show: "More options...",
		side_options_radiomode_title: "Radio mode: add songs at the end of the playlist",
		side_options_radiomode_disabled: "<strong>Radio mode</strong>: off",
		side_options_radiomode_enable: "Enable radio mode",
		side_options_radiomode_enabled: "<strong>Radio</strong>: on",
		side_options_radiomode_options: "Radio mode options",
		side_radiomode_genre_selector_title: "Only add songs of following genres :",
		side_radiomode_close: "close window",
		side_radiomode_disable: "Disable radio mode",
		side_options_audiofade_title: "<strong>Fade</strong> between songs",
		side_options_audiofade_seconds: "second(s)",
		side_options_spectrum_title: "<strong>Spectrum</strong>",
		side_options_spectrum_enable: "enable",
		side_options_spectrum_disable: "disable",
		side_options_hide: "Hide options",
		side_playlistloader: "Loading last playlist...",
		side_playlist_empty: "Your playlist is empty.",
		side_playlist_fill: "Put songs !",
		side_playlist_empty_title: "Clear playlist",
		side_playlist_empty_button: "   Clear",
		side_playlist_load_title: "Load playlist",
		side_playlist_load_button: "    Load",
		side_playlist_record_title: "Record playlist",
		side_playlist_record_button: "    Record",
		side_playlistrecord_title: "Record as : ",
		side_playlistrecord_placeholder: "playlist name...",
		side_playlistrecord_button: " Record",
		side_playlistrecord_cancel: "oh no sorry",
		side_playlistrecord_playlist_name_exists: "a playlist with this name already exists... ",
		side_playlistrecord_playlist_name_exists_button: " Replace",
		website_logged_as: "Logged as",
		website_logout: "logout",
		website_total_playing_length: "hours of music",
		website_logging_out: "Logging out..."
	},
	"html/results/container.html": {
		artists_details_button: "Show details",
		artists: "Artists",
		albums_details_button: "Show details",
		albums: "Albums",
		songs_details_button: "Show details",
		songs: "Songs"
	},
	"html/library/container.html": {
		newest: "Newest",
		popular: "Popular",
		by_title: "By title",
		by_genre: "By genre",
		by_artist: "By artist",
		by_album: "By album"
	},
	"html/my/container.html": {
		to_review: "To review",
		my_songs: "My songs",
		my_playlists: "My playlists",
		my_favorite_songs: "Songs I like",
		my_invites: "Invites"
	},
	"html/upload/container.html": {
		box_label: "Drag'n'drop song files in this box",
		video_link: "How does it work ?",
		video_close: "Close"
	},
	"html/welcome/container.html": {
		listen_title: "Listen",
		listen_body: "songs available in the catalog",
		upload_title: "Add",
		upload_body: "your own songs in the catalog",
		playlists_title: "Create",
		playlists_body: "your playlists in your personnal space",
		search_title: "Search",
		search_body: "artists, song titles and albums",
		thats_new: "That's new !"
	},
	"html/welcome/wnWidget.album.html": {
		album_by: "by",
		album_songs: "{{songs}} song(s)",
		album_add_to_player: "Add songs to player queue"
	},
	"html/my/song_template_trailer.html": {
		edit: "edit"
	},
	"html/my/song_template_review_trailer.html": {
		review: "review"
	},
	"html/my/plm.html": {
		my_playlists_title: "My playlists",
		playlist_new_button: "New",
		playlist_new_label: "New playlist name :",
		playlist_create: "Create",
		playlist_cancel: "Cancel"
	},
	"html/my/plm_rpl.html": {
		playlist_empty: "This playlist is empty !",
		load_in_player: "Load playlist in the player",
		rename_button: "Rename",
		remove_button: "Remove",
		rename_playlist_label: "Rename playlist : ",
		cancel_button: "Oh no sorry",
		remove_playlist_label: "Warning, this playlist will be <strong>permanently</strong> removed. Are you really sure ?",
		remove_playlist_ok_button: "Yes",
		loading: "Loading playlist..."
	},
	"html/my/image.widget.html": {
		remove: "Remove this image"
	},
	"html/library/content_simple.html": {
		add_to_playlist: "Add all songs to the player queue",
		refresh: "Refresh list",
		no_song: "No song found",
		loading: "Loading...",
		extended_show_more: "Show more infos...",
		extended_show_less: "Hide infos...",
		extended_loading: "Loading...",
		select_visible: "Select only visible songs"
	},
	"html/library/content_genre.html": {
		back_to_list: "Back to genres listing",
		add_to_playlist: "Add all songs to the player queue",
		refresh: "Refresh list",
		no_song: "No song found",
		loading: "Loading...",
		extended_show_more: "Show more infos...",
		extended_show_less: "Hide infos...",
		extended_loading: "Loading...",
		select_visible: "Select only visible songs"

	},
	"html/library/content_none.html": {
		no_song: "No song"
	},
	"html/library/content_artist_related.html": {
		see_also: "See also"
	},
	"html/library/content_album_widget.html": {
		show_songs: "Show album songs",
		hide_songs: "Hide album songs"
	},
	"html/library/content_album_all_popover.html": {
		songs: "song(s)",
		artists: "Artists",
		genres: "Genres"
	},
	"html/library/control_genre.html": {
		loading: "Loading..."
	},
	"html/library/control_artist.html": {
		artist_placeholder: "Artist name...",
		all_artists: "All artists",
		loading: "Loading...",
		no_result: "No artist found"
	},
	"html/library/control_album.html": {
		album_placeholder: "Album name...",
		loading: "Loading...",
		no_result: "no album found",
		all_albums: "All albums by cover"
	},
	"html/library/control_title.html": {
		title_placeholder: "Song title...",
		loading: "Loading...",
		no_result: "No song found"
	},
	"html/library/listing_artist_line.html": {
		songs: "song(s)"
	},
	"html/library/listing_genre.html": {
		songs_link: "See the {{count}} songs"
	},
	"html/hoverbox/addsong.container.html": {
		add_to_header: "Add to",
		current_playlist: "player queue",
		playlist_header: "playlist",
		other_actions_header: "Other actions",
		song_edit: "Edit song metadata"
	},
	"html/hoverbox/playlist.container.html": {
		remove_all_previous_songs: "Remove previous songs",
		remove_all_next_songs: "Remove next songs",
		artist_songs: "This artist's songs...",
		album_songs: "This album...",
		song_download: "Download",
		song_edit: "Edit song metadata"
	},
	"html/hoverbox/playlist.rpl.container.html": {
		load: "Load..."
	},
	"html/upload/file.widget.html": {
		review_button: "Review this song",
		close_button: "Close",
		type_error: "File will not be uploaded. Supported audio files are mp3, ogg, flac and m4a.",
		waiting: "Waiting",
		cancel_link: "Don't send this song"
	},
	"html/pleaseWait.html": {
		loading: "Loading..."
	},
	"html/refresh.html": {
		refresh_list: "This listing is outdated. Click here to refresh."
	},
	"html/results/album.html": {
		open: "see songs",
		close: "hide songs",
		songs: "song(s)",
		minutes: "minute(s)",
		add_to_player: "Add to player queue",
		add_after_current_song: "Add next to the currently playing song",
		open_in_library: "View in library"
	},
	"html/results/artist.html": {
		open: "see songs",
		close: "hide songs",
		songs: "song(s)",
		minutes: "minute(s)",
		add_to_player: "Add to player queue",
		add_after_current_song: "Add next to the currently playing song",
		open_in_library: "View in library"
	},
	"html/review/song.html": {
		page_title: "Song metadata",
		reviewed: "Use this page to update the meta data of {{filename}}.",
		introduction: "It's really important to provide true meta data, as this will improve the usability and the relevance of the catalog.<BR>Most important fields are: the <strong>title</strong> of the song, the <strong>artist</strong>'s name, and the song <strong>genre</strong>.",
		review_file: "Review of the song : {{filename}}",
		title: "Song title",
		artist: "Artist",
		loading: "loading...",
		no_artist: "no known artist",
		album: "Album",
		no_album: "no known album",
		tracknumber: "track number",
		genre: "Genre",
		no_genre: "no matching genre",
		date: "Year",
		review_button: "Record",
		review_and_show_next_button: "Record & show the next song",
		validating: "Recording...",
		song_images: "Images related to this song (drag'n'drop images here)",
		list_button: "Back to the list of songs to review",
		reviewed_title: "Done !",
		reviewed_message: "The song <span name=\"artist\"></span> - <span name=\"title\"></span> is reviewed.",
		review_other_button: "Review other songs meta data",
		upload_button: "Go to the\"Upload\" part",
		delete_button: "Delete this song",
		delete_title: "Deleting song {{title}} (by {{artist}})",
		delete_message: "Warning ! You are about to delete the song <b>{{title}}</b>. This can't be reverted.",
		cancel_delete_button: "No thanks I keep this file",
		delete_message_followup: "Before deleting this song, you can <a href=\"{{download_link}}\">download it</a> on your local drive.",
		do_delete_button: "Delete this song",
		delete_success_message: "The song: <b>{{title}}</b> is deleted. For a maximal user experience, please reload this website page once you're finished deleting songs.",
		delete_error_message: "Aoww... this is an error. The song <b>{{title}}</b> perhaps could not have been deleted."
	},
	"html/review/song_error.html": {
		error_message: "This song can't be found."
	},
	"html/review/list.html": {
		title: "Songs to review",
		unknown_artist: "unknown artist",
		unknown_title: "unknown title"
	},
	"html/review/none.html": {
		message: "All your songs are reviewed. Go to the <a href=\"#upload\">Upload</a> page to put new songs on the server."
	},
	"review/song.html": {
		title: "Song metadata",
		reviewed: "Use this page to update the meta data of {{filename}}.",
		introduction: "It's really important to provide true meta data, as this will improve the usability and the relevance of the catalog.<BR>Most important fields are: the <strong>title</strong> of the song, the <strong>artist</strong>'s name, and the song <strong>genre</strong>.",
		review_file: "Review of the song : {{filename}}",
		song_title: "Song title",
		song_artist: "Artist",
		loading: "loading...",
		no_artist: "no known artist",
		song_album: "Album",
		no_album: "no known album",
		song_tracknumber: "track number",
		song_genre: "Genre",
		no_genre: "no matching genre",
		song_date: "Year",
		review_button: "Record",
		review_and_show_next_button: "Record & show the next song",
		validating: "Recording...",
		song_images: "Images related to this song (drag'n'drop images here)",
		list_button: "Back to the list of songs to review",
		reviewed_title: "Done !",
		reviewed_message: "The song <span name=\"artist\"></span> - <span name=\"title\"></span> is reviewed.",
		review_other_button: "Review other songs meta data",
		upload_button: "Go to the\"Upload\" part"
	},
	"html/my/invites_none.html": {
		no_invite: "You don't have any invite to send. Sorry"
	},
	"html/my/invites.html": {
		title: "Invites",
		resume: "You got <strong name=\"count\">{{count}}</strong> invites to bring 10er10 to your friends.",
		send_title: "Send an invite",
		send_description: " To send an invite, type your friend's email address below, and click \"send\". This application doesn't store email addresses, and the mail will sent sent immediately.",
		email_address: "Email address",
		email_invalid: "The email address is not valid",
		email_send: "Send",
		success_title: "Your invite has been sent...",
		success_description: "In {{ttl}} days, if your friend didn't register, the invite will be invalidated. ",
		error_title: "Your invite hasn't been sent...",
		error_description:" Oops, the server produced an error. Please try again in a moment."
	},

	inline: {
		review_err_no_title: "Song should have a title",
		review_err_no_artist: "Song should have an artist",
		review_err_unknown_genre: "Unknown genre"
		
	}
};

exports.client = {
	"landing.letsgo": "Let's go !",
	"my.review.error.imagesize": "Please choose some square image...",
	"my.review.error.filetransfert": "Unable to send file to the server",
	"my.review.success.filetransfert": "Image {{filename}} recorded",
	"osd.rpl.success.removed": "Playlist <b>{{name}}</b> removed.",
	"osd.rpl.success.created": "Playlist <b>{{name}}</b> created.",
	"osd.rpl.success.updated": "Playlist <b>{{name}}</b> updated.",
	"osd.rpl.success.renamed": "Playlist <b>{{name}}</b> renamed.",
	"playlist.anonymous.name": "anonymous playlist",
	"upload.song.uploading": "Sending song to the server",
	"upload.song.processing": "Processing song, please wait...",
	"upload.song.success": "Success",
	"upload.song.alreadyindb": "This song is already available",
	"upload.song.serverError": "Server failure... Please retry",
	"library.extendedInfos.artist.albums": "This artist albums",
	"library.extendedInfos.artist.artists": "Artists you might like",
	"library.extendedInfos.genre.artists": "Artists",
	"library.extendedInfos.genre.albums": "Albums",
	"library.extendedInfos.artist.genres": "Genres",
	"library.extendedInfos.album.artists": "Artists",
	"library.scope.toggle.full": "Show full catalog",
	"library.scope.toggle.user": "Only show my own songs"
};