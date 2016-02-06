var Botkit = require('./lib/Botkit.js');
var os = require('os');
var _ = require('underscore');
var moment = require('moment');

var controller = Botkit.slackbot({
    debug: true,
    json_file_store: './'

});

var bot = controller.spawn({
    token: process.env.token
    }).startRTM(function(err,res) {
        fetchUsersAndSave();
        fetchChannelsAndSave();

    });

var fetchUsersAndSave = function() {
        bot.api.users.list({
            presence: 0
        }, function(err, res) {

            addUsersToStore(res.members);
        });
};

var fetchChannelsAndSave = function() {
        bot.api.channels.list({},
            function(err, res) {

            addChannelsToStore(res.channels);
        });
};

var addUsersToStore = function(users) {
    users.forEach(function(user) {
        controller.storage.users.save(user);
    });
};

var addChannelsToStore = function(channels) {
    channels.forEach(function(channel) {
        controller.storage.channels.save(channel);
    });
};

var sendMessageAllUsers = function(message, channel_name) {
    controller.storage.channels.all(function(err, channels){
        var channel = _.findWhere(channels, {name: channel_name});

        channel.members.forEach(function(user) {
            bot.botkit.log(user + message);
            // bot.api.chat.postMessage({
            //     channel: user,
            //     as_user: true,
            //     text: message
            // });
        });
    });
};

var leave_listener = function() {
  controller.hears(['leave: (.*)'],'direct_message,direct_mention,mention',function(bot, incoming_message) {
      var matches = incoming_message.text.match(/leave: (.*)/i);
      controller.storage.users.get(incoming_message.user, function(err, user) {
        var date = moment(matches[1]);
        var message_text = user.real_name + ' leave on ' + date.toString();
        var message = {
          date: date.format('X'),
          type: 'leave',
          message: message_text
        };
        controller.storage.messages.save(message,function(err, id) {
             bot.reply(incoming_message, "Your leave has been recorded:" + message_text);
         });
      });
  });

  controller.hears(['send:leave'],'direct_message,direct_mention,mention',function(bot, incoming_message) {
      leaveCron();
  });

};

var leaveCron = function() {
  //Wrap with function that runs every morning IST
  controller.storage.messages.all(function(err, messages) {
    var today = moment().startOf('day').format('X');
    var messages_for_the_day = _.where(messages, {
        type: 'leave',
        date: today
    });

    messages_for_the_day.forEach(function(message) {
        sendMessageAllUsers(message.message, 'hackathon');
    });

  });
};

var story_listener = function() {
  controller.hears(['story: (.*)'],'direct_message,direct_mention,mention',function(bot, incoming_message) {
      var matches = incoming_message.text.match(/story: (.*)/i);
      controller.storage.users.get(incoming_message.user, function(err, user) {
        var message_text = matches[1];
        var card_number = message_text.match(/#\d*/)[0];
        var status = message_text.replace(card_number, '').trim();
        var is_completed = message_text.indexOf('completed') > 0;

        controller.storage.messages.all(function(err, messages) {
            var message = _.where(messages, {card_number: card_number});

            message = _.extend(message, {
              date: moment().format('X'),
              type: 'story',
              card_number: card_number,
              is_completed: is_completed,
              status: status
            });

            controller.storage.messages.save(message,function(err, id) {
                bot.reply(incoming_message, 'https://recruiterbox.mingle.thoughtworks.com/projects/recruiterbox/cards/' + message.card_number.replace('#') + ' (' + message.status + ')');
            });
        });
      });
  });

  controller.hears(['send:story'],'direct_message,direct_mention,mention',function(bot, incoming_message) {
      storyCron();
  });

};

var storyCron = function() {
  //Wrap with function that runs every morning IST
  controller.storage.messages.all(function(err, messages) {
    var today = moment().startOf('day').format('X');
    var messages_for_the_day = _.where(messages, {
        type: 'story',
        is_completed: false
    });

    messages_for_the_day.forEach(function(message) {
        var message_text = 'https://recruiterbox.mingle.thoughtworks.com/projects/recruiterbox/cards/' + message.card_number.replace('#') + ' (' + message.status + ')';
        sendMessageAllUsers(message_text, 'hackathon');
    });

  });
};




      // controller.storage.users.get(message.user,function(err, user) {
      //     if (!user) {
      //         user = {
      //             id: message.user,
      //         };
      //     }
      //     user.name = date;
      //     controller.storage.users.save(user,function(err, id) {
      //         bot.reply(message,'Got it. I will call you ' + user.name + ' from now on.');
      //     });
      // });


//
// setInterval(function() {
//   bot.api.chat.postMessage({
//     channel: 'U06L88R26',
//     as_user: true,
//     text: 'hello cheta'
//   });
// },5000);


leave_listener();
story_listener();

