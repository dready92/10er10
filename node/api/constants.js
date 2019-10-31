module.exports = {
  LIMIT_DEFAULT: 20,
  LIMIT_MAX: 200,
  SORT_KEYS: {
    creation: 'ts_creation',
    title: '_id',
  },
  SONG_SORT_KEYS: {
    creation: 'ts_creation',
    title: 'tokentitle',
  },
  SORT_DIRECTIONS: {
    asc: 1,
    desc: -1,
  },
  SORT_DEFAULT: {
    KEY: 'ts_creation',
    DIRECTION: -1,
  },
};
