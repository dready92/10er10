/**
 * @swagger
 * definitions:
 *   SourceFile:
 *     type: object
 *     required:
 *       - type
 *       - extension
 *     properties:
 *       type:
 *         type: string
 *       extension:
 *         type: string
 * 
 * 
 *   Song:
 *     type: object
 *     required:
 *       - _id
 *       - _rev
 *       - artist
 *       - duration
 *       - genre
 *       - title
 *       - ts_creation
 *       - user
 *     properties:
 *       _id:
 *         type: string
 *       _rev:
 *         type: string
 *       album:
 *         type: string
 *       artist:
 *         type: string
 *       date:
 *         type: integer
 *       duration:
 *         type: integer
 *       filename:
 *         type: string
 *       genre:
 *         type: string
 *       hits:
 *         type: integer
 *       reviewed:
 *         type: boolean
 *       sha1:
 *         type: string
 *       sourceFile:
 *         $ref: '#/definitions/SourceFile'
 *       title:
 *         type: string
 *       tracknumber:
 *         type: integer
 *       ts_creation:
 *         type: integer
 *       user:
 *         type: string
 *       valid:
 *         type: boolean
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 */

