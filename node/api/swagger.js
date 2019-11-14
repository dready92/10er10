/**
 * @swagger
 * components:
 *   schemas:
 *     Artist:
 *       type: object
 *       required:
 *         - _id
 *         - count
 *         - duration
 *         - hits
 *         - genres
 *       properties:
 *         _id:
 *           type: string
 *           description: Artist name
 *           example: "The Rolling Stones"
 *         count:
 *           type: integer
 *           description: Number of songs of this artist
 *           example: 14
 *         duration:
 *           type: integer
 *           description: Length of all the songs of the artist, in seconds
 *           example: 3711
 *         hits:
 *           type: integer
 *           description: number of hits of all the songs of the artist
 *           example: 1146
 *         genres:
 *           type: array
 *           items:
 *             type: string
 *           example: ['Rock', 'Blues']
 *           description: disctinct genres of songs of the artist
 *         songs:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Song'
 *           description: the songs of the artist
 *     Album:
 *       type: object
 *       required:
 *         - _id
 *         - count
 *         - duration
 *         - hits
 *         - genres
 *         - creation_ts
 *       properties:
 *         _id:
 *           type: string
 *           description: Album title
 *           example: "Sticky Fingers"
 *         count:
 *           type: integer
 *           description: Number of songs in this album
 *           example: 14
 *         creation_ts:
 *           type: integer
 *           description: Unix timestamp on when the song has been uploaded to the server
 *           example: 1245566701
 *         duration:
 *           type: integer
 *           description: Length of all the songs of the album, in seconds
 *           example: 3711
 *         hits:
 *           type: integer
 *           description: number of hits of all the songs of the album
 *           example: 1146
 *         genres:
 *           type: array
 *           items:
 *             type: string
 *           example: ['Rock', 'Blues']
 *           description: disctinct genres of songs in the album
 *         songs:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Song'
 *           description: the songs in the album
 *     Song:
 *       type: object
 *       required:
 *         - _id
 *         - artist
 *         - duration
 *         - genre
 *         - hits
 *         - sha1
 *         - title
 *         - tokenartists
 *         - tokentitle
 *         - tracknumber
 *         - ts_creation
 *         - user
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the song
 *           example: aa38ie0l02u5pq4e11vbpuj
 *         album:
 *           type: string
 *           description: Name of the album the song belongs to.
 *           example: "Nova Tunes 2.2"
 *         artist:
 *           type: string
 *           description: Name of the artist(s), raw. See also tokenartists property
 *           example: "Breakbot"
 *         date:
 *           type: integer
 *           description: the date where the song has been recorded (in studio)
 *           example: 2010
 *         duration:
 *           type: integer
 *           description: length of the song in seconds
 *           example: 289
 *         filename:
 *           type: string
 *           description: name of the file that has been uploaded to the server
 *           example: "13-breakbot_ft_irfane-baby_im_yours.mp3"
 *         genre:
 *           type: string
 *           description: song's genre
 *           example: "Funk"
 *         hits:
 *           type: integer
 *           description: number of times this song has been listened on the platform
 *           example: 45667
 *         images:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SongImage'
 *         sha1:
 *           type: string
 *           description: Sha1 of the original source file uploaded to the server. Used to make sure that one song is not uploaded more than one time in the system.
 *           example: "e85b609deae7953097a7dd50e99c589d4af11a14"
 *         sourcefile:
 *           type: object
 *           description: 10er10 converts all files in ogg. When the source file is in mp3 format, this file is kept on the server too, and can be used to stream.  This file will be the one with the higher quality.
 *           properties:
 *             type:
 *               type: string
 *               description: Mime type of the source file
 *               example: "audio/mpeg"
 *             extension:
 *               type: string
 *               description: extension of the source file (most likely .mp3)
 *               example: ".mp3"
 *         title:
 *           type: string
 *           description: Song's title, raw. See also the tokentitle property
 *           example:  "Baby I'm Yours (Feat. Irfane)"
 *         tokenartists:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of artists in this song, guessed using the powerfull built-in title/artist tokenizer
 *           example: ["Breakbot", "Irfane"]
 *         tokentitle:
 *           type: string
 *           description: Song's title, guessed using the powerfull built-in title/artist tokenizer
 *           example: "Baby I'm Yours"
 *         tracknumber:
 *           type: integer
 *           default: 0
 *           description: position of the track in the album
 *           example: 13
 *         ts_creation:
 *           type: integer
 *           description: timestamp of when the song has been uploaded on the server
 *           example: 1289764649722
 *         user:
 *           type: string
 *           description: identifier of the user who uploaded the song
 *           example: us59265490266789
 *         valid:
 *           type: boolean
 *           description: whether this song has all fields considered as valid after the sanitizer passed. This field should always be true.
 *           example: true
 *     SongImage:
 *       type: object
 *       properties:
 *         filename:
 *           type: string
 *           description: the name of the image as recorded on the server.
 *           example: abja7a2vrkhpo2ep2j8c.jpg
 *         sha1:
 *           type: string
 *           description: the sha1 of the image object
 *           example: "24906aa8d6212f9e787020d45229c3d90aae0f3a"
 *         alternatives:
 *           type: object
 *           additionalProperties: true
 *           description: the key of the alternatives object is a string:the size in pixel of the longest side of the image. The value is an object containing    he properties width and length, that gives respectively the width and length of the image, in pixels
 *           example:
 *             "200": {width: 200, height: 198}
 *             "250": {width: 245, height: 250}
 *           properties:
 *             width:
 *               type: integer
 *               description: width of the image in pixels
 *               example: 200
 *             height:
 *               type: integer
 *               description: height of the image in pixels
 *               example: 198
 *     StatRecord:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: the grouping key, with the form "year-month-day-genre" (depending on the stat query). Examples; 2018-07 2018-07-Rock
 *           example: 2018-04-01-Classical
 *         count:
 *           type: number
 *           description: the number of songs listened on that period of time
 *           example: 34
 *     DenormalizationTask:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: unique id for the currently running task
 *           example: ae2342uh8e5g67
 *         count:
 *           type: integer
 *           description: total number of operations to run
 *           example: 18035
 *         done:
 *           type: integer
 *           description: total number of operations completed
 *           example: 9855
 *         errors:
 *           type: integer
 *           description: total number of operations that failed
 *           example: 34
 *
 */

/**
* @swagger
* tags:
*  - name: admins
*    description: Secured Admin-only calls
*  - name: users
*    description: Operations available to regular users
*/
