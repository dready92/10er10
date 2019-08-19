/* global describe beforeEach cy it expect */
/* eslint-disable prefer-arrow-callback,func-names,prefer-destructuring */

const url = 'http://localhost:8888';

describe('Song API', function () {
  beforeEach(function () {
    cy.request('POST', `${url}/api/session`, { username: 'user1', password: 'test' }).then((resp) => {
      expect(resp.status).to.eq(200);
    });
  });

  describe('/api/song/aa:id endpoint', function () {

    const songId = 'aa1a749voc8nq37p8sqehd0824l2e192pra';
    const nonExistingSongId = 'aa404';

    it('should find a song by its id', function () {
      cy.request({
        url: `${url}/api/song/${songId}`,
        method: 'GET',
        failOnStatusCode: false,
      }).then((resp) => {
        const body = resp.body;
        expect(body.tokentitle).to.equal('Navidub');
        expect(body.tokenartists).to.deep.equal(['The Dubbstyle']);
      });
    });

    it('should send 404 when the song is not found', function () {
      cy.request({
        url: `${url}/api/song/${nonExistingSongId}`,
        method: 'GET',
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(404);
      });
    });
  });
});
