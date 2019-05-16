/* eslint-disable prefer-arrow-callback */
/* eslint-disable func-names */

/// <reference types="Cypress" />

const url = 'http://localhost:8888';

describe('Login test', function () {
  it('should fail with a wrong user/pass', function () {
    cy.visit(url);

    cy.get('input[name=username]')
      .type('user1');
    cy.get('input[name=password]')
      .type('invalid');
    cy.get('input[type=submit]')
      .click();
    cy.get('body').contains('Please login');
  });
  it('should work with a correct user/pass', function () {
    cy.visit(url);

    cy.get('input[name=username]')
      .type('user1');
    cy.get('input[name=password]')
      .type('test');
    cy.get('input[type=submit]')
      .click();
    cy.get('body').contains('Logged as user1');
  });
});
