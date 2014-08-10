(function(exports) {

// Create namespace
var uptime = exports.uptime = {};

// List of monitors to present
var MONITORS = [
  {
    title:    'queue.taskcluster.net',
    name:     'queue.taskcluster.net',
    key:      'm776323830-a170e7abc854f94cc2f4c078'
  }, {
    title:    'scheduler.taskcluster.net',
    name:     'task-graph-scheduler',
    key:      'm776120202-44923d8660c2a1bd1a5de440'
  }, {
    title:    'auth.taskcluster.net',
    name:     'auth.taskcluster.net',
    key:      'm776208480-28abc3b309cb0e526a5ebce8'
  }, {
    title:    'aws-provisioner.taskcluster.net',
    name:     'provisioner',
    key:      'm776120201-37b5da206dfd8de4b00ae25b'
  }, {
    title:    'events.taskcluster.net',
    name:     'events.taskcluster.net',
    key:      'm776321033-e82bb32adfa08a0bba0002c6'
  }
];

// Export monitors
uptime.MONITORS = MONITORS;

// States in monitor status
var STATUS_STATE = {
  0: 'paused',
  1: 'not-checked',
  2: 'up',
  8: 'seems-down',
  9: 'down'
};

// States in log entries
var LOG_STATES = {
  1:  'down',
  2:  'up',
  99: 'paused',
  98: 'started'
};

// Return a promise for an a status object from a monitor
var loadMonitor = function(monitor) {
  return request
    .get('http://api.uptimerobot.com/getMonitors')
    .query({
      apiKey:                     monitor.key,
      customUptimeRatio:          '1-7-30',
      logs:                       1,
      responseTimes:              1,
      format:                     'json',
      noJsonCallback:             1
    })
    .end()
    .then(function(res) {
      var monitor = res.body.monitors.monitor[0];

      // Order the log and computer duration
      var log = (monitor.log || []).map(function(entry) {
        return {
          state:      LOG_STATES[entry.type],
          date:       new Date(entry.datetime)
        };
      });
      log.sort(function(a, b) {
        return b.date.getTime() - a.date.getTime();
      });
      for(var i = log.length - 1; i > 0; i--) {
        log[i].duration = moment(log[i].date).from(log[i - 1].date, true);
      }
      log[0].duration = moment(log[i].date).from(new Date(), true)

      // Order the response times
      var responseTimes = (monitor.responsetime || []).map(function(entry) {
        return {
          time:       parseInt(entry.value),
          date:       new Date(entry.datetime)
        };
      });
      responseTimes.sort(function(a, b) {
        return  b.date.getTime() - a.date.getTime();
      });

      // Find up times
      var uptimes = monitor.customuptimeratio.split('-');
      return window.retval = {
        uptime: {
          day:      parseFloat(uptimes[0]),
          week:     parseFloat(uptimes[1]),
          month:    parseFloat(uptimes[2]),
          allTime:  parseFloat(monitor.alltimeuptimeratio)
        },
        state:          STATUS_STATE[monitor.status],
        log:            log,
        responseTimes:  responseTimes
      };
    }).then(null, function(err) {
      console.log("Error fetching data for: " + monitor.name);
      console.error(err);
    });
};

// Export loadMonitor
uptime.loadMonitor = loadMonitor;

// End module
})(this);