const express = require('express');
const logs = express.Router({mergeParams: true});
const schedule = require('node-schedule');
const arp = require('node-arp');
const ping = require('ping');
const moment = require('moment');

const {Log} = require('../models/log');

const hosts = [];

for (let i = 0; i < 256; i++) {
  hosts.push(`192.168.0.${i}`)
}

// SCAN ARP
schedule.scheduleJob('*/1 * * * *', function(){
  console.log(new Date());
  hosts.forEach(host => {
    ping.promise.probe(host)
      .then(res => {
        if (res.alive) {
          arp.getMAC(host, function(err, mac) {
            if (!err) {
              Log.findOne({macAddress: mac})
                .then(item => {
                  if (item) {
                    let index = item.logs.findIndex(obj => {
                      return obj.subjectDate === moment().format('YYYY-MM-DD')
                    });
                    if (index >= 0) {
                      item.addTimeSameDay(index);
                    } else {
                      item.addTimeNewDay();
                    }
                  } else {
                    let log = new Log({
                      macAddress: mac
                    });
                    log.save().then(saved => saved.addTimeNewDay());
                  }
                });
            }
          });
        }
      });
  });
});

// update logs of a specific date
logs.patch('/', (req, res) => {
  let update = {};

  if (req.body.firstCheckIn && req.body.lastCheckIn) {
    update = {"logs.$.firstCheckIn": req.body.firstCheckIn, "logs.$.lastCheckIn": req.body.lastCheckIn};
  } else if (req.body.firstCheckIn && !req.body.lastCheckIn) {
    update = {"logs.$.firstCheckIn": req.body.firstCheckIn};
  } else if (!req.body.firstCheckIn && req.body.lastCheckIn) {
    update = {"logs.$.lastCheckIn": req.body.lastCheckIn};
  }

  Log.update({macAddress : req.body.macAddress, "logs.subjectDate": req.body.subjectDate},
    {$set: update})
    .then(log => {
      if (log.n === 0) {
        return res.status(404).send();
      }
      res.status(200).send(log)
    })
    .catch(error => res.status(400).send(error))
});

// get all logs
logs.get('/', (req, res) => {
  Log.find().then((users) => {
    res.status(200).send(users);
  }, (e) => {
    res.status(400).send(e);
  });
});

// manual checkin
logs.post('/', (req, res) => {
  Log.findOne({macAddress: req.body.macAddress})
    .then(item => {
      if (!item) {
        res.status(404).send();
      }

      if (item) {
        let index = item.logs.findIndex(obj => {
          return obj.subjectDate === moment().format('YYYY-MM-DD')
        });
        if (index >= 0) {
          item.addTimeSameDay(index)
            .then((response) => res.status(200).send(response))
            .catch(error => res.status(400).send(error));
        } else {
          item.addTimeNewDay()
            .then((response) => res.status(200).send(response))
            .catch(error => res.status(400).send(error));
        }
      }
    })
    .catch(error => {
      res.status(400).send(error);
  })
});

// is in today
logs.get('/:id', (req, res) => {
  Log.findOne({macAddress: req.params.id})
    .then(item => {
      if (!item) {
        res.status(404).send();
      }

      if (item) {
        let index = item.logs.findIndex(obj => {
          return obj.subjectDate === moment().format('YYYY-MM-DD')
        });
        if (index >= 0) {
          res.status(200).send({alreadyInToday: true})
        } else {
          res.status(200).send({alreadyInToday: false})
        }
      }
    })
    .catch(error => {
      res.status(400).send(error);
    })
});

module.exports = logs;