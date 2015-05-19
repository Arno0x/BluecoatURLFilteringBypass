Bluecoat Proxies URL filtering bypass, for NodeJS
============

Author: Arno0x0x - [@Arno0x0x](http://twitter.com/Arno0x0x)

**BluecoatFilteringBypassProxy** is a very basic PoC (*let me restate to be clear: VERY basic*) of a simple technique that can be used to defeat (80% of the time) the URL filtering on a Bluecoat Proxy.

While this PoC has been successfully tested against a "Bluecoat ProxySG" appliance with WebFilter/WebPulse enabled, it *may* also work on other URL filtering proxies.

It is noticeable that this technique doesn't involve using any third party server outside of the corportate network to perform some sort of tunneling or any fancy stuff like that. It's all local to the client computer and doesn't require any admin rights. The trick is all about rewriting client requests on the fly.

**BluecoatFilteringBypassProxy** is written in Javascript, based on NodeJS libraries and runtime. It does NOT require any additionnal NodeJS module.

This script is distributed under the terms of the [GPLv3 licence](http://www.gnu.org/copyleft/gpl.html).

Disclaimer
----------------

1. As usual, this script is just a PoC to demonstrate how this kind of URL filtering works and give a better understanding of the limits of such a filtering. I think it's good for network/system admins to see what it needs for their users to bypass, in most case, their URL filtering.

2. The code is crap. I'm not a developper nor do I have time to write nice and reusable code. Feel free to fork. However, it's pretty stable and I've been using it day long.

3. If you get caught by your company bypassing or even trying to bypass their URL filtering proxy, well... you might get into trouble, who knows ?

Dependencies
----------------

BluecoatFilteringBypassProxy requires [NodeJS](https://nodejs.org) to run it and that's pretty much it. The script is based only on NodeJS core modules so no additionnal module is required.

Installation / Start it
------------

Copy the BluecoatFilteringBypassProxy.js in a directory. Edit it to configure main variables at the beginning of the script, namely:

- proxyPort : Integer - Sets the TCP port the proxy will be listening on
- serviceProxy : String - Defines the Bluecoat upstream proxy name or IP
- servicePort : Integer - Defines the Bluecoat upstream proxy TCP port

Then run the script via NodeJS binary:

    # node BluecoatFilteringBypassProxy.js

Eventually configure your browser to point to this proxy listening on the port specified with the "proxyPort" variable