/* global describe beforeEach cy it expect */
/* eslint-disable prefer-arrow-callback,func-names,prefer-destructuring */

const url = 'http://localhost:8888';

describe('Genres API', function () {
  beforeEach(function () {
    cy.request('POST', `${url}/api/session`, { username: 'user1', password: 'test' }).then((resp) => {
      expect(resp.status).to.eq(200);
    });
  });

  describe('/api/genres/available endpoint', function () {

    it('should list the genres available, ordered alphabetically', function () {
      cy.request({
        url: `${url}/api/genres/available`,
        method: 'GET',
      }).then((resp) => {
        const body = resp.body;
        expect(body).to.be.an('array');
        const genres = body.map(element => element.key[0]);
        expect(genres).to.deep.equal(['Dub', 'Latin', 'Lo-Fi']);
      });
    });
  });
});
