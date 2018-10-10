const express = require('express');
const logs = express.Router({mergeParams: true});
const schedule = require('node-schedule');
const arp = require('node-arp');
const ping = require('ping');
const moment = require('moment');
const {ObjectID} = require('mongodb');

const {Log} = require('../models/log');

const hosts = [];

for (let i = 0; i < 256; i++) {
  hosts.push(`192.168.5.${i}`)
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
                      return obj.subjectDate === moment().format('MMMM Do YYYY')
                    });
                    if (index >= 0) {
                      item.addTimeSameDay(index);
                    } else {
                      item.addTimeNewDay();
                    }
                  }
                });
            }
          });
        }
      });
  });
});

// POST /logs
logs.post('/', (req, res) => {

  let log = new Log({
    _user: req.body._user,
    macAddress: req.body.macAddress
  });

  log.save()
    .then(doc => res.send(doc))
    .catch(e => res.status(400).send(e));
});

// DELETE /logs
logs.delete('/:id', (req, res) => {

  Log.deleteOne({ '_user': req.params.id }).then((user) => {
    res.send(user);
  }, (e) => {
    res.status(400).send(e);
  });
});

// PATCH /logs
logs.patch('/', (req, res) => {
  Log.findOneAndUpdate({
    _user: req.body._user
  }, { $set: { macAddress: req.body.macAddress } }, { new: true, runValidators: true }).then(log => {
    if (!log) {
      return res.status(404).send();
    }

    res.status(200).send(log);
  }).catch(err => {
    if (err) {
      res.status(400).send();
    }
  });
});

// PATCH /logs/presence/edit
logs.patch('/presence/edit', (req, res) => {
  Log.update({_user : req.body._user, "logs._id": req.body._id},
    {$set: {"logs.$.firstCheckIn": req.body.firstCheckIn, "logs.$.lastCheckIn": req.body.lastCheckIn}})
    .then(log => {
      if (!log) {
        return res.status(404).send();
      }
      res.status(200).send(log)
    })
    .catch(error => res.status(400).send(error))
});

// GET /logs
logs.get('/', (req, res) => {
  Log.find().then((users) => {
    res.status(200).send(users);
  }, (e) => {
    res.status(400).send(e);
  });
});

// POST /logs/presence/manual
logs.post('/presence/manual', (req, res) => {
  Log.findOne({_user: req.body._user})
    .then(item => {
      if (item) {
        let index = item.logs.findIndex(obj => {
          return obj.subjectDate === moment().format('MMMM Do YYYY')
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
    });
});

module.exports = logs;