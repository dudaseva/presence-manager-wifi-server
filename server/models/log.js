const mongoose = require('mongoose');
const moment = require('moment');

let LogSchema = new mongoose.Schema({
  _user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  macAddress: {
    type: String,
    required: true,
    minlength: 5
  },
  logs: [{
    subjectDate: {
      type: String,
      required: true
    },
    firstCheckIn: {
      type: String,
    },
    lastCheckIn: {
      type: String,
    }
  }]
});

LogSchema.methods.addTimeSameDay = function (index) {
  let log = this;

  log.logs[index].lastCheckIn = moment().format('MMMM Do YYYY, h:mm:ss a');

  return log.save();
};

LogSchema.methods.addTimeNewDay = function () {
  let log = this;
  let time = moment().format('MMMM Do YYYY, h:mm:ss a');
  let subjectDate = moment().format('MMMM Do YYYY');


  log.logs = log.logs.concat([{subjectDate: subjectDate, firstCheckIn: time}]);

  return log.save();
};

let Log = mongoose.model('Log', LogSchema);

module.exports = { Log };
