/* global describe beforeEach cy it expect */
/* eslint-disable prefer-arrow-callback,func-names */

const url = 'http://localhost:8888';

describe('most recent songs list', function () {
  beforeEach(function () {
    cy.request('POST', `${url}/api/session`, { username: 'user1', password: 'test' }).then((resp) => {
      expect(resp.status).to.eq(200);
    });
  });

  it('should fail with a wrong user/pass', function () {
    cy.visit(`${url}/#library/creations`);

    cy.get('#main div.list > .song')
      .should('have.length', 1)
      .first()
      .invoke('attr', 'name')
      .should('equal', 'aa1a749voc8nq37p8sqehd0824l2e192pra');
  });
});
