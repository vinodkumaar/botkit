if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

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
  bot.api.users.list({
      presence: 0
  },function(err, res) {
    res.members.forEach(function(user) {
        controller.storage.users.save(user);
    });
    leave_listener();
      if (err) {
          bot.botkit.log('Failed to fetch users', err);
      }
  });
});



var leave_listener = function() {
  controller.hears(['leave: (.*)'],'direct_message,direct_mention,mention',function(bot, incoming_message) {
      var matches = incoming_message.text.match(/leave: (.*)/i);
      controller.storage.users.get(incoming_message.user, function(err, user) {
        var date = new Date(matches[1]);
        var message_text = user.real_name + ' leave on ' + date.toString();
        var message = {
          date: date,
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
  controller.storage.messages.all(function(messages) {
    bot.botkit.log(messages + ' messages');
    var messages_for_the_day = _.filter(messages, function(message) {
      return moment(message.date).format('x') == moment().startOf('day');
    });
    messages_for_the_day.forEach(function(message) {
      controller.storage.users.all(function(users) {
        users.forEach(function(user) {
          bot.botkit.log(message.message);
        });
      });
    });
  }) ;
}



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
