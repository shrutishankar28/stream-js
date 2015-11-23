var stream = require('../src/getstream'),
    exports = module.exports,
    jwt = require('jsonwebtoken'),
    qc = require('quickcheck'),
    signing = require('../src/lib/signing');

var feedMeta = {
  user1: {
    slug: 'user',
    id: '11',
    token: 'YHEtoaiaB03gBR9px6vX4HCRVKk',
  },

  aggregated2: {
    slug: 'aggregated',
    id: '22',
    token: 'HxAmzOcePOz0vAIpyEolPl5NEfA',
  },

  aggregated3: {
    slug: 'aggregated',
    id: '33',
    token: 'YxCkg56vpnabvHPNLCHK7Se36FY',
  },

  flat3: {
    slug: 'flat',
    id: '33',
    token: 'MqPLN1eA_7l5iYrJ8zMyImkY8V0',
  },

  secret3: {
    slug: 'secret',
    id: '33',
    token: 'fo8mzeoxsa1if2te5KWJtOF-cZw',
  },

  notification3: {
    slug: 'notification',
    id: '33',
    token: 'h2YC_zy7fcHQUAJc5kNhZaH9Kp0',
  },

  user1ReadOnly: {
    slug: 'user',
    id: '11',
    token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJmZWVkX2lkIjoidXNlcjExIiwicmVzb3VyY2UiOiIqIiwiYWN0aW9uIjoicmVhZCIsImlhdCI6MTQzMzkzODYyMX0.8FAc6ja0Gb2IBZjBIJ7NnsbtMHpGtDpreej-z84NPOQ',
  },
};

exports.createClient = function(inNode, localRun) {
  var args = ['ahj2ndz7gsan'];

  if (inNode) {
    args.push('gthc2t9gh7pzq52f6cky8w4r4up9dr6rju9w3fjgmkv6cdvvav2ufe5fv7e2r9qy', 519, {'group': 'browserTestCycle', 'location': 'eu-west'});
  } else {
    args.push(null, 519, {'group': 'browserTestCycle', 'location': 'eu-west'});
  }

  var client = stream.connect.apply(stream, args);

  if (localRun) {
    client.baseUrl = 'http://localhost:8000/api/';
    client.fayeUrl = 'http://localhost:9999/faye/';
  }

  return client;
};

exports.createFeeds = function(client) {
  var feeds = {};

  for (var key in feedMeta) {
    var feed = feedMeta[key];
    feeds[key] = client.feed(feed.slug, feed.id, feed.token);
  }

  return feeds;
};

var propertyHeaderJSON = exports.propertyHeaderJSON = function propertyHeaderJSON(jwt) {
  var json = signing.isJWTSignature(jwt);
  return json !== undefined;
};

var arbJSON = exports.arbJSON = function arbJSON(depth) {
  var width = Math.floor(Math.random() * (10 - 1) + 1);

  var result = {};

  while(width--) {
    var value = qc.arbString(),
        maxDepth = Math.floor(Math.random() * (3 - 1) + 1);

    if(depth) {
      value = arbJSON(depth-1);
    } else if(depth === undefined) {
      value = arbJSON(maxDepth);
    }

    result[ qc.arbString() ] = value;
  }

  return result;
};

var arbNonEmptyString = exports.arbNonEmptyString = function arbNonEmptyString() {
  var str = qc.arbString();

  return str === '' ? arbNonEmptyString() : str;
};

var arbJWT = exports.arbJWT = function arbJWT() {
  return jwt.sign( arbJSON(), arbNonEmptyString(), arbJSON() );
};
