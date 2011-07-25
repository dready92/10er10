Invites system configuration
============================

10er10 allows you to send invites by email. The flow is :

* From the 10er10 interface, you type the email you want to send the invite to.
* The invited person receive an email, with a link to your 10er10 server.
* He follows the link and can create his account
* He finally can login on your 10er10 server using the account he just created.

The mail is sent using the sendmail executable : be sure that **sendmail** is available in the path of the user running the 10er10 node server.

Invites implementation
======================

10er10 uses a dedicated virtualhost to host the invites server. Let's say your 10er10 server is reachable through :

**http://10er10.mydomain.com/**

You'll have to create a new DNS entry on your DNS server for a new virtualhost, for example :

**http://invites.10er10.mydomain.com/**

Application configuration
=========================

You'll have to tweak some values in the configuration file (node/config.js):


* **exports.emailSender** : the email address that will appear as the emitter of the invite email
* **exports.emailSenderLabel** : The name of the sender of the invite email
* **exports.invites.ttl** : the duration (in days) the invite will be valid
* **exports.invites.domain** : the VirtualHost dedicated to invites
* **exports.invites.websiteUrl** : the URL of the main 10er10 website (will appear at the end of the account creation)
* **exports.invites.subject** : the subject of the invite email
* **exports.invites.message** : the body of the invite email. The special tag {{>url}} will be replaced by the url the can access to create his account.

Example configuration :

    exports.emailSender = "someone@10er10.mydomain.com";
    exports.emailSenderLabel = "SomeOne nice";
    exports.invites = {
    	ttl:7 ,
    	domain: "invites.10er10.mydomain.com",
    	url: "http://invites.10er10.mydomain.com/code/in{{id}}",
    	websiteUrl: "http://10er10.mydomain.com/",
    	subject: "Register to my 10er10 website !",
    	message: "Hello, you can register to my 10er10 website by going here : {{>url}}"
    }

Updating an account so it can send invites
==========================================

By default, a 10er10 account can't send invites. To allow it to send invites, use the addInvites.js script located in node/admin. For example, to allow the login "beudbeud" to send 20 invites on the production server, use :

    cd node/admin
    node d10-addInvites.js beudbeud 20 -p

To do the same on the development server, use :

    cd node/admin
    node d10-addInvites.js beudbeud 20

Unfortunately, the change won't be immediately reflected on the web: this is due to the cache of session data in the node server. If you want the invites to appear, restart the node server, or wait at most 30 minutes.
On the 10er10 web interface, beudbeud can then go in "Personnal Space", and then in the "Invites" tab. for a login that did not have the "Invite" tab, the tab won't appear dynamically, the user should reload the web page.

