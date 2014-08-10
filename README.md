TaskCluster - Status Dashboard
==============================

Uptime of taskcluster components is monitored by uptimerobot.net.
This dashboard displays results from their JSON API. Jonas currently
administers the monitors setup with uptimerobot.net.

This is really just a static dashboard, we could extend it with results from
a test suite that runs against production services or hit the `/v1/ping` on
our services. The goal is just to give an overview of what is broken in
production.

Ideally, the dashboard can remain static and just consume output from other
services. There not much point in hosting this on the same infrastructure as
everything else.
