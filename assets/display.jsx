/** @jsx React.DOM */
(function(exports) {

// Widget to show monitors
var Monitors = React.createClass({
  render: function() {
    return (
      <span>
      {
        this.props.monitors.map(function(monitor) {
          return <Monitor monitor={monitor} key={monitor.key}/>;
        }, this)
      }
      </span>
    );
  }
});

var STATE_ICON = {
  'up':           'glyphicon glyphicon-ok',
  'not-checked':  'glyphicon glyphicon-time',
  'paused':       'glyphicon glyphicon-pause',
  'seems-down':   'glyphicon glyphicon-warning-sign',
  'down':         'glyphicon glyphicon-fire'
};

var STATE_LABEL = {
  'up':           'label label-success',
  'not-checked':  'label label-info',
  'paused':       'label label-warning',
  'seems-down':   'label label-danger',
  'down':         'label label-danger'
};

// Display a single monitor
var Monitor = React.createClass({
  getInitialState: function() {
    return {
      loading: true
    };
  },

  // Create method to reload
  reload: function() {
    uptime.loadMonitor(this.props.monitor).then(function(data) {
      this.setState(data);
      this.setState({loading: false});
    }.bind(this));
  },

  componentDidMount: function() {
    // Reload every 5 minutes
    this.ivtHandler = setInterval(this.reload, 5 * 60 * 1000);

    // Reload immediately
    this.reload();
  },

  componentWillUnmount: function() {
    clearInterval(this.ivtHandler);
    this.ivtHandler = null;
  },

  // Render monitor
  render: function() {
    var contents;
    if (this.state.loading) {
      contents = (
        <div id="loading">
          <i className="glyphicon glyphicon-refresh"></i>
        </div>
      );
    } else {
      contents = (
        <span>
          <div ref="statusInfo">
            <div className="status-uptime" ref="statusUptime">
              <div className="status-icon">
                <i className={STATE_ICON[this.state.state]}></i><br/>
                <b>State: </b>
                <span className={STATE_LABEL[this.state.state]}>
                  {this.state.state}
                </span>
              </div>
              <div className="panel panel-default uptime-panel">
                <div className="panel-heading">
                  <h3 className="panel-title">
                    Uptime
                  </h3>
                </div>
                <div className="panel-body">
                  <dl className="dl-horizontal">
                    <dt>24 hours</dt>
                    <dd>{this.state.uptime.day + ' %'}</dd>
                    <dt>Week</dt>
                    <dd>{this.state.uptime.week + ' %'}</dd>
                    <dt>Month</dt>
                    <dd>{this.state.uptime.month + ' %'}</dd>
                    <dt>All time</dt>
                    <dd>{this.state.uptime.allTime + ' %'}</dd>

                  </dl>
                </div>
              </div>
            </div>
            {
              this.state.responseTimes.length > 0 ?
              <Graph responseTimes={this.state.responseTimes}/>
              : <div style={{ height: '160px', display: 'inline-block'}}></div>
            }
          </div>
          <Log entries={this.state.log}/>
        </span>
      );
    }

    return (
      <div className="well">
        <h1 id="monitor-title">
          Status: <code>{this.props.monitor.title}</code>
        </h1>
        {contents}
      </div>
    );
  }
});


var Graph = React.createClass({
  paper: null,

  componentDidMount: function() {
    this.paper = Raphael(this.refs.canvas.getDOMNode(), 530, 160);
    this.renderGraph();
  },

  componentWillUnmount: function() {
    this.paper.remove();
  },

  renderGraph: function() {
    if (this.chart) {
      this.chart.remove();
      this.text.remove()
      this.line.remove();
    }
    var responseTimes = this.props.responseTimes;

    var xvals = responseTimes.map(function(entry) {
      return entry.date.getTime();
    });
    var yvals = responseTimes.map(function(entry) { return entry.time});
    var color = '#55f';
    this.chart = this.paper.linechart(
      45, 5, 480, 130,
      xvals,
      yvals, {
        nostroke:   false,
        axis:       "0 0 1 1",
        symbol:     "circle",
        smooth:     false,
        colors:     [color],
        shade:      false,
        width:      0.5
    });

    // Render x labels
    this.chart.axis[0].text.items.forEach(function(item) {
      var date = new Date(parseInt(item.attr('text')));
      item.attr('text', moment(date).fromNow());
    });
    // Render y labels
    this.chart.axis[1].text.items.forEach(function(item) {
      item.attr('text', item.attr('text') + ' ms');
    });

    this.text = this.paper.text(500, 25, "Response Time").attr({
      'fill':         '#000',
      'text-anchor':  'end',
      'font-size':    '11pt'
    });
    var offset = 495 - this.text.getBBox().width;
    var line = this.line = this.paper.path('M' + offset + ' 25h-10').attr({
      'stroke':           color,
      'stroke-width':     2
    });

    var paper = this.paper;
    this.chart.hoverColumn(function () {
        this.tags = paper.set();
            this.tags.push(
              paper.tag(this.x, this.y[0], this.values[0] + ' ms', 360 - 160, 7)
                   .insertBefore(line)
                   .attr([
                      {fill: "#fff"},
                      {fill: this.symbols[0].attr("fill")}
                    ])
              );

    }, function () {
      if(this.tags) {
        this.tags.remove();
      }
    });

  },

  render: function() {
    if (this.paper) {
      this.renderGraph();
    }
    return <div ref="canvas" className="canvas"></div>
  }
});

var LOG_STATE_ICON = {
  'up':           'glyphicon glyphicon-ok',
  'down':         'glyphicon glyphicon-fire',
  'paused':       'glyphicon glyphicon-pause',
  'started':      'glyphicon glyphicon-play'
};

var LOG_STATE_LABEL = {
  'up':           'label label-success',
  'down':         'label label-danger',
  'started':      'label label-info',
  'paused':       'label label-warning'
};

var Log = React.createClass({
  getInitialState: function() {
    return {
      showLog:    false
    };
  },

  onTitleClick: function() {
    this.setState({
      showLog:      !this.state.showLog
    });
  },

  render: function() {
    var titleIcon = 'glyphicon glyphicon-chevron-' +
                    (this.state.showLog ? 'down' : 'right');

    var body;
    if (this.state.showLog) {
      body = (
        <div className="panel-body">
          <table className="table table-condensed log-table">
            <thead>
              <th>State</th>
              <th>Duration</th>
              <th>Start</th>
            </thead>
            <tbody>
              {
                this.props.entries.map(function(entry) {
                  return (
                    <tr key={entry.date}>
                      <td>
                        <i className={LOG_STATE_ICON[entry.state]}></i>
                        &nbsp;&nbsp;
                        <span className={LOG_STATE_LABEL[entry.state]}>
                          {entry.state}
                        </span>
                      </td>
                      <td>{entry.duration}</td>
                      <td>{moment(entry.date).format('Do of MMMM YYYY, H:mm:ss')}</td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="panel panel-default log-panel"
           onClick={this.onTitleClick}>
        <div className="panel-heading log-title">
          <h3 className="panel-title">
            <i className={titleIcon}></i>
            &nbsp;&nbsp;&nbsp;
            <b>Incident History</b>
          </h3>
        </div>
        {body}
      </div>
    );
  }
});




// Render monitors
React.renderComponent(new Monitors({
  monitors:   uptime.MONITORS
}), document.getElementById('monitors'));

// End module
})(this);