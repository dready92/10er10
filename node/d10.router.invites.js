const bodyParser = require('body-parser');

const jsonParserMiddleware = bodyParser.json();
const nodemailer = require('nodemailer');
const d10 = require('./d10');

exports.api = function api(app) {
  app.get('/api/invites/count', (request) => {
    if (request.ctx.user.invites) {
      d10.realrest.success(request.ctx.user.invites, request.ctx);
    } else {
      d10.realrest.success(0, request.ctx);
    }
  });

  function isValidEmailAddress(emailAddress) {
    // eslint-disable-next-line no-control-regex,no-useless-escape
    return /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/.test(emailAddress);
  }

  function reallySendMail(email, body, then) {
    const mailTransport = nodemailer
      .createTransport(d10.config.emailTransport.type, d10.config.emailTransport.options);
    mailTransport.sendMail({
      from: `${d10.config.emailSenderLabel} <${d10.config.emailSender}>`,
      to: email,
      subject: d10.config.invites.subject,
      text: body,
    }, (err, resp) => {
      then(err, resp);
    });
  }


  function sendInviteMail(email, invite, then) {
    const body = d10.mustache.to_html(d10.config.invites.message, {
      ttl: d10.config.invites.ttl,
    }, {
      url: d10.mustache.to_html(d10.config.invites.url, { id: invite._id.replace(/^in/, '') }),
    });
    reallySendMail(email, body, then);
  }

  // eslint-disable-next-line consistent-return
  app.post('/api/sendInvite', jsonParserMiddleware, (request) => {
    // should have email...?
    if (!request.ctx.user.invites) {
      return d10.realrest.err(431, { invites: request.ctx.user.invites }, request.ctx);
    }
    if (!request.body || !request.body.email || !request.body.email.length) {
      return d10.realrest.err(427, 'missing parameter: email', request.ctx);
    }
    if (!isValidEmailAddress(request.body.email)) {
      return d10.realrest.err(434, {}, request.ctx);
    }

    // create invite
    const iid = d10.uid();
    const invite = {
      _id: `in${iid}`,
      from: request.ctx.user._id,
      creation_time: new Date().getTime(),
    };

    // eslint-disable-next-line consistent-return
    d10.mcol(d10.COLLECTIONS.INVITES).insertOne(invite)
      .catch((err) => {
        // eslint-disable-next-line no-param-reassign
        err.code = 423;
        throw err;
      })
      .then(() => new Promise((resolve, reject) => {
        sendInviteMail(request.body.email, invite, (err) => {
          if (err) {
            // eslint-disable-next-line no-param-reassign
            err.code = 435;
            reject(err);
          }
          resolve();
          return d10.realrest.success([], request.ctx);
        });
      }))
      .then(() => d10.mcol(d10.COLLECTIONS.USERS).updateOne(
        { _id: request.ctx.user._id },
        { $inc: { invites: -1 } },
      ))
      .catch(err => d10.realrest.err(err.code || 500, err, request.ctx));
  });
};
