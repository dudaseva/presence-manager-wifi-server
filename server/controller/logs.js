const express = require('express');
const logs = express.Router({mergeParams: true});
const schedule = require('node-schedule');
const arp = require('node-arp');
const ping = require('ping');
const moment = require('moment');

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
                    console.log(JSON.stringify(item, undefined, 2));
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

module.exports = logs;