/* global describe beforeEach cy it expect */
/* eslint-disable prefer-arrow-callback,func-names */

const url = 'http://localhost:8888';

describe('most recent songs list', function () {

  const songIds = [
    'aa2gaosrf11pk3re5q22ljil1u8sderqgq5',
    'aa143nvhqmr6h1371ra4g3q21621bissc9j',
    'aa1a749voc8nq37p8sqehd0824l2e192pra'
  ];

  beforeEach(function () {
    cy.request('POST', `${url}/api/session`, { username: 'user1', password: 'test' }).then((resp) => {
      expect(resp.status).to.eq(200);
    });
  });

  it('should return the list of most recent songs', function () {
    cy.visit(`${url}/#library/creations`);

    cy.get('#main div.list > .song')
      .should('have.length', 3)
      .each(($el, index) => {
        cy.wrap($el).invoke('attr', 'name').should('equal', songIds[index]);
      });
  });
});
