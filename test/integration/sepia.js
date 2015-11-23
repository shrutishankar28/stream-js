var /*sepia = require('sepia'),*/
    expect = require('expect.js'),
    stream = require('../../src/getstream'),
    shared = require('../shared'),
    util = require('../shared'),
    isNodeEnv = typeof window === 'undefined',
    errors = stream.errors;

/*sepia.configure({
  verbose: true,
  debug: true,
});*/

describe('Stream Client', function() {
  this.timeout(4000);

  var self = this;
  var client, feeds;

  beforeEach(function before() {
    client = shared.createClient(isNodeEnv, self.runLocal);
    feeds  = shared.createFeeds(client);
  });

  it('handlers', function(done) {
    var called = {};
    called.request = 0;
    called.response = 0;
    function callback() {
      called.request += 1;
    }

    function responseCallback() {
      called.response += 1;
    }

    client.on('request', callback);
    client.on('response', responseCallback);

    function third() {
      expect(called.request).to.eql(1);
      expect(called.response).to.eql(1);
      done();
    }

    function second() {
      client.off();
      feeds.user1.get({'limit': 1}, third);
    }

    feeds.user1.get({'limit': 1}, second);
  });

  it('get', function(done) {
    feeds.user1.get({'limit': 1}, function(error, response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body['results'][0]['id']).to.be.a('string');
      var userAgent = response.request.headers['X-Stream-Client'];
      expect(userAgent.indexOf('stream-javascript-client')).to.eql(0);
      done();
    });
  });

  it('add activity', function(done) {
    var activity = {'actor': 'test-various:characters', 'verb': 'add', 'object': 1, 'tweet': 'hello world'};
    function get(error, response, body) {
      var activityId = body['id'];
      feeds.user1.get({'limit': 1}, function(error, response, body) {
        expect(response.statusCode).to.eql(200);
        expect(body['results'][0]['id']).to.eql(activityId);
        done();
      });
    }

    feeds.user1.addActivity(activity, get);
  });

  it('add complex activity', function(done) {
    var activity = {'actor': 1, 'verb': 'add', 'object': 1};
    activity['participants'] = ['Thierry', 'Tommaso'];
    activity['route'] = {'name': 'Vondelpark', 'distance': '20'};
    var currentDate = new Date();
    activity['date'] = currentDate;
    var isoDate = currentDate.toISOString();
    function get(error, response, body) {
      var activityId = body['id'];
      feeds.user1.get({'limit': 1}, function(error, response, body) {
        expect(response.statusCode).to.eql(200);
        expect(body['results'][0]['id']).to.eql(activityId);
        expect(body['results'][0]['participants']).to.eql(['Thierry', 'Tommaso']);
        expect(body['results'][0]['route']).to.eql({'name': 'Vondelpark', 'distance': '20'});
        expect(body['results'][0]['date']).to.eql(isoDate);
        done();
      });
    }

    feeds.user1.addActivity(activity, get);
  });

  it('add activity using to', function(done) {
    var activity = {'actor': 1, 'verb': 'add', 'object': 1};
    activity['participants'] = ['Thierry', 'Tommaso'];
    activity['route'] = {'name': 'Vondelpark', 'distance': '20'};
    activity['to'] = ['flat:33', 'user:everyone'];
    //flat3
    if (!isNodeEnv) activity['to'] = ['flat:33' + ' ' + feeds.flat3.token];

    function get(error, response, body) {
      var activityId = body['id'];
      expect(error).to.eql(null);
      expect(body.exception).to.eql(undefined);
      feeds.flat3.get({'limit': 1}, function(error, response, body) {
        expect(response.statusCode).to.eql(200);
        expect(body['results'][0]['id']).to.eql(activityId);
        done();
      });
    }

    feeds.user1.addActivity(activity, get);
  });

  it('add activity no callback', function(done) {
    var activity = {'actor': 1, 'verb': 'add', 'object': 1};
    feeds.user1.addActivity(activity);
    done();
  });

  it('remove activity', function(done) {
    var activity = {'actor': 1, 'verb': 'add', 'object': 1};
    function remove(error, response, body) {
      var activityId = body['id'];
      expect(response.statusCode).to.eql(201);
      feeds.user1.removeActivity(activityId, function(error, response, body) {
        expect(response.statusCode).to.eql(200);
        done();
      });
    }

    feeds.user1.addActivity(activity, remove);
  });

  it('remove activity foreign id', function(done) {
    var activity = {'actor': 1, 'verb': 'add', 'object': 1, 'foreign_id': 'add:1'};
    var now = new Date();
    activity.time = now.toISOString();
    function remove(error, response, body) {
      var activityId = body['id'];
      expect(response.statusCode).to.eql(201);
      feeds.user1.removeActivity({foreignId: 'add:1'}, function(error, response, body) {
        expect(response.statusCode).to.eql(200);
        user1.get({limit:10}, function(error, response, body) {
          expect(response.statusCode).to.eql(200);
          expect(body['results'][0]['id']).not.to.eql(activityId);
          expect(body['results'][0]['foreign_id']).not.to.eql('add:1');
          done();
        });
      });
    }

    feeds.user1.addActivity(activity, remove);
  });

  it('add activities', function(done) {
    var activities = [
      {'actor': 1, 'verb': 'tweet', 'object': 1},
      {'actor': 2, 'verb': 'tweet', 'object': 3},
    ];
    function get(error, response, body) {
      var activityIdFirst = body['activities'][0]['id'];
      var activityIdLast = body['activities'][1]['id'];
      feeds.user1.get({'limit': 2}, function(error, response, body) {
        expect(response.statusCode).to.eql(200);
        expect(body['results'][0]['id']).to.eql(activityIdLast);
        expect(body['results'][1]['id']).to.eql(activityIdFirst);
        done();
      });
    }

    feeds.user1.addActivities(activities, get);
  });

  it('follow', function(done) {
    var activityId = null;
    this.timeout(9000);
    function add() {
      var activity = {'actor': 1, 'verb': 'add', 'object': 1};
      feeds.user1.addActivity(activity, follow);
    }

    function follow(error, response, body) {
      activityId = body['id'];
      feeds.aggregated2.follow('user', '11', runCheck);
    }

    function runCheck(error, response, body) {
      function check() {
          aggregated2.get({'limit': 1}, function(error, response, body) {
            expect(response.statusCode).to.eql(200);
            expect(body['results'][0]['activities'][0]['id']).to.eql(activityId);
            done();
          });
        }

      setTimeout(check, READ_TIMEOUT);
    }

    add();
  });

  it('follow without callback', function() {
    feeds.aggregated2.follow('user', '111');
  });

  it('follow with copy limit', function(done) {
    feeds.aggregated2.follow('user', '999', { limit: 500 }, function(error, response, body) {
      if (error) done(error);
      expect(response.statusCode).to.be(201);
      done();
    });
  });

  it('unfollow', function(done) {
    this.timeout(6000);
    var activityId = null;
    function add() {
      var activity = {'actor': 1, 'verb': 'add', 'object': 1};
      feeds.user1.addActivity(activity, follow);
    }

    function follow(error, response, body) {
      activityId = body['id'];
      feeds.aggregated2.follow('user', '11', unfollow);
    }

    function unfollow(error, response, body) {
      feeds.aggregated2.unfollow('user', '11', check);
    }

    function check(error, response, body) {
      setTimeout(function() {
        feeds.aggregated2.get({'limit': 1}, function(error, response, body) {
          expect(response.statusCode).to.eql(200);
          var firstResult = body['results'][0];
          var activityFound = (firstResult) ? firstResult['activities'][0]['id'] : null;
          expect(activityFound).to.not.eql(activityId);
          done();
        });
      }, READ_TIMEOUT);
    }

    add();
  });

  it('list followers', function(done) {
    function callback(error, response, body) {
      expect(error).to.eql(null);
      expect(body.exception).to.eql(undefined);
      done();
    };

    feeds.user1.followers({limit: '10', offset: '10'}, callback);
  });

  it('list following', function(done) {
    function callback(error, response, body) {
      expect(error).to.eql(null);
      expect(body.exception).to.eql(undefined);
      done();
    };

    feeds.user1.following({limit: '10', offset: '10'}, callback);
  });

  it('do i follow', function(done) {
    function doifollow() {
      feeds.user1.following({'filter': ['flat:33', 'flat:44']}, callback);
    }

    function callback(error, response, body) {
      expect(error).to.eql(null);
      expect(body.exception).to.eql(undefined);
      var results = body.results;
      expect(results.length).to.eql(1);
      expect(results[0]['target_id']).to.eql('flat:33');
      done();
    }

    feeds.user1.follow('flat', '33', doifollow);
  });

  it('get read-only feed', function(done) {
    function check(error, response, body) {
      expect(response.statusCode).to.eql(200);
      done();
    }

    feeds.user1ReadOnly.get({'limit': 2}, check);
  });

  it('get filtering', function(done) {
    // first add three activities
    //TODO find a library to make async testing easier on the eye

    var activityIdOne = null;
    var activityIdTwo = null;
    var activityIdThree = null;

    function add() {
      var activity = {'actor': 1, 'verb': 'add', 'object': 1};
      feeds.user1.addActivity(activity, add2);
    }

    function add2(error, response, body) {
      activityIdOne = body['id'];
      var activity = {'actor': 2, 'verb': 'watch', 'object': 2};
      feeds.user1.addActivity(activity, add3);
    }

    function add3(error, response, body) {
      activityIdTwo = body['id'];
      var activity = {'actor': 3, 'verb': 'run', 'object': 2};
      feeds.user1.addActivity(activity, function(error, response, body) {
        // testing eventual consistency is not easy :)
        function getBound() {
          get(error, response, body);
        }

        setTimeout(getBound, 200);
      });
    }

    function get(error, response, body) {
      activityIdThree = body['id'];
      feeds.user1.get({'limit': 2}, check);
    }

    // no filtering
    function check(error, response, body) {
      expect(body['results'].length).to.eql(2);
      expect(body['results'][0]['id']).to.eql(activityIdThree);
      expect(body['results'][1]['id']).to.eql(activityIdTwo);
      feeds.user1.get({limit:2, offset:1}, check2);
    }

    // offset based
    function check2(error, response, body) {
      expect(body['results'].length).to.eql(2);
      expect(body['results'][0]['id']).to.eql(activityIdTwo);
      expect(body['results'][1]['id']).to.eql(activityIdOne);
      feeds.user1.get({limit:2, 'id_lt':activityIdTwo}, check3);
    }

    // try id_lt based
    function check3(error, response, body) {
      expect(body['results'].length).to.eql(2);
      expect(body['results'][0]['id']).to.eql(activityIdOne);
      done();
    }

    add();

  });

  it('mark read and seen', function(done) {
    // add 2 activities to ensure we have new data
    var params = {limit: 2};
    var activities = [
      {'actor': 1, 'verb': 'add', 'object': 1},
      {'actor': 2, 'verb': 'test', 'object': 2},
    ];
    feeds.notification3.addActivities(activities, getNotifications);
    // lookup the notification ids
    function getNotifications(error, response, body) {
      feeds.notification3.get(params, markRead);
    };
    // mark all seen and the first read
    function markRead(error, response, body) {
      var notificationId = body['results'][0]['id'];
      var params = {limit:2, 'mark_seen':true, 'mark_read': notificationId};
      feeds.notification3.get(params, readFeed);
    }
    // read the feed (should be seen and 1 unread)
    function readFeed(error, response, body) {
      feeds.notification3.get(params, verifyState);
    };
    // verify the seen and 1 unread
    function verifyState(error, response, body) {
      expect(body['results'][0]['is_seen']).to.eql(true);
      expect(body['results'][1]['is_seen']).to.eql(true);
      expect(body['results'][0]['is_read']).to.eql(true);
      expect(body['results'][1]['is_read']).to.eql(false);
      expect(body['unread']).to.be.greaterThan(1);
      expect(body['unseen']).to.eql(0);
      done();
    };

  });

  it('fayeGetClient', function(done) {
    var client = feeds.user1.getFayeClient();
    done();
  });

  it('fayeSubscribe', function(done) {
    this.timeout(6000);
    var client = feeds.user1.getFayeClient();
    var subscription = feeds.user1.subscribe(function callback() {
    });

    subscription.then(function() {
      done();
    });
  });

  it('fayeSubscribeListening', function(done) {
    this.timeout(6000);

    var testUser1 = client.feed('user', '111', 'ksBmfluIarcgjR9e6ptwqkWZWJo'),
        testUser2 = client.feed('user', '222', 'psuPHwgwoX-PGsg780jcXdO93VM'),
        testUser3 = client.feed('user', '333', '7e4xHA0y1Pn6_iZAv7nu0ujuMXg');

    var subscribes = [],
        messages = 0,
        N_MESSAGES = 3,
        activity = {
      'verb': 'test',
      'actor': 'User:1',
      'object': 1,
    };

    var msgCallback = function(message) {
      if (message && message.new && message.new.length > 0) {
        messages += 1;
      }

      if (messages == N_MESSAGES) {
        done();
      }
    };

    var httpCallback = function(error, response, body) {
      if (error) done(error);
      if (response.statusCode !== 201) done(body);
    };

    Faye.Promise.all([
      testUser1.subscribe(msgCallback),
      testUser2.subscribe(msgCallback),
      testUser3.subscribe(msgCallback),
    ]).then(function() {
      testUser1.addActivity(activity, httpCallback);
      testUser2.addActivity(activity, httpCallback);
      testUser3.addActivity(activity, httpCallback);
    }, done);
  });

  it('fayeSubscribeListeningWrongToken', function(done) {
    this.timeout(6000);

    var testUser1 = client.feed('user', '111', 'psuPHwgwoX-PGsg780jcXdO93VM'),
        testUser2 = client.feed('user', '222', 'psuPHwgwoX-PGsg780jcXdO93VM');

    var messages = 0,
        activity = {
      'verb': 'test',
      'actor': 'User:1',
      'object': 1,
    };

    var httpCallback = function(error, response, body) {
      if (error) done(error);
      if (response.statusCode !== 201) done(body);
    };

    var doneYet = function(obj) {
      messages++;

      if (messages === 2) done();
    };

    testUser1.subscribe(function(message) {
      done('testUser1 should not receive any messages');
    }).then(function() {
      done('testUser1 should not authenticate succefully');
    }, doneYet);

    testUser2.subscribe(doneYet).then(function() {
      testUser2.addActivity(activity, httpCallback);
    }, done);

  });

  it('fayeSubscribeScope', function(done) {
    this.timeout(6000);
    var client = feeds.user1ReadOnly.getFayeClient();
    var isDone = false;

    var doneYet = function() {
      if (!isDone) {
        done();
        isDone = true;
      }
    };

    var subscription = feeds.user1ReadOnly.subscribe(doneYet);
    subscription.then(doneYet);
  });

  it('fayeSubscribeScopeTampered', function(done) {
    this.timeout(6000);
    var client = feeds.user1ReadOnly.getFayeClient();
    var isDone = false;

    var doneYet = function() {
      if (!isDone) {
        done();
        isDone = true;
      }
    };

    var subscription = feeds.user1ReadOnly.subscribe(doneYet);
    subscription.then(doneYet);
  });

  it('fayeSubscribeError', function(done) {
    this.timeout(6000);

    var client = stream.connect('5crf3bhfzesn');
    function sub() {
      var user1 = client.feed('user', '11', 'secret');
      feeds.user1.subscribe();
    }

    expect(sub).to.throwException(function(e) {
      expect(e).to.be.a(errors.SiteError);
    });

    done();
  });

  it('get promises', function(done) {
    feeds.user1.get({'limit': 1}).then(function(body) {
      done();
    }, done);
  });

  it('post promises', function(done) {
    var activity = {'actor': 'test-various:characters', 'verb': 'add', 'object': 1, 'tweet': 'hello world'};
    feeds.user1.addActivity(activity).then(function(body) {
      done();
    }, done);
  });

  it('post promises fail', function(done) {
    var activity = {'actor': 'test-various:characters', 'verb': 'add', 'object': '', 'tweet': 'hello world'};
    var p = feeds.user1.addActivity(activity)
      .then(function(body) {
        done('expected failure');
      });

    p.catch(function(errorObj) {
      done();
    });
  });

  if (isNodeEnv) {
    // Server side specific tests
    var wrapCB = function(expectedStatusCode, done, cb) {
      return function(error, response, body) {
        if (error) return done(error);
        expect(response.statusCode).to.be(expectedStatusCode);

        if (typeof cb === 'function') {
          cb.apply(cb, arguments);
        } else {
          done();
        }
      };
    };

    it('supports application level authentication', function(done) {
      client.makeSignedRequest({
        url: 'test/auth/digest/',
      }, wrapCB(200, done));
    });

    it('fails application level authentication with wrong keys', function(done) {
      var client = stream.connect('aap', 'noot');

      client.makeSignedRequest({
        url: 'test/auth/digest/',
      }, function(error, response, body) {
        if (error) done(error);
        if (body.exception === 'ApiKeyException') done();
      });
    });

    it('supports adding activity to multiple feeds', function(done) {
      var activity = {
        'actor': 'user:11',
        'verb': 'like',
        'object': '000',
      };
      var feeds = ['flat:33', 'user:11'];

      client.addToMany(activity, feeds, wrapCB(201, done));
    });

    it('supports batch following', function(done) {
      this.timeout(6000);

      var follows = [
        {'source': 'flat:1', 'target': 'user:1'},
        {'source': 'flat:1', 'target': 'user:2'},
        {'source': 'flat:1', 'target': 'user:3'},
      ];

      client.followMany(follows, wrapCB(201, done));
    });

    it('no secret application auth', function() {
      var client = stream.connect('ahj2ndz7gsan');

      expect(function() {
        client.addToMany({}, []);
      }).to.throwError(function(e) {
        expect(e).to.be.a(errors.SiteError);
      });
    });

    it('batch promises', function(done) {
      var activity = {
        'actor': 'user:11',
        'verb': 'like',
        'object': '000',
      };
      var feeds = ['flat:33', 'user:11'];

      client.addToMany(activity, feeds).then(function(body) {
        done();
      }, done);
    });
  } else {
    // Client side specific tests

    it('shouldn\'t support signed requests on the client', function() {
      expect(client.makeSignedRequest).to.be(undefined);
    });
  }
});
