const express = require('express');
const _ = require('lodash');
const logs = express.Router({mergeParams: true});
const {ObjectID} = require('mongodb');
const shell = require('shelljs');
const schedule = require('node-schedule');
const arp = require('node-arp');
const ping = require('ping');
const moment = require('moment');

const {Log} = require('../models/log');

const hosts = [];

for (let i = 0; i < 256; i++) {
  hosts.push(`192.168.43.${i}`)
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

// POST /services
logs.post('/', (req, res) => {

  let log = new Log({
    _user: req.body._user,
    macAddress: req.body.macAddress
  });

  log.save()
    .then(doc => res.send(doc))
    .catch(e => res.status(400).send(e));
});

module.exports = logs;